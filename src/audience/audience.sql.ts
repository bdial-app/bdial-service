/**
 * Shared SQL for audience analytics.
 *
 * There is no dedicated activity log, so "activity" is assembled from the
 * tables that already record someone doing something, with a timestamp:
 *
 *   provider_analytics_events  provider/product views, searches shown, contacts
 *                              — carries a session id, so it sees visitors who
 *                              never log in
 *   search_logs                searches
 *   ad_events                  banner / sponsored / offer impressions and clicks
 *   messages                   chat messages sent
 *
 * An "actor" is a logged-in user (u:<id>) or, failing that, an anonymous
 * session (s:<id>). A visitor who logs in mid-session counts once as each.
 *
 * Staff accounts are left out, so the team's own testing does not read as
 * traffic.
 *
 * Every query runs with the session time zone set to UTC (see
 * AudienceService.run), which makes `col::timestamptz` correct whether a
 * table's created_at was created as timestamp or timestamptz — the schema has
 * both, and the entities do not say which.
 */

export const TZ = 'Asia/Kolkata';

/** Every non-customer value of the users.role enum. */
export const INTERNAL_ROLES = [
  'admin',
  'super_admin',
  'moderator',
  'associate',
];

const internalList = INTERNAL_ROLES.map((r) => `'${r}'`).join(', ');

/** A users row (aliased `alias`) that is a real customer or business, not staff. */
export const notInternal = (alias: string) =>
  `(${alias}.role IS NULL OR ${alias}.role::text NOT IN (${internalList}))`;

/**
 * Has this account ever signed in? Accounts made by an admin or the bulk
 * provider import are inserted with neither id; an OTP or Google sign-in sets
 * one. Without this, a single bulk import reads as a day of 150 sign-ups.
 */
export const hasSignedIn = (alias: string) =>
  `(${alias}.supabase_id IS NOT NULL OR ${alias}.google_id IS NOT NULL)`;

/** Local (IST) wall-clock time of a timestamptz expression. */
export const local = (expr: string) => `(${expr} AT TIME ZONE '${TZ}')`;

/**
 * CTEs `activity` and `actors` covering everything at or after `since` (a SQL
 * expression yielding timestamptz). `actors` has columns: at, user_id, actor.
 */
export const activityCtes = (since: string) => `
activity AS (
  SELECT e.user_id, NULLIF(e.session_id, 'ssr') AS session_id, e.created_at::timestamptz AS at
    FROM provider_analytics_events e WHERE e.created_at::timestamptz >= ${since}
  UNION ALL
  SELECT s.user_id, NULL, s.created_at::timestamptz
    FROM search_logs s WHERE s.created_at::timestamptz >= ${since}
  UNION ALL
  SELECT a.user_id, NULL, a.created_at::timestamptz
    FROM ad_events a WHERE a.created_at::timestamptz >= ${since}
  UNION ALL
  SELECT m.sender_id, NULL, m.created_at::timestamptz
    FROM messages m WHERE m.created_at::timestamptz >= ${since}
),
actors AS (
  SELECT act.at,
         act.user_id,
         CASE WHEN act.user_id IS NOT NULL THEN 'u:' || act.user_id::text
              ELSE 's:' || act.session_id END AS actor
    FROM activity act
    LEFT JOIN users u ON u.id = act.user_id
   WHERE (act.user_id IS NOT NULL OR act.session_id IS NOT NULL)
     AND (u.id IS NULL OR ${notInternal('u')})
)`;
