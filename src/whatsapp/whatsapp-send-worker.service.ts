import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import {
  MetaCloudApiService,
  WhatsAppApiError,
} from './meta-cloud-api.service';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { returnedRows } from '../common/utils/returned-rows';
import {
  backoffMs,
  describeMetaError,
  WHATSAPP_CLAIM_CAP_PER_TICK,
  WHATSAPP_LEASE_MS,
  WHATSAPP_MAX_PER_SECOND,
  WHATSAPP_THROTTLE_PAUSE_MS,
  WHATSAPP_MAX_ATTEMPTS,
  WHATSAPP_SEND_CONCURRENCY,
  WHATSAPP_STALE_LOCK_MINUTES,
  WHATSAPP_TICK_MS,
} from './whatsapp.constants';

interface ClaimedRow {
  id: string;
  contact_id: string;
  campaign_id: string;
  payload: Record<string, unknown> | null;
  attempts: number;
}

interface SendingCampaign {
  id: string;
  rate_per_minute: number | null;
  category: string;
}

/**
 * Drains `whatsapp_messages` for campaigns in `sending`.
 * Every 10s: release stale locks, honour the IST send window, claim a batch
 * with FOR UPDATE SKIP LOCKED, respect the daily cap, send with concurrency 5,
 * then mark finished campaigns completed.
 */
@Injectable()
export class WhatsAppSendWorkerService {
  private readonly logger = new Logger(WhatsAppSendWorkerService.name);
  private ticking = false;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WhatsAppMessage)
    private readonly messageRepo: Repository<WhatsAppMessage>,
    @InjectRepository(WhatsAppCampaign)
    private readonly campaignRepo: Repository<WhatsAppCampaign>,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    private readonly meta: MetaCloudApiService,
    private readonly settings: WhatsAppSettingsService,
  ) {}

  /** This process, for the send lease. */
  private readonly instanceId = `${process.env.HOSTNAME ?? 'local'}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;

  @Interval(WHATSAPP_TICK_MS)
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      // Several backends share this database; only the lease holder sends,
      // so their bursts can't add up past Meta's per-number limit.
      if (!(await this.holdLease())) return;
      await this.releaseStaleLocks();
      const sending = await this.sendingCampaigns();
      if (sending.length) {
        if (this.meta.isConfigured()) {
          await this.processBatch(sending);
        } else {
          this.logger.warn(
            'Campaigns are sending but WhatsApp env is not configured',
          );
        }
      }
      await this.completeFinishedCampaigns();
    } catch (err) {
      this.logger.error(
        `Worker tick failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    } finally {
      this.ticking = false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async promoteScheduled(): Promise<void> {
    try {
      const res = await this.campaignRepo
        .createQueryBuilder()
        .update(WhatsAppCampaign)
        .set({ status: 'sending', startedAt: () => 'now()' })
        .where(
          `status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()`,
        )
        .execute();
      if (res.affected)
        this.logger.log(`Started ${res.affected} scheduled campaign(s)`);
    } catch (err) {
      this.logger.error(
        `promoteScheduled failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async hourlyPhoneMeta(): Promise<void> {
    await this.settings.refreshPhoneMetaQuietly();
  }

  // ── Steps ────────────────────────────────────────────────────────────────

  /** Take or renew the send lease. False when another backend holds it. */
  private async holdLease(): Promise<boolean> {
    const res: unknown = await this.dataSource.query(
      `UPDATE whatsapp_settings
          SET worker_lease_owner = $1,
              worker_lease_until = now() + ($2 || ' milliseconds')::interval
        WHERE id = 1
          AND (worker_lease_until IS NULL OR worker_lease_until < now() OR worker_lease_owner = $1)
        RETURNING id`,
      [this.instanceId, String(WHATSAPP_LEASE_MS)],
    );
    if (returnedRows(res).length) return true;
    // No settings row yet: create it, then try again next tick.
    await this.settings.getRow();
    return false;
  }

  /** Hold every queued message of a campaign for a while (Meta asked us to slow down). */
  private async throttleCampaign(campaignId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE whatsapp_messages
          SET send_after = GREATEST(COALESCE(send_after, now()), now() + ($2 || ' milliseconds')::interval)
        WHERE campaign_id = $1 AND status = 'queued'`,
      [campaignId, String(WHATSAPP_THROTTLE_PAUSE_MS)],
    );
    this.logger.warn(
      `Meta rate limit (130429): pausing campaign ${campaignId} for ${WHATSAPP_THROTTLE_PAUSE_MS / 1000}s`,
    );
  }

  private async releaseStaleLocks(): Promise<void> {
    await this.dataSource.query(
      `UPDATE whatsapp_messages
          SET status = 'queued', locked_at = NULL
        WHERE status = 'sending'
          AND locked_at < now() - ($1 || ' minutes')::interval`,
      [String(WHATSAPP_STALE_LOCK_MINUTES)],
    );
  }

  private async sendingCampaigns(): Promise<SendingCampaign[]> {
    return this.dataSource.query<SendingCampaign[]>(
      `SELECT c.id, c.rate_per_minute, t.category::text AS category
         FROM whatsapp_campaigns c
         JOIN whatsapp_templates t ON t.id = c.template_id
        WHERE c.status = 'sending'`,
    );
  }

  private async processBatch(sending: SendingCampaign[]): Promise<void> {
    const settings = await this.settings.getRow();
    const now = new Date();

    // 1. Send window (IST): claim nothing until it opens. Queued rows are left
    // as they are rather than stamped with the opening time, so widening the
    // window in Settings takes effect on the next tick instead of after the
    // old opening time.
    if (!this.settings.isWithinSendWindow(settings, now)) return;

    // 2. Claim.
    const perTick = sending.reduce(
      (sum, c) =>
        sum +
        Math.max(
          1,
          Math.ceil((c.rate_per_minute ?? settings.ratePerMinute) / 6),
        ),
      0,
    );
    const n = Math.min(WHATSAPP_CLAIM_CAP_PER_TICK, perTick);
    const claimRes: unknown = await this.dataSource.query(
      `UPDATE whatsapp_messages
          SET status = 'sending', locked_at = now(), attempts = attempts + 1
        WHERE id IN (
          SELECT m.id FROM whatsapp_messages m
            JOIN whatsapp_campaigns c ON c.id = m.campaign_id
           WHERE m.status = 'queued' AND c.status = 'sending'
             AND (m.send_after IS NULL OR m.send_after <= now())
           ORDER BY m.created_at
           LIMIT $1
           FOR UPDATE SKIP LOCKED)
        RETURNING id, contact_id, campaign_id, payload, attempts`,
      [n],
    );
    const claimed = returnedRows<ClaimedRow>(claimRes);
    if (!claimed.length) return;

    // 3. Daily cap on unique recipients per rolling 24h.
    const capRow = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(DISTINCT contact_id)::text AS count
         FROM whatsapp_messages
        WHERE direction = 'outbound' AND sent_at > now() - interval '24 hours'`,
    );
    const used = Number(capRow[0]?.count ?? 0);
    let headroom = Math.max(0, settings.dailyCap - used);
    const recent = await this.dataSource.query<Array<{ contact_id: string }>>(
      `SELECT DISTINCT contact_id FROM whatsapp_messages
        WHERE direction = 'outbound' AND sent_at > now() - interval '24 hours'
          AND contact_id = ANY($1::uuid[])`,
      [claimed.map((c) => c.contact_id)],
    );
    const alreadyCounted = new Set(recent.map((r) => r.contact_id));
    const toSend: ClaimedRow[] = [];
    const overflow: ClaimedRow[] = [];
    const newContacts = new Set<string>();
    for (const row of claimed) {
      if (
        alreadyCounted.has(row.contact_id) ||
        newContacts.has(row.contact_id)
      ) {
        toSend.push(row);
      } else if (headroom > 0) {
        headroom--;
        newContacts.add(row.contact_id);
        toSend.push(row);
      } else {
        overflow.push(row);
      }
    }
    if (overflow.length) {
      await this.dataSource.query(
        `UPDATE whatsapp_messages
            SET status = 'queued', locked_at = NULL, attempts = GREATEST(attempts - 1, 0),
                send_after = now() + interval '1 hour'
          WHERE id = ANY($1::uuid[])`,
        [overflow.map((o) => o.id)],
      );
      this.logger.warn(
        `Daily cap reached; deferred ${overflow.length} message(s) by 1h`,
      );
    }

    // 4. Send, spread evenly over the tick (no bursts) and never faster than
    // WHATSAPP_MAX_PER_SECOND. If Meta says "too many", stop this campaign's
    // remaining sends and hand them back to the queue.
    const categoryByCampaign = new Map(sending.map((c) => [c.id, c.category]));
    const gapMs = Math.max(
      1000 / WHATSAPP_MAX_PER_SECOND,
      (WHATSAPP_TICK_MS * 0.9) / Math.max(1, toSend.length),
    );
    const throttled = new Set<string>();
    const handedBack: ClaimedRow[] = [];
    let cursor = 0;
    let nextStart = Date.now();
    const workers = Array.from(
      { length: Math.min(WHATSAPP_SEND_CONCURRENCY, toSend.length) },
      async () => {
        while (cursor < toSend.length) {
          const row = toSend[cursor++];
          const wait = nextStart - Date.now();
          nextStart = Math.max(nextStart, Date.now()) + gapMs;
          if (wait > 0) await sleep(wait);
          if (throttled.has(row.campaign_id)) {
            handedBack.push(row);
            continue;
          }
          const rateLimited = await this.sendOne(
            row,
            categoryByCampaign.get(row.campaign_id) ?? 'utility',
          );
          if (rateLimited && !throttled.has(row.campaign_id)) {
            throttled.add(row.campaign_id);
            await this.throttleCampaign(row.campaign_id);
          }
        }
      },
    );
    await Promise.all(workers);
    if (handedBack.length) {
      await this.dataSource.query(
        `UPDATE whatsapp_messages
            SET status = 'queued', locked_at = NULL, attempts = GREATEST(attempts - 1, 0),
                send_after = now() + ($2 || ' milliseconds')::interval
          WHERE id = ANY($1::uuid[]) AND status = 'sending'`,
        [handedBack.map((r) => r.id), String(WHATSAPP_THROTTLE_PAUSE_MS)],
      );
    }
  }

  /** Send one message. True when Meta answered "too many messages" (130429). */
  private async sendOne(row: ClaimedRow, category: string): Promise<boolean> {
    if (!row.payload) {
      await this.markFailed(row, null, 'Message has no payload', false);
      return false;
    }
    try {
      const res = await this.meta.sendPayload(row.payload);
      await this.dataSource.query(
        `UPDATE whatsapp_messages
            SET status = 'sent', wa_message_id = $2, sent_at = now(), locked_at = NULL,
                error_code = NULL, error_message = NULL
          WHERE id = $1 AND status = 'sending'`,
        [row.id, res.messageId],
      );
      await this.dataSource.query(
        `UPDATE whatsapp_campaigns
            SET sent_count = sent_count + 1, queued_count = GREATEST(queued_count - 1, 0)
          WHERE id = $1`,
        [row.campaign_id],
      );
      await this.dataSource.query(
        category === 'marketing'
          ? `UPDATE whatsapp_contacts SET last_outbound_at = now(), last_marketing_at = now() WHERE id = $1`
          : `UPDATE whatsapp_contacts SET last_outbound_at = now() WHERE id = $1`,
        [row.contact_id],
      );
      return false;
    } catch (err) {
      await this.handleSendError(row, err);
      return err instanceof WhatsAppApiError && err.code === 130429;
    }
  }

  private async handleSendError(row: ClaimedRow, err: unknown): Promise<void> {
    const apiErr = err instanceof WhatsAppApiError ? err : null;
    const code = apiErr?.code ?? null;
    const desc = describeMetaError(
      code,
      apiErr?.httpStatus,
      apiErr?.message ?? errMessage(err),
    );
    const message = apiErr?.details
      ? `${desc.message}: ${apiErr.details}`
      : desc.message;

    if (desc.retryable && row.attempts < WHATSAPP_MAX_ATTEMPTS) {
      const delay = backoffMs(row.attempts);
      await this.dataSource.query(
        `UPDATE whatsapp_messages
            SET status = 'queued', locked_at = NULL, error_code = $2, error_message = $3,
                send_after = now() + ($4 || ' milliseconds')::interval
          WHERE id = $1 AND status = 'sending'`,
        [row.id, code, message, String(delay)],
      );
      return;
    }

    await this.markFailed(row, code, message, Boolean(desc.pauseCampaign));

    if (desc.capHit) {
      await this.contactRepo.update(
        { id: row.contact_id },
        { lastCapHitAt: new Date() },
      );
    }
    if (desc.markUnreachable) {
      await this.contactRepo.update(
        { id: row.contact_id },
        { reachable: false },
      );
    }
  }

  private async markFailed(
    row: ClaimedRow,
    code: number | null,
    message: string,
    pauseCampaign: boolean,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE whatsapp_messages
          SET status = 'failed', failed_at = now(), locked_at = NULL,
              error_code = $2, error_message = $3
        WHERE id = $1 AND status = 'sending'`,
      [row.id, code, message],
    );
    await this.dataSource.query(
      `UPDATE whatsapp_campaigns
          SET failed_count = failed_count + 1, queued_count = GREATEST(queued_count - 1, 0)
        WHERE id = $1`,
      [row.campaign_id],
    );
    if (pauseCampaign) {
      const res = await this.dataSource.query<unknown[]>(
        `UPDATE whatsapp_campaigns
            SET status = 'paused', failure_reason = $2
          WHERE id = $1 AND status = 'sending'
          RETURNING id`,
        [
          row.campaign_id,
          `Paused automatically: ${message}${code != null ? ` (Meta ${code})` : ''}`,
        ],
      );
      if (returnedRows(res).length) {
        this.logger.warn(`Campaign ${row.campaign_id} paused: ${message}`);
      }
    }
  }

  private async completeFinishedCampaigns(): Promise<void> {
    const res = await this.dataSource.query<unknown[]>(
      `UPDATE whatsapp_campaigns c
          SET status = 'completed', completed_at = now(), queued_count = 0
        WHERE c.status = 'sending'
          AND NOT EXISTS (
            SELECT 1 FROM whatsapp_messages m
             WHERE m.campaign_id = c.id AND m.status IN ('queued','sending'))
        RETURNING c.id`,
    );
    const completed = returnedRows(res).length;
    if (completed) {
      this.logger.log(`Completed ${completed} campaign(s)`);
    }
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
