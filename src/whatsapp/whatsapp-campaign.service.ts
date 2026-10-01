import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppMessage } from '../entities/whatsapp-message.entity';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { MetaCloudApiService } from './meta-cloud-api.service';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppAudienceService } from './whatsapp-audience.service';
import { WhatsAppVariableService } from './whatsapp-variable.service';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { toApiDigits, toE164 } from './whatsapp-phone.util';
import { META_ERROR_MAP, WHATSAPP_INSERT_CHUNK } from './whatsapp.constants';
import {
  CampaignSummary,
  csvEscape,
  MessageRow,
  toCampaignDetail,
  toCampaignSummary,
  toMessageRow,
} from './whatsapp.mappers';
import {
  AudienceFilters,
  ClassifiedRecipient,
  emptySkipBreakdown,
  paginate,
  PaginatedResult,
  ResolvedProviderVariables,
  SKIP_REASON_TO_KEY,
  SkipBreakdown,
} from './whatsapp.types';
import {
  CampaignListQueryDto,
  CampaignMessagesQueryDto,
  CreateCampaignDto,
  SendCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

const RETRYABLE_CODES = Object.entries(META_ERROR_MAP)
  .filter(([, d]) => d.retryable || d.capHit)
  .map(([code]) => Number(code));

@Injectable()
export class WhatsAppCampaignService {
  private readonly logger = new Logger(WhatsAppCampaignService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WhatsAppCampaign)
    private readonly campaignRepo: Repository<WhatsAppCampaign>,
    @InjectRepository(WhatsAppMessage)
    private readonly messageRepo: Repository<WhatsAppMessage>,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    private readonly meta: MetaCloudApiService,
    private readonly settings: WhatsAppSettingsService,
    private readonly templates: WhatsAppTemplateService,
    private readonly audience: WhatsAppAudienceService,
    private readonly variables: WhatsAppVariableService,
    private readonly inbox: WhatsAppInboxService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async list(
    query: CampaignListQueryDto,
  ): Promise<PaginatedResult<CampaignSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.campaignRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.template', 't')
      .leftJoinAndSelect('c.creator', 'u')
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status)
      qb.andWhere('c.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere('(c.name ILIKE :s OR t.name ILIKE :s)', {
        s: `%${query.search.trim()}%`,
      });
    }
    const [rows, total] = await qb.getManyAndCount();
    return paginate(
      rows.map((c) => toCampaignSummary(c)),
      total,
      page,
      limit,
    );
  }

  async getEntity(id: string): Promise<WhatsAppCampaign> {
    const c = await this.campaignRepo.findOne({
      where: { id },
      relations: ['template', 'creator'],
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async get(id: string) {
    const c = await this.getEntity(id);
    const [skipBreakdown, failureBreakdown] = await Promise.all([
      this.skipBreakdown(id),
      this.failureBreakdown(id),
    ]);
    return toCampaignDetail(c, skipBreakdown, failureBreakdown);
  }

  async create(dto: CreateCampaignDto, userId: string | null) {
    const template = await this.templates.getEntity(dto.templateId);
    const c = this.campaignRepo.create({
      name: dto.name.trim(),
      templateId: template.id,
      audience: { ...dto.audience },
      variableMapping: dto.variableMapping ?? {},
      headerMediaUrl: dto.headerMediaUrl ?? null,
      buttonUrlParams: dto.buttonUrlParams ?? null,
      ratePerMinute: dto.ratePerMinute ?? null,
      status: 'draft',
      createdBy: userId,
    });
    const saved = await this.campaignRepo.save(c);
    return this.get(saved.id);
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const c = await this.getEntity(id);
    if (c.status !== 'draft') {
      throw new ConflictException('Only draft campaigns can be edited');
    }
    if (dto.templateId && dto.templateId !== c.templateId) {
      const t = await this.templates.getEntity(dto.templateId);
      c.templateId = t.id;
    }
    if (dto.name !== undefined) c.name = dto.name.trim();
    if (dto.audience !== undefined) c.audience = { ...dto.audience };
    if (dto.variableMapping !== undefined)
      c.variableMapping = dto.variableMapping;
    if (dto.headerMediaUrl !== undefined) c.headerMediaUrl = dto.headerMediaUrl;
    if (dto.buttonUrlParams !== undefined)
      c.buttonUrlParams = dto.buttonUrlParams;
    if (dto.ratePerMinute !== undefined) c.ratePerMinute = dto.ratePerMinute;
    await this.campaignRepo.save(c);
    return this.get(id);
  }

  async duplicate(id: string, userId: string | null) {
    const c = await this.getEntity(id);
    const copy = this.campaignRepo.create({
      name: `${c.name} (copy)`.slice(0, 200),
      templateId: c.templateId,
      audience: { ...c.audience },
      variableMapping: { ...c.variableMapping },
      headerMediaUrl: c.headerMediaUrl,
      buttonUrlParams: c.buttonUrlParams ? { ...c.buttonUrlParams } : null,
      ratePerMinute: c.ratePerMinute,
      status: 'draft',
      createdBy: userId,
    });
    const saved = await this.campaignRepo.save(copy);
    return this.get(saved.id);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const c = await this.getEntity(id);
    if (!['draft', 'cancelled'].includes(c.status)) {
      throw new ConflictException(
        'Only draft or cancelled campaigns can be deleted',
      );
    }
    await this.campaignRepo.delete({ id }); // messages cascade
    return { deleted: true };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async send(id: string, dto: SendCampaignDto) {
    const c = await this.getEntity(id);
    if (c.status !== 'draft') {
      throw new ConflictException(
        `Campaign is ${c.status}; only drafts can be sent`,
      );
    }
    const template =
      c.template ?? (await this.templates.getEntity(c.templateId));
    if (template.status !== 'approved') {
      throw new UnprocessableEntityException(
        `Template "${template.name}" is ${template.status}; it must be approved`,
      );
    }
    this.meta.assertConfigured();

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt is not a valid date');
    }

    const settingsRow = await this.settings.getRow();
    const filters = (c.audience ?? {}) as AudienceFilters;
    const recipients = await this.audience.resolve(filters);
    const phones = recipients
      .map((r) => r.phone)
      .filter((p): p is string => Boolean(p));
    const contacts = await this.audience.loadContactsByPhone(phones);
    const classified = this.audience.classify(
      recipients,
      contacts,
      template.category,
      settingsRow,
    );

    // Upsert contacts for every valid phone (so skipped rows still have a contact).
    await this.upsertContacts(classified, contacts);

    // Variables, batched for the whole audience.
    const sources = this.variables.sourcesNeeded(
      c.variableMapping,
      c.buttonUrlParams,
    );
    for (const v of template.variables ?? []) {
      if (v.source !== 'custom') sources.add(v.source);
    }
    const providerIds = classified
      .map((r) => r.providerId)
      .filter((p): p is string => Boolean(p));
    const resolved = await this.variables.resolveForProviders(
      providerIds,
      sources,
    );

    const rows: QueryDeepPartialEntity<WhatsAppMessage>[] = [];
    let queued = 0;
    let skipped = 0;
    for (const r of classified) {
      const vars = r.providerId ? resolved.get(r.providerId) : undefined;
      const variables = this.variables.applyMapping(
        c.variableMapping,
        vars,
        template,
      );
      const buttonValues = this.variables.buttonValues(
        c.buttonUrlParams,
        r.providerId,
        vars,
        template,
      );
      const renderedBody = this.templates.render(
        template.components,
        variables,
        buttonValues,
      ).body;
      const contact = r.phone ? contacts.get(r.phone) : undefined;

      if (r.skipReason || !contact) {
        skipped++;
        if (!contact && !r.skipReason) {
          // Should not happen (upsert above), but never lose a row silently.
          this.logger.warn(
            `No contact for ${r.phone ?? 'unknown'} in campaign ${c.id}`,
          );
        }
        // Rows without a phone have no contact to attach to; record them on a
        // placeholder is impossible (contact_id NOT NULL), so count only.
        if (!contact) continue;
        rows.push({
          contactId: contact.id,
          campaignId: c.id,
          providerId: r.providerId,
          direction: 'outbound',
          kind: 'template',
          status: 'skipped',
          skipReason: r.skipReason,
          templateId: template.id,
          templateName: template.name,
          renderedBody,
          variables,
        });
        continue;
      }

      const components = this.templates.buildSendComponents(
        template,
        variables,
        c.headerMediaUrl,
        buttonValues,
      );
      rows.push({
        contactId: contact.id,
        campaignId: c.id,
        providerId: r.providerId,
        direction: 'outbound',
        kind: 'template',
        status: 'queued',
        templateId: template.id,
        templateName: template.name,
        renderedBody,
        variables,
        payload: this.meta.buildTemplatePayload(
          toApiDigits(contact.phone),
          template.name,
          template.language,
          components,
        ) as QueryDeepPartialEntity<WhatsAppMessage>['payload'],
      });
      queued++;
    }

    for (let i = 0; i < rows.length; i += WHATSAPP_INSERT_CHUNK) {
      await this.messageRepo.insert(rows.slice(i, i + WHATSAPP_INSERT_CHUNK));
    }

    const rate = this.settings.rateFor(template.category, settingsRow.rates);
    c.totalRecipients = classified.length;
    c.queuedCount = queued;
    c.skippedCount = skipped;
    c.sentCount = 0;
    c.deliveredCount = 0;
    c.readCount = 0;
    c.failedCount = 0;
    c.repliedCount = 0;
    c.estimatedCostInr = Math.round(queued * rate * 100) / 100;
    c.actualCostInr = 0;
    c.failureReason = null;
    if (scheduledAt && scheduledAt.getTime() > Date.now()) {
      c.status = 'scheduled';
      c.scheduledAt = scheduledAt;
    } else {
      c.status = 'sending';
      c.scheduledAt = scheduledAt;
      c.startedAt = new Date();
    }
    await this.campaignRepo.save(c);
    this.logger.log(
      `Campaign ${c.id} "${c.name}": ${queued} queued, ${skipped} skipped → ${c.status}`,
    );
    return this.get(id);
  }

  private async upsertContacts(
    classified: ClassifiedRecipient[],
    contacts: Map<string, WhatsAppContact>,
  ): Promise<void> {
    const missing = new Map<string, ClassifiedRecipient>();
    for (const r of classified) {
      if (r.phone && !contacts.has(r.phone) && !missing.has(r.phone))
        missing.set(r.phone, r);
    }
    if (!missing.size) return;
    const values = [...missing.values()].map((r) => ({
      phone: r.phone!,
      providerId: r.providerId,
      userId: r.userId,
    }));
    for (let i = 0; i < values.length; i += WHATSAPP_INSERT_CHUNK) {
      await this.contactRepo
        .createQueryBuilder()
        .insert()
        .into(WhatsAppContact)
        .values(values.slice(i, i + WHATSAPP_INSERT_CHUNK))
        .orIgnore()
        .execute();
    }
    const fresh = await this.audience.loadContactsByPhone([...missing.keys()]);
    for (const [phone, contact] of fresh) contacts.set(phone, contact);
  }

  async pause(id: string) {
    const c = await this.getEntity(id);
    if (!['sending', 'scheduled'].includes(c.status)) {
      throw new ConflictException(`Cannot pause a ${c.status} campaign`);
    }
    await this.campaignRepo.update({ id }, { status: 'paused' });
    return this.get(id);
  }

  async resume(id: string) {
    const c = await this.getEntity(id);
    if (c.status !== 'paused') {
      throw new ConflictException(`Cannot resume a ${c.status} campaign`);
    }
    const template =
      c.template ?? (await this.templates.getEntity(c.templateId));
    if (template.status !== 'approved') {
      throw new UnprocessableEntityException(
        `Template "${template.name}" is ${template.status}; fix it before resuming`,
      );
    }
    this.meta.assertConfigured();
    await this.campaignRepo.update(
      { id },
      {
        status:
          c.scheduledAt && c.scheduledAt.getTime() > Date.now()
            ? 'scheduled'
            : 'sending',
        failureReason: null,
        startedAt: c.startedAt ?? new Date(),
      },
    );
    return this.get(id);
  }

  async cancel(id: string) {
    const c = await this.getEntity(id);
    if (['completed', 'cancelled'].includes(c.status)) {
      throw new ConflictException(`Campaign is already ${c.status}`);
    }
    await this.dataSource.transaction(async (trx) => {
      const res = await trx.query<unknown[]>(
        `UPDATE whatsapp_messages
            SET status = 'skipped', skip_reason = 'cancelled', locked_at = NULL
          WHERE campaign_id = $1 AND status IN ('queued','sending')
          RETURNING id`,
        [id],
      );
      const n = Array.isArray(res) ? res.length : 0;
      await trx.query(
        `UPDATE whatsapp_campaigns
            SET status = 'cancelled', completed_at = now(),
                queued_count = 0, skipped_count = skipped_count + $2
          WHERE id = $1`,
        [id, n],
      );
    });
    return this.get(id);
  }

  /** Requeue failed rows whose error is transient (or the 24h marketing cap). */
  async retryFailed(id: string): Promise<{ requeued: number }> {
    const c = await this.getEntity(id);
    if (!['sending', 'paused', 'completed', 'failed'].includes(c.status)) {
      throw new ConflictException(`Cannot retry a ${c.status} campaign`);
    }
    const res = await this.dataSource.query<unknown[]>(
      `UPDATE whatsapp_messages
          SET status = 'queued', send_after = now(), locked_at = NULL, attempts = 0,
              failed_at = NULL
        WHERE campaign_id = $1 AND status = 'failed'
          AND (error_code IS NULL OR error_code = ANY($2::int[]))
        RETURNING id`,
      [id, RETRYABLE_CODES],
    );
    const requeued = Array.isArray(res) ? res.length : 0;
    if (requeued) {
      await this.dataSource.query(
        `UPDATE whatsapp_campaigns
            SET queued_count = queued_count + $2,
                failed_count = GREATEST(failed_count - $2, 0),
                status = CASE WHEN status IN ('completed','failed') THEN 'sending' ELSE status END,
                completed_at = CASE WHEN status IN ('completed','failed') THEN NULL ELSE completed_at END
          WHERE id = $1`,
        [id, requeued],
      );
    }
    return { requeued };
  }

  /** Send the campaign's template to one number, outside the campaign. */
  async testSend(
    id: string,
    rawPhone: string,
  ): Promise<{ waMessageId: string | null; messageId: string }> {
    const c = await this.getEntity(id);
    const template =
      c.template ?? (await this.templates.getEntity(c.templateId));
    const phone = toE164(rawPhone);
    if (!phone) throw new BadRequestException('phone is not a valid number');

    // Resolve against the first matching provider so the preview looks real.
    const recipients = await this.audience.resolve(
      (c.audience ?? {}) as AudienceFilters,
    );
    const first = recipients.find((r) => r.providerId);
    const sources = this.variables.sourcesNeeded(
      c.variableMapping,
      c.buttonUrlParams,
    );
    const resolved = first?.providerId
      ? await this.variables.resolveForProviders([first.providerId], sources)
      : new Map<string, ResolvedProviderVariables>();
    const vars = first?.providerId ? resolved.get(first.providerId) : undefined;
    const variables = this.variables.applyMapping(
      c.variableMapping,
      vars,
      template,
    );
    const buttonValues = this.variables.buttonValues(
      c.buttonUrlParams,
      first?.providerId ?? null,
      vars,
      template,
    );

    const contact = await this.inbox.ensureContact(phone);
    const m = await this.inbox.sendDirect(
      contact,
      { template, variables, headerMediaUrl: c.headerMediaUrl, buttonValues },
      first?.providerId ?? null,
    );
    return { waMessageId: m.waMessageId, messageId: m.id };
  }

  // ── Recipients ───────────────────────────────────────────────────────────

  async messages(
    id: string,
    query: CampaignMessagesQueryDto,
  ): Promise<PaginatedResult<MessageRow>> {
    await this.getEntity(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.recipientQuery(id, query.status, query.search)
      .skip((page - 1) * limit)
      .take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return paginate(
      rows.map((m) => this.toRow(m)),
      total,
      page,
      limit,
    );
  }

  async exportCsv(id: string): Promise<{ filename: string; csv: string }> {
    const c = await this.getEntity(id);
    const header = [
      'phone',
      'brand_name',
      'city',
      'status',
      'skip_reason',
      'error_code',
      'error_message',
      'attempts',
      'sent_at',
      'delivered_at',
      'read_at',
      'failed_at',
      'cost_inr',
      'rendered_body',
    ];
    const lines = [header.join(',')];
    const pageSize = 2000;
    for (let offset = 0; ; offset += pageSize) {
      const rows = await this.recipientQuery(id)
        .skip(offset)
        .take(pageSize)
        .getMany();
      for (const m of rows) {
        const r = this.toRow(m);
        lines.push(
          [
            r.phone,
            r.provider?.brandName ?? '',
            r.provider?.city ?? '',
            r.status,
            r.skipReason ?? '',
            r.errorCode ?? '',
            r.errorMessage ?? '',
            r.attempts,
            r.sentAt ?? '',
            r.deliveredAt ?? '',
            r.readAt ?? '',
            r.failedAt ?? '',
            r.costInr,
            r.renderedBody ?? '',
          ]
            .map(csvEscape)
            .join(','),
        );
      }
      if (rows.length < pageSize) break;
    }
    const safe =
      c.name.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60) || 'campaign';
    return {
      filename: `whatsapp-${safe}-${c.id.slice(0, 8)}.csv`,
      csv: lines.join('\n'),
    };
  }

  private recipientQuery(id: string, status?: string, search?: string) {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.contact', 'c')
      .leftJoinAndSelect('c.provider', 'p')
      .where('m.campaign_id = :id', { id })
      .orderBy('m.created_at', 'ASC');
    if (status) qb.andWhere('m.status = :status', { status });
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('c.phone ILIKE :s').orWhere('p.brand_name ILIKE :s');
        }),
        { s: `%${search.trim()}%` },
      );
    }
    return qb;
  }

  private toRow(m: WhatsAppMessage): MessageRow {
    const p = m.contact?.provider;
    return toMessageRow(
      m,
      m.contact?.phone ?? '',
      p ? { id: p.id, brandName: p.brandName, city: p.city } : null,
    );
  }

  private async skipBreakdown(id: string): Promise<SkipBreakdown> {
    const out = emptySkipBreakdown();
    const rows = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.skip_reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('m.campaign_id = :id AND m.status = :st', { id, st: 'skipped' })
      .groupBy('m.skip_reason')
      .getRawMany<{ reason: string | null; count: string }>();
    for (const r of rows) {
      const key = r.reason
        ? SKIP_REASON_TO_KEY[r.reason as keyof typeof SKIP_REASON_TO_KEY]
        : undefined;
      if (key) out[key] += Number(r.count);
    }
    return out;
  }

  private async failureBreakdown(
    id: string,
  ): Promise<Array<{ code: number | null; message: string; count: number }>> {
    const rows = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.error_code', 'code')
      .addSelect('MIN(m.error_message)', 'message')
      .addSelect('COUNT(*)', 'count')
      .where('m.campaign_id = :id AND m.status = :st', { id, st: 'failed' })
      .groupBy('m.error_code')
      .orderBy('count', 'DESC')
      .getRawMany<{
        code: number | null;
        message: string | null;
        count: string;
      }>();
    return rows.map((r) => ({
      code: r.code,
      message: r.message ?? META_ERROR_MAP[Number(r.code)]?.message ?? 'Failed',
      count: Number(r.count),
    }));
  }

  /** Used by the module-level status check for stuck sending campaigns (not scheduled here). */
  async countByStatus(statuses: WhatsAppCampaign['status'][]): Promise<number> {
    return this.campaignRepo.count({ where: { status: In(statuses) } });
  }

  templateFor(c: WhatsAppCampaign): WhatsAppTemplate | null {
    return c.template ?? null;
  }
}
