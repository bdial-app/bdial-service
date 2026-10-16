import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminSeenMark } from '../entities/admin-seen-mark.entity';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';

/** Work waiting on any admin — the same counts the pages themselves show. */
export const WAITING_KEYS = [
  'queue',
  'providersInReview',
  'flaggedReviews',
  'verifications',
  'reports',
  'offers',
  'sponsorships',
  'bugReports',
  'womenLed',
] as const;

/** What's new since this admin last opened the section. */
export const FRESH_KEYS = [
  'users',
  'providers',
  'products',
  'reviews',
  'photos',
  'chat',
  'payments',
  'subscriptions',
  'cities',
  'logs',
] as const;

export type FreshKey = (typeof FRESH_KEYS)[number];
type Counts<K extends string> = Record<K, number>;

export interface Attention {
  waiting: Counts<(typeof WAITING_KEYS)[number]>;
  fresh: Counts<FreshKey>;
  /** Since when each fresh count runs (ISO). */
  since: Record<FreshKey, string>;
}

/** Someone who never opened a section sees the last day's worth. */
const DEFAULT_LOOKBACK_MS = 24 * 3600_000;
/** And nobody counts back further than this. */
const MAX_LOOKBACK_MS = 30 * 24 * 3600_000;
const WAITING_TTL_MS = 30_000;
const FRESH_TTL_MS = 15_000;

/** Signed up themselves (bulk-imported and admin-made accounts have neither id). */
const SIGNED_UP = (u: string) =>
  `(${u}.supabase_id IS NOT NULL OR ${u}.google_id IS NOT NULL)`;
const NOT_STAFF = (u: string) =>
  `(${u}.role IS NULL OR ${u}.role::text NOT IN ('associate','moderator','admin','super_admin'))`;
/** For `timestamp` columns, which hold UTC wall-clock time. */
const AFTER_UTC = (col: string, p: number) =>
  `${col} > ($${p}::timestamptz AT TIME ZONE 'UTC')`;

/**
 * Sidebar counts for the admin: what's waiting for action (shared by all
 * admins) and what's new since each admin last looked (per admin, per
 * section, stored in admin_seen_marks). Each is one round trip of COUNTs
 * on indexed columns, cached briefly so many open tabs cost one query.
 */
@Injectable()
export class AdminAttentionService {
  private waitingCache: { at: number; value: Attention['waiting'] } | null =
    null;
  private freshCache = new Map<
    string,
    { at: number; value: Pick<Attention, 'fresh' | 'since'> }
  >();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AdminSeenMark)
    private readonly seenRepo: Repository<AdminSeenMark>,
  ) {}

  assertStaff(user: { role?: string } | undefined) {
    if ((ROLE_HIERARCHY[user?.role ?? ''] ?? 0) < ROLE_HIERARCHY.associate)
      throw new ForbiddenException('Staff access required');
  }

  /** `refresh` skips the short caches, e.g. right after an admin acted. */
  async get(
    user: { id: string; role?: string },
    refresh = false,
  ): Promise<Attention> {
    this.assertStaff(user);
    if (refresh) {
      this.waitingCache = null;
      this.freshCache.delete(user.id);
    }
    const [waiting, fresh] = await Promise.all([
      this.waiting(),
      this.fresh(user),
    ]);
    return { waiting, ...fresh };
  }

  /** Mark sections as seen now; their "new" counts start again from zero. */
  async markSeen(
    user: { id: string; role?: string },
    sections: readonly FreshKey[],
  ) {
    this.assertStaff(user);
    if (!sections.length) return { ok: true };
    const now = new Date();
    await this.seenRepo.upsert(
      sections.map((section) => ({ userId: user.id, section, seenAt: now })),
      ['userId', 'section'],
    );
    this.freshCache.delete(user.id);
    return { ok: true };
  }

  private async waiting(): Promise<Attention['waiting']> {
    if (this.waitingCache && Date.now() - this.waitingCache.at < WAITING_TTL_MS)
      return this.waitingCache.value;
    // Same definitions as the Moderation Queue and each page's pending tab.
    const [r] = await this.dataSource.query<Record<string, string>[]>(`
      SELECT
        (SELECT count(*) FROM verifications WHERE status = 'in_review') AS "providersInReview",
        (SELECT count(*) FROM verifications WHERE aadhaar_status = 'pending') AS "verifications",
        (SELECT count(*) FROM reports WHERE status = 'pending') AS "reports",
        (SELECT count(*) FROM review_reports WHERE status = 'pending') AS "flaggedReviews",
        (SELECT count(*) FROM sponsored_listings WHERE approval_status = 'pending_approval') AS "sponsorships",
        (SELECT count(*) FROM provider_offers WHERE approval_status = 'pending_approval') AS "offers",
        (SELECT count(*) FROM bug_reports WHERE status = 'open') AS "bugReports",
        (SELECT count(*) FROM providers WHERE women_led_status = 'pending' AND deleted_at IS NULL) AS "womenLed"
    `);
    const n = (k: string) => Number(r?.[k] ?? 0);
    const value: Attention['waiting'] = {
      queue:
        n('providersInReview') +
        n('verifications') +
        n('reports') +
        n('flaggedReviews') +
        n('sponsorships') +
        n('offers') +
        n('bugReports'),
      providersInReview: n('providersInReview'),
      flaggedReviews: n('flaggedReviews'),
      verifications: n('verifications'),
      reports: n('reports'),
      offers: n('offers'),
      sponsorships: n('sponsorships'),
      bugReports: n('bugReports'),
      womenLed: n('womenLed'),
    };
    this.waitingCache = { at: Date.now(), value };
    return value;
  }

  private async fresh(user: {
    id: string;
    role?: string;
  }): Promise<Pick<Attention, 'fresh' | 'since'>> {
    const hit = this.freshCache.get(user.id);
    if (hit && Date.now() - hit.at < FRESH_TTL_MS) return hit.value;

    const marks = await this.seenRepo.find({ where: { userId: user.id } });
    const now = Date.now();
    const since = {} as Record<FreshKey, string>;
    for (const key of FRESH_KEYS) {
      const seen = marks.find((m) => m.section === key)?.seenAt?.getTime();
      since[key] = new Date(
        Math.max(seen ?? now - DEFAULT_LOOKBACK_MS, now - MAX_LOOKBACK_MS),
      ).toISOString();
    }
    const p = (k: FreshKey) => FRESH_KEYS.indexOf(k) + 1;

    // payments, subscriptions and city_requests may be timestamptz or not
    // (entity and migration disagree); they're small, so compare as instants.
    const [r] = await this.dataSource.query<Record<string, string>[]>(
      `
      SELECT
        (SELECT count(*) FROM users u
          WHERE ${AFTER_UTC('u.created_at', p('users'))} AND ${SIGNED_UP('u')} AND ${NOT_STAFF('u')}) AS "users",
        (SELECT count(*) FROM providers pr JOIN users u ON u.id = pr.user_id
          WHERE ${AFTER_UTC('pr.created_at', p('providers'))} AND pr.deleted_at IS NULL AND ${SIGNED_UP('u')}) AS "providers",
        (SELECT count(*) FROM products x JOIN providers pr ON pr.id = x.provider_id JOIN users u ON u.id = pr.user_id
          WHERE x.created_at > $${p('products')} AND pr.deleted_at IS NULL AND ${SIGNED_UP('u')}) AS "products",
        (SELECT count(*) FROM reviews WHERE posted_at > $${p('reviews')}) AS "reviews",
        (SELECT count(*) FROM photos ph JOIN providers pr ON pr.id = ph.provider_id JOIN users u ON u.id = pr.user_id
          WHERE ph.uploaded_at > $${p('photos')} AND pr.deleted_at IS NULL AND ${SIGNED_UP('u')}) AS "photos",
        (SELECT count(*) FROM conversations c WHERE ${AFTER_UTC('c.created_at', p('chat'))}) AS "chat",
        (SELECT count(*) FROM payments WHERE status = 'succeeded' AND created_at::timestamptz > $${p('payments')}) AS "payments",
        (SELECT count(*) FROM subscriptions WHERE created_at::timestamptz > $${p('subscriptions')}) AS "subscriptions",
        (SELECT count(*) FROM city_requests WHERE created_at::timestamptz > $${p('cities')}) AS "cities",
        (SELECT count(*) FROM system_logs WHERE level = 'error' AND created_at > $${p('logs')}) AS "logs"
      `,
      FRESH_KEYS.map((k) => since[k]),
    );
    const fresh = {} as Counts<FreshKey>;
    for (const key of FRESH_KEYS) fresh[key] = Number(r?.[key] ?? 0);
    // Logs are for admins and up.
    if ((ROLE_HIERARCHY[user.role ?? ''] ?? 0) < ROLE_HIERARCHY.admin)
      fresh.logs = 0;

    const value = { fresh, since };
    this.freshCache.set(user.id, { at: Date.now(), value });
    if (this.freshCache.size > 500) this.freshCache.clear();
    return value;
  }
}
