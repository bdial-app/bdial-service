import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  TZ,
  activityCtes,
  hasSignedIn,
  local,
  notInternal,
} from './audience.sql';

const n = (v: unknown) => Number(v ?? 0);

/** Percentage with one decimal; null when there is nothing to divide by. */
const pct = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : null;

export const clampDays = (d?: number | string) =>
  Math.min(90, Math.max(7, Math.floor(Number(d) || 30)));

export const clampWeeks = (w?: number | string) =>
  Math.min(12, Math.max(4, Math.floor(Number(w) || 8)));

/** Midnight IST, (days - 1) days ago, as timestamptz. Expects days in $1. */
const PERIOD_START = `((date_trunc('day', ${local('now()')}) - make_interval(days => $1::int - 1)) AT TIME ZONE '${TZ}')`;

/** Today's IST date list for the period, oldest first. Expects days in $1. */
const PERIOD_DAYS = `
days AS (
  SELECT d::date AS day
    FROM generate_series(
      date_trunc('day', ${local('now()')}) - make_interval(days => $1::int - 1),
      date_trunc('day', ${local('now()')}),
      interval '1 day'
    ) d
)`;

/** The 15-minute window an instant falls in. IST is UTC+5:30, so these align. */
const BUCKET = `to_timestamp(floor(extract(epoch FROM at) / 900) * 900)`;

const CONTACT_EVENTS = ['chat_initiated', 'call_clicked', 'direction_clicked'];

/** A raw result row: every column is read through n() or String(). */
type Row = Record<string, unknown>;
type Query = (sql: string, params?: unknown[]) => Promise<Row[]>;

@Injectable()
export class AudienceService {
  constructor(private readonly db: DataSource) {}

  /** Runs queries in one transaction with the session clock on UTC; see audience.sql.ts. */
  private withUtc<T>(fn: (q: Query) => Promise<T>): Promise<T> {
    return this.db.transaction(async (m) => {
      await m.query(`SET LOCAL TIME ZONE 'UTC'`);
      return fn((sql, params) => m.query(sql, params));
    });
  }

  /**
   * Right now. "Online" is the chat heartbeat, sent every 60s by a signed-in
   * app on its home screen — so it is exact, but only for signed-in people.
   * The wider windows add anyone who did something, signed in or not.
   */
  async live() {
    return this.withUtc(async (q) => {
      const [r] = await q(`
        WITH ${activityCtes(`now() - interval '24 hours'`)},
        hb AS (
          SELECT 'u:' || u.id::text AS actor, u.last_seen_at AS at
            FROM users u
           WHERE u.last_seen_at >= now() - interval '24 hours' AND ${notInternal('u')}
        ),
        everyone AS (SELECT actor, at FROM actors UNION ALL SELECT actor, at FROM hb)
        SELECT
          (SELECT COUNT(*) FROM hb WHERE at >= now() - interval '2 minutes') AS online_now,
          COUNT(DISTINCT actor) FILTER (WHERE at >= now() - interval '15 minutes') AS active_15m,
          COUNT(DISTINCT actor) FILTER (WHERE at >= now() - interval '1 hour') AS active_1h,
          COUNT(DISTINCT actor) AS active_24h,
          COUNT(DISTINCT actor) FILTER (WHERE actor LIKE 's:%' AND at >= now() - interval '1 hour') AS visitors_1h
        FROM everyone`);
      return {
        onlineNow: n(r.online_now),
        active15m: n(r.active_15m),
        active1h: n(r.active_1h),
        active24h: n(r.active_24h),
        visitors1h: n(r.visitors_1h),
        asOf: new Date().toISOString(),
      };
    });
  }

  async overview(daysIn?: number | string) {
    const days = clampDays(daysIn);
    return this.withUtc(async (q) => {
      const daily: Array<Record<string, unknown>> = await q(
        `
        WITH ${activityCtes(PERIOD_START)}, ${PERIOD_DAYS},
        per_bucket AS (
          SELECT date_trunc('day', ${local('at')})::date AS day, ${BUCKET} AS bucket,
                 COUNT(DISTINCT actor) AS c
            FROM actors GROUP BY 1, 2
        ),
        per_day AS (
          SELECT date_trunc('day', ${local('at')})::date AS day,
                 COUNT(DISTINCT actor) FILTER (WHERE actor LIKE 'u:%') AS users,
                 COUNT(DISTINCT actor) FILTER (WHERE actor LIKE 's:%') AS visitors
            FROM actors GROUP BY 1
        ),
        signups AS (
          SELECT date_trunc('day', ${local('u.created_at::timestamptz')})::date AS day, COUNT(*) AS c
            FROM users u
           WHERE u.created_at::timestamptz >= ${PERIOD_START} AND ${notInternal('u')} AND ${hasSignedIn('u')}
           GROUP BY 1
        )
        SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
               COALESCE(pd.users, 0) AS users,
               COALESCE(pd.visitors, 0) AS visitors,
               COALESCE((SELECT MAX(c) FROM per_bucket pb WHERE pb.day = days.day), 0) AS peak15,
               COALESCE(s.c, 0) AS signups
          FROM days
          LEFT JOIN per_day pd ON pd.day = days.day
          LEFT JOIN signups s ON s.day = days.day
         ORDER BY days.day`,
        [days],
      );

      const [c] = await q(
        `
        WITH ${activityCtes(PERIOD_START)},
        per_bucket AS (SELECT ${BUCKET} AS bucket, COUNT(DISTINCT actor) AS c FROM actors GROUP BY 1),
        peak AS (SELECT bucket, c FROM per_bucket ORDER BY c DESC, bucket DESC LIMIT 1),
        new_users AS (
          SELECT u.id, u.created_at::timestamptz AS joined
            FROM users u
           WHERE u.created_at::timestamptz >= ${PERIOD_START} AND ${notInternal('u')} AND ${hasSignedIn('u')}
        )
        SELECT
          (SELECT COUNT(DISTINCT actor) FROM actors WHERE actor LIKE 'u:%') AS active_users,
          (SELECT COUNT(DISTINCT actor) FROM actors WHERE actor LIKE 's:%') AS visitors,
          (SELECT COALESCE(SUM(c), 0) FROM per_bucket) AS bucket_sum,
          GREATEST(1, floor(extract(epoch FROM now() - ${PERIOD_START}) / 900)) AS bucket_count,
          (SELECT c FROM peak) AS peak_c,
          (SELECT bucket FROM peak) AS peak_at,
          (SELECT COUNT(*) FROM new_users) AS new_users,
          (SELECT COUNT(DISTINCT n.id) FROM new_users n
             JOIN actors a ON a.user_id = n.id AND a.at >= n.joined) AS activated,
          (SELECT COUNT(DISTINCT a.user_id) FROM actors a
             JOIN users u ON u.id = a.user_id
            WHERE u.created_at::timestamptz < ${PERIOD_START}) AS returning_active,
          (SELECT COUNT(*) FROM users u WHERE ${notInternal('u')} AND ${hasSignedIn('u')}) AS total_users,
          (SELECT COUNT(*) FROM users u WHERE ${notInternal('u')} AND NOT ${hasSignedIn('u')}) AS unclaimed`,
        [days],
      );

      // Fixed 30-day window, whatever period is picked. The heartbeat counts
      // here: a last-seen inside the window is a real visit, even one that
      // touched no business. It cannot help the daily history above, because
      // it only remembers each person's latest visit.
      const [s] = await q(`
        WITH ${activityCtes(`now() - interval '30 days'`)},
        hb AS (
          SELECT 'u:' || u.id::text AS actor, u.last_seen_at AS at
            FROM users u
           WHERE u.last_seen_at >= now() - interval '30 days' AND ${notInternal('u')}
        ),
        everyone AS (SELECT actor, at FROM actors UNION ALL SELECT actor, at FROM hb),
        today AS (SELECT (date_trunc('day', ${local('now()')}) AT TIME ZONE '${TZ}') AS t)
        SELECT
          COUNT(DISTINCT actor) FILTER (WHERE actor LIKE 'u:%' AND at >= (SELECT t FROM today)) AS dau,
          COUNT(DISTINCT actor) FILTER (WHERE actor LIKE 'u:%' AND at >= now() - interval '7 days') AS wau,
          COUNT(DISTINCT actor) FILTER (WHERE actor LIKE 'u:%') AS mau,
          (SELECT COUNT(*) FROM (
             SELECT DISTINCT date_trunc('day', ${local('at')}), actor FROM actors WHERE actor LIKE 'u:%'
           ) x) AS user_days_30,
          (SELECT COUNT(DISTINCT actor) FROM actors WHERE actor LIKE 'u:%') AS mau_events
        FROM everyone`);

      const heat: Array<Record<string, unknown>> = await q(
        `
        WITH ${activityCtes(PERIOD_START)},
        cells AS (SELECT DISTINCT date_trunc('hour', ${local('at')}) AS h, actor FROM actors)
        SELECT extract(isodow FROM h)::int AS dow, extract(hour FROM h)::int AS hour,
               COUNT(*) AS actor_hours
          FROM cells GROUP BY 1, 2`,
        [days],
      );

      const series = daily.map((d) => ({
        day: String(d.day),
        users: n(d.users),
        visitors: n(d.visitors),
        peak15: n(d.peak15),
        signups: n(d.signups),
      }));
      const mean = (k: 'users' | 'visitors') =>
        Math.round(
          (series.reduce((t, d) => t + d[k], 0) / Math.max(1, series.length)) *
            10,
        ) / 10;

      // Each weekday's cell is averaged over how many of that weekday the period held.
      const weekdayCount = new Map<number, number>();
      for (const d of series) {
        const dow = ((new Date(`${d.day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // ISO: Mon=1
        weekdayCount.set(dow, (weekdayCount.get(dow) ?? 0) + 1);
      }
      const heatmap = heat.map((h) => ({
        dow: n(h.dow),
        hour: n(h.hour),
        avgActive:
          Math.round(
            (n(h.actor_hours) / Math.max(1, weekdayCount.get(n(h.dow)) ?? 1)) *
              10,
          ) / 10,
      }));

      const mauEvents = n(s.mau_events);
      return {
        days,
        summary: {
          activeUsers: n(c.active_users),
          visitors: n(c.visitors),
          avgDailyUsers: mean('users'),
          avgDailyVisitors: mean('visitors'),
          dau: n(s.dau),
          wau: n(s.wau),
          mau: n(s.mau),
          // Average day's users as a share of the month's users, both from
          // activity so the two sides measure the same thing.
          stickiness: pct(n(s.user_days_30) / 30, mauEvents),
          peakConcurrent: n(c.peak_c),
          peakConcurrentAt: c.peak_at
            ? new Date(c.peak_at as string).toISOString()
            : null,
          avgConcurrent:
            Math.round((n(c.bucket_sum) / n(c.bucket_count)) * 100) / 100,
          newUsers: n(c.new_users),
          activationRate: pct(n(c.activated), n(c.new_users)),
          returningShare: pct(n(c.returning_active), n(c.active_users)),
          totalUsers: n(c.total_users),
          // Made by an admin or the bulk import and never signed into since.
          unclaimedAccounts: n(c.unclaimed),
        },
        daily: series,
        heatmap,
      };
    });
  }

  /** Of each week's sign-ups, how many came back in the weeks after. */
  async retention(weeksIn?: number | string) {
    const weeks = clampWeeks(weeksIn);
    return this.withUtc(async (q) => {
      const cohortStart = `((date_trunc('week', ${local('now()')}) - make_interval(weeks => $1::int - 1)) AT TIME ZONE '${TZ}')`;
      const rows: Array<Record<string, unknown>> = await q(
        `
        WITH ${activityCtes(cohortStart)},
        cohorts AS (
          SELECT u.id, date_trunc('week', ${local('u.created_at::timestamptz')})::date AS week
            FROM users u
           WHERE u.created_at::timestamptz >= ${cohortStart} AND ${notInternal('u')} AND ${hasSignedIn('u')}
        ),
        act AS (
          SELECT DISTINCT a.user_id, date_trunc('week', ${local('a.at')})::date AS week
            FROM actors a WHERE a.user_id IS NOT NULL
        )
        SELECT to_char(c.week, 'YYYY-MM-DD') AS cohort,
               COUNT(DISTINCT c.id) AS size,
               COUNT(DISTINCT c.id) FILTER (WHERE act.week = c.week) AS w0,
               COUNT(DISTINCT c.id) FILTER (WHERE act.week = c.week + 7) AS w1,
               COUNT(DISTINCT c.id) FILTER (WHERE act.week = c.week + 14) AS w2,
               COUNT(DISTINCT c.id) FILTER (WHERE act.week = c.week + 21) AS w3,
               COUNT(DISTINCT c.id) FILTER (WHERE act.week = c.week + 28) AS w4,
               to_char(date_trunc('week', ${local('now()')}), 'YYYY-MM-DD') AS this_week
          FROM cohorts c
          LEFT JOIN act ON act.user_id = c.id
         GROUP BY c.week
         ORDER BY c.week`,
        [weeks],
      );
      return {
        weeks,
        cohorts: rows.map((r) => {
          const size = n(r.size);
          const ageWeeks = Math.round(
            (Date.parse(String(r.this_week)) - Date.parse(String(r.cohort))) /
              (7 * 864e5),
          );
          // A week that has not happened yet is unknown, not zero.
          const at = (k: number) =>
            k > ageWeeks
              ? null
              : { users: n(r[`w${k}`]), rate: pct(n(r[`w${k}`]), size) };
          return {
            cohort: String(r.cohort),
            size,
            weeks: [0, 1, 2, 3, 4].map(at),
          };
        }),
      };
    });
  }

  /** Where active people are, what they are, and what reaches them. */
  async reach(daysIn?: number | string) {
    const days = clampDays(daysIn);
    return this.withUtc(async (q) => {
      const cities: Array<Record<string, unknown>> = await q(
        `
        WITH ${activityCtes(PERIOD_START)},
        active AS (SELECT DISTINCT a.user_id FROM actors a WHERE a.user_id IS NOT NULL)
        SELECT COALESCE(NULLIF(initcap(lower(trim(u.city))), ''), 'Unknown') AS city,
               COUNT(*) AS users
          FROM active JOIN users u ON u.id = active.user_id
         GROUP BY 1 ORDER BY users DESC LIMIT 12`,
        [days],
      );
      const [kind] = await q(
        `
        WITH ${activityCtes(PERIOD_START)},
        active AS (SELECT DISTINCT a.user_id FROM actors a WHERE a.user_id IS NOT NULL)
        SELECT COUNT(*) FILTER (WHERE p.id IS NULL) AS customers,
               COUNT(*) FILTER (WHERE p.id IS NOT NULL) AS business_owners
          FROM active LEFT JOIN providers p ON p.user_id = active.user_id`,
        [days],
      );
      const platforms: Array<Record<string, unknown>> = await q(
        `
        WITH ${activityCtes(PERIOD_START)},
        active AS (SELECT DISTINCT a.user_id FROM actors a WHERE a.user_id IS NOT NULL),
        tok AS (
          SELECT DISTINCT dt.user_id, dt.platform::text AS platform
            FROM device_tokens dt JOIN users u ON u.id = dt.user_id
           WHERE dt.is_active AND ${notInternal('u')}
        )
        SELECT t.platform,
               COUNT(DISTINCT t.user_id) AS reachable,
               COUNT(DISTINCT t.user_id) FILTER (WHERE t.user_id IN (SELECT user_id FROM active)) AS active
          FROM tok t GROUP BY t.platform ORDER BY reachable DESC`,
        [days],
      );
      return {
        days,
        cities: cities.map((c) => ({
          city: String(c.city),
          users: n(c.users),
        })),
        customers: n(kind.customers),
        businessOwners: n(kind.business_owners),
        platforms: platforms.map((p) => ({
          platform: String(p.platform),
          pushReachable: n(p.reachable),
          activeInPeriod: n(p.active),
        })),
      };
    });
  }

  /** What advertising delivered, and what a business listing turns into. */
  async ads(daysIn?: number | string) {
    const days = clampDays(daysIn);
    const ev = `
      ev AS (
        SELECT a.event_type::text AS event_type, a.entity_type::text AS entity_type,
               a.entity_id, a.user_id, a.created_at::timestamptz AS at
          FROM ad_events a LEFT JOIN users u ON u.id = a.user_id
         WHERE a.created_at::timestamptz >= ${PERIOD_START} AND (u.id IS NULL OR ${notInternal('u')})
      )`;
    return this.withUtc(async (q) => {
      const [t] = await q(
        `
        WITH ${ev}
        SELECT COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
               COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
               COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'impression') AS reached,
               COUNT(*) FILTER (WHERE event_type = 'impression' AND user_id IS NOT NULL) AS known_impressions,
               COUNT(*) FILTER (WHERE event_type = 'impression' AND user_id IS NULL) AS anonymous_impressions,
               COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'click') AS clickers
          FROM ev`,
        [days],
      );
      const placements: Array<Record<string, unknown>> = await q(
        `
        WITH ${ev}
        SELECT entity_type,
               COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
               COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
               COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'impression') AS reached
          FROM ev GROUP BY entity_type ORDER BY impressions DESC`,
        [days],
      );
      const daily: Array<Record<string, unknown>> = await q(
        `
        WITH ${ev}, ${PERIOD_DAYS},
        per_day AS (
          SELECT date_trunc('day', ${local('at')})::date AS day,
                 COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
                 COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
            FROM ev GROUP BY 1
        )
        SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
               COALESCE(pd.impressions, 0) AS impressions, COALESCE(pd.clicks, 0) AS clicks
          FROM days LEFT JOIN per_day pd ON pd.day = days.day ORDER BY days.day`,
        [days],
      );
      const top: Array<Record<string, unknown>> = await q(
        `
        WITH ${ev}
        SELECT ev.entity_type, ev.entity_id::text AS entity_id,
               COALESCE(pb.title, po.title, p.brand_name, 'Removed') AS name,
               COUNT(*) FILTER (WHERE ev.event_type = 'impression') AS impressions,
               COUNT(*) FILTER (WHERE ev.event_type = 'click') AS clicks
          FROM ev
          LEFT JOIN promo_banners pb ON ev.entity_type = 'promo_banner' AND pb.id = ev.entity_id
          LEFT JOIN provider_offers po ON ev.entity_type = 'provider_offer' AND po.id = ev.entity_id
          LEFT JOIN sponsored_listings sl ON ev.entity_type = 'sponsored_listing' AND sl.id = ev.entity_id
          LEFT JOIN providers p ON p.id = sl.provider_id
         GROUP BY 1, 2, 3 ORDER BY impressions DESC, clicks DESC LIMIT 10`,
        [days],
      );
      const funnelRows: Array<Record<string, unknown>> = await q(
        `
        SELECT e.event_type::text AS event_type, COUNT(*) AS c,
               COUNT(DISTINCT COALESCE('u:' || e.user_id::text, 's:' || e.session_id)) AS people
          FROM provider_analytics_events e LEFT JOIN users u ON u.id = e.user_id
         WHERE e.created_at::timestamptz >= ${PERIOD_START} AND (u.id IS NULL OR ${notInternal('u')})
         GROUP BY 1`,
        [days],
      );
      const [contactors] = await q(
        `
        SELECT COUNT(DISTINCT COALESCE('u:' || e.user_id::text, 's:' || e.session_id)) AS people,
               COUNT(DISTINCT e.provider_id) AS businesses
          FROM provider_analytics_events e LEFT JOIN users u ON u.id = e.user_id
         WHERE e.created_at::timestamptz >= ${PERIOD_START} AND (u.id IS NULL OR ${notInternal('u')})
           AND e.event_type::text IN (${CONTACT_EVENTS.map((x) => `'${x}'`).join(', ')})`,
        [days],
      );

      const impressions = n(t.impressions);
      const clicks = n(t.clicks);
      const known = n(t.known_impressions);
      const reached = n(t.reached);
      const ev2 = new Map(
        funnelRows.map((r) => [String(r.event_type), n(r.c)]),
      );
      const count = (k: string) => ev2.get(k) ?? 0;
      const contacts = CONTACT_EVENTS.reduce((sum, k) => sum + count(k), 0);
      const profileViews = count('profile_view');

      return {
        days,
        totals: {
          impressions,
          clicks,
          ctr: pct(clicks, impressions),
          reachedUsers: reached,
          anonymousImpressions: n(t.anonymous_impressions),
          frequency:
            reached > 0 ? Math.round((known / reached) * 10) / 10 : null,
          clickers: n(t.clickers),
          avgDailyImpressions: Math.round((impressions / days) * 10) / 10,
        },
        placements: placements.map((p) => ({
          placement: String(p.entity_type),
          impressions: n(p.impressions),
          clicks: n(p.clicks),
          ctr: pct(n(p.clicks), n(p.impressions)),
          reachedUsers: n(p.reached),
          avgDailyImpressions: Math.round((n(p.impressions) / days) * 10) / 10,
        })),
        daily: daily.map((d) => ({
          day: String(d.day),
          impressions: n(d.impressions),
          clicks: n(d.clicks),
        })),
        topAds: top.map((a) => ({
          placement: String(a.entity_type),
          id: String(a.entity_id),
          name: String(a.name),
          impressions: n(a.impressions),
          clicks: n(a.clicks),
          ctr: pct(n(a.clicks), n(a.impressions)),
        })),
        funnel: {
          searchAppearances: count('search_appearance'),
          searchClicks: count('search_click'),
          profileViews,
          productViews: count('product_view'),
          contacts,
          chats: count('chat_initiated'),
          calls: count('call_clicked'),
          directions: count('direction_clicked'),
          saves: count('saved'),
          shares: count('share_clicked'),
          contactsPer100Views: pct(contacts, profileViews),
          peopleWhoContacted: n(contactors.people),
          businessesContacted: n(contactors.businesses),
        },
      };
    });
  }
}
