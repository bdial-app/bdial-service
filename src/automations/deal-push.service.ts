import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationTemplateService } from '../notifications/notification-template.service';
import { EngagementPushService } from './engagement-push.service';

const IST = { timeZone: 'Asia/Kolkata' } as const;

const endDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
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

  /** 10:30 AM: deals that ended in the last day, with what they achieved. */
  @Cron('30 10 * * *', IST)
  async ended(): Promise<void> {
    if (!(await this.templates.isEnabled('deal_ended'))) return;
    const rows: DealRow[] = await this.dataSource.query(
      `SELECT o.id, o.provider_id, p.user_id, p.brand_name, o.title, o.tier,
              o.discount_type, o.discount_value, o.ends_at
         FROM provider_offers o
         JOIN providers p ON p.id = o.provider_id
        WHERE o.approval_status = 'approved'
          AND o.ends_at <= now() AND o.ends_at > now() - interval '1 day'
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
             WHERE n.user_id = p.user_id AND n.data->>'slug' = 'deal_ended' AND n.data->>'offerId' = o.id::text
          )
        LIMIT 500`,
    );
    const stats = await this.views(rows.map((d) => d.id));
    for (const d of rows) {
      const s = stats.get(d.id);
      const result =
        s && s.views > 0
          ? `It reached ${s.views} ${s.views === 1 ? 'person' : 'people'}${s.taps ? ` and got ${s.taps} ${s.taps === 1 ? 'tap' : 'taps'}` : ''}. `
          : '';
      await this.toOwner(d, 'deal_ended', { title: d.title, result });
    }
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
