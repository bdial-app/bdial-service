import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { Provider } from '../entities/provider.entity';
import {
  MetaCloudApiService,
  WhatsAppApiError,
} from './meta-cloud-api.service';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppVariableService } from './whatsapp-variable.service';
import { WhatsAppAudienceService } from './whatsapp-audience.service';
import { toApiDigits, toE164 } from './whatsapp-phone.util';
import { describeMetaError, WHATSAPP_WINDOW_MS } from './whatsapp.constants';
import {
  ContactExtras,
  ContactJson,
  MessageJson,
  toContactJson,
  toMessageJson,
  windowExpiresAt,
} from './whatsapp.mappers';
import { paginate, PaginatedResult } from './whatsapp.types';
import {
  ConversationsQueryDto,
  DirectSendDto,
  ThreadQueryDto,
} from './dto/inbox.dto';

interface ConversationRow {
  contact_id: string;
  phone: string;
  display_name: string | null;
  consent: string;
  unread_count: number;
  last_inbound_at: Date | null;
  provider_id: string | null;
  brand_name: string | null;
  city: string | null;
  lm_direction: string;
  lm_kind: string;
  lm_body: string | null;
  lm_at: Date;
  lm_status: string;
}

export interface DirectSendInput {
  text?: string;
  templateId?: string;
  template?: WhatsAppTemplate;
  variables?: Record<string, string>;
  headerMediaUrl?: string | null;
  buttonValues?: Record<string, string>;
}

@Injectable()
export class WhatsAppInboxService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    @InjectRepository(WhatsAppMessage)
    private readonly messageRepo: Repository<WhatsAppMessage>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly meta: MetaCloudApiService,
    private readonly settings: WhatsAppSettingsService,
    private readonly templates: WhatsAppTemplateService,
    private readonly variables: WhatsAppVariableService,
    private readonly audience: WhatsAppAudienceService,
  ) {}

  // ── Conversations ────────────────────────────────────────────────────────

  async listConversations(
    query: ConversationsQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const params: unknown[] = [];
    const where: string[] = [];
    if (query.filter === 'unread') where.push('c.unread_count > 0');
    if (query.filter === 'open_window') {
      where.push(`c.last_inbound_at > now() - interval '24 hours'`);
    }
    if (query.search) {
      params.push(`%${query.search.trim()}%`);
      where.push(
        `(c.phone ILIKE $${params.length} OR c.display_name ILIKE $${params.length} OR p.brand_name ILIKE $${params.length})`,
      );
    }
    const whereSql = where.length ? `AND ${where.join(' AND ')}` : '';
    const base = `
      FROM whatsapp_contacts c
      LEFT JOIN providers p ON p.id = c.provider_id
      JOIN LATERAL (
        SELECT m.direction::text AS lm_direction, m.kind::text AS lm_kind, m.rendered_body AS lm_body,
               m.created_at AS lm_at, m.status::text AS lm_status
          FROM whatsapp_messages m
         WHERE m.contact_id = c.id
         ORDER BY m.created_at DESC
         LIMIT 1) lm ON true
      WHERE true ${whereSql}`;

    const countRows = await this.dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count ${base}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);
    const rows = await this.dataSource.query<ConversationRow[]>(
      `SELECT c.id AS contact_id, c.phone, c.display_name, c.consent::text AS consent, c.unread_count,
              c.last_inbound_at, p.id AS provider_id, p.brand_name, p.city,
              lm.lm_direction, lm.lm_kind, lm.lm_body, lm.lm_at, lm.lm_status
         ${base}
        ORDER BY lm.lm_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    );
    const items = rows.map((r) => ({
      contactId: r.contact_id,
      phone: r.phone,
      displayName: r.display_name,
      provider: r.provider_id
        ? { id: r.provider_id, brandName: r.brand_name ?? '', city: r.city }
        : null,
      consent: r.consent,
      unreadCount: Number(r.unread_count),
      lastMessage: {
        direction: r.lm_direction,
        kind: r.lm_kind,
        body: r.lm_body,
        at: new Date(r.lm_at).toISOString(),
        status: r.lm_status,
      },
      windowExpiresAt: windowExpiresAt(r.last_inbound_at),
    }));
    return paginate(items, total, page, limit);
  }

  async thread(
    contactId: string,
    query: ThreadQueryDto,
  ): Promise<{
    items: MessageJson[];
    contact: ContactJson;
    windowExpiresAt: string | null;
  }> {
    const contact = await this.audience.getContact(contactId);
    const limit = query.limit ?? 50;
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.campaign', 'c')
      .where('m.contact_id = :contactId', { contactId })
      .orderBy('m.created_at', 'DESC')
      .take(limit);
    if (query.before) {
      qb.andWhere('m.created_at < :before', { before: new Date(query.before) });
    }
    const rows = await qb.getMany();
    rows.reverse();
    const extras = await this.audience.contactExtras([contactId]);
    return {
      items: rows.map((m) => toMessageJson(m)),
      contact: toContactJson(contact, extras.get(contactId) ?? {}),
      windowExpiresAt: windowExpiresAt(contact.lastInboundAt),
    };
  }

  async reply(contactId: string, dto: DirectSendDto): Promise<MessageJson> {
    const contact = await this.audience.getContact(contactId);
    const m = await this.sendDirect(contact, dto, contact.providerId);
    return toMessageJson(m);
  }

  async markRead(contactId: string): Promise<{ ok: true }> {
    const contact = await this.audience.getContact(contactId);
    await this.contactRepo.update({ id: contactId }, { unreadCount: 0 });
    if (this.meta.isConfigured()) {
      const latest = await this.messageRepo.findOne({
        where: { contactId, direction: 'inbound' },
        order: { createdAt: 'DESC' },
      });
      if (latest?.waMessageId) {
        try {
          await this.meta.markRead(latest.waMessageId);
        } catch {
          // Read receipts are cosmetic; never fail the request for them.
        }
      }
    }
    void contact;
    return { ok: true };
  }

  async unreadCount(): Promise<{ count: number }> {
    const count = await this.contactRepo
      .createQueryBuilder('c')
      .where('c.unread_count > 0')
      .getCount();
    return { count };
  }

  // ── Provider page ────────────────────────────────────────────────────────

  async providerPanel(providerId: string) {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      relations: ['user'],
    });
    if (!provider) throw new NotFoundException('Provider not found');
    const phoneCandidates = this.phoneCandidates(provider);
    const contact = await this.findContactForProvider(
      provider,
      phoneCandidates,
    );
    const messages = contact
      ? await this.messageRepo.find({
          where: { contactId: contact.id },
          relations: ['campaign'],
          order: { createdAt: 'DESC' },
          take: 20,
        })
      : [];
    messages.reverse();
    const extras = contact
      ? await this.audience.contactExtras([contact.id])
      : new Map<string, ContactExtras>();
    return {
      contact: contact
        ? toContactJson(contact, extras.get(contact.id) ?? {})
        : null,
      phoneCandidates,
      windowExpiresAt: windowExpiresAt(contact?.lastInboundAt),
      messages: messages.map((m) => toMessageJson(m)),
    };
  }

  async sendToProvider(
    providerId: string,
    dto: DirectSendDto,
  ): Promise<MessageJson> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      relations: ['user'],
    });
    if (!provider) throw new NotFoundException('Provider not found');
    const candidates = this.phoneCandidates(provider);
    let contact = await this.findContactForProvider(provider, candidates);
    if (!contact) {
      const phone = candidates.find((c) => c.normalized)?.normalized;
      if (!phone) {
        throw new UnprocessableEntityException(
          'Provider has no valid WhatsApp-capable phone number',
        );
      }
      contact = await this.ensureContact(phone, provider.id, provider.userId);
    }
    let variables = dto.variables;
    if (dto.templateId && !variables) {
      const template = await this.templates.getEntity(dto.templateId);
      const sources = new Set(
        (template.variables ?? [])
          .map((v) => v.source)
          .filter((s) => s !== 'custom'),
      );
      const resolved = await this.variables.resolveForProviders(
        [provider.id],
        sources,
      );
      variables = this.variables.applyMapping(
        null,
        resolved.get(provider.id),
        template,
      );
    }
    const m = await this.sendDirect(
      contact,
      { ...dto, variables },
      provider.id,
    );
    return toMessageJson(m);
  }

  phoneCandidates(
    provider: Provider,
  ): Array<{ source: string; raw: string; normalized: string | null }> {
    const out: Array<{
      source: string;
      raw: string;
      normalized: string | null;
    }> = [];
    const push = (source: string, raw: string | null | undefined) => {
      if (raw && raw.trim()) out.push({ source, raw, normalized: toE164(raw) });
    };
    push('whatsapp_number', provider.whatsappNumber);
    push('contact_number', provider.contactNumber);
    push('mobile_number', provider.user?.mobileNumber);
    return out;
  }

  private async findContactForProvider(
    provider: Provider,
    candidates: Array<{ normalized: string | null }>,
  ): Promise<WhatsAppContact | null> {
    const byProvider = await this.contactRepo.findOne({
      where: { providerId: provider.id },
      relations: ['provider'],
      order: { lastInboundAt: 'DESC' },
    });
    if (byProvider) return byProvider;
    const phones = candidates
      .map((c) => c.normalized)
      .filter((p): p is string => Boolean(p));
    if (!phones.length) return null;
    const byPhone = await this.contactRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.provider', 'p')
      .where('c.phone IN (:...phones)', { phones })
      .getOne();
    if (byPhone && !byPhone.providerId) {
      byPhone.providerId = provider.id;
      byPhone.userId = provider.userId;
      await this.contactRepo.save(byPhone);
    }
    return byPhone;
  }

  // ── Core one-off send (inbox reply, provider page, test sends) ───────────

  /**
   * Meta's pre-approved `hello_world` sample: the local approved mirror when
   * synced, otherwise a synthetic (unsaved) definition sent by name so the
   * settings test-send works on a fresh test number.
   */
  async helloWorldTemplate(): Promise<WhatsAppTemplate> {
    const local = await this.templates.findByName('hello_world');
    if (local && local.status === 'approved') return local;
    const synthetic = new WhatsAppTemplate();
    synthetic.name = 'hello_world';
    synthetic.language = local?.language ?? 'en_US';
    synthetic.category = 'utility';
    synthetic.status = 'approved';
    synthetic.components = [
      { type: 'HEADER', format: 'TEXT', text: 'Hello World' },
      {
        type: 'BODY',
        text: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.',
      },
      { type: 'FOOTER', text: 'WhatsApp Business Platform sample message' },
    ];
    synthetic.variables = [];
    return synthetic;
  }

  async ensureContact(
    phone: string,
    providerId: string | null = null,
    userId: string | null = null,
  ): Promise<WhatsAppContact> {
    let contact = await this.contactRepo.findOne({ where: { phone } });
    if (!contact) {
      contact = await this.contactRepo.save(
        this.contactRepo.create({ phone, providerId, userId }),
      );
    } else if (providerId && !contact.providerId) {
      contact.providerId = providerId;
      contact.userId = userId;
      await this.contactRepo.save(contact);
    }
    return contact;
  }

  /**
   * Send one message outside a campaign. Free text requires an open 24h
   * window; otherwise a template must be given. Records the row either way.
   */
  async sendDirect(
    contact: WhatsAppContact,
    input: DirectSendInput,
    providerId: string | null,
  ): Promise<WhatsAppMessage> {
    this.meta.assertConfigured();
    const to = toApiDigits(contact.phone);
    let payload: Record<string, unknown>;
    let row: Partial<WhatsAppMessage>;

    if (input.text && input.text.trim()) {
      const open =
        contact.lastInboundAt &&
        new Date(contact.lastInboundAt).getTime() + WHATSAPP_WINDOW_MS >
          Date.now();
      if (!open) {
        throw new UnprocessableEntityException(
          'The 24h customer-service window is closed; send a template instead',
        );
      }
      payload = this.meta.buildTextPayload(to, input.text.trim());
      row = { kind: 'text', renderedBody: input.text.trim() };
    } else {
      const template =
        input.template ??
        (input.templateId
          ? await this.templates.getEntity(input.templateId)
          : null);
      if (!template)
        throw new BadRequestException('Provide text or templateId');
      if (template.status !== 'approved') {
        throw new UnprocessableEntityException(
          `Template "${template.name}" is ${template.status}; only approved templates can be sent`,
        );
      }
      const variables = {
        ...this.templates.sampleVariables(template),
        ...(input.variables ?? {}),
      };
      const buttonValues =
        input.buttonValues ??
        this.variables.buttonValues(null, providerId, undefined, template);
      const components = this.templates.buildSendComponents(
        template,
        variables,
        input.headerMediaUrl ?? null,
        buttonValues,
      );
      payload = this.meta.buildTemplatePayload(
        to,
        template.name,
        template.language,
        components,
      );
      row = {
        kind: 'template',
        templateId: template.id ?? null,
        templateName: template.name,
        variables,
        renderedBody: this.templates.render(
          template.components,
          variables,
          buttonValues,
        ).body,
      };
    }

    const message = this.messageRepo.create({
      ...row,
      contactId: contact.id,
      campaignId: null,
      providerId: providerId ?? contact.providerId ?? null,
      direction: 'outbound',
      status: 'sending',
      payload,
      attempts: 1,
      lockedAt: new Date(),
    });
    const saved = await this.messageRepo.save(message);

    try {
      const res = await this.meta.sendPayload(payload);
      saved.status = 'sent';
      saved.waMessageId = res.messageId;
      saved.sentAt = new Date();
      saved.lockedAt = null;
      await this.messageRepo.save(saved);
      await this.contactRepo.update(
        { id: contact.id },
        { lastOutboundAt: new Date() },
      );
      return saved;
    } catch (err) {
      const apiErr = err instanceof WhatsAppApiError ? err : null;
      const desc = describeMetaError(
        apiErr?.code ?? null,
        apiErr?.httpStatus,
        apiErr?.message,
      );
      saved.status = 'failed';
      saved.failedAt = new Date();
      saved.lockedAt = null;
      saved.errorCode = apiErr?.code ?? null;
      saved.errorMessage = apiErr?.details
        ? `${desc.message}: ${apiErr.details}`
        : desc.message;
      await this.messageRepo.save(saved);
      if (desc.markUnreachable) {
        await this.contactRepo.update({ id: contact.id }, { reachable: false });
      }
      throw new UnprocessableEntityException(
        `${saved.errorMessage}${apiErr?.code != null ? ` (Meta ${apiErr.code})` : ''}`,
      );
    }
  }
}
