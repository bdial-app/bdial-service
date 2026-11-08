import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { hasSignedIn, notInternal } from '../audience/audience.sql';
import { AdminService } from './admin.service';
import type { DashboardPeriodQueryDto } from './dto/dashboard-period.dto';

export type DashboardGranularity = 'day' | 'week' | 'month';

type Row = Record<string, unknown>;
type Query = (sql: string, params?: unknown[]) => Promise<Row[]>;

/** Rows created inside [$1, $2) — both bounds timestamptz, so indexes still apply. */
const IN = (col: string) =>
  `${col}::timestamptz >= $1::timestamptz AND ${col}::timestamptz < $2::timestamptz`;

/**
 * Everything the dashboard counts over a period. Each figure is "rows created
 * in the range"; definitions match the all-time dashboard figures so a range
 * reads as a slice of them.
 */
const TOTALS_SQL = `SELECT
  (SELECT count(*) FROM users u WHERE ${IN('u.created_at')})::int AS "newUsers",
  (SELECT count(*) FROM users u WHERE ${IN('u.created_at')} AND ${hasSignedIn('u')} AND ${notInternal('u')})::int AS "signedInUsers",
  (SELECT count(*) FROM providers p WHERE p.deleted_at IS NULL AND ${IN('p.created_at')})::int AS "newProviders",
  (SELECT count(*) FROM products pr WHERE ${IN('pr.created_at')})::int AS "newProducts",
  (SELECT count(*) FROM reviews r WHERE ${IN('r.posted_at')})::int AS "reviews",
  (SELECT count(*) FROM search_logs s WHERE ${IN('s.created_at')})::int AS "searches",
  (SELECT count(*) FROM provider_leads l WHERE ${IN('l.created_at')})::int AS "leads",
  (SELECT count(*) FROM conversations c WHERE ${IN('c.created_at')})::int AS "conversations",
  (SELECT count(*) FROM messages m WHERE ${IN('m.created_at')})::int AS "messages",
  (SELECT count(*) FROM app_invites i WHERE ${IN('i.created_at')})::int AS "invites",
  (SELECT count(*) FROM reports rp WHERE ${IN('rp.created_at')})::int AS "reports",
  (SELECT COALESCE(SUM(pay.amount), 0)::int FROM payments pay WHERE pay.status = 'succeeded' AND ${IN('pay.created_at')}) AS "revenue",
  (SELECT count(*) FROM payments pay WHERE pay.status = 'succeeded' AND ${IN('pay.created_at')})::int AS "payments",
  (SELECT count(*) FROM ad_events a WHERE a.event_type = 'impression' AND ${IN('a.created_at')})::int AS "adImpressions",
  (SELECT count(*) FROM ad_events a WHERE a.event_type = 'click' AND ${IN('a.created_at')})::int AS "adClicks",
  (SELECT count(*) FROM notifications n WHERE ${IN('n.created_at')})::int AS "notificationsSent",
  (SELECT count(*) FROM notifications n WHERE n.is_read AND ${IN('n.created_at')})::int AS "notificationsRead",
  (SELECT count(*) FROM notification_batches nb WHERE nb.status = 'sent' AND ${IN('COALESCE(nb.sent_at, nb.created_at)')})::int AS "batchesSent"`;

const TOTAL_KEYS = [
  'newUsers',
  'signedInUsers',
  'newProviders',
  'newProducts',
  'reviews',
  'searches',
  'leads',
  'conversations',
  'messages',
  'invites',
  'reports',
  'revenue',
  'payments',
  'adImpressions',
  'adClicks',
  'notificationsSent',
  'notificationsRead',
  'batchesSent',
] as const;

export type DashboardPeriodTotals = Record<(typeof TOTAL_KEYS)[number], number>;

/** The charted series, one count per bucket. */
const SERIES: Record<string, string> = {
  users: `SELECT 'users' AS k, created_at::timestamptz AS at FROM users WHERE ${IN('created_at')}`,
  providers: `SELECT 'providers', created_at::timestamptz FROM providers WHERE deleted_at IS NULL AND ${IN('created_at')}`,
  searches: `SELECT 'searches', created_at::timestamptz FROM search_logs WHERE ${IN('created_at')}`,
  reports: `SELECT 'reports', created_at::timestamptz FROM reports WHERE ${IN('created_at')}`,
  leads: `SELECT 'leads', created_at::timestamptz FROM provider_leads WHERE ${IN('created_at')}`,
  conversations: `SELECT 'conversations', created_at::timestamptz FROM conversations WHERE ${IN('created_at')}`,
};

const istToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** `ymd` shifted by `days` calendar days. */
const shiftYmd = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const diffDays = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

/** Midnight IST at the start of `ymd`, as a timestamptz literal. */
const istMidnight = (ymd: string) => `${ymd}T00:00:00+05:30`;

/**
 * The admin dashboard over a chosen period: totals, the same totals for the
 * period just before (to compare), lead tiers, cities and the trend series.
 */
@Injectable()
export class DashboardPeriodService {
  constructor(
    private readonly db: DataSource,
    private readonly admin: AdminService,
  ) {}

  /**
   * One transaction with the session clock on UTC: some tables' created_at is
   * a plain timestamp holding UTC, and `col::timestamptz` only reads it right
   * under UTC (see audience.sql.ts).
   */
  private withUtc<T>(fn: (q: Query) => Promise<T>): Promise<T> {
    return this.db.transaction(async (m) => {
      await m.query(`SET LOCAL TIME ZONE 'UTC'`);
      return fn((sql, params) => m.query(sql, params));
    });
  }

  async get(actor: any, query: DashboardPeriodQueryDto) {
    this.admin.assertAdmin(actor);
    const to = query.to ?? istToday();
    if (query.from && query.from > to)
      throw new BadRequestException('from must not be after to');

    return this.withUtc(async (q) => {
      const allTime = !query.from;
      // All time starts on the first day anyone or any business joined.
      let from = query.from;
      if (!from) {
        const [first] = await q(
          `SELECT to_char((LEAST(
             (SELECT min(created_at::timestamptz) FROM users),
             (SELECT min(created_at::timestamptz) FROM providers)
           ) AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS d`,
        );
        from = typeof first?.d === 'string' ? first.d : to;
      }
      const start = from > to ? to : from;
      const days = diffDays(start, to) + 1;
      const granularity: DashboardGranularity =
        days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';

      // All time counts everything, including rows older than the first user.
      const lower = allTime ? '-infinity' : istMidnight(start);
      const upper = istMidnight(shiftYmd(to, 1));
      const bounds = [lower, upper];

      const totals = await this.totals(q, bounds);

      let previous: {
        from: string;
        to: string;
        totals: DashboardPeriodTotals;
      } | null = null;
      if (query.compare === 'true' && !allTime) {
        const prevTo = shiftYmd(start, -1);
        const prevFrom = shiftYmd(prevTo, -(days - 1));
        previous = {
          from: prevFrom,
          to: prevTo,
          totals: await this.totals(q, [
            istMidnight(prevFrom),
            istMidnight(start),
          ]),
        };
      }

      const tiers = await q(
        `SELECT tier::text AS tier, count(*)::int AS count FROM provider_leads l WHERE ${IN('l.created_at')} GROUP BY 1`,
        bounds,
      );
      const tier = (t: string) =>
        Number(tiers.find((r) => r.tier === t)?.count ?? 0);

      const topCities = await q(
        `SELECT initcap(trim(p.city)) AS city, count(*)::int AS count FROM providers p
         WHERE p.deleted_at IS NULL AND NULLIF(trim(p.city), '') IS NOT NULL
           AND p.status IN ('active', 'unverified') AND ${IN('p.created_at')}
         GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 8`,
        bounds,
      );

      // Every bucket in the range, zero-filled, so quiet days still show.
      const keys = Object.keys(SERIES);
      const seriesRows = await q(
        `WITH buckets AS (
           SELECT b::date AS bucket
           FROM generate_series(date_trunc($3::text, $4::date::timestamp), date_trunc($3::text, $5::date::timestamp), ('1 ' || $3::text)::interval) b
         ),
         ev AS (${keys.map((k) => SERIES[k]).join('\n UNION ALL ')}),
         agg AS (
           SELECT k, date_trunc($3::text, at AT TIME ZONE 'Asia/Kolkata')::date AS bucket, count(*)::int AS n
           FROM ev GROUP BY 1, 2
         )
         SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket,
                ${keys.map((k) => `COALESCE(SUM(a.n) FILTER (WHERE a.k = '${k}'), 0)::int AS "${k}"`).join(',\n ')}
         FROM buckets b LEFT JOIN agg a ON a.bucket = b.bucket
         GROUP BY b.bucket ORDER BY b.bucket`,
        [...bounds, granularity, start, to],
      );

      return {
        range: { from: start, to, days, granularity, allTime },
        totals,
        previous,
        leadBreakdown: {
          hot: tier('hot'),
          warm: tier('warm'),
          cold: tier('cold'),
        },
        topCities: topCities.map((r) => ({
          city: String(r.city),
          count: Number(r.count),
        })),
        series: seriesRows.map((r) => ({
          bucket: String(r.bucket),
          ...Object.fromEntries(keys.map((k) => [k, Number(r[k] ?? 0)])),
        })),
      };
    });
  }

  private async totals(
    q: Query,
    bounds: string[],
  ): Promise<DashboardPeriodTotals> {
    const [row] = await q(TOTALS_SQL, bounds);
    return Object.fromEntries(
      TOTAL_KEYS.map((k) => [k, Number(row?.[k] ?? 0)]),
    ) as DashboardPeriodTotals;
  }
}
