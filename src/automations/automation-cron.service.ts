import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AutomationsService } from './automations.service';

/** Times are India time, whatever the server's clock says. */
const IST = { timeZone: 'Asia/Kolkata' } as const;
const IST_OFFSET_MS = 330 * 60_000;

/** Midnight (India time) at the start of the given India-time date parts, as an instant. */
const istMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
const istParts = (d = new Date()) => {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    d: t.getUTCDate(),
    dow: t.getUTCDay(),
  };
};
const monthName = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleString('en-IN', {
    month: 'long',
    timeZone: 'UTC',
  });
const shortDate = (d: Date) =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

type Activity = {
  views: number;
  searches: number;
  enquiries: number;
  calls: number;
};

/**
 * The scheduled automations: 6 PM "customers waiting", Monday summary, 1st of
 * the month summary, 25th "free leads left", plan renewals and boosts ending.
 * Each first checks its automation is on, so nothing runs while it's off.
 */
@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly automations: AutomationsService,
  ) {}

  /** Owners who agreed to WhatsApp alerts (their business number's consent). */
  private async optedInBusinesses(): Promise<
    {
      id: string;
      user_id: string;
      women_led_status: string;
      free_leads_used_this_month: number;
      free_leads_reset_at: Date | null;
    }[]
  > {
    return this.dataSource.query(
      `SELECT DISTINCT p.id, p.user_id, p.women_led_status, p.free_leads_used_this_month, p.free_leads_reset_at
         FROM providers p
         JOIN whatsapp_contacts c ON c.provider_id = p.id AND c.consent = 'opted_in'
        WHERE p.deleted_at IS NULL AND p.status IN ('active', 'unverified')`,
    );
  }

  /** Views, search appearances, enquiries and calls per business in [from, to). */
  async activity(
    ids: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, Activity>> {
    const out = new Map<string, Activity>();
    for (const id of ids)
      out.set(id, { views: 0, searches: 0, enquiries: 0, calls: 0 });
    if (!ids.length) return out;
    const rows = await this.dataSource.query<
      { provider_id: string; event_type: string; n: string }[]
    >(
      `SELECT provider_id, event_type::text AS event_type, count(*) AS n
         FROM provider_analytics_events
        WHERE provider_id = ANY($1::uuid[])
          AND event_type IN ('profile_view', 'search_appearance', 'chat_initiated', 'call_clicked')
          AND created_at >= $2::timestamptz AND created_at < $3::timestamptz
        GROUP BY 1, 2`,
      [ids, from.toISOString(), to.toISOString()],
    );
    const field: Record<string, keyof Activity> = {
      profile_view: 'views',
      search_appearance: 'searches',
      chat_initiated: 'enquiries',
      call_clicked: 'calls',
    };
    for (const r of rows) {
      const a = out.get(r.provider_id);
      const f = field[r.event_type];
      if (a && f) a[f] = Number(r.n);
    }
    return out;
  }

  private async freeLeadQuota(womenLed: boolean): Promise<number> {
    const key = womenLed
      ? 'women_led_free_leads_per_month'
      : 'free_lead_quota_monthly';
    const [row] = await this.dataSource.query<{ value: string }[]>(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key],
    );
    const n = parseInt(row?.value ?? '', 10);
    return Number.isFinite(n) ? n : womenLed ? 8 : 5;
  }

  // ── 6 PM: customers waiting for a reply ──────────────────────────────────

  @Cron('0 18 * * *', IST)
  async enquiriesWaiting(): Promise<void> {
    if (!(await this.automations.isEnabled('enquiries_waiting'))) return;
    const rows = await this.dataSource.query<
      { provider_id: string; waiting: string; oldest: Date }[]
    >(
      `SELECT p.id AS provider_id, count(*) AS waiting, min(c.last_message_at) AS oldest
         FROM conversation_participants cp
         JOIN conversations c ON c.id = cp.conversation_id
         JOIN providers p ON p.user_id = cp.user_id AND p.deleted_at IS NULL
        WHERE cp.role = 'provider' AND cp.unread_count > 0 AND cp.is_active
          AND c.last_message_at < now() - interval '4 hours'
          AND c.last_message_at > now() - interval '7 days'
        GROUP BY p.id`,
    );
    const { y, m, d } = istParts();
    for (const r of rows) {
      const oldest = new Date(r.oldest);
      const startOfToday = istMidnight(y, m, d);
      const oldestWhen =
        oldest >= startOfToday
          ? 'this morning'
          : oldest >= istMidnight(y, m, d - 1)
            ? 'yesterday'
            : shortDate(oldest);
      await this.automations.schedule('enquiries_waiting', {
        dedupeKey: `enquiries_waiting:${r.provider_id}:${y}-${m + 1}-${d}`,
        providerId: r.provider_id,
        context: { waitingCount: Number(r.waiting), oldestWhen },
      });
    }
  }

  // ── Monday: weekly summary ───────────────────────────────────────────────

  @Cron('0 10 * * 1', IST)
  async weeklySummary(): Promise<void> {
    if (!(await this.automations.isEnabled('weekly_summary'))) return;
    const { y, m, d } = istParts();
    if (d <= 7) return; // the monthly summary covers this week
    const to = istMidnight(y, m, d);
    const from = istMidnight(y, m, d - 7);
    const businesses = await this.optedInBusinesses();
    const activity = await this.activity(
      businesses.map((b) => b.id),
      from,
      to,
    );
    const range = `${shortDate(from)}–${shortDate(new Date(to.getTime() - 1))}`;
    for (const b of businesses) {
      const a = activity.get(b.id)!;
      if (a.views < 5 && a.enquiries < 1) continue; // only real activity
      await this.automations.schedule('weekly_summary', {
        dedupeKey: `weekly_summary:${b.id}:${y}-${m + 1}-${d}`,
        providerId: b.id,
        context: { range, ...a },
      });
    }
  }

  // ── 1st of the month: monthly summary + free leads renewed ───────────────

  @Cron('0 10 1 * *', IST)
  async monthlySummary(): Promise<void> {
    if (!(await this.automations.isEnabled('monthly_summary'))) return;
    const { y, m } = istParts();
    const from = istMidnight(y, m - 1, 1);
    const to = istMidnight(y, m, 1);
    const prev = new Date(Date.UTC(y, m - 1, 1));
    const businesses = await this.optedInBusinesses();
    const activity = await this.activity(
      businesses.map((b) => b.id),
      from,
      to,
    );
    for (const b of businesses) {
      const a = activity.get(b.id)!;
      if (a.views < 1) continue;
      await this.automations.schedule('monthly_summary', {
        dedupeKey: `monthly_summary:${b.id}:${y}-${m + 1}`,
        providerId: b.id,
        context: {
          month: monthName(prev.getUTCFullYear(), prev.getUTCMonth()),
          nextMonth: monthName(y, m),
          freeLeads: await this.freeLeadQuota(
            b.women_led_status === 'approved',
          ),
          ...a,
        },
      });
    }
  }

  // ── 25th: free lead unlocks left ─────────────────────────────────────────

  @Cron('0 10 25 * *', IST)
  async freeLeadsLeft(): Promise<void> {
    if (!(await this.automations.isEnabled('free_leads_left'))) return;
    const { y, m } = istParts();
    const businesses = await this.optedInBusinesses();
    if (!businesses.length) return;
    const waitingRows = await this.dataSource.query<
      { provider_id: string; n: string }[]
    >(
      `SELECT provider_id, count(*) AS n FROM provider_leads
        WHERE provider_id = ANY($1::uuid[]) AND is_unlocked = false
          AND last_seen_at > now() - interval '30 days'
        GROUP BY 1`,
      [businesses.map((b) => b.id)],
    );
    const waiting = new Map(
      waitingRows.map((r) => [r.provider_id, Number(r.n)]),
    );
    for (const b of businesses) {
      const quota = await this.freeLeadQuota(b.women_led_status === 'approved');
      const reset = b.free_leads_reset_at
        ? istParts(new Date(b.free_leads_reset_at))
        : null;
      const used =
        reset && reset.y === y && reset.m === m
          ? Number(b.free_leads_used_this_month ?? 0)
          : 0;
      const left = Math.max(0, quota - used);
      const w = waiting.get(b.id) ?? 0;
      if (left < 1 || w < 1) continue;
      await this.automations.schedule('free_leads_left', {
        dedupeKey: `free_leads_left:${b.id}:${y}-${m + 1}`,
        providerId: b.id,
        context: {
          left,
          quota,
          waiting: w,
          month: monthName(y, m),
          resetDate: `1 ${monthName(y, m + 1)}`,
        },
      });
    }
  }

  // ── Daily: plans renewing in 3 days, boosts ending in 2–3 days ───────────

  @Cron('0 10 * * *', IST)
  async renewalsAndBoosts(): Promise<void> {
    if (await this.automations.isEnabled('plan_renewal')) {
      const subs = await this.dataSource.query<
        {
          id: string;
          provider_id: string;
          current_period_end: Date;
          billing_interval: string;
          name: string;
          price_monthly: string;
          price_yearly: string;
        }[]
      >(
        `SELECT s.id, s.provider_id, s.current_period_end, s.billing_interval, sp.name, sp.price_monthly, sp.price_yearly
           FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.plan_id
          WHERE s.status = 'active' AND s.cancel_at_period_end = false
            AND s.current_period_end BETWEEN now() + interval '2 days' AND now() + interval '3 days'`,
      );
      for (const s of subs) {
        const end = new Date(s.current_period_end);
        await this.automations.schedule('plan_renewal', {
          dedupeKey: `plan_renewal:${s.id}:${end.toISOString().slice(0, 10)}`,
          providerId: s.provider_id,
          context: {
            planName: s.name,
            renewDate: shortDate(end),
            amount: Math.round(
              Number(
                s.billing_interval === 'yearly'
                  ? s.price_yearly
                  : s.price_monthly,
              ),
            ).toLocaleString('en-IN'),
          },
        });
      }
    }
    if (await this.automations.isEnabled('boost_ending')) {
      const boosts = await this.dataSource.query<
        {
          id: string;
          provider_id: string;
          ends_at: Date;
          impressions: number;
          clicks: number;
        }[]
      >(
        `SELECT id, provider_id, ends_at, impressions, clicks FROM sponsored_listings
          WHERE is_active AND approval_status = 'approved'
            AND ends_at BETWEEN now() + interval '2 days' AND now() + interval '3 days'`,
      );
      for (const b of boosts) {
        await this.automations.schedule('boost_ending', {
          dedupeKey: `boost_ending:${b.id}`,
          providerId: b.provider_id,
          context: {
            endDate: shortDate(new Date(b.ends_at)),
            impressions: Number(b.impressions ?? 0).toLocaleString('en-IN'),
            clicks: Number(b.clicks ?? 0).toLocaleString('en-IN'),
          },
        });
      }
    }
  }
}
