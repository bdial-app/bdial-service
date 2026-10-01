import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { MetaCloudApiService } from './meta-cloud-api.service';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { CampaignSummary, toCampaignSummary } from './whatsapp.mappers';

export interface AttentionItem {
  type:
    | 'template_rejected'
    | 'campaign_failed'
    | 'campaign_paused'
    | 'high_failure_rate'
    | 'unanswered_replies'
    | 'quality_drop'
    | 'not_configured'
    | 'webhook_silent';
  title: string;
  detail: string;
  href: string;
}

export interface SeriesPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied: number;
  costInr: number;
}

interface DayRow {
  day: string;
  sent: string;
  delivered: string;
  read: string;
  failed: string;
  replied: string;
  cost: string;
}

@Injectable()
export class WhatsAppOverviewService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WhatsAppCampaign)
    private readonly campaignRepo: Repository<WhatsAppCampaign>,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    @InjectRepository(WhatsAppTemplate)
    private readonly templateRepo: Repository<WhatsAppTemplate>,
    private readonly meta: MetaCloudApiService,
    private readonly settings: WhatsAppSettingsService,
  ) {}

  async overview(days = 30) {
    const span = Math.min(Math.max(days, 1), 365);
    const [series, kpiExtras, attention, recentCampaigns] = await Promise.all([
      this.series(span),
      this.kpiExtras(),
      this.attention(),
      this.recentCampaigns(),
    ]);
    const totals = series.reduce(
      (acc, p) => ({
        sent: acc.sent + p.sent,
        delivered: acc.delivered + p.delivered,
        read: acc.read + p.read,
        failed: acc.failed + p.failed,
        replied: acc.replied + p.replied,
        costInr: acc.costInr + p.costInr,
      }),
      { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0, costInr: 0 },
    );
    return {
      kpis: {
        ...totals,
        costInr: Math.round(totals.costInr * 100) / 100,
        deliveryRate: totals.sent ? round4(totals.delivered / totals.sent) : 0,
        readRate: totals.delivered ? round4(totals.read / totals.delivered) : 0,
        ...kpiExtras,
      },
      series,
      attention,
      recentCampaigns,
    };
  }

  /** Per-IST-day counts for the last N days, zero-filled. */
  private async series(days: number): Promise<SeriesPoint[]> {
    const rows = await this.dataSource.query<DayRow[]>(
      `WITH d AS (
         SELECT generate_series(
           (now() AT TIME ZONE 'Asia/Kolkata')::date - ($1::int - 1),
           (now() AT TIME ZONE 'Asia/Kolkata')::date,
           interval '1 day')::date AS day)
       SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
         (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.direction = 'outbound'
            AND (m.sent_at AT TIME ZONE 'Asia/Kolkata')::date = d.day)::text AS sent,
         (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.direction = 'outbound'
            AND (m.delivered_at AT TIME ZONE 'Asia/Kolkata')::date = d.day)::text AS delivered,
         (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.direction = 'outbound'
            AND (m.read_at AT TIME ZONE 'Asia/Kolkata')::date = d.day)::text AS read,
         (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.direction = 'outbound'
            AND (m.failed_at AT TIME ZONE 'Asia/Kolkata')::date = d.day)::text AS failed,
         (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.direction = 'inbound'
            AND (m.created_at AT TIME ZONE 'Asia/Kolkata')::date = d.day)::text AS replied,
         (SELECT COALESCE(SUM(m.cost_inr), 0) FROM whatsapp_messages m WHERE m.direction = 'outbound'
            AND (m.sent_at AT TIME ZONE 'Asia/Kolkata')::date = d.day)::text AS cost
       FROM d ORDER BY d.day`,
      [days],
    );
    return rows.map((r) => ({
      date: r.day,
      sent: Number(r.sent),
      delivered: Number(r.delivered),
      read: Number(r.read),
      failed: Number(r.failed),
      replied: Number(r.replied),
      costInr: Math.round(Number(r.cost) * 100) / 100,
    }));
  }

  private async kpiExtras() {
    const [activeCampaigns, unreadConversations, contacts, optedOut] =
      await Promise.all([
        this.campaignRepo.count({
          where: { status: In(['sending', 'scheduled']) },
        }),
        this.contactRepo
          .createQueryBuilder('c')
          .where('c.unread_count > 0')
          .getCount(),
        this.contactRepo.count(),
        this.contactRepo.count({ where: { consent: 'opted_out' } }),
      ]);
    return { activeCampaigns, unreadConversations, contacts, optedOut };
  }

  private async recentCampaigns(): Promise<CampaignSummary[]> {
    const rows = await this.campaignRepo.find({
      relations: ['template', 'creator'],
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return rows.map((c) => toCampaignSummary(c));
  }

  private async attention(): Promise<AttentionItem[]> {
    const items: AttentionItem[] = [];
    if (!this.meta.isConfigured()) {
      items.push({
        type: 'not_configured',
        title: 'WhatsApp is not configured',
        detail: 'Set the WHATSAPP_* environment variables to enable sending.',
        href: '/whatsapp/settings',
      });
      return items;
    }

    const settingsRow = await this.settings.getRow();

    const rejected = await this.templateRepo.find({
      where: { status: 'rejected' },
      order: { updatedAt: 'DESC' },
      take: 5,
    });
    for (const t of rejected) {
      items.push({
        type: 'template_rejected',
        title: `Template "${t.name}" was rejected`,
        detail:
          t.rejectedReason ?? 'Meta did not give a reason. Edit and resubmit.',
        href: `/whatsapp/templates/${t.id}`,
      });
    }

    const troubled = await this.campaignRepo.find({
      where: { status: In(['failed', 'paused']) },
      order: { updatedAt: 'DESC' },
      take: 5,
    });
    for (const c of troubled) {
      items.push({
        type: c.status === 'failed' ? 'campaign_failed' : 'campaign_paused',
        title: `Campaign "${c.name}" is ${c.status}`,
        detail:
          c.failureReason ??
          (c.status === 'paused'
            ? 'Resume when ready.'
            : 'Check the failure breakdown.'),
        href: `/whatsapp/campaigns/${c.id}`,
      });
    }

    const highFailure = await this.dataSource.query<
      Array<{
        id: string;
        name: string;
        sent_count: number;
        failed_count: number;
      }>
    >(
      `SELECT id, name, sent_count, failed_count
         FROM whatsapp_campaigns
        WHERE status IN ('sending','completed')
          AND (sent_count + failed_count) >= 20
          AND failed_count::numeric / NULLIF(sent_count + failed_count, 0) > 0.2
          AND updated_at > now() - interval '7 days'
        ORDER BY updated_at DESC LIMIT 5`,
    );
    for (const c of highFailure) {
      const pct = Math.round(
        (Number(c.failed_count) /
          (Number(c.sent_count) + Number(c.failed_count))) *
          100,
      );
      items.push({
        type: 'high_failure_rate',
        title: `High failure rate on "${c.name}"`,
        detail: `${pct}% of attempted messages failed. Check phone quality and template status.`,
        href: `/whatsapp/campaigns/${c.id}`,
      });
    }

    const unanswered = await this.contactRepo
      .createQueryBuilder('c')
      .where('c.unread_count > 0')
      .andWhere(`c.last_inbound_at < now() - interval '2 hours'`)
      .getCount();
    if (unanswered > 0) {
      items.push({
        type: 'unanswered_replies',
        title: `${unanswered} conversation${unanswered === 1 ? '' : 's'} waiting for a reply`,
        detail:
          'Replies are free inside the 24h window; after that you need a template.',
        href: '/whatsapp/inbox',
      });
    }

    const quality = (settingsRow.phoneMeta?.quality_rating ?? '').toUpperCase();
    if (quality === 'RED' || quality === 'YELLOW') {
      items.push({
        type: 'quality_drop',
        title: `Phone quality rating is ${quality}`,
        detail:
          'Blocks and reports lower the rating; RED for 7 days lowers the messaging tier.',
        href: '/whatsapp/settings',
      });
    }

    const recentSent = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM whatsapp_messages
        WHERE direction = 'outbound' AND sent_at > now() - interval '24 hours'`,
    );
    const lastEvent = settingsRow.webhookLastEventAt?.getTime() ?? 0;
    if (
      Number(recentSent[0]?.count ?? 0) > 0 &&
      Date.now() - lastEvent > 24 * 60 * 60 * 1000
    ) {
      items.push({
        type: 'webhook_silent',
        title: 'No webhook events in the last 24h',
        detail:
          'Messages were sent but no delivery statuses arrived. Check the webhook URL and subscriptions in Meta.',
        href: '/whatsapp/settings',
      });
    }

    return items;
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
