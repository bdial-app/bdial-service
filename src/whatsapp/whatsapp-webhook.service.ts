import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import {
  WhatsAppMessage,
  WhatsAppMessageKind,
} from '../entities/whatsapp-message.entity';
import { MetaCloudApiService } from './meta-cloud-api.service';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { phoneDigitVariants, toApiDigits, toE164 } from './whatsapp-phone.util';
import {
  describeMetaError,
  MESSAGE_STATUS_RANK,
  OPT_IN_AUTO_REPLY,
  OPT_OUT_AUTO_REPLY,
} from './whatsapp.constants';

// ── Webhook payload shapes (only the parts we read) ───────────────────────────

interface WebhookStatus {
  id: string;
  /** 'sent' | 'delivered' | 'read' | 'failed' (open set) */
  status: string;
  timestamp?: string;
  recipient_id?: string;
  pricing?: { billable?: boolean; category?: string; pricing_model?: string };
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: { details?: string };
  }>;
}

interface WebhookInboundMessage {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
  reaction?: { emoji?: string };
  location?: { name?: string; address?: string };
}

interface WebhookValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WebhookInboundMessage[];
  statuses?: WebhookStatus[];
  // message_template_status_update
  event?: string;
  message_template_id?: number | string;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string | null;
  // phone_number_quality_update
  current_limit?: string;
  display_phone_number?: string;
}

interface WebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: WebhookValue }>;
  }>;
}

const KIND_BY_TYPE: Record<string, WhatsAppMessageKind> = {
  text: 'text',
  image: 'image',
  document: 'document',
  audio: 'audio',
  video: 'video',
  sticker: 'sticker',
  location: 'location',
  reaction: 'reaction',
  button: 'text',
  interactive: 'text',
};

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    @InjectRepository(WhatsAppMessage)
    private readonly messageRepo: Repository<WhatsAppMessage>,
    private readonly meta: MetaCloudApiService,
    private readonly settings: WhatsAppSettingsService,
    private readonly templates: WhatsAppTemplateService,
  ) {}

  /** HMAC-SHA256 of the raw body with the app secret vs `sha256=<hex>`. */
  verifySignature(
    rawBody: Buffer | undefined,
    header: string | undefined,
  ): boolean {
    const secret = this.meta.appSecret;
    if (!secret || !rawBody || !header) return false;
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(header.trim());
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Process a verified webhook body; never throws. */
  async handle(body: unknown): Promise<void> {
    try {
      await this.settings.touchWebhook();
    } catch (err) {
      this.logger.warn(`touchWebhook failed: ${errMessage(err)}`);
    }
    const payload = (body ?? {}) as WebhookBody;
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        try {
          switch (change.field) {
            case 'messages':
              for (const s of value.statuses ?? []) await this.applyStatus(s);
              for (const m of value.messages ?? [])
                await this.applyInbound(m, value);
              break;
            case 'message_template_status_update':
              await this.templates.applyStatusUpdate({
                metaTemplateId:
                  value.message_template_id != null
                    ? String(value.message_template_id)
                    : null,
                name: value.message_template_name ?? null,
                language: value.message_template_language ?? null,
                event: value.event ?? '',
                reason: value.reason ?? null,
              });
              break;
            case 'phone_number_quality_update':
              await this.applyQualityUpdate(value);
              break;
            default:
              this.logger.debug(
                `Unhandled webhook field: ${change.field ?? '?'}`,
              );
          }
        } catch (err) {
          this.logger.error(
            `Webhook change (${change.field ?? '?'}) failed: ${errMessage(err)}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      }
    }
  }

  // ── Statuses ─────────────────────────────────────────────────────────────

  private async applyStatus(s: WebhookStatus): Promise<void> {
    const msg = await this.messageRepo.findOne({
      where: { waMessageId: s.id },
    });
    if (!msg) return;
    const at = s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();
    const settings = await this.settings.getRow();

    if (s.status === 'failed') {
      if (msg.status === 'failed') return;
      const e = s.errors?.[0];
      const desc = describeMetaError(
        e?.code ?? null,
        undefined,
        e?.title ?? e?.message,
      );
      const detail = e?.error_data?.details;
      await this.dataSource.query(
        `UPDATE whatsapp_messages
            SET status = 'failed', failed_at = $2, error_code = $3, error_message = $4
          WHERE id = $1 AND status <> 'failed'`,
        [
          msg.id,
          at,
          e?.code ?? null,
          detail ? `${desc.message}: ${detail}` : desc.message,
        ],
      );
      if (msg.campaignId) {
        await this.dataSource.query(
          `UPDATE whatsapp_campaigns SET failed_count = failed_count + 1 WHERE id = $1`,
          [msg.campaignId],
        );
      }
      if (desc.capHit) {
        await this.contactRepo.update(
          { id: msg.contactId },
          { lastCapHitAt: new Date() },
        );
      }
      if (desc.markUnreachable) {
        await this.contactRepo.update(
          { id: msg.contactId },
          { reachable: false },
        );
      }
      return;
    }

    const newRank = MESSAGE_STATUS_RANK[s.status];
    if (newRank === undefined) return;
    const currentRank = MESSAGE_STATUS_RANK[msg.status] ?? -1;

    // Pricing arrives on the first (sent/delivered) status; record it once.
    let costInr = 0;
    if (s.pricing && msg.billable === null) {
      const billable = Boolean(s.pricing.billable);
      const category = (s.pricing.category ?? '').toLowerCase();
      costInr = billable ? this.settings.rateFor(category, settings.rates) : 0;
      await this.dataSource.query(
        `UPDATE whatsapp_messages
            SET billable = $2, pricing_category = $3, cost_inr = $4
          WHERE id = $1 AND billable IS NULL`,
        [msg.id, billable, category || null, costInr],
      );
      if (msg.campaignId && costInr > 0) {
        await this.dataSource.query(
          `UPDATE whatsapp_campaigns SET actual_cost_inr = actual_cost_inr + $2 WHERE id = $1`,
          [msg.campaignId, costInr],
        );
      }
    }

    const sets: string[] = [];
    const params: unknown[] = [msg.id];
    const firstDelivered =
      (s.status === 'delivered' || s.status === 'read') && !msg.deliveredAt;
    const firstRead = s.status === 'read' && !msg.readAt;
    if (newRank > currentRank && msg.status !== 'failed') {
      params.push(s.status);
      sets.push(`status = $${params.length}`);
    }
    if (s.status === 'sent' && !msg.sentAt) {
      params.push(at);
      sets.push(`sent_at = $${params.length}`);
    }
    if (firstDelivered) {
      params.push(at);
      sets.push(`delivered_at = $${params.length}`);
    }
    if (firstRead) {
      params.push(at);
      sets.push(`read_at = $${params.length}`);
    }
    if (!sets.length) return;
    await this.dataSource.query(
      `UPDATE whatsapp_messages SET ${sets.join(', ')} WHERE id = $1`,
      params,
    );

    if (msg.campaignId && (firstDelivered || firstRead)) {
      const inc: string[] = [];
      if (firstDelivered) inc.push('delivered_count = delivered_count + 1');
      if (firstRead) inc.push('read_count = read_count + 1');
      await this.dataSource.query(
        `UPDATE whatsapp_campaigns SET ${inc.join(', ')} WHERE id = $1`,
        [msg.campaignId],
      );
    }
  }

  // ── Inbound ──────────────────────────────────────────────────────────────

  private async applyInbound(
    m: WebhookInboundMessage,
    value: WebhookValue,
  ): Promise<void> {
    const phone = toE164(`+${m.from}`) ?? `+${m.from}`;
    const profileName =
      value.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? null;
    const contact = await this.upsertInboundContact(phone, profileName);

    const type = m.type ?? 'unknown';
    const kind: WhatsAppMessageKind = KIND_BY_TYPE[type] ?? 'unknown';
    const body = this.inboundBody(m);
    const at = m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();

    // Dedupe on wa_message_id (partial unique index): a redelivered event
    // inserts nothing and we stop here.
    const inserted = await this.dataSource.query<Array<{ id: string }>>(
      `INSERT INTO whatsapp_messages
         (contact_id, campaign_id, provider_id, direction, kind, status,
          rendered_body, payload, wa_message_id, created_at)
       VALUES ($1, NULL, $2, 'inbound', $3, 'received', $4, $5::jsonb, $6, $7)
       ON CONFLICT (wa_message_id) WHERE wa_message_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [contact.id, contact.providerId, kind, body, JSON.stringify(m), m.id, at],
    );
    if (!inserted.length) return; // duplicate delivery

    await this.dataSource.query(
      `UPDATE whatsapp_contacts
          SET last_inbound_at = GREATEST(COALESCE(last_inbound_at, $2), $2),
              unread_count = unread_count + 1, reachable = true
        WHERE id = $1`,
      [contact.id, at],
    );

    await this.bumpRepliedCount(contact.id, at);
    await this.handleKeywords(contact, body);
  }

  private inboundBody(m: WebhookInboundMessage): string {
    switch (m.type) {
      case 'text':
        return m.text?.body ?? '';
      case 'button':
        return m.button?.text ?? m.button?.payload ?? '[button]';
      case 'interactive':
        return (
          m.interactive?.button_reply?.title ??
          m.interactive?.list_reply?.title ??
          '[interactive]'
        );
      case 'image':
        return m.image?.caption ? `[image] ${m.image.caption}` : '[image]';
      case 'video':
        return m.video?.caption ? `[video] ${m.video.caption}` : '[video]';
      case 'document':
        return m.document?.caption || m.document?.filename
          ? `[document] ${m.document?.caption ?? m.document?.filename ?? ''}`.trim()
          : '[document]';
      case 'reaction':
        return m.reaction?.emoji
          ? `[reaction] ${m.reaction.emoji}`
          : '[reaction]';
      case 'location':
        return `[location] ${m.location?.name ?? m.location?.address ?? ''}`.trim();
      case 'audio':
        return '[audio]';
      case 'sticker':
        return '[sticker]';
      default:
        return `[${m.type ?? 'unknown'}]`;
    }
  }

  private async upsertInboundContact(
    phone: string,
    displayName: string | null,
  ): Promise<WhatsAppContact> {
    let contact = await this.contactRepo.findOne({ where: { phone } });
    if (!contact) {
      const link = await this.linkByPhone(phone);
      contact = await this.contactRepo.save(
        this.contactRepo.create({
          phone,
          providerId: link?.providerId ?? null,
          userId: link?.userId ?? null,
          displayName,
        }),
      );
      return contact;
    }
    let dirty = false;
    if (displayName && displayName !== contact.displayName) {
      contact.displayName = displayName;
      dirty = true;
    }
    if (!contact.providerId) {
      const link = await this.linkByPhone(phone);
      if (link) {
        contact.providerId = link.providerId;
        contact.userId = link.userId;
        dirty = true;
      }
    }
    if (dirty) await this.contactRepo.save(contact);
    return contact;
  }

  /** Match an inbound number to a provider via whatsapp_number / contact_number / users.mobile_number. */
  private async linkByPhone(
    phone: string,
  ): Promise<{ providerId: string; userId: string } | null> {
    const variants = phoneDigitVariants(phone);
    const rows = await this.dataSource.query<
      Array<{ id: string; user_id: string }>
    >(
      `SELECT p.id, p.user_id
         FROM providers p
         LEFT JOIN users u ON u.id = p.user_id
        WHERE p.deleted_at IS NULL
          AND (regexp_replace(COALESCE(p.whatsapp_number, ''), '\\D', '', 'g') = ANY($1::text[])
            OR regexp_replace(COALESCE(p.contact_number, ''), '\\D', '', 'g') = ANY($1::text[])
            OR regexp_replace(COALESCE(u.mobile_number, ''), '\\D', '', 'g') = ANY($1::text[]))
        ORDER BY (regexp_replace(COALESCE(p.whatsapp_number, ''), '\\D', '', 'g') = ANY($1::text[])) DESC,
                 p.created_at ASC
        LIMIT 1`,
      [variants],
    );
    const r = rows[0];
    return r ? { providerId: r.id, userId: r.user_id } : null;
  }

  /** Once per contact per campaign: a reply within 7 days of a campaign message. */
  private async bumpRepliedCount(contactId: string, at: Date): Promise<void> {
    const rows = await this.dataSource.query<
      Array<{ campaign_id: string; created_at: Date }>
    >(
      `SELECT campaign_id, created_at FROM whatsapp_messages
        WHERE contact_id = $1 AND direction = 'outbound' AND campaign_id IS NOT NULL
          AND created_at > $2::timestamptz - interval '7 days' AND created_at <= $2
        ORDER BY created_at DESC LIMIT 1`,
      [contactId, at],
    );
    const last = rows[0];
    if (!last) return;
    const prior = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM whatsapp_messages
        WHERE contact_id = $1 AND direction = 'inbound'
          AND created_at > $2 AND created_at < $3`,
      [contactId, last.created_at, at],
    );
    if (Number(prior[0]?.count ?? 0) > 0) return;
    await this.dataSource.query(
      `UPDATE whatsapp_campaigns SET replied_count = replied_count + 1 WHERE id = $1`,
      [last.campaign_id],
    );
  }

  private async handleKeywords(
    contact: WhatsAppContact,
    body: string,
  ): Promise<void> {
    const word = body.trim().toUpperCase();
    if (!word || word.length > 40) return;
    const settings = await this.settings.getRow();
    const optOut = (settings.optOutKeywords ?? []).map((k) => k.toUpperCase());
    const optIn = (settings.optInKeywords ?? []).map((k) => k.toUpperCase());

    if (optOut.includes(word)) {
      await this.contactRepo.update(
        { id: contact.id },
        {
          consent: 'opted_out',
          consentChangedAt: new Date(),
          consentSource: 'keyword',
        },
      );
      await this.autoReply(contact, OPT_OUT_AUTO_REPLY);
    } else if (optIn.includes(word)) {
      await this.contactRepo.update(
        { id: contact.id },
        {
          consent: 'opted_in',
          consentChangedAt: new Date(),
          consentSource: 'keyword',
        },
      );
      await this.autoReply(contact, OPT_IN_AUTO_REPLY);
    }
  }

  /** Free text inside the window we just received a message in. */
  private async autoReply(
    contact: WhatsAppContact,
    text: string,
  ): Promise<void> {
    if (!this.meta.isConfigured()) return;
    const payload = this.meta.buildTextPayload(
      toApiDigits(contact.phone),
      text,
    );
    const row = this.messageRepo.create({
      contactId: contact.id,
      providerId: contact.providerId,
      direction: 'outbound',
      kind: 'text',
      status: 'sending',
      renderedBody: text,
      payload,
      attempts: 1,
    });
    const saved = await this.messageRepo.save(row);
    try {
      const res = await this.meta.sendPayload(payload);
      await this.messageRepo.update(
        { id: saved.id },
        { status: 'sent', waMessageId: res.messageId, sentAt: new Date() },
      );
      await this.contactRepo.update(
        { id: contact.id },
        { lastOutboundAt: new Date() },
      );
    } catch (err) {
      await this.messageRepo.update(
        { id: saved.id },
        {
          status: 'failed',
          failedAt: new Date(),
          errorMessage: errMessage(err),
        },
      );
    }
  }

  // ── Quality ──────────────────────────────────────────────────────────────

  private async applyQualityUpdate(value: WebhookValue): Promise<void> {
    const patch: Record<string, string | null> = {};
    if (value.current_limit) patch.messaging_limit_tier = value.current_limit;
    if (value.event === 'FLAGGED') patch.quality_rating = 'RED';
    if (value.event === 'UNFLAGGED') patch.quality_rating = 'GREEN';
    if (Object.keys(patch).length) await this.settings.patchPhoneMeta(patch);
    // The authoritative values come from GET /{phone_number_id}; refresh if we can.
    await this.settings.refreshPhoneMetaQuietly();
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
