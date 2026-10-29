import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { AnalyticsService } from '../analytics/analytics.service';
import type {
  AdminLeadInteractionQueryDto,
  AdminLeadListQueryDto,
  LeadPeriod,
} from './dto/admin-leads.dto';

const PERIOD_DAYS: Record<LeadPeriod, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

/** A lead the business would see: a signed-in customer who isn't the owner. */
const REAL_LEAD = 'l.user_id IS NOT NULL AND l.user_id <> pr.user_id';
/** A customer action on a business. Search appearances are passive, so they don't count. */
const REAL_INTERACTION = `(e.user_id IS NULL OR e.user_id <> pr.user_id) AND e.event_type <> 'search_appearance'`;
/** The newest conversation between the lead's customer and the business. */
const LEAD_CONVERSATION_SQL = `(
  SELECT c.id FROM conversations c
    JOIN conversation_participants a ON a.conversation_id = c.id AND a.role = 'provider' AND a.user_id = pr.user_id
    JOIN conversation_participants b ON b.conversation_id = c.id AND b.role = 'customer' AND b.user_id = l.user_id
   ORDER BY c.last_message_at DESC NULLS LAST LIMIT 1)`;

const IST_DAY = (col: string) =>
  `to_char(${col} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;

/** Collects positional parameters for a raw query. */
class Params {
  readonly values: unknown[] = [];
  add(v: unknown) {
    this.values.push(v);
    return `$${this.values.length}`;
  }
}

/**
 * The admin's Leads screen: how customers interact with businesses, and what
 * businesses do with the leads that come of it (checked, unlocked, paid).
 */
@Injectable()
export class AdminLeadsService {
  private readonly logger = new Logger(AdminLeadsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly analytics: AnalyticsService,
  ) {}

  private assertAdmin(user: any) {
    if ((ROLE_HIERARCHY[user.role] ?? 0) < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private since(period: LeadPeriod = '30d'): Date | null {
    const days = PERIOD_DAYS[period];
    return days == null ? null : new Date(Date.now() - days * 86_400_000);
  }

  async overview(admin: any, period: LeadPeriod = '30d') {
    this.assertAdmin(admin);
    const since = this.since(period);
    const q = <T = any>(sql: string, params: unknown[] = [since]) =>
      this.dataSource.query<T[]>(sql, params);
    const inPeriod = (col: string) =>
      `($1::timestamptz IS NULL OR ${col} >= $1::timestamptz)`;

    const pairsCte = `pairs AS (
      SELECT DISTINCT e.provider_id, e.user_id FROM provider_analytics_events e
        JOIN providers pr ON pr.id = e.provider_id
       WHERE e.user_id IS NOT NULL AND ${REAL_INTERACTION} AND ${inPeriod('e.created_at')})`;

    // The daily chart covers the period (the last 90 days for "all").
    const days = PERIOD_DAYS[period] ?? 90;
    const chartSince = new Date(Date.now() - days * 86_400_000);

    const [
      [demand],
      [funnel],
      [revenue],
      methods,
      tiers,
      sources,
      interactions,
      topBusinesses,
      dailyInteractions,
      dailyLeads,
      dailyRevenue,
    ] = await Promise.all([
      q(`WITH ${pairsCte}
         SELECT count(*)::int AS interested,
                count(DISTINCT provider_id)::int AS businesses,
                count(DISTINCT provider_id) FILTER (
                  WHERE NOT EXISTS (SELECT 1 FROM provider_leads l WHERE l.provider_id = pairs.provider_id)
                )::int AS "neverOpened"
           FROM pairs`),
      q(`SELECT
           count(*) FILTER (WHERE ${inPeriod('l.last_seen_at')})::int AS leads,
           count(*) FILTER (WHERE l.last_viewed_at IS NOT NULL AND ${inPeriod('l.last_viewed_at')})::int AS checked,
           count(*) FILTER (WHERE l.is_unlocked AND ($1::timestamptz IS NULL OR l.unlocked_at >= $1::timestamptz))::int AS unlocked,
           count(*) FILTER (WHERE l.unlock_method = 'paid' AND ${inPeriod('l.unlocked_at')})::int AS paid,
           count(*) FILTER (WHERE NOT l.is_unlocked AND l.tier = 'hot' AND ${inPeriod('l.last_seen_at')})::int AS "hotLocked"
         FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
         WHERE ${REAL_LEAD}`),
      q(`SELECT coalesce(sum(amount) FILTER (WHERE status = 'succeeded'), 0)::float AS amount,
                count(*) FILTER (WHERE status = 'succeeded')::int AS payments,
                count(DISTINCT provider_id) FILTER (WHERE status = 'succeeded')::int AS payers,
                count(*) FILTER (WHERE status IN ('pending', 'processing'))::int AS pending,
                count(*) FILTER (WHERE status = 'failed')::int AS failed
           FROM payments WHERE type = 'lead_unlock' AND ${inPeriod('created_at')}`),
      q(`SELECT coalesce(l.unlock_method, 'unknown') AS method, count(*)::int AS count
           FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
          WHERE ${REAL_LEAD} AND l.is_unlocked AND ($1::timestamptz IS NULL OR l.unlocked_at >= $1::timestamptz)
          GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT l.tier, count(*)::int AS leads,
                count(*) FILTER (WHERE l.first_viewed_at IS NOT NULL)::int AS checked,
                count(*) FILTER (WHERE l.is_unlocked)::int AS unlocked,
                count(*) FILTER (WHERE l.unlock_method = 'paid')::int AS paid
           FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
          WHERE ${REAL_LEAD} AND ${inPeriod('l.last_seen_at')}
          GROUP BY 1`),
      q(`SELECT coalesce(l.source::text, 'unknown') AS source, count(*)::int AS leads,
                count(*) FILTER (WHERE l.is_unlocked)::int AS unlocked
           FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
          WHERE ${REAL_LEAD} AND ${inPeriod('l.last_seen_at')}
          GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT e.event_type AS "eventType", count(*)::int AS events,
                count(DISTINCT e.user_id)::int AS customers,
                count(DISTINCT e.provider_id)::int AS businesses
           FROM provider_analytics_events e JOIN providers pr ON pr.id = e.provider_id
          WHERE ${REAL_INTERACTION} AND ${inPeriod('e.created_at')}
          GROUP BY 1 ORDER BY 2 DESC`),
      q(`WITH ${pairsCte},
         demand AS (SELECT provider_id, count(*)::int AS interested FROM pairs GROUP BY 1),
         ls AS (
           SELECT l.provider_id, count(*)::int AS leads,
                  count(*) FILTER (WHERE l.tier = 'hot')::int AS hot,
                  count(*) FILTER (WHERE l.first_viewed_at IS NOT NULL)::int AS checked,
                  count(*) FILTER (WHERE l.is_unlocked)::int AS unlocked,
                  count(*) FILTER (WHERE l.unlock_method = 'paid')::int AS paid,
                  max(l.last_viewed_at) AS "lastCheckedAt"
             FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
            WHERE ${REAL_LEAD} AND ${inPeriod('l.last_seen_at')}
            GROUP BY 1),
         rev AS (
           SELECT provider_id, sum(amount)::float AS revenue FROM payments
            WHERE type = 'lead_unlock' AND status = 'succeeded' AND ${inPeriod('created_at')}
            GROUP BY 1)
         SELECT pr.id, pr.brand_name AS "brandName", pr.city, pr.slug, pr.profile_photo_url AS "photoUrl",
                coalesce(d.interested, 0) AS interested, coalesce(ls.leads, 0) AS leads, coalesce(ls.hot, 0) AS hot,
                coalesce(ls.checked, 0) AS checked, coalesce(ls.unlocked, 0) AS unlocked, coalesce(ls.paid, 0) AS paid,
                ls."lastCheckedAt", coalesce(rev.revenue, 0) AS revenue
           FROM demand d
           FULL JOIN ls ON ls.provider_id = d.provider_id
           JOIN providers pr ON pr.id = coalesce(d.provider_id, ls.provider_id)
           LEFT JOIN rev ON rev.provider_id = pr.id
          ORDER BY interested DESC, leads DESC, revenue DESC
          LIMIT 10`),
      q(
        `SELECT ${IST_DAY('e.created_at')} AS day, count(*)::int AS interactions,
                count(DISTINCT e.user_id)::int AS customers
           FROM provider_analytics_events e JOIN providers pr ON pr.id = e.provider_id
          WHERE ${REAL_INTERACTION} AND e.created_at >= $1
          GROUP BY 1`,
        [chartSince],
      ),
      q(
        `SELECT day, sum(checked)::int AS checked, sum(unlocked)::int AS unlocked, sum(paid)::int AS paid FROM (
           SELECT ${IST_DAY('l.first_viewed_at')} AS day, 1 AS checked, 0 AS unlocked, 0 AS paid
             FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
            WHERE ${REAL_LEAD} AND l.first_viewed_at >= $1
           UNION ALL
           SELECT ${IST_DAY('l.unlocked_at')}, 0, 1, (l.unlock_method = 'paid')::int
             FROM provider_leads l JOIN providers pr ON pr.id = l.provider_id
            WHERE ${REAL_LEAD} AND l.unlocked_at >= $1
         ) x GROUP BY 1`,
        [chartSince],
      ),
      q(
        `SELECT ${IST_DAY('created_at')} AS day, sum(amount)::float AS revenue
           FROM payments WHERE type = 'lead_unlock' AND status = 'succeeded' AND created_at >= $1
          GROUP BY 1`,
        [chartSince],
      ),
    ]);

    const byDay = <T extends { day: string }>(rows: T[]) =>
      new Map(rows.map((r) => [r.day, r]));
    const di = byDay(dailyInteractions),
      dl = byDay(dailyLeads),
      dr = byDay(dailyRevenue);
    const daily: {
      date: string;
      interactions: number;
      customers: number;
      checked: number;
      unlocked: number;
      paid: number;
      revenue: number;
    }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86_400_000).toLocaleDateString(
        'en-CA',
        { timeZone: 'Asia/Kolkata' },
      );
      daily.push({
        date,
        interactions: di.get(date)?.interactions ?? 0,
        customers: di.get(date)?.customers ?? 0,
        checked: dl.get(date)?.checked ?? 0,
        unlocked: dl.get(date)?.unlocked ?? 0,
        paid: dl.get(date)?.paid ?? 0,
        revenue: dr.get(date)?.revenue ?? 0,
      });
    }

    return {
      period,
      funnel: { interested: demand.interested, ...funnel },
      demand: {
        businesses: demand.businesses,
        neverOpened: demand.neverOpened,
      },
      revenue,
      methods,
      tiers,
      sources,
      interactions,
      topBusinesses,
      daily,
    };
  }

  async list(admin: any, query: AdminLeadListQueryDto) {
    this.assertAdmin(admin);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const p = new Params();
    const where = [REAL_LEAD];

    const since = this.since(query.period ?? 'all');
    if (since) where.push(`l.last_seen_at >= ${p.add(since)}`);
    if (query.search) {
      const s = p.add(`%${query.search}%`);
      where.push(
        `(u.name ILIKE ${s} OR u.mobile_number ILIKE ${s} OR pr.brand_name ILIKE ${s})`,
      );
    }
    if (query.providerId)
      where.push(`l.provider_id = ${p.add(query.providerId)}`);
    if (query.tier) where.push(`l.tier = ${p.add(query.tier)}`);
    if (query.source) where.push(`l.source = ${p.add(query.source)}`);
    if (query.status === 'unlocked') where.push('l.is_unlocked');
    if (query.status === 'locked') where.push('NOT l.is_unlocked');
    if (query.method === 'unknown')
      where.push('l.is_unlocked AND l.unlock_method IS NULL');
    else if (query.method)
      where.push(`l.unlock_method = ${p.add(query.method)}`);
    if (query.checked === 'true') where.push('l.first_viewed_at IS NOT NULL');
    if (query.checked === 'false') where.push('l.first_viewed_at IS NULL');

    const order =
      query.sort === 'score'
        ? 'l.score DESC, l.last_seen_at DESC'
        : query.sort === 'unlocked'
          ? 'l.unlocked_at DESC NULLS LAST, l.last_seen_at DESC'
          : query.sort === 'checked'
            ? 'l.last_viewed_at DESC NULLS LAST, l.last_seen_at DESC'
            : 'l.last_seen_at DESC';

    const from = `FROM provider_leads l
      JOIN providers pr ON pr.id = l.provider_id
      JOIN users u ON u.id = l.user_id`;
    const cond = `WHERE ${where.join(' AND ')}`;
    // The page query appends LIMIT/OFFSET params; the count must not see them.
    const filterParams = [...p.values];

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query(
        `SELECT count(*)::int AS total ${from} ${cond}`,
        filterParams,
      ),
      this.dataSource.query(
        `SELECT l.*, pr.id AS pr_id, pr.brand_name, pr.city AS pr_city, pr.slug, pr.profile_photo_url,
                u.name AS u_name, u.mobile_number, u.email, u.google_email, u.city AS u_city,
                pay.amount AS pay_amount, pay.status AS pay_status, pay.metadata->>'bulk' AS pay_bulk,
                ${LEAD_CONVERSATION_SQL} AS conversation_id
         ${from} LEFT JOIN payments pay ON pay.id = l.unlock_payment_id ${cond}
         ORDER BY ${order}
         LIMIT ${p.add(limit)} OFFSET ${p.add((page - 1) * limit)}`,
        p.values,
      ),
    ]);

    return {
      items: rows.map((r: any) => this.formatLead(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async detail(admin: any, id: string) {
    this.assertAdmin(admin);
    const [row] = await this.dataSource.query(
      `SELECT l.*, pr.id AS pr_id, pr.brand_name, pr.city AS pr_city, pr.slug, pr.profile_photo_url,
              u.name AS u_name, u.mobile_number, u.email, u.google_email, u.city AS u_city,
              pay.amount AS pay_amount, pay.status AS pay_status, pay.metadata->>'bulk' AS pay_bulk,
              ${LEAD_CONVERSATION_SQL} AS conversation_id
         FROM provider_leads l
         JOIN providers pr ON pr.id = l.provider_id
         LEFT JOIN users u ON u.id = l.user_id
         LEFT JOIN payments pay ON pay.id = l.unlock_payment_id
        WHERE l.id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException('Lead not found');

    const [timeline, products] = await Promise.all([
      this.dataSource.query(
        `SELECT e.id, e.event_type AS "eventType", e.source, e.duration, e.metadata, e.entity_id AS "entityId",
                e.created_at AS "createdAt", prod.name AS "productName"
           FROM provider_analytics_events e
           LEFT JOIN products prod ON prod.id = e.entity_id AND e.event_type = 'product_view'
          WHERE e.provider_id = $1 AND ${row.user_id ? 'e.user_id = $2' : 'e.session_id = $2 AND e.user_id IS NULL'}
          ORDER BY e.created_at DESC LIMIT 100`,
        [row.provider_id, row.user_id ?? row.session_id],
      ),
      row.products_viewed?.length
        ? this.dataSource.query(
            `SELECT id, name FROM products WHERE id = ANY($1)`,
            [row.products_viewed],
          )
        : Promise.resolve([]),
    ]);

    return { ...this.formatLead(row), timeline, products };
  }

  async interactions(admin: any, query: AdminLeadInteractionQueryDto) {
    this.assertAdmin(admin);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const p = new Params();
    const where = [
      query.eventType
        ? `(e.user_id IS NULL OR e.user_id <> pr.user_id) AND e.event_type = ${p.add(query.eventType)}`
        : REAL_INTERACTION,
    ];
    const since = this.since(query.period ?? '30d');
    if (since) where.push(`e.created_at >= ${p.add(since)}`);
    if (query.providerId)
      where.push(`e.provider_id = ${p.add(query.providerId)}`);
    if (query.registered === 'true') where.push('e.user_id IS NOT NULL');
    if (query.registered === 'false') where.push('e.user_id IS NULL');
    if (query.search) {
      const s = p.add(`%${query.search}%`);
      where.push(
        `(u.name ILIKE ${s} OR u.mobile_number ILIKE ${s} OR pr.brand_name ILIKE ${s})`,
      );
    }

    const from = `FROM provider_analytics_events e
      JOIN providers pr ON pr.id = e.provider_id
      LEFT JOIN users u ON u.id = e.user_id`;
    const cond = `WHERE ${where.join(' AND ')}`;
    // The page query appends LIMIT/OFFSET params; the count must not see them.
    const filterParams = [...p.values];

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query(
        `SELECT count(*)::int AS total ${from} ${cond}`,
        filterParams,
      ),
      this.dataSource.query(
        `SELECT e.id, e.event_type AS "eventType", e.source, e.duration, e.metadata, e.created_at AS "createdAt",
                pr.id AS "providerId", pr.brand_name AS "brandName", pr.city AS "providerCity",
                u.id AS "userId", u.name AS "userName", u.mobile_number AS "userMobile",
                prod.name AS "productName", l.id AS "leadId", l.tier AS "leadTier", l.is_unlocked AS "leadUnlocked"
         ${from}
         LEFT JOIN products prod ON prod.id = e.entity_id AND e.event_type = 'product_view'
         LEFT JOIN provider_leads l ON l.provider_id = e.provider_id AND l.visitor_key = e.user_id::text
         ${cond}
         ORDER BY e.created_at DESC
         LIMIT ${p.add(limit)} OFFSET ${p.add((page - 1) * limit)}`,
        p.values,
      ),
    ]);

    return {
      items: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Leads are scored when a business opens its leads screen. Rescoring fills
   * them in for businesses that haven't, so the admin sees every lead.
   */
  async rescore(admin: any, providerId?: string) {
    this.assertAdmin(admin);
    const ids: string[] = providerId
      ? [providerId]
      : (
          await this.dataSource.query<{ provider_id: string }[]>(
            `SELECT DISTINCT provider_id FROM provider_analytics_events
              WHERE created_at >= now() - interval '30 days' AND user_id IS NOT NULL`,
          )
        ).map((r) => r.provider_id);
    let failed = 0;
    for (const id of ids) {
      await this.analytics.computeLeads(id, 30).catch((e) => {
        failed++;
        this.logger.warn(`Lead rescore failed for ${id}: ${e?.message}`);
      });
    }
    return { businesses: ids.length, failed };
  }

  private formatLead(r: any) {
    return {
      id: r.id,
      tier: r.tier,
      score: r.score,
      source: r.source,
      searchQuery: r.search_query,
      actionsPerformed: r.actions_performed ?? [],
      productsViewedCount: r.products_viewed?.length ?? 0,
      totalDuration: r.total_duration,
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      isUnlocked: r.is_unlocked,
      unlockedAt: r.unlocked_at,
      unlockMethod: r.is_unlocked ? (r.unlock_method ?? 'unknown') : null,
      payment: r.unlock_payment_id
        ? {
            id: r.unlock_payment_id,
            amount: r.pay_amount != null ? Number(r.pay_amount) : null,
            status: r.pay_status,
            bulk: r.pay_bulk === 'true',
          }
        : null,
      firstViewedAt: r.first_viewed_at,
      lastViewedAt: r.last_viewed_at,
      viewCount: r.view_count ?? 0,
      conversationId: r.conversation_id ?? null,
      provider: {
        id: r.pr_id,
        brandName: r.brand_name,
        city: r.pr_city,
        slug: r.slug,
        photoUrl: r.profile_photo_url,
      },
      customer: r.user_id
        ? {
            id: r.user_id,
            name: r.u_name,
            mobileNumber: r.mobile_number,
            email: r.email ?? r.google_email,
            city: r.u_city,
          }
        : null,
    };
  }
}
