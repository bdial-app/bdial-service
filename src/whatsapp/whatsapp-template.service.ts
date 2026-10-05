import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WhatsAppTemplate,
  WhatsAppTemplateButton,
  WhatsAppTemplateCategory,
  WhatsAppTemplateComponent,
  WhatsAppTemplateStatus,
  WhatsAppTemplateVariable,
} from '../entities/whatsapp-template.entity';
import { WhatsAppCampaign } from '../entities/whatsapp-campaign.entity';
import {
  MetaCloudApiService,
  MetaTemplate,
  WhatsAppApiError,
} from './meta-cloud-api.service';
import sharp from 'sharp';
import { STARTER_TEMPLATES } from './seeds/starter-templates';
import {
  DEFAULT_CARD_ID,
  WhatsAppMediaService,
} from './whatsapp-media.service';
import { META_TEMPLATE_STATUS_MAP } from './whatsapp.constants';
import { TemplateJson, toTemplateJson } from './whatsapp.mappers';
import { RenderedTemplate } from './whatsapp.types';
import {
  TemplateListQueryDto,
  TemplatePreviewDto,
  UpsertTemplateDto,
} from './dto/template.dto';

const PLACEHOLDER_RE = /\{\{(\d+)\}\}/g;

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(
    @InjectRepository(WhatsAppTemplate)
    private readonly templateRepo: Repository<WhatsAppTemplate>,
    @InjectRepository(WhatsAppCampaign)
    private readonly campaignRepo: Repository<WhatsAppCampaign>,
    private readonly meta: MetaCloudApiService,
    private readonly media: WhatsAppMediaService,
  ) {}

  // ── Reads ────────────────────────────────────────────────────────────────

  async list(query: TemplateListQueryDto): Promise<{ items: TemplateJson[] }> {
    const qb = this.templateRepo
      .createQueryBuilder('t')
      .orderBy('t.updatedAt', 'DESC')
      .take(200);
    if (query.status)
      qb.andWhere('t.status = :status', { status: query.status });
    if (query.category)
      qb.andWhere('t.category = :category', { category: query.category });
    if (query.search) {
      qb.andWhere('(t.name ILIKE :s OR t.description ILIKE :s)', {
        s: `%${query.search.trim()}%`,
      });
    }
    const rows = await qb.getMany();
    const usage = await this.usageCounts(rows.map((r) => r.id));
    return { items: rows.map((r) => toTemplateJson(r, usage.get(r.id) ?? 0)) };
  }

  async getEntity(id: string): Promise<WhatsAppTemplate> {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async get(id: string): Promise<TemplateJson> {
    const t = await this.getEntity(id);
    const usage = await this.usageCounts([id]);
    return toTemplateJson(t, usage.get(id) ?? 0);
  }

  async findByName(
    name: string,
    language?: string,
  ): Promise<WhatsAppTemplate | null> {
    return this.templateRepo.findOne({
      where: language ? { name, language } : { name },
      order: { status: 'ASC' },
    });
  }

  private async usageCounts(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!ids.length) return map;
    const rows = await this.campaignRepo
      .createQueryBuilder('c')
      .select('c.template_id', 'templateId')
      .addSelect('COUNT(*)', 'count')
      .where('c.template_id IN (:...ids)', { ids })
      .groupBy('c.template_id')
      .getRawMany<{ templateId: string; count: string }>();
    for (const r of rows) map.set(r.templateId, Number(r.count));
    return map;
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  async create(
    dto: UpsertTemplateDto,
    userId: string | null,
  ): Promise<TemplateJson> {
    const language = dto.language?.trim() || 'en';
    this.validateDefinition(dto.components, dto.variables ?? []);
    const existing = await this.templateRepo.findOne({
      where: { name: dto.name, language },
    });
    if (existing) {
      throw new ConflictException(
        `Template "${dto.name}" (${language}) already exists`,
      );
    }
    let t = this.templateRepo.create({
      name: dto.name,
      language,
      category: dto.category,
      components: this.withExamples(dto.components, dto.variables ?? []),
      variables: dto.variables ?? [],
      description: dto.description ?? null,
      status: 'draft',
      createdBy: userId,
    });
    t = await this.templateRepo.save(t);
    if (dto.submit) t = await this.submitEntity(t);
    return toTemplateJson(t, 0);
  }

  async update(id: string, dto: UpsertTemplateDto): Promise<TemplateJson> {
    const t = await this.getEntity(id);
    if (!['draft', 'rejected'].includes(t.status)) {
      throw new ConflictException(
        `Only draft or rejected templates can be edited (status: ${t.status})`,
      );
    }
    const language = dto.language?.trim() || t.language;
    this.validateDefinition(dto.components, dto.variables ?? []);
    if (dto.name !== t.name || language !== t.language) {
      const clash = await this.templateRepo.findOne({
        where: { name: dto.name, language },
      });
      if (clash && clash.id !== t.id) {
        throw new ConflictException(
          `Template "${dto.name}" (${language}) already exists`,
        );
      }
    }
    t.name = dto.name;
    t.language = language;
    t.category = dto.category;
    t.components = this.withExamples(dto.components, dto.variables ?? []);
    t.variables = dto.variables ?? [];
    t.description = dto.description ?? t.description;
    let saved = await this.templateRepo.save(t);
    if (dto.submit) saved = await this.submitEntity(saved, true);
    const usage = await this.usageCounts([id]);
    return toTemplateJson(saved, usage.get(id) ?? 0);
  }

  async submit(id: string): Promise<TemplateJson> {
    const t = await this.getEntity(id);
    if (!['draft', 'rejected'].includes(t.status)) {
      throw new ConflictException(
        `Template is already ${t.status}; only drafts can be submitted`,
      );
    }
    const saved = await this.submitEntity(t, true);
    const usage = await this.usageCounts([id]);
    return toTemplateJson(saved, usage.get(id) ?? 0);
  }

  /**
   * Send to Meta for review. A rejected or paused template that Meta still
   * holds under the same name is edited in place; anything else is created
   * (replacing an older copy under another name or language).
   */
  private async submitEntity(
    t: WhatsAppTemplate,
    replaceExisting = false,
  ): Promise<WhatsAppTemplate> {
    this.meta.assertConfigured();
    this.validateDefinition(t.components, t.variables ?? []);
    try {
      const body = await this.withHeaderSample(this.buildMetaCreateBody(t));

      if (replaceExisting && t.metaTemplateId) {
        const remote = await this.meta.getTemplateIdentity(t.metaTemplateId);
        const sameIdentity =
          remote?.name === t.name && remote?.language === t.language;
        if (
          remote &&
          sameIdentity &&
          ['rejected', 'paused'].includes(t.status)
        ) {
          await this.meta.editTemplate(t.metaTemplateId, {
            category: body.category,
            components: body.components,
          });
          t.status = 'pending';
          t.rejectedReason = null;
          t.lastSyncedAt = new Date();
          return this.templateRepo.save(t);
        }
        if (remote) {
          // Renamed, or not editable: retire the old copy, then create.
          try {
            await this.meta.deleteTemplate(remote.name, t.metaTemplateId);
          } catch (err) {
            this.logger.warn(
              `Delete before re-create failed for ${remote.name}: ${errMessage(err)}`,
            );
          }
        }
      }

      const res = await this.meta.createTemplate(body);
      t.metaTemplateId = res.id ?? t.metaTemplateId;
      t.status =
        (META_TEMPLATE_STATUS_MAP[res.status] as WhatsAppTemplateStatus) ||
        'pending';
      if (res.category) {
        const cat = res.category.toLowerCase() as WhatsAppTemplateCategory;
        if (['marketing', 'utility', 'authentication'].includes(cat))
          t.category = cat;
      }
      t.rejectedReason = null;
      t.lastSyncedAt = new Date();
      return this.templateRepo.save(t);
    } catch (err) {
      if (err instanceof WhatsAppApiError) {
        throw new UnprocessableEntityException(
          `Meta rejected the template: ${err.message}${err.details ? ` (${err.details})` : ''}`,
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const t = await this.getEntity(id);
    const usage = await this.usageCounts([id]);
    if ((usage.get(id) ?? 0) > 0) {
      throw new ConflictException(
        'Template is used by one or more campaigns and cannot be deleted',
      );
    }
    if (t.metaTemplateId && this.meta.isConfigured()) {
      try {
        await this.meta.deleteTemplate(t.name, t.metaTemplateId);
      } catch (err) {
        this.logger.warn(
          `Meta delete failed for ${t.name}: ${errMessage(err)}`,
        );
      }
    }
    await this.templateRepo.delete({ id });
    return { deleted: true };
  }

  async sync(): Promise<{ synced: number; created: number; updated: number }> {
    this.meta.assertConfigured();
    const remote = await this.meta.listTemplates();
    let created = 0;
    let updated = 0;
    for (const r of remote) {
      const status =
        (META_TEMPLATE_STATUS_MAP[r.status] as WhatsAppTemplateStatus) ||
        'pending';
      const category = r.category.toLowerCase() as WhatsAppTemplateCategory;
      if (!['marketing', 'utility', 'authentication'].includes(category))
        continue;
      const components = (r.components ?? []) as WhatsAppTemplateComponent[];
      let local = await this.templateRepo.findOne({
        where: { name: r.name, language: r.language },
      });
      if (!local) {
        local = this.templateRepo.create({
          name: r.name,
          language: r.language,
          category,
          status,
          metaTemplateId: r.id,
          components,
          variables: this.inferVariables(components),
          qualityScore: r.quality_score?.score ?? null,
          rejectedReason: r.rejected_reason ?? null,
          lastSyncedAt: new Date(),
        });
        created++;
      } else {
        local.category = category;
        local.status = status;
        local.metaTemplateId = r.id;
        local.components = components;
        if (!local.variables?.length)
          local.variables = this.inferVariables(components);
        local.qualityScore = r.quality_score?.score ?? local.qualityScore;
        local.rejectedReason =
          r.rejected_reason ??
          (status === 'rejected' ? local.rejectedReason : null);
        local.lastSyncedAt = new Date();
        updated++;
      }
      await this.templateRepo.save(local);
    }
    return { synced: remote.length, created, updated };
  }

  async seed(userId: string | null): Promise<{ created: number }> {
    let created = 0;
    for (const s of STARTER_TEMPLATES) {
      const exists = await this.templateRepo.findOne({
        where: { name: s.name, language: s.language },
      });
      if (exists) continue;
      await this.templateRepo.save(
        this.templateRepo.create({
          name: s.name,
          language: s.language,
          category: s.category,
          status: 'draft',
          components: s.components,
          variables: s.variables,
          description: s.description,
          isSeed: true,
          createdBy: userId,
        }),
      );
      created++;
    }
    return { created };
  }

  /** Apply a Meta template-status webhook. */
  async applyStatusUpdate(update: {
    metaTemplateId?: string | null;
    name?: string | null;
    language?: string | null;
    event: string;
    reason?: string | null;
  }): Promise<void> {
    let t: WhatsAppTemplate | null = null;
    if (update.metaTemplateId) {
      t = await this.templateRepo.findOne({
        where: { metaTemplateId: update.metaTemplateId },
      });
    }
    if (!t && update.name) {
      t = await this.templateRepo.findOne({
        where: update.language
          ? { name: update.name, language: update.language }
          : { name: update.name },
      });
    }
    if (!t) return;
    const status = META_TEMPLATE_STATUS_MAP[update.event] as
      | WhatsAppTemplateStatus
      | undefined;
    if (!status) return;
    t.status = status;
    if (status === 'rejected')
      t.rejectedReason = update.reason ?? 'Rejected by Meta';
    if (status === 'approved') t.rejectedReason = null;
    if (update.metaTemplateId && !t.metaTemplateId)
      t.metaTemplateId = update.metaTemplateId;
    t.lastSyncedAt = new Date();
    await this.templateRepo.save(t);
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  async preview(dto: TemplatePreviewDto): Promise<RenderedTemplate> {
    let components: WhatsAppTemplateComponent[] | undefined = dto.components;
    let variables = dto.variables ?? {};
    if (dto.templateId) {
      const t = await this.getEntity(dto.templateId);
      components = t.components;
      if (!dto.variables) variables = this.sampleVariables(t);
    }
    if (!components) {
      throw new BadRequestException('templateId or components is required');
    }
    return this.render(components, variables);
  }

  render(
    components: WhatsAppTemplateComponent[],
    variables: Record<string, string>,
    buttonValues: Record<string, string> = {},
    headerMediaUrl: string | null = null,
  ): RenderedTemplate {
    const fill = (text: string | undefined) =>
      (text ?? '').replace(
        PLACEHOLDER_RE,
        (_m, n: string) => variables[n] ?? `{{${n}}}`,
      );
    const out: RenderedTemplate = { body: '' };
    for (const c of components) {
      switch (c.type) {
        case 'HEADER':
          if (c.format === 'IMAGE') {
            out.header = { type: 'IMAGE', url: headerMediaUrl };
          } else if (c.format === 'TEXT' || c.text) {
            out.header = fill(c.text);
          }
          break;
        case 'BODY':
          out.body = fill(c.text);
          break;
        case 'FOOTER':
          out.footer = c.text ?? '';
          break;
        case 'BUTTONS':
          out.buttons = (c.buttons ?? []).map((b, i) => ({
            type: b.type,
            text: b.text,
            url: b.url
              ? b.url.replace(
                  /\{\{1\}\}/,
                  buttonValues[String(i)] ??
                    b.example?.[0]?.split('/').pop() ??
                    '',
                )
              : undefined,
            phone_number: b.phone_number,
          }));
          break;
      }
    }
    return out;
  }

  bodyText(components: WhatsAppTemplateComponent[]): string {
    return components.find((c) => c.type === 'BODY')?.text ?? '';
  }

  headerComponent(
    components: WhatsAppTemplateComponent[],
  ): WhatsAppTemplateComponent | undefined {
    return components.find((c) => c.type === 'HEADER');
  }

  urlButtonsWithParam(
    components: WhatsAppTemplateComponent[],
  ): Array<{ index: number; button: WhatsAppTemplateButton }> {
    const buttons = components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
    return buttons
      .map((button, index) => ({ index, button }))
      .filter(
        ({ button }) =>
          button.type === 'URL' && /\{\{1\}\}/.test(button.url ?? ''),
      );
  }

  /** Sample values from the template's own variable metadata. */
  sampleVariables(t: WhatsAppTemplate): Record<string, string> {
    const out: Record<string, string> = {};
    for (const v of t.variables ?? []) {
      if (v.location === 'body' || v.location === 'header')
        out[String(v.index)] = v.sample;
    }
    return out;
  }

  /**
   * Build the `components` array for POST /messages given resolved values.
   * `variables` are keyed by index and apply to body (and header TEXT) params;
   * `buttonValues` are keyed by URL-button index.
   */
  buildSendComponents(
    t: WhatsAppTemplate,
    variables: Record<string, string>,
    headerMediaUrl: string | null,
    buttonValues: Record<string, string>,
  ): unknown[] {
    const out: unknown[] = [];
    const header = this.headerComponent(t.components);
    if (header) {
      if (header.format === 'IMAGE') {
        if (headerMediaUrl) {
          out.push({
            type: 'header',
            parameters: [{ type: 'image', image: { link: headerMediaUrl } }],
          });
        }
      } else if (header.text && PLACEHOLDER_RE.test(header.text)) {
        PLACEHOLDER_RE.lastIndex = 0;
        const indexes = placeholderIndexes(header.text);
        out.push({
          type: 'header',
          parameters: indexes.map((n) => ({
            type: 'text',
            text: variables[String(n)] ?? '',
          })),
        });
      }
      PLACEHOLDER_RE.lastIndex = 0;
    }
    const bodyIdx = placeholderIndexes(this.bodyText(t.components));
    if (bodyIdx.length) {
      out.push({
        type: 'body',
        parameters: bodyIdx.map((n) => ({
          type: 'text',
          text: variables[String(n)] ?? '',
        })),
      });
    }
    for (const { index } of this.urlButtonsWithParam(t.components)) {
      const value = buttonValues[String(index)];
      if (value === undefined) continue;
      out.push({
        type: 'button',
        sub_type: 'url',
        index: String(index),
        parameters: [{ type: 'text', text: value }],
      });
    }
    return out;
  }

  // ── Validation & Meta body ───────────────────────────────────────────────

  validateDefinition(
    components: WhatsAppTemplateComponent[],
    variables: WhatsAppTemplateVariable[],
  ): void {
    if (!Array.isArray(components) || !components.length) {
      throw new BadRequestException('components must be a non-empty array');
    }
    const body = components.find((c) => c.type === 'BODY');
    if (!body || !body.text?.trim()) {
      throw new BadRequestException('A BODY component with text is required');
    }
    if (body.text.length > 1024) {
      throw new BadRequestException('Body must be 1024 characters or fewer');
    }
    const header = components.find((c) => c.type === 'HEADER');
    if (header?.format === 'TEXT' && (header.text ?? '').length > 60) {
      throw new BadRequestException(
        'Header text must be 60 characters or fewer',
      );
    }
    const footer = components.find((c) => c.type === 'FOOTER');
    if (footer && (footer.text ?? '').length > 60) {
      throw new BadRequestException('Footer must be 60 characters or fewer');
    }
    const buttons = components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
    if (buttons.length > 3) {
      throw new BadRequestException('At most 3 buttons are allowed');
    }

    const bodyIdx = placeholderIndexes(body.text);
    for (let i = 0; i < bodyIdx.length; i++) {
      if (bodyIdx[i] !== i + 1) {
        throw new BadRequestException(
          'Body variables must be sequential: {{1}}, {{2}}, …',
        );
      }
    }
    const bodyVars = variables.filter((v) => v.location === 'body');
    for (const n of bodyIdx) {
      const v = bodyVars.find((x) => x.index === n);
      if (!v) {
        throw new BadRequestException(
          `Variable {{${n}}} has no metadata entry`,
        );
      }
      if (!v.sample?.trim()) {
        throw new BadRequestException(
          `Variable {{${n}}} needs a sample value (Meta requires examples)`,
        );
      }
    }
    for (const v of bodyVars) {
      if (!bodyIdx.includes(v.index)) {
        throw new BadRequestException(
          `Variable {{${v.index}}} is declared but not used in the body`,
        );
      }
    }
  }

  /** Ensure Meta `example` blocks exist for every variable. */
  withExamples(
    components: WhatsAppTemplateComponent[],
    variables: WhatsAppTemplateVariable[],
  ): WhatsAppTemplateComponent[] {
    return components.map((c) => {
      if (c.type === 'BODY' && c.text) {
        const idx = placeholderIndexes(c.text);
        if (idx.length && !c.example) {
          const samples = idx.map(
            (n) =>
              variables.find((v) => v.location === 'body' && v.index === n)
                ?.sample ?? `Sample ${n}`,
          );
          return { ...c, example: { body_text: [samples] } };
        }
      }
      if (c.type === 'HEADER' && c.format === 'TEXT' && c.text) {
        const idx = placeholderIndexes(c.text);
        if (idx.length && !c.example) {
          const samples = idx.map(
            (n) =>
              variables.find((v) => v.location === 'header' && v.index === n)
                ?.sample ?? `Sample ${n}`,
          );
          return { ...c, example: { header_text: samples } };
        }
      }
      if (c.type === 'BUTTONS' && c.buttons) {
        return {
          ...c,
          buttons: c.buttons.map((b) => {
            if (
              b.type === 'URL' &&
              b.url &&
              /\{\{1\}\}/.test(b.url) &&
              !b.example?.length
            ) {
              const v = variables.find((x) => x.location === 'button');
              return {
                ...b,
                example: [b.url.replace('{{1}}', v?.sample ?? 'sample')],
              };
            }
            return b;
          }),
        };
      }
      return c;
    });
  }

  /**
   * The admin app sends Meta-format components (including `example` blocks),
   * so they are passed through unchanged; `withExamples` only fills an
   * `example` that is missing, never rewrites one that is present.
   */
  buildMetaCreateBody(t: WhatsAppTemplate): Record<string, unknown> {
    const components = this.withExamples(t.components, t.variables ?? []);
    return {
      name: t.name,
      language: t.language,
      category: t.category.toUpperCase(),
      allow_category_change: true,
      components,
    };
  }

  /**
   * Meta reviews an image-header template against a sample image, given as an
   * upload handle — a link is rejected ("Missing sample parameter"). Upload
   * the sample link the admin entered, or the Tijarah card when there is none,
   * and put the handle in its place. Handles are only sent, never stored.
   */
  private async withHeaderSample(
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const components = body.components as WhatsAppTemplateComponent[];
    const i = components.findIndex(
      (c) => c.type === 'HEADER' && c.format === 'IMAGE',
    );
    if (i < 0) return body;
    const given = (
      components[i].example as { header_handle?: unknown[] } | undefined
    )?.header_handle?.[0];
    const link = typeof given === 'string' ? given.trim() : '';
    // Anything that is not a link is taken to be a handle already.
    if (link && !/^https?:\/\//i.test(link)) return body;

    const card = link ? null : await this.media.card(DEFAULT_CARD_ID);
    const image = link
      ? await this.sampleFromLink(link)
      : card && { data: card, mimeType: 'image/jpeg' as const };
    if (!image) {
      throw new BadRequestException(
        'Could not prepare a sample image for the image header',
      );
    }
    const handle = await this.meta.uploadTemplateSample(
      image.data,
      image.mimeType,
    );
    const next = [...components];
    next[i] = { ...components[i], example: { header_handle: [handle] } };
    return { ...body, components: next };
  }

  /** The admin's sample link as JPEG/PNG bytes Meta accepts. */
  private async sampleFromLink(
    link: string,
  ): Promise<{ data: Buffer; mimeType: 'image/jpeg' | 'image/png' }> {
    const fail = (why: string) =>
      new BadRequestException(
        `The sample image link did not work (${why}). Use a public JPG or PNG link under 5 MB, or leave it empty to use the Tijarah card.`,
      );
    if (!/^https:\/\//i.test(link)) throw fail('it must start with https://');
    let buf: Buffer;
    try {
      const res = await fetch(link, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw fail(`the server answered ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw fail('it could not be downloaded');
    }
    if (buf.length > 5 * 1024 * 1024) throw fail('it is over 5 MB');
    try {
      const meta = await sharp(buf).metadata();
      if (meta.format === 'png') return { data: buf, mimeType: 'image/png' };
      if (meta.format === 'jpeg') return { data: buf, mimeType: 'image/jpeg' };
      // WebP, GIF and the rest: Meta wants JPEG or PNG.
      return {
        data: await sharp(buf)
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 88 })
          .toBuffer(),
        mimeType: 'image/jpeg',
      };
    } catch {
      throw fail('it is not an image');
    }
  }

  /** For templates that arrived via sync without local metadata. */
  private inferVariables(
    components: WhatsAppTemplateComponent[],
  ): WhatsAppTemplateVariable[] {
    const body = components.find((c) => c.type === 'BODY');
    if (!body?.text) return [];
    const example = body.example as { body_text?: string[][] } | undefined;
    const samples = example?.body_text?.[0] ?? [];
    return placeholderIndexes(body.text).map((n, i) => ({
      index: n,
      location: 'body' as const,
      label: `Variable ${n}`,
      source: 'custom' as const,
      sample: samples[i] ?? `Sample ${n}`,
    }));
  }

  mapRemoteStatus(r: MetaTemplate): WhatsAppTemplateStatus {
    return (
      (META_TEMPLATE_STATUS_MAP[r.status] as WhatsAppTemplateStatus) ||
      'pending'
    );
  }
}

export function placeholderIndexes(text: string | undefined): number[] {
  if (!text) return [];
  const found: number[] = [];
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const n = Number(m[1]);
    if (!found.includes(n)) found.push(n);
  }
  return found.sort((a, b) => a - b);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
