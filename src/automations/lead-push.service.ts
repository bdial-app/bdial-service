import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationTemplateService } from '../notifications/notification-template.service';
import { EngagementPushService } from './engagement-push.service';

const IST = { timeZone: 'Asia/Kolkata' } as const;

/**
 * 11:30 AM: owners with 2+ new hot or warm leads they haven't unlocked get
 * one push saying how many their Lead Wallet (or free unlocks) covers.
 * Within the 1-a-day / 3-a-week limit on promotional pushes.
 */
@Injectable()
export class LeadPushService {
  private readonly logger = new Logger(LeadPushService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dispatch: NotificationDispatchService,
    private readonly templates: NotificationTemplateService,
    private readonly engagement: EngagementPushService,
  ) {}

  private async setting(key: string, fallback: string): Promise<string> {
    const [r] = await this.dataSource.query<{ value: string }[]>(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key],
    );
    return r?.value ?? fallback;
  }

  @Cron('30 11 * * *', IST)
  async newHotLeads(): Promise<void> {
    if (!(await this.templates.isEnabled('new_hot_leads'))) return;
    if ((await this.setting('leads_monetization_enabled', 'false')) !== 'true')
      return;
    const rows: {
      user_id: string;
      brand_name: string;
      n: number;
      balance: string | null;
      plan_slug: string | null;
    }[] = await this.dataSource.query(
      `SELECT p.user_id, p.brand_name, count(*)::int AS n, w.balance, pl.slug AS plan_slug
         FROM provider_leads l
         JOIN providers p ON p.id = l.provider_id
         LEFT JOIN lead_wallets w ON w.provider_id = p.id
         LEFT JOIN subscriptions s ON s.provider_id = p.id AND s.status = 'active'
         LEFT JOIN subscription_plans pl ON pl.id = s.plan_id
        WHERE l.is_unlocked = false AND l.user_id IS NOT NULL
          AND l.tier IN ('hot', 'warm')
          AND l.created_at > now() - interval '24 hours'
          AND p.deleted_at IS NULL AND p.status = 'active'
        GROUP BY p.id, p.user_id, p.brand_name, w.balance, pl.slug
       HAVING count(*) >= 2`,
    );
    let sent = 0;
    for (const r of rows) {
      const growth = r.plan_slug === 'growth';
      const hot = parseFloat(
        await this.setting(
          growth ? 'lead_price_hot_discounted' : 'lead_price_hot',
          growth ? '49' : '99',
        ),
      );
      const balance = Number(r.balance ?? 0);
      const covers = hot > 0 ? Math.floor(balance / hot) : 0;
      const line =
        covers >= r.n
          ? `Your Lead Wallet can get all ${r.n} contacts now — reach them before other businesses do.`
          : covers > 0
            ? `Your wallet covers ${covers}. Top up for the rest and get up to 30% extra credit.`
            : 'Top up your Lead Wallet and get up to 30% extra credit to reach them first.';
      if (!(await this.engagement.allowed(r.user_id))) continue;
      const ok = await this.dispatch
        .sendTemplated(
          r.user_id,
          'new_hot_leads',
          { count: String(r.n), brandName: r.brand_name, line },
          { kind: 'engagement', slug: 'new_hot_leads' },
          'provider',
        )
        .catch(() => false);
      if (ok) sent++;
    }
    if (sent) this.logger.log(`New hot leads pushes: ${sent}`);
  }
}
