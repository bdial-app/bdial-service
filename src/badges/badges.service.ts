import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AuditLog, ProviderBadge, SystemSetting } from '../entities';
import {
  AUTOMATIC_BADGE_KEYS,
  BADGE_BY_KEY,
  BADGE_KEYS,
  BADGES,
  BadgeKey,
  CURATED_BADGE_KEYS,
  RULES,
  badgeRank,
} from './badge-catalog';

/** What lists and cards carry: the badges a business holds now, highest first. */
export interface BadgeRef {
  type: BadgeKey;
  source: 'earned' | 'curated';
}

export interface RunSummary {
  at: string;
  ms: number;
  holders: Record<string, number>;
  added: Record<string, number>;
  removed: Record<string, number>;
}

const LAST_RUN_KEY = 'badges.last_run';
/** Any fixed number; only one instance at a time recalculates (shared database). */
const RECALC_LOCK = 724_119_001;
/** Rows changed: TypeORM gives [rows, count] for UPDATE … RETURNING, rows for INSERT. */
const rowCount = (res: unknown): number =>
  Array.isArray(res) &&
  res.length === 2 &&
  Array.isArray(res[0]) &&
  typeof res[1] === 'number'
    ? res[1]
    : Array.isArray(res)
      ? res.length
      : 0;
const PUBLIC_PROVIDER = `p.deleted_at IS NULL AND p.status IN ('active', 'unverified')`;

/**
 * Badges: who holds which, keeping the automatic ones true to their rules
 * (src/badges/badge-catalog.ts), and the team's curated ones.
 */
@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    @InjectRepository(ProviderBadge)
    private readonly badges: Repository<ProviderBadge>,
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Reading ───────────────────────────────────────────────────────────────

  /** The badges each business holds now (active, not expired, still a badge we have), highest first. */
  async activeFor(providerIds: string[]): Promise<Map<string, BadgeRef[]>> {
    const map = new Map<string, BadgeRef[]>();
    const ids = [...new Set(providerIds.filter(Boolean))];
    if (!ids.length) return map;
    const rows = await this.dataSource.query<
      { provider_id: string; type: BadgeKey; source: 'earned' | 'curated' }[]
    >(
      `SELECT provider_id, type, source FROM provider_badges
        WHERE provider_id = ANY($1::uuid[]) AND is_active
          AND (expires_at IS NULL OR expires_at > now())
          AND type = ANY($2::text[])`,
      [ids, BADGE_KEYS],
    );
    for (const r of rows) {
      const list = map.get(r.provider_id) ?? [];
      list.push({ type: r.type, source: r.source });
      map.set(r.provider_id, list);
    }
    for (const list of map.values())
      list.sort((a, b) => badgeRank(a.type) - badgeRank(b.type));
    return map;
  }

  /** The same list with each business's badges added (`badges: []` when none). */
  async attach<T extends { id: string }>(
    list: T[] | null | undefined,
  ): Promise<(T & { badges: BadgeRef[] })[]> {
    if (!list?.length) return [];
    const map = await this.activeFor(list.map((p) => p.id));
    return list.map((p) => ({ ...p, badges: map.get(p.id) ?? [] }));
  }

  // ── The rules, as numbers ─────────────────────────────────────────────────
  // Each returns per-business numbers; `only` narrows to one business (for
  // its owner's progress), null means every public business.

  private async ratings(m: EntityManager, only: string | null) {
    return m.query<
      { id: string; rating: number | null; reviews: number; created_at: Date }[]
    >(
      `WITH r AS (
         SELECT provider_id, AVG(star_rating)::float AS avg, COUNT(*)::int AS n
           FROM reviews WHERE status = 'active' GROUP BY provider_id)
       SELECT p.id, p.created_at,
              (COALESCE(r.avg, 0) * COALESCE(r.n, 0) + COALESCE(p.google_rating, 0) * COALESCE(p.google_review_count, 0))
                / NULLIF(COALESCE(r.n, 0) + COALESCE(p.google_review_count, 0), 0) AS rating,
              (COALESCE(r.n, 0) + COALESCE(p.google_review_count, 0))::int AS reviews
         FROM providers p LEFT JOIN r ON r.provider_id = p.id
        WHERE ${PUBLIC_PROVIDER} AND ($1::uuid IS NULL OR p.id = $1)`,
      [only],
    );
  }

  private async replies(m: EntityManager, only: string | null) {
    const { days, withinHours } = RULES.quickResponder;
    return m.query<{ id: string; enquiries: number; quick: number }[]>(
      `WITH conv AS (
         SELECT p.id AS provider_id, p.user_id AS owner_id, pp.conversation_id AS cid
           FROM providers p
           JOIN conversation_participants pp ON pp.user_id = p.user_id AND pp.role = 'provider'
          WHERE ${PUBLIC_PROVIDER} AND ($1::uuid IS NULL OR p.id = $1)),
       asked AS (
         SELECT conv.*, (SELECT min(m.created_at) FROM messages m
                          WHERE m.conversation_id = conv.cid AND m.deleted_at IS NULL
                            AND m.message_type <> 'system' AND m.sender_id IS DISTINCT FROM conv.owner_id) AS asked_at
           FROM conv),
       answered AS (
         SELECT a.provider_id, a.asked_at,
                (SELECT min(m.created_at) FROM messages m
                  WHERE m.conversation_id = a.cid AND m.deleted_at IS NULL
                    AND m.sender_id = a.owner_id AND m.created_at >= a.asked_at) AS replied_at
           FROM asked a
          WHERE a.asked_at >= now() - make_interval(days => $2))
       SELECT provider_id AS id, count(*)::int AS enquiries,
              count(*) FILTER (WHERE replied_at - asked_at <= make_interval(hours => $3))::int AS quick
         FROM answered GROUP BY provider_id`,
      [only, days, withinHours],
    );
  }

  private async popularity(m: EntityManager, only: string | null) {
    // Ranked within each city among every business anyone contacted, then narrowed.
    return m.query<{ id: string; people: number; pr: number; rk: number }[]>(
      `WITH people AS (
         SELECT provider_id, COUNT(DISTINCT COALESCE(user_id::text, session_id))::int AS people
           FROM provider_analytics_events
          WHERE created_at >= now() - make_interval(days => $2)
            AND event_type IN ('call_clicked', 'chat_initiated', 'direction_clicked', 'saved', 'share_clicked')
          GROUP BY provider_id),
       ranked AS (
         SELECT p.id, pe.people,
                percent_rank() OVER (PARTITION BY lower(trim(p.city)) ORDER BY pe.people)::float AS pr,
                rank() OVER (PARTITION BY lower(trim(p.city)) ORDER BY pe.people DESC)::int AS rk
           FROM providers p JOIN people pe ON pe.provider_id = p.id
          WHERE ${PUBLIC_PROVIDER})
       SELECT * FROM ranked WHERE ($1::uuid IS NULL OR id = $1)`,
      [only, RULES.communityFavourite.days],
    );
  }

  private async catalogue(m: EntityManager, only: string | null) {
    return m.query<{ id: string; items: number; visible: number }[]>(
      `SELECT p.id,
              count(*) FILTER (WHERE pr.price > 0 AND (pr.photo_url IS NOT NULL OR cardinality(pr.photo_urls) > 0))::int AS items,
              count(*)::int AS visible
         FROM providers p JOIN products pr ON pr.provider_id = p.id AND pr.is_active
        WHERE ${PUBLIC_PROVIDER} AND ($1::uuid IS NULL OR p.id = $1)
        GROUP BY p.id`,
      [only],
    );
  }

  // ── Keeping the automatic badges true ─────────────────────────────────────

  /** Nightly, and from admin → Badges → Recalculate. */
  @Cron('15 2 * * *', { timeZone: 'Asia/Kolkata' })
  async nightly() {
    try {
      await this.recalculate();
    } catch (err) {
      this.logger.error(
        `Badge recalculation failed: ${(err as Error).message}`,
      );
    }
  }

  async recalculate(): Promise<RunSummary | { skipped: true }> {
    const started = Date.now();
    return this.dataSource.transaction(async (m) => {
      const [{ locked }] = await m.query<{ locked: boolean }[]>(
        `SELECT pg_try_advisory_xact_lock($1) AS locked`,
        [RECALC_LOCK],
      );
      if (!locked) return { skipped: true as const };

      // Curated badges past their end date stop showing; make it official.
      await m.query(
        `UPDATE provider_badges SET is_active = false, updated_at = now()
          WHERE is_active AND expires_at IS NOT NULL AND expires_at <= now()`,
      );

      const holders = new Map<string, Set<string>>();
      const held: { provider_id: string; type: string }[] = await m.query(
        `SELECT provider_id, type FROM provider_badges WHERE is_active AND source = 'earned'`,
      );
      for (const h of held) {
        if (!holders.has(h.type)) holders.set(h.type, new Set());
        holders.get(h.type)!.add(h.provider_id);
      }
      const has = (type: BadgeKey, id: string) =>
        holders.get(type)?.has(id) ?? false;

      const [ratings, replies, popularity, catalogue] = await Promise.all([
        this.ratings(m, null),
        this.replies(m, null),
        this.popularity(m, null),
        this.catalogue(m, null),
      ]);

      const eligible: Record<string, string[]> = {
        top_rated: ratings
          .filter((r) => {
            const { minReviews, earn, keep } = RULES.topRated;
            const rating = Number(r.rating ?? 0);
            return (
              r.reviews >= minReviews &&
              (rating >= earn || (has('top_rated', r.id) && rating >= keep))
            );
          })
          .map((r) => r.id),
        rising_star: ratings
          .filter((r) => {
            const { days, minReviews, minRating } = RULES.risingStar;
            const age =
              (Date.now() - new Date(r.created_at).getTime()) / 86_400_000;
            return (
              age <= days &&
              r.reviews >= minReviews &&
              Number(r.rating ?? 0) >= minRating
            );
          })
          .map((r) => r.id),
        quick_responder: replies
          .filter((r) => {
            const { minEnquiries, earn, keep } = RULES.quickResponder;
            const share = r.enquiries ? r.quick / r.enquiries : 0;
            return (
              r.enquiries >= minEnquiries &&
              (share >= earn || (has('quick_responder', r.id) && share >= keep))
            );
          })
          .map((r) => r.id),
        community_favourite: popularity
          .filter((r) => {
            const c = RULES.communityFavourite;
            const top = (rank: number) => r.pr >= rank || r.rk === 1;
            return (
              (r.people >= c.earnPeople && top(c.earnRank)) ||
              (has('community_favourite', r.id) &&
                r.people >= c.keepPeople &&
                top(c.keepRank))
            );
          })
          .map((r) => r.id),
        full_catalogue: catalogue
          .filter((r) => {
            const { earn, keep } = RULES.fullCatalogue;
            return (
              r.items >= earn ||
              (has('full_catalogue', r.id) && r.items >= keep)
            );
          })
          .map((r) => r.id),
      };

      const summary: RunSummary = {
        at: new Date().toISOString(),
        ms: 0,
        holders: {},
        added: {},
        removed: {},
      };
      for (const type of AUTOMATIC_BADGE_KEYS) {
        const ids = eligible[type] ?? [];
        const removed: unknown = await m.query(
          `UPDATE provider_badges SET is_active = false, updated_at = now()
            WHERE is_active AND source = 'earned' AND type = $1 AND NOT (provider_id = ANY($2::uuid[]))
            RETURNING id`,
          [type, ids],
        );
        const added = await m.query<{ id: string }[]>(
          `INSERT INTO provider_badges (provider_id, type, source, is_active)
           SELECT unnest($2::uuid[]), $1, 'earned', true
           ON CONFLICT (provider_id, type) WHERE is_active DO NOTHING
           RETURNING id`,
          [type, ids],
        );
        summary.removed[type] = rowCount(removed);
        summary.added[type] = added.length;
        summary.holders[type] = ids.length;
      }
      for (const type of CURATED_BADGE_KEYS) {
        const [{ n }] = await m.query<{ n: number }[]>(
          `SELECT count(*)::int AS n FROM provider_badges WHERE is_active AND type = $1`,
          [type],
        );
        summary.holders[type] = n;
      }
      summary.ms = Date.now() - started;
      await this.saveLastRun(m, summary);
      this.logger.log(
        `Badges recalculated in ${summary.ms} ms: ${JSON.stringify(summary.holders)}`,
      );
      return summary;
    });
  }

  private async saveLastRun(m: EntityManager, summary: RunSummary) {
    await m.query(
      `INSERT INTO system_settings (key, value, type, "group", description)
       VALUES ($1, $2, 'json', 'badges', 'Last automatic badge recalculation')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [LAST_RUN_KEY, JSON.stringify(summary)],
    );
  }

  private async lastRun(): Promise<RunSummary | null> {
    const row = await this.settings.findOne({ where: { key: LAST_RUN_KEY } });
    try {
      return row ? (JSON.parse(row.value) as RunSummary) : null;
    } catch {
      return null;
    }
  }

  // ── An owner's badges, and how close they are to the rest ────────────────

  async progressFor(providerId: string) {
    const m = this.dataSource.manager;
    const [rows, ratings, replies, popularity, catalogue] = await Promise.all([
      this.badges.find({
        where: { providerId, isActive: true, type: In(BADGE_KEYS) },
      }),
      this.ratings(m, providerId),
      this.replies(m, providerId),
      this.popularity(m, providerId),
      this.catalogue(m, providerId),
    ]);
    const live = rows.filter((b) => !b.expiresAt || b.expiresAt > new Date());
    const r = ratings[0];
    const rating = Number(r?.rating ?? 0);
    const reviews = r?.reviews ?? 0;
    const daysIn = r
      ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000)
      : 0;
    const q = replies[0] ?? { enquiries: 0, quick: 0 };
    const pop = popularity[0];
    const cat = catalogue[0] ?? { items: 0, visible: 0 };
    const stars = (n: number) => `${n.toFixed(1)}★`;

    const progress: Record<BadgeKey, string> = {
      tijarah_pick: 'Given by the Tijarah team to standout businesses.',
      top_rated: `${reviews ? `${stars(rating)} from ${reviews} review${reviews === 1 ? '' : 's'}` : 'No reviews yet'}; needs ${stars(RULES.topRated.earn)} from ${RULES.topRated.minReviews}.`,
      community_favourite: `${pop?.people ?? 0} ${pop?.people === 1 ? 'person' : 'people'} called, chatted, saved or shared it in the last ${RULES.communityFavourite.days} days; it goes to the top 10% of the city, with ${RULES.communityFavourite.earnPeople} or more.`,
      quick_responder: q.enquiries
        ? `Replied within ${RULES.quickResponder.withinHours} hours to ${q.quick} of ${q.enquiries} enquiries (${Math.round((q.quick / q.enquiries) * 100)}%); needs ${Math.round(RULES.quickResponder.earn * 100)}% of ${RULES.quickResponder.minEnquiries}+.`
        : `No enquiries in the last ${RULES.quickResponder.days} days yet.`,
      rising_star:
        daysIn > RULES.risingStar.days
          ? `Only for a business's first ${RULES.risingStar.days} days.`
          : `${RULES.risingStar.days - daysIn} days left to reach ${stars(RULES.risingStar.minRating)} from ${RULES.risingStar.minReviews} reviews (now ${reviews ? `${stars(rating)} from ${reviews}` : 'no reviews'}).`,
      full_catalogue: cat.visible
        ? `${cat.items} of ${cat.visible} items have a price and a photo; needs ${RULES.fullCatalogue.earn}.`
        : `No items listed yet; needs ${RULES.fullCatalogue.earn} with a price and a photo.`,
    };

    return {
      badges: BADGES.map((def) => {
        const b = live.find((x) => x.type === def.key);
        return {
          key: def.key,
          label: def.label,
          kind: def.kind,
          meaning: def.meaning,
          rule: def.rule,
          held: !!b,
          since: b?.createdAt ?? null,
          expiresAt: b?.expiresAt ?? null,
          progress: b ? null : progress[def.key],
          // Rising Star can't be earned after a business's first 90 days.
          possible:
            !!b || def.key !== 'rising_star' || daysIn <= RULES.risingStar.days,
        };
      }),
    };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async overview() {
    const [counts, lastRun] = await Promise.all([
      this.dataSource.query<{ type: string; n: number }[]>(
        `SELECT type, count(*)::int AS n FROM provider_badges b
           JOIN providers p ON p.id = b.provider_id AND ${PUBLIC_PROVIDER}
          WHERE b.is_active AND (b.expires_at IS NULL OR b.expires_at > now())
          GROUP BY type`,
      ),
      this.lastRun(),
    ]);
    return {
      badges: BADGES.map((b) => ({
        ...b,
        holders: counts.find((c) => c.type === b.key)?.n ?? 0,
      })),
      lastRun,
    };
  }

  async list(q: {
    type?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const qb = this.badges
      .createQueryBuilder('b')
      .leftJoin('b.provider', 'p')
      .addSelect([
        'p.id',
        'p.brandName',
        'p.slug',
        'p.city',
        'p.area',
        'p.profilePhotoUrl',
        'p.status',
      ])
      .where('b.type IN (:...keys)', { keys: BADGE_KEYS });
    if (q.type) qb.andWhere('b.type = :type', { type: q.type });
    if (q.status === 'removed')
      qb.andWhere('(NOT b.isActive OR b.expiresAt <= now())');
    else
      qb.andWhere(
        'b.isActive AND (b.expiresAt IS NULL OR b.expiresAt > now())',
      );
    if (q.search?.trim())
      qb.andWhere('p.brandName ILIKE :s', { s: `%${q.search.trim()}%` });
    qb.orderBy('b.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** All of one business's badges, held and not, with its progress (admin's business page). */
  async forBusiness(providerId: string) {
    const [progress, history] = await Promise.all([
      this.progressFor(providerId),
      this.badges.find({
        where: { providerId, type: In(BADGE_KEYS) },
        order: { updatedAt: 'DESC' },
        take: 20,
      }),
    ]);
    return { ...progress, history };
  }

  async award(
    adminId: string,
    body: {
      providerId: string;
      type: string;
      reason?: string;
      expiresAt?: string | null;
    },
  ) {
    if (!CURATED_BADGE_KEYS.includes(body.type as BadgeKey)) {
      throw new BadRequestException(
        `${BADGE_BY_KEY.get(body.type as BadgeKey)?.label ?? body.type} is automatic: it follows its rule and can't be given by hand`,
      );
    }
    const reason = body.reason?.trim();
    if (!reason) throw new BadRequestException('Say why this business gets it');
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('The end date has to be in the future');
    }
    const [provider] = await this.dataSource.query<
      { id: string; brand_name: string }[]
    >(
      `SELECT id, brand_name FROM providers WHERE id = $1 AND deleted_at IS NULL`,
      [body.providerId],
    );
    if (!provider) throw new NotFoundException('Business not found');

    const existing = await this.badges.findOne({
      where: { providerId: body.providerId, type: body.type, isActive: true },
    });
    const badge =
      existing ??
      this.badges.create({ providerId: body.providerId, type: body.type });
    badge.source = 'curated';
    badge.reason = reason;
    badge.expiresAt = expiresAt;
    badge.awardedBy = adminId;
    badge.isActive = true;
    const saved = await this.badges.save(badge);
    await this.audit(
      adminId,
      existing ? 'update_badge' : 'award_badge',
      saved.id,
      {
        business: provider.brand_name,
        badge: body.type,
        reason,
        until: expiresAt?.toISOString() ?? null,
      },
    );
    return saved;
  }

  async revoke(adminId: string, id: string) {
    const badge = await this.badges.findOne({ where: { id } });
    if (!badge || !badge.isActive)
      throw new NotFoundException('Badge not found');
    if (badge.source !== 'curated') {
      throw new BadRequestException(
        'Automatic badges follow their rule; they go by themselves when the business no longer qualifies',
      );
    }
    badge.isActive = false;
    await this.badges.save(badge);
    await this.audit(adminId, 'revoke_badge', id, { badge: badge.type });
    return { ok: true };
  }

  private async audit(
    adminId: string,
    action: string,
    id: string,
    state: Record<string, unknown>,
  ) {
    await this.auditLogs.save(
      this.auditLogs.create({
        adminId,
        action,
        entityType: 'provider_badge',
        entityId: id,
        previousState: null,
        newState: state,
        description: `Badge: ${action.replace(/_/g, ' ')}`,
      }),
    );
  }
}
