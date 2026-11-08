import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationTemplateService } from '../notifications/notification-template.service';
import { AutomationsService } from './automations.service';
import { EngagementPushService } from './engagement-push.service';

const IST = { timeZone: 'Asia/Kolkata' } as const;

const endDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
const shortDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
const DAY_MS = 86_400_000;
const discount = (type: string, value: string | number) =>
  type === 'percentage'
    ? `${Number(value)}%`
    : `₹${Number(value).toLocaleString('en-IN')}`;

interface DealRow {
  id: string;
  provider_id: string;
  user_id: string;
  brand_name: string;
  title: string;
  tier: string;
  discount_type: string;
  discount_value: string;
  ends_at: Date;
}

/**
 * How many more deals an owner can add without paying, by the same rules as
 * creating one (ProvidersService.createOffer). `left` is Infinity when the
 * plan has no cap; `free` is false when the deals come with their plan.
 */
interface Allowance {
  left: number;
  quota: number;
  free: boolean;
  plan: string | null;
}

/** "2 free deals", "1 deal in your Growth plan", "unlimited deals in your Growth plan". */
const dealsLeftText = (a: Allowance) => {
  const deals = (n: number) => (n === 1 ? 'deal' : 'deals');
  if (a.free) return `${a.left} free ${deals(a.left)}`;
  if (a.left === Infinity) return `unlimited deals in your ${a.plan} plan`;
  return `${a.left} ${deals(a.left)} in your ${a.plan} plan`;
};

/** A running deal, or one waiting for approval, means there's nothing to remind about. */
const RUNNING_DEAL = `SELECT 1 FROM provider_offers x
  WHERE x.provider_id = p.id AND x.is_active AND x.ends_at > now()
    AND x.approval_status IN ('approved', 'pending_approval')`;

/**
 * Pushes around a deal's life: live → halfway (free) → ends tomorrow → ended,
 * plus a heads-up to customers who saved a business when it starts a 15-day
 * deal. Each is a template admins can edit or switch off, sent once per deal.
 */
@Injectable()
export class DealPushService {
  private readonly logger = new Logger(DealPushService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dispatch: NotificationDispatchService,
    private readonly templates: NotificationTemplateService,
    private readonly engagement: EngagementPushService,
    private readonly automations: AutomationsService,
  ) {}

  /** Live, approved deals of live businesses matching `where`, not yet sent `slug`. */
  private deals(slug: string, where: string): Promise<DealRow[]> {
    return this.dataSource.query(
      `SELECT o.id, o.provider_id, p.user_id, p.brand_name, o.title, o.tier,
              o.discount_type, o.discount_value, o.ends_at
         FROM provider_offers o
         JOIN providers p ON p.id = o.provider_id
        WHERE o.is_active = true AND o.approval_status = 'approved'
          AND p.deleted_at IS NULL AND p.status IN ('active', 'unverified')
          AND ${where}
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
             WHERE n.user_id = p.user_id AND n.data->>'slug' = $1 AND n.data->>'offerId' = o.id::text
          )
        LIMIT 500`,
      [slug],
    );
  }

  private async views(
    offerIds: string[],
  ): Promise<Map<string, { views: number; taps: number }>> {
    if (offerIds.length === 0) return new Map();
    const rows: { entity_id: string; views: string; taps: string }[] =
      await this.dataSource.query(
        `SELECT entity_id,
              count(*) FILTER (WHERE event_type = 'impression') AS views,
              count(*) FILTER (WHERE event_type = 'click') AS taps
         FROM ad_events
        WHERE entity_type = 'provider_offer' AND entity_id = ANY($1::uuid[])
        GROUP BY entity_id`,
        [offerIds],
      );
    return new Map(
      rows.map((r) => [
        r.entity_id,
        { views: Number(r.views), taps: Number(r.taps) },
      ]),
    );
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const [r] = await this.dataSource.query<{ value: string }[]>(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key],
    );
    return r?.value ?? fallback;
  }

  /** Deals each business can still add without paying. */
  private async allowances(
    providerIds: string[],
  ): Promise<Map<string, Allowance>> {
    if (providerIds.length === 0) return new Map();
    const [monetization, quota, womenQuota] = await Promise.all([
      this.setting('deals_monetization_enabled', 'false'),
      this.setting('free_deal_quota_lifetime', '2'),
      this.setting('women_led_free_deals_lifetime', '5'),
    ]);
    const rows: {
      id: string;
      women_led_status: string | null;
      free_deals_created: number | null;
      total: number;
      plan_name: string | null;
      plan_max: number | null;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.women_led_status, p.free_deals_created,
              (SELECT count(*)::int FROM provider_offers o WHERE o.provider_id = p.id) AS total,
              sp.name AS plan_name, sp.max_total_deals AS plan_max
         FROM providers p
         LEFT JOIN LATERAL (
           SELECT s.plan_id FROM subscriptions s
            WHERE s.provider_id = p.id AND s.status = 'active'
            ORDER BY s.created_at DESC LIMIT 1
         ) s ON true
         LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
        WHERE p.id = ANY($1::uuid[])`,
      [providerIds],
    );
    const out = new Map<string, Allowance>();
    for (const r of rows) {
      const plan = r.plan_name ?? null;
      let a: Allowance;
      if (monetization !== 'true') {
        // Every deal is free; the old lifetime cap (5, or the plan's) applies.
        const cap = plan ? Number(r.plan_max) : 5;
        a =
          cap === -1
            ? { left: Infinity, quota: Infinity, free: false, plan }
            : {
                left: Math.max(0, cap - Number(r.total)),
                quota: cap,
                free: !plan,
                plan,
              };
      } else if (plan) {
        a = { left: Infinity, quota: Infinity, free: false, plan };
      } else {
        const q = Number(
          r.women_led_status === 'approved' ? womenQuota : quota,
        );
        a = {
          left: Math.max(0, q - Number(r.free_deals_created ?? 0)),
          quota: q,
          free: true,
          plan: null,
        };
      }
      out.set(r.id, a);
    }
    return out;
  }

  private toOwner(
    d: DealRow,
    slug: string,
    vars: Record<string, string | number>,
  ) {
    return this.dispatch
      .sendTemplated(
        d.user_id,
        slug,
        Object.fromEntries(
          Object.entries(vars).map(([k, v]) => [k, String(v)]),
        ),
        { slug, offerId: d.id },
        'provider',
      )
      .catch(() => false);
  }

  // ── Started ─────────────────────────────────────────────────────────────

  /** Every 15 min: deals that have just gone live (including ones scheduled ahead). */
  @Cron('*/15 * * * *')
  async dealLive(): Promise<void> {
    if (await this.templates.isEnabled('deal_live')) {
      const live = await this.deals(
        'deal_live',
        `o.starts_at <= now() AND o.starts_at > now() - interval '1 day' AND o.ends_at > now()`,
      );
      for (const d of live)
        await this.toOwner(d, 'deal_live', {
          title: d.title,
          endDate: endDate(d.ends_at),
        });
    }
    await this.savedBusinessDeals();
  }

  /** A 15-day deal is announced to the customers who saved that business. */
  private async savedBusinessDeals(): Promise<void> {
    if (!(await this.templates.isEnabled('saved_business_deal'))) return;
    const deals: DealRow[] = await this.dataSource.query(
      `SELECT o.id, o.provider_id, p.user_id, p.brand_name, o.title, o.tier,
              o.discount_type, o.discount_value, o.ends_at
         FROM provider_offers o
         JOIN providers p ON p.id = o.provider_id
        WHERE o.is_active = true AND o.approval_status = 'approved' AND o.tier IN ('paid', 'plan')
          AND o.starts_at <= now() AND o.starts_at > now() - interval '1 day' AND o.ends_at > now()
          AND p.deleted_at IS NULL AND p.status IN ('active', 'unverified')`,
    );
    for (const d of deals) {
      const savers: { user_id: string }[] = await this.dataSource.query(
        `SELECT DISTINCT s.user_id FROM saved_items s
          WHERE s.item_type = 'provider' AND s.item_id = $1 AND s.user_id <> $2
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
               WHERE n.user_id = s.user_id AND n.data->>'slug' = 'saved_business_deal' AND n.data->>'offerId' = $3
            )`,
        [d.provider_id, d.user_id, d.id],
      );
      for (const s of savers) {
        // Counts toward each customer's 1-a-day / 3-a-week limit on promotional pushes.
        if (!(await this.engagement.allowed(s.user_id))) continue;
        await this.dispatch
          .sendTemplated(
            s.user_id,
            'saved_business_deal',
            {
              brandName: d.brand_name,
              discount: discount(d.discount_type, d.discount_value),
              title: d.title,
              endDate: endDate(d.ends_at),
              providerId: d.provider_id,
            },
            { kind: 'engagement', slug: 'saved_business_deal', offerId: d.id },
            'customer',
          )
          .catch(() => false);
      }
    }
  }

  // ── Running ─────────────────────────────────────────────────────────────

  /** 11 AM: day 3 of a free deal — how it's doing, and the 15-day upgrade. */
  @Cron('0 11 * * *', IST)
  async freeHalfway(): Promise<void> {
    if (!(await this.templates.isEnabled('deal_free_halfway'))) return;
    const deals = await this.deals(
      'deal_free_halfway',
      `o.tier = 'free' AND o.starts_at <= now() - interval '2 days' AND o.ends_at > now() + interval '36 hours'`,
    );
    const stats = await this.views(deals.map((d) => d.id));
    const price = await this.setting('deal_creation_price', '149');
    for (const d of deals) {
      const views = stats.get(d.id)?.views ?? 0;
      if (views < 5) continue; // nothing worth bragging about yet
      await this.toOwner(d, 'deal_free_halfway', { views, price });
    }
  }

  /** 10 AM: deals ending tomorrow — upgrade a free one, extend a paid one. */
  @Cron('0 10 * * *', IST)
  async endingTomorrow(): Promise<void> {
    const window = `o.ends_at > now() + interval '14 hours' AND o.ends_at <= now() + interval '38 hours' AND o.starts_at <= now()`;
    const stats = async (rows: DealRow[]) => this.views(rows.map((d) => d.id));

    if (await this.templates.isEnabled('deal_ending_free')) {
      const free = await this.deals(
        'deal_ending_free',
        `o.tier = 'free' AND ${window}`,
      );
      const price = await this.setting('deal_creation_price', '149');
      for (const d of free)
        await this.toOwner(d, 'deal_ending_free', { title: d.title, price });
    }
    if (await this.templates.isEnabled('deal_ending_paid')) {
      const paid = await this.deals(
        'deal_ending_paid',
        `o.tier IN ('paid', 'plan') AND ${window}`,
      );
      const seen = await stats(paid);
      const price = await this.setting('deal_extension_price', '74');
      for (const d of paid) {
        const views = seen.get(d.id)?.views ?? 0;
        await this.toOwner(d, 'deal_ending_paid', {
          title: d.title,
          seen: views > 0 ? `${views} people have seen it so far. ` : '',
          price,
        });
      }
    }
  }

  // ── Ended ───────────────────────────────────────────────────────────────

  /**
   * 10:30 AM: deals that ended in the last day, with what they achieved. When
   * nothing else is running and they can still add deals, the push says how
   * many (deal_ended_next) instead. WhatsApp follows if they don't open the app.
   */
  @Cron('30 10 * * *', IST)
  async ended(): Promise<void> {
    const [pushOn, nextOn, whatsappOn] = await Promise.all([
      this.templates.isEnabled('deal_ended'),
      this.templates.isEnabled('deal_ended_next'),
      this.automations.isEnabled('deal_ended'),
    ]);
    if (!pushOn && !whatsappOn) return;
    const rows: (DealRow & { others: boolean })[] = await this.dataSource.query(
      `SELECT o.id, o.provider_id, p.user_id, p.brand_name, o.title, o.tier,
              o.discount_type, o.discount_value, o.ends_at,
              EXISTS (${RUNNING_DEAL} AND x.id <> o.id) AS others
         FROM provider_offers o
         JOIN providers p ON p.id = o.provider_id
        WHERE o.approval_status = 'approved'
          AND o.ends_at <= now() AND o.ends_at > now() - interval '1 day'
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
             WHERE n.user_id = p.user_id AND n.data->>'slug' IN ('deal_ended', 'deal_ended_next')
               AND n.data->>'offerId' = o.id::text
          )
        LIMIT 500`,
    );
    const stats = await this.views(rows.map((d) => d.id));
    const allow = nextOn
      ? await this.allowances([
          ...new Set(rows.filter((d) => !d.others).map((d) => d.provider_id)),
        ])
      : new Map<string, Allowance>();
    for (const d of rows) {
      const s = stats.get(d.id);
      if (pushOn) {
        const result =
          s && s.views > 0
            ? `It reached ${s.views} ${s.views === 1 ? 'person' : 'people'}${s.taps ? ` and got ${s.taps} ${s.taps === 1 ? 'tap' : 'taps'}` : ''}. `
            : '';
        const a = d.others ? undefined : allow.get(d.provider_id);
        if (a && a.left > 0)
          await this.toOwner(d, 'deal_ended_next', {
            title: d.title,
            result,
            dealsLeft: dealsLeftText(a),
          });
        else await this.toOwner(d, 'deal_ended', { title: d.title, result });
      }
      // Only worth a WhatsApp when people actually saw it.
      if (whatsappOn && (s?.views ?? 0) >= 5)
        await this.automations.schedule('deal_ended', {
          dedupeKey: `deal_ended:${d.id}`,
          providerId: d.provider_id,
          context: {
            dealTitle: d.title,
            endDate: shortDate(d.ends_at),
            views: (s?.views ?? 0).toLocaleString('en-IN'),
          },
        });
    }
  }

  // ── Deals left to use ───────────────────────────────────────────────────

  /**
   * 6:30 PM: owners with nothing running who can still add deals without
   * paying. Two reminders per quiet stretch: 3 and 10 days after their last
   * deal ended, or 7 and 21 days after the shop opened if they never ran one.
   * The first also queues the WhatsApp version (free deals only).
   */
  @Cron('30 18 * * *', IST)
  async dealsLeft(): Promise<void> {
    const [pushOn, whatsappOn] = await Promise.all([
      this.templates.isEnabled('deals_left_reminder'),
      this.automations.isEnabled('free_deals_left'),
    ]);
    if (!pushOn && !whatsappOn) return;
    const rows: {
      id: string;
      user_id: string;
      brand_name: string;
      created_at: Date;
      last_end: Date | null;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.user_id, p.brand_name, p.created_at,
              -- A deal switched off early counts from its start, so the date stays put.
              (SELECT max(CASE WHEN o.ends_at <= now() THEN o.ends_at ELSE o.starts_at END)
                 FROM provider_offers o WHERE o.provider_id = p.id) AS last_end
         FROM providers p
        WHERE p.deleted_at IS NULL AND p.status IN ('active', 'unverified')
          AND NOT EXISTS (${RUNNING_DEAL})
          AND (EXISTS (SELECT 1 FROM provider_offers o WHERE o.provider_id = p.id)
               OR EXISTS (SELECT 1 FROM products pr WHERE pr.provider_id = p.id AND pr.is_active = true))`,
    );
    if (rows.length === 0) return;

    const sent: { user_id: string; anchor: string; n: number; last: Date }[] =
      await this.dataSource.query(
        `SELECT user_id, data->>'anchor' AS anchor, count(*)::int AS n, max(created_at) AS last
           FROM notifications
          WHERE data->>'slug' = 'deals_left_reminder' AND user_id = ANY($1::uuid[])
          GROUP BY 1, 2`,
        [rows.map((r) => r.user_id)],
      );
    const history = new Map(sent.map((h) => [`${h.user_id}|${h.anchor}`, h]));
    const now = Date.now();

    const due = rows.flatMap((r) => {
      const anchor = r.last_end
        ? `ended:${new Date(r.last_end).toISOString().slice(0, 10)}`
        : 'never';
      const age =
        (now - new Date(r.last_end ?? r.created_at).getTime()) / DAY_MS;
      const [first, second] = r.last_end ? [3, 10] : [7, 21];
      const h = history.get(`${r.user_id}|${anchor}`);
      const n = Number(h?.n ?? 0);
      const stage =
        n === 0 && age >= first
          ? 1
          : n === 1 &&
              age >= second &&
              now - new Date(h!.last).getTime() >= 7 * DAY_MS
            ? 2
            : 0;
      return stage ? [{ ...r, anchor, stage }] : [];
    });
    const allow = await this.allowances(due.map((r) => r.id));

    let pushed = 0;
    for (const r of due) {
      const a = allow.get(r.id);
      if (!a || a.left <= 0) continue;
      if (pushOn && (await this.engagement.allowed(r.user_id))) {
        const ok = await this.dispatch
          .sendTemplated(
            r.user_id,
            'deals_left_reminder',
            {
              dealsLeft: dealsLeftText(a),
              addThem: a.left === 1 ? 'Add it now' : 'Add them now',
              brandName: r.brand_name,
            },
            {
              kind: 'engagement',
              slug: 'deals_left_reminder',
              anchor: r.anchor,
              stage: r.stage,
            },
            'provider',
          )
          .catch(() => false);
        if (ok) pushed++;
      }
      if (whatsappOn && r.stage === 1 && a.free)
        await this.automations.schedule('free_deals_left', {
          dedupeKey: `free_deals_left:${r.id}:${r.anchor}`,
          providerId: r.id,
          context: { left: String(a.left), quota: String(a.quota) },
        });
    }
    this.logger.log(`Deals left: ${pushed} owners reminded`);
  }

  // ── No deal lately ──────────────────────────────────────────────────────

  /** 2nd of the month: businesses with products but no deal in 45 days (switched off by default). */
  @Cron('0 12 2 * *', IST)
  async nudge(): Promise<void> {
    if (!(await this.templates.isEnabled('deal_nudge'))) return;
    const [quota, womenQuota, price] = await Promise.all([
      this.setting('free_deal_quota_lifetime', '2'),
      this.setting('women_led_free_deals_lifetime', '5'),
      this.setting('deal_creation_price', '149'),
    ]);
    const rows: {
      user_id: string;
      brand_name: string;
      free_deals_created: number;
      women_led_status: string;
    }[] = await this.dataSource.query(
      `SELECT p.user_id, p.brand_name, p.free_deals_created, p.women_led_status
           FROM providers p
          WHERE p.deleted_at IS NULL AND p.status = 'active'
            AND EXISTS (SELECT 1 FROM products pr WHERE pr.provider_id = p.id AND pr.is_active = true)
            AND NOT EXISTS (
              SELECT 1 FROM provider_offers o WHERE o.provider_id = p.id AND o.created_at > now() - interval '45 days'
            )`,
    );
    let sent = 0;
    for (const r of rows) {
      const freeLeft =
        Number(r.women_led_status === 'approved' ? womenQuota : quota) -
        Number(r.free_deals_created ?? 0);
      const offer =
        freeLeft > 0
          ? `You have ${freeLeft} free ${freeLeft === 1 ? 'deal' : 'deals'} left (5 days each).`
          : `A 15-day deal is ₹${price}.`;
      if (!(await this.engagement.allowed(r.user_id))) continue;
      const ok = await this.dispatch
        .sendTemplated(
          r.user_id,
          'deal_nudge',
          { offer, brandName: r.brand_name },
          { kind: 'engagement', slug: 'deal_nudge' },
          'provider',
        )
        .catch(() => false);
      if (ok) sent++;
    }
    this.logger.log(`Deal nudge: ${sent} owners`);
  }
}
