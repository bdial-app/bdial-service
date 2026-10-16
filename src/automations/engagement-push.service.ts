import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationTemplateService } from '../notifications/notification-template.service';
import { AutomationCronService } from './automation-cron.service';

const IST = { timeZone: 'Asia/Kolkata' } as const;
const IST_OFFSET_MS = 330 * 60_000;
const MAX_ENGAGEMENT_PER_DAY = 1;
const MAX_ENGAGEMENT_PER_WEEK = 3;

const istToday = () => {
  const t = new Date(Date.now() + IST_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
};
const istMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
const monthName = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleString('en-IN', {
    month: 'long',
    timeZone: 'UTC',
  });

/**
 * Scheduled pushes that bring owners and customers back (free, in-app).
 * Each runs only when its push template is switched on in admin → Notifications,
 * and each person gets at most 1 of these a day and 3 a week.
 */
@Injectable()
export class EngagementPushService {
  private readonly logger = new Logger(EngagementPushService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dispatch: NotificationDispatchService,
    private readonly templates: NotificationTemplateService,
    private readonly stats: AutomationCronService,
  ) {}

  /** Within today's and this week's limit of engagement pushes? */
  async allowed(userId: string): Promise<boolean> {
    const [r] = await this.dataSource.query<{ day: string; week: string }[]>(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS day,
              count(*) AS week
         FROM notifications
        WHERE user_id = $1 AND data->>'kind' = 'engagement' AND created_at > now() - interval '7 days'`,
      [userId],
    );
    return (
      Number(r?.day ?? 0) < MAX_ENGAGEMENT_PER_DAY &&
      Number(r?.week ?? 0) < MAX_ENGAGEMENT_PER_WEEK
    );
  }

  /** Sent this kind to them within `days`? (e.g. boost offers once a month) */
  private async sentRecently(
    userId: string,
    slug: string,
    days: number,
  ): Promise<boolean> {
    const [r] = await this.dataSource.query<{ n: string }[]>(
      `SELECT count(*) AS n FROM notifications
        WHERE user_id = $1 AND data->>'slug' = $2 AND created_at > now() - ($3 || ' days')::interval`,
      [userId, slug, String(days)],
    );
    return Number(r?.n ?? 0) > 0;
  }

  /** Send one engagement push if they're within their limits. */
  private async send(
    userId: string,
    slug: string,
    vars: Record<string, string | number>,
    mode: 'provider' | 'customer',
    params?: Record<string, string>,
  ): Promise<boolean> {
    if (!(await this.allowed(userId))) return false;
    const strVars = Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, String(v)]),
    );
    return this.dispatch
      .sendTemplated(
        userId,
        slug,
        strVars,
        { kind: 'engagement', slug, ...(params ? { params } : {}) },
        mode,
      )
      .catch(() => false);
  }

  private async on(slug: string): Promise<boolean> {
    return this.templates.isEnabled(slug);
  }

  /** Active, owner-linked businesses (optionally only some columns). */
  private businesses() {
    return this.dataSource.query<
      {
        id: string;
        user_id: string;
        brand_name: string;
        city: string;
        women_led_status: string;
        created_at: Date;
        instagram_handle: string | null;
        website_url: string | null;
        profile_photo_url: string | null;
      }[]
    >(
      `SELECT p.id, p.user_id, p.brand_name, p.city, p.women_led_status, p.created_at, p.instagram_handle, p.website_url, p.profile_photo_url
         FROM providers p
        WHERE p.deleted_at IS NULL AND p.status = 'active'`,
    );
  }

  private async leadsWaiting(ids: string[]): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const rows = await this.dataSource.query<
      { provider_id: string; n: string }[]
    >(
      `SELECT provider_id, count(*) AS n FROM provider_leads
        WHERE provider_id = ANY($1::uuid[]) AND is_unlocked = false AND last_seen_at > now() - interval '30 days'
        GROUP BY 1`,
      [ids],
    );
    return new Map(rows.map((r) => [r.provider_id, Number(r.n)]));
  }

  // ── Owners ────────────────────────────────────────────────────────────────

  /** 1st, 10:30: free lead unlocks are back (if people are waiting). */
  @Cron('30 10 1 * *', IST)
  async freeLeadsBack(): Promise<void> {
    if (!(await this.on('free_leads_back'))) return;
    const list = await this.businesses();
    const waiting = await this.leadsWaiting(list.map((b) => b.id));
    for (const b of list) {
      const w = waiting.get(b.id) ?? 0;
      if (w < 1) continue;
      await this.send(
        b.user_id,
        'free_leads_back',
        {
          quota: b.women_led_status === 'approved' ? 8 : 5,
          waiting: w,
          brandName: b.brand_name,
        },
        'provider',
      );
    }
  }

  /** 25th, 11:00: free unlocks left and people waiting. */
  @Cron('0 11 25 * *', IST)
  async freeLeadsEnding(): Promise<void> {
    if (!(await this.on('free_leads_ending'))) return;
    const { y, m } = istToday();
    const rows = await this.dataSource.query<
      {
        id: string;
        user_id: string;
        women_led_status: string;
        used: number;
        reset_at: Date | null;
      }[]
    >(
      `SELECT id, user_id, women_led_status, free_leads_used_this_month AS used, free_leads_reset_at AS reset_at
         FROM providers WHERE deleted_at IS NULL AND status = 'active'`,
    );
    const waiting = await this.leadsWaiting(rows.map((r) => r.id));
    for (const r of rows) {
      const quota = r.women_led_status === 'approved' ? 8 : 5;
      const reset = r.reset_at
        ? new Date(new Date(r.reset_at).getTime() + IST_OFFSET_MS)
        : null;
      const used =
        reset && reset.getUTCFullYear() === y && reset.getUTCMonth() === m
          ? Number(r.used ?? 0)
          : 0;
      const left = quota - used;
      const w = waiting.get(r.id) ?? 0;
      if (left < 1 || w < 1) continue;
      await this.send(
        r.user_id,
        'free_leads_ending',
        { left, waiting: w, resetDate: `1 ${monthName(y, m + 1)}` },
        'provider',
      );
    }
  }

  /** Monday 10:30: the week in numbers, and a Boost nudge after a good week. */
  @Cron('30 10 * * 1', IST)
  async weekly(): Promise<void> {
    const [report, boost] = await Promise.all([
      this.on('weekly_report'),
      this.on('boost_good_week'),
    ]);
    if (!report && !boost) return;
    const { y, m, d } = istToday();
    const to = istMidnight(y, m, d);
    const from = istMidnight(y, m, d - 7);
    const before = istMidnight(y, m, d - 14);
    const list = await this.businesses();
    const ids = list.map((b) => b.id);
    const [now, prev] = await Promise.all([
      this.stats.activity(ids, from, to),
      this.stats.activity(ids, before, from),
    ]);
    const boostOn = boost && (await this.boostsEnabled());
    const boosted = boostOn ? await this.activelyBoosted() : new Set<string>();
    for (const b of list) {
      const a = now.get(b.id)!;
      const p = prev.get(b.id)!;
      const up =
        p.views > 0 ? Math.round(((a.views - p.views) / p.views) * 100) : 0;
      if (
        boostOn &&
        a.views >= 20 &&
        up >= 30 &&
        !boosted.has(b.id) &&
        !(await this.sentRecently(b.user_id, 'boost_good_week', 30))
      ) {
        if (
          await this.send(
            b.user_id,
            'boost_good_week',
            { views: a.views, pct: up, brandName: b.brand_name },
            'provider',
          )
        )
          continue;
      }
      if (report && (a.views >= 3 || a.enquiries >= 1)) {
        await this.send(
          b.user_id,
          'weekly_report',
          {
            brandName: b.brand_name,
            views: a.views,
            searches: a.searches,
            enquiries: a.enquiries,
          },
          'provider',
        );
      }
    }
  }

  /** Thursday 11:00: a popular search in their city that their shop doesn't match. */
  @Cron('0 11 * * 4', IST)
  async searchDemand(): Promise<void> {
    if (!(await this.on('search_demand'))) return;
    const top = await this.dataSource.query<
      { city: string; term: string; n: string }[]
    >(
      `SELECT lower(city) AS city, lower(trim(query)) AS term, count(*) AS n
         FROM search_logs
        WHERE created_at > now() - interval '7 days' AND city IS NOT NULL AND length(trim(query)) BETWEEN 3 AND 40
        GROUP BY 1, 2 HAVING count(*) >= 5
        ORDER BY 3 DESC`,
    );
    if (!top.length) return;
    const byCity = new Map<string, { term: string; n: number }[]>();
    for (const t of top) {
      const list = byCity.get(t.city) ?? [];
      if (list.length < 10) list.push({ term: t.term, n: Number(t.n) });
      byCity.set(t.city, list);
    }
    const shops = await this.dataSource.query<
      {
        id: string;
        user_id: string;
        brand_name: string;
        city: string;
        text: string;
      }[]
    >(
      `SELECT p.id, p.user_id, p.brand_name, p.city,
              lower(concat_ws(' ', p.brand_name, p.description, string_agg(pr.name, ' '), string_agg(c.name, ' '))) AS text
         FROM providers p
         LEFT JOIN products pr ON pr.provider_id = p.id AND pr.is_active
         LEFT JOIN provider_categories pc ON pc.provider_id = p.id
         LEFT JOIN categories c ON c.id = pc.category_id
        WHERE p.deleted_at IS NULL AND p.status = 'active' AND lower(p.city) = ANY($1)
        GROUP BY p.id`,
      [[...byCity.keys()]],
    );
    for (const s of shops) {
      const terms = byCity.get(s.city.toLowerCase()) ?? [];
      // A search their shop is related to (shares a word with what they sell) but doesn't list.
      const words = new Set(
        (s.text ?? '').split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      );
      const pick = terms.find(
        (t) =>
          !s.text?.includes(t.term) &&
          t.term.split(/\s+/).some((w) => words.has(w)),
      );
      if (!pick) continue;
      await this.send(
        s.user_id,
        'search_demand',
        {
          city: s.city,
          term: pick.term,
          count: pick.n,
          brandName: s.brand_name,
        },
        'provider',
      );
    }
  }

  /** Wednesday 11:00: quiet shops get one next step (photos, products, reviews, a deal, links). */
  @Cron('0 11 * * 3', IST)
  async shopSteps(): Promise<void> {
    if (!(await this.on('shop_step'))) return;
    const rows = await this.shopStrength();
    for (const r of rows) {
      if (r.enquiries_14d >= 3 || r.views_14d >= 40) continue; // not quiet
      const step = this.nextStep(r);
      if (!step) continue;
      await this.send(r.user_id, 'shop_step', step, 'provider');
    }
  }

  /** Tuesday 11:00: strong listings that have never been boosted. */
  @Cron('0 11 * * 2', IST)
  async boostReady(): Promise<void> {
    if (!(await this.on('boost_ready')) || !(await this.boostsEnabled()))
      return;
    const price = await this.cheapestBoost();
    const everBoosted = new Set(
      (
        await this.dataSource.query<{ provider_id: string }[]>(
          `SELECT DISTINCT provider_id FROM sponsored_listings`,
        )
      ).map((r) => r.provider_id),
    );
    for (const r of await this.shopStrength()) {
      if (
        everBoosted.has(r.id) ||
        r.photos < 3 ||
        r.products < 3 ||
        r.reviews < 1
      )
        continue;
      if (await this.sentRecently(r.user_id, 'boost_ready', 30)) continue;
      await this.send(
        r.user_id,
        'boost_ready',
        { brandName: r.brand_name, city: r.city, price },
        'provider',
      );
    }
  }

  /** 1st, 12:00: how many families saved the shop last month. */
  @Cron('0 12 1 * *', IST)
  async savedByFamilies(): Promise<void> {
    if (!(await this.on('saved_by_families'))) return;
    const { y, m } = istToday();
    const rows = await this.dataSource.query<
      { user_id: string; brand_name: string; n: string }[]
    >(
      `SELECT p.user_id, p.brand_name, count(*) AS n
         FROM saved_items s JOIN providers p ON p.id = s.item_id
        WHERE s.item_type = 'provider' AND p.deleted_at IS NULL
          AND s.created_at >= $1::timestamptz AND s.created_at < $2::timestamptz
        GROUP BY 1, 2 HAVING count(*) >= 3`,
      [
        istMidnight(y, m - 1, 1).toISOString(),
        istMidnight(y, m, 1).toISOString(),
      ],
    );
    for (const r of rows) {
      await this.send(
        r.user_id,
        'saved_by_families',
        { count: Number(r.n), brandName: r.brand_name },
        'provider',
      );
    }
  }

  /** Daily 11:30: shop anniversaries. */
  @Cron('30 11 * * *', IST)
  async anniversaries(): Promise<void> {
    if (!(await this.on('shop_anniversary'))) return;
    const { y, m, d } = istToday();
    const rows = await this.dataSource.query<
      { id: string; user_id: string; brand_name: string; created_at: Date }[]
    >(
      `SELECT id, user_id, brand_name, created_at FROM providers
        WHERE deleted_at IS NULL AND status = 'active'
          AND extract(month FROM created_at) = $1 AND extract(day FROM created_at) = $2
          AND extract(year FROM created_at) < $3`,
      [m + 1, d, y],
    );
    for (const r of rows) {
      const years = y - new Date(r.created_at).getUTCFullYear();
      const [v] = await this.dataSource.query<{ n: string }[]>(
        `SELECT count(*) AS n FROM provider_analytics_events WHERE provider_id = $1 AND event_type = 'profile_view'`,
        [r.id],
      );
      await this.send(
        r.user_id,
        'shop_anniversary',
        {
          years: years === 1 ? 'One year' : `${years} years`,
          views: Number(v?.n ?? 0).toLocaleString('en-IN'),
          brandName: r.brand_name,
        },
        'provider',
      );
    }
  }

  // ── Customers ─────────────────────────────────────────────────────────────

  /** Thursday 7 PM: cities with 3+ live deals, to people active in the last 60 days. */
  @Cron('0 19 * * 4', IST)
  async weekendDeals(): Promise<void> {
    if (!(await this.on('weekend_deals'))) return;
    const cities = await this.dataSource.query<{ city: string; n: string }[]>(
      `SELECT lower(p.city) AS city, count(*) AS n
         FROM provider_offers o JOIN providers p ON p.id = o.provider_id
        WHERE o.is_active AND o.approval_status = 'approved'
          AND o.starts_at <= now() + interval '3 days' AND o.ends_at > now()
          AND p.deleted_at IS NULL AND p.status = 'active'
        GROUP BY 1 HAVING count(*) >= 3`,
    );
    for (const c of cities) {
      const users = await this.dataSource.query<{ id: string; city: string }[]>(
        `SELECT id, city FROM users
          WHERE lower(city) = $1 AND status = 'active' AND last_seen_at > now() - interval '60 days'`,
        [c.city],
      );
      for (const u of users) {
        await this.send(
          u.id,
          'weekend_deals',
          { count: Number(c.n), city: u.city },
          'customer',
        );
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async boostsEnabled(): Promise<boolean> {
    const [r] = await this.dataSource.query<{ value: string }[]>(
      `SELECT value FROM system_settings WHERE key = 'sponsorships_enabled'`,
    );
    return r?.value === 'true';
  }

  private async activelyBoosted(): Promise<Set<string>> {
    const rows = await this.dataSource.query<{ provider_id: string }[]>(
      `SELECT DISTINCT provider_id FROM sponsored_listings WHERE is_active AND ends_at > now()`,
    );
    return new Set(rows.map((r) => r.provider_id));
  }

  private async cheapestBoost(): Promise<string> {
    const [r] = await this.dataSource.query<{ value: string }[]>(
      `SELECT value FROM system_settings WHERE key = 'sponsorship_plans'`,
    );
    try {
      const plans = JSON.parse(r?.value ?? '[]') as { price?: number }[];
      const prices = plans.map((p) => Number(p.price)).filter((n) => n > 0);
      return prices.length
        ? Math.min(...prices).toLocaleString('en-IN')
        : '499';
    } catch {
      return '499';
    }
  }

  /** What each active shop has: photos, products, reviews, deals, links, recent activity. */
  async shopStrength() {
    return this.dataSource.query<
      {
        id: string;
        user_id: string;
        brand_name: string;
        city: string;
        photos: number;
        products: number;
        products_with_photos: number;
        reviews: number;
        deals: number;
        has_links: boolean;
        views_14d: number;
        enquiries_14d: number;
      }[]
    >(
      `SELECT p.id, p.user_id, p.brand_name, p.city,
              (SELECT count(*) FROM photos ph WHERE ph.provider_id = p.id)::int
                + (CASE WHEN p.profile_photo_url IS NOT NULL THEN 1 ELSE 0 END) AS photos,
              (SELECT count(*) FROM products pr WHERE pr.provider_id = p.id AND pr.is_active)::int AS products,
              (SELECT count(*) FROM products pr WHERE pr.provider_id = p.id AND pr.is_active
                 AND (pr.photo_url IS NOT NULL OR coalesce(array_length(pr.photo_urls, 1), 0) > 0))::int AS products_with_photos,
              (SELECT count(*) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active')::int AS reviews,
              (SELECT count(*) FROM provider_offers o WHERE o.provider_id = p.id)::int AS deals,
              (p.instagram_handle IS NOT NULL OR p.website_url IS NOT NULL) AS has_links,
              (SELECT count(*) FROM provider_analytics_events e WHERE e.provider_id = p.id AND e.event_type = 'profile_view' AND e.created_at > now() - interval '14 days')::int AS views_14d,
              (SELECT count(*) FROM provider_analytics_events e WHERE e.provider_id = p.id AND e.event_type = 'chat_initiated' AND e.created_at > now() - interval '14 days')::int AS enquiries_14d
         FROM providers p
        WHERE p.deleted_at IS NULL AND p.status = 'active'`,
    );
  }

  /** The one thing a quiet shop should add next, in the order that brings customers fastest. */
  nextStep(r: {
    brand_name: string;
    city: string;
    photos: number;
    products: number;
    reviews: number;
    deals: number;
    has_links: boolean;
  }): { title: string; body: string; route: string } | null {
    if (r.photos < 3) {
      return {
        title: `${r.brand_name} has ${r.photos === 0 ? 'no photos' : r.photos === 1 ? '1 photo' : `${r.photos} photos`}`,
        body: 'Customers choose shops they can see. Add a few photos of your shop and work. It takes a minute.',
        route: '/?tab=listings&subTab=photos',
      };
    }
    if (r.products < 3) {
      return {
        title: `Add what you sell to ${r.brand_name}`,
        body: `Products with photos and prices help Mumineen in ${r.city} find you in search.`,
        route: '/?tab=listings&subTab=products',
      };
    }
    if (r.reviews < 1) {
      return {
        title: 'Get your first reviews',
        body: 'Your regular customers already trust you. Send them your review link on WhatsApp.',
        route: '/?tab=listings&subTab=reviews',
      };
    }
    if (r.deals < 1) {
      return {
        title: 'Add a deal for the community',
        body: `Your first deals are free. A deal puts ${r.brand_name} in the Deals tab for everyone in ${r.city}.`,
        route: '/?tab=listings&subTab=deals',
      };
    }
    if (!r.has_links) {
      return {
        title: 'Link your Instagram',
        body: 'So customers can see your latest work, right from Tijarah.',
        route: '/?tab=listings&subTab=details',
      };
    }
    return null;
  }
}
