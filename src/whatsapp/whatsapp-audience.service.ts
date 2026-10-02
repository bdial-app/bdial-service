import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { Category } from '../entities/category.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppSegment } from '../entities/whatsapp-segment.entity';
import { WhatsAppSettings } from '../entities/whatsapp-settings.entity';
import { WhatsAppTemplateCategory } from '../entities/whatsapp-template.entity';
import { toE164 } from './whatsapp-phone.util';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import {
  AudienceFilters,
  AudienceRecipient,
  ClassifiedRecipient,
  emptySkipBreakdown,
  paginate,
  PaginatedResult,
  SKIP_REASON_TO_KEY,
  SkipBreakdown,
} from './whatsapp.types';
import { ContactJson, toContactJson } from './whatsapp.mappers';
import {
  ContactsQueryDto,
  PatchContactDto,
  UpsertSegmentDto,
} from './dto/audience.dto';

interface ProviderRow {
  id: string;
  user_id: string;
  brand_name: string;
  city: string | null;
  whatsapp_number: string | null;
  contact_number: string | null;
  mobile_number: string | null;
  owner_name: string | null;
}

export interface AudiencePreview {
  total: number;
  sendable: number;
  skipped: SkipBreakdown;
  estimatedCost: { utility: number; marketing: number };
  sample: Array<{
    providerId: string | null;
    brandName: string | null;
    city: string | null;
    phone: string | null;
    consent: string;
  }>;
}

@Injectable()
export class WhatsAppAudienceService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    @InjectRepository(WhatsAppSegment)
    private readonly segmentRepo: Repository<WhatsAppSegment>,
    private readonly settings: WhatsAppSettingsService,
  ) {}

  // ── Resolve ──────────────────────────────────────────────────────────────

  /** Providers (plus pasted phones) matching the filters, with phone chosen by priority. */
  async resolve(filters: AudienceFilters): Promise<AudienceRecipient[]> {
    const f = filters ?? {};
    const recipients: AudienceRecipient[] = [];
    const manual = f.mode === 'manual';

    if (!manual || (f.providerIds && f.providerIds.length)) {
      const qb = this.providerRepo
        .createQueryBuilder('p')
        .leftJoin('users', 'u', 'u.id = p.user_id')
        .select([
          'p.id AS id',
          'p.user_id AS user_id',
          'p.brand_name AS brand_name',
          'p.city AS city',
          'p.whatsapp_number AS whatsapp_number',
          'p.contact_number AS contact_number',
          'u.mobile_number AS mobile_number',
          'u.name AS owner_name',
        ])
        .where('p.deleted_at IS NULL')
        .orderBy('p.created_at', 'ASC');

      if (manual) {
        qb.andWhere('p.id IN (:...ids)', { ids: f.providerIds });
      } else {
        this.applyProviderFilters(qb, f);
      }
      // Safety exclusions apply in both modes.
      this.applyContactExclusions(qb, f);

      const rows = await qb.getRawMany<ProviderRow>();
      for (const r of rows) {
        const candidates = [
          r.whatsapp_number,
          r.contact_number,
          r.mobile_number,
        ];
        const hadRaw = candidates.some((c) => c && c.trim());
        let phone: string | null = null;
        for (const c of candidates) {
          phone = toE164(c);
          if (phone) break;
        }
        recipients.push({
          providerId: r.id,
          userId: r.user_id,
          phone,
          hadRawPhone: hadRaw,
          brandName: r.brand_name,
          city: r.city,
          ownerName: r.owner_name,
        });
      }
    }

    for (const raw of f.phones ?? []) {
      const phone = toE164(raw);
      recipients.push({
        providerId: null,
        userId: null,
        phone,
        hadRawPhone: Boolean(raw && raw.trim()),
        brandName: null,
        city: null,
        ownerName: null,
      });
    }
    return recipients;
  }

  private applyProviderFilters(
    qb: SelectQueryBuilder<Provider>,
    f: AudienceFilters,
  ): void {
    const statuses = f.statuses?.length ? f.statuses : ['active', 'unverified'];
    qb.andWhere('p.status IN (:...statuses)', { statuses });

    if (f.cities?.length) {
      qb.andWhere(
        new Brackets((w) => {
          f.cities!.forEach((city, i) => {
            w.orWhere(`p.city ILIKE :city${i}`, { [`city${i}`]: city.trim() });
          });
        }),
      );
    }
    if (f.categoryIds?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM provider_categories pc WHERE pc.provider_id = p.id AND pc.category_id IN (:...categoryIds))`,
        { categoryIds: f.categoryIds },
      );
    }
    if (f.trustLevels?.length) {
      qb.andWhere('p.trust_level IN (:...trustLevels)', {
        trustLevels: f.trustLevels,
      });
    }
    if (f.verification) {
      if (f.verification === 'none') {
        qb.andWhere(
          `NOT EXISTS (SELECT 1 FROM verifications v WHERE v.user_id = p.user_id)`,
        );
      } else {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM verifications v WHERE v.user_id = p.user_id AND v.status = :vstatus)`,
          { vstatus: f.verification },
        );
      }
    }
    if (typeof f.womenLed === 'boolean') {
      qb.andWhere('p.is_women_led = :womenLed', { womenLed: f.womenLed });
    }
    if (typeof f.isFeatured === 'boolean') {
      qb.andWhere('p.is_featured = :isFeatured', { isFeatured: f.isFeatured });
    }
    if (f.createdWithinDays) {
      qb.andWhere(`p.created_at >= now() - (:cw || ' days')::interval`, {
        cw: String(f.createdWithinDays),
      });
    }
    if (f.createdBeforeDays) {
      qb.andWhere(`p.created_at < now() - (:cb || ' days')::interval`, {
        cb: String(f.createdBeforeDays),
      });
    }
    if (f.inactiveDays) {
      qb.andWhere(
        `(u.last_seen_at IS NULL OR u.last_seen_at < now() - (:inactive || ' days')::interval)`,
        { inactive: String(f.inactiveDays) },
      );
    }
    if (f.missingLogo) {
      qb.andWhere(`(p.profile_photo_url IS NULL OR p.profile_photo_url = '')`);
    }
    if (f.missingProducts) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM products pr WHERE pr.provider_id = p.id)`,
      );
    }
    // Mirrors the admin location tiers: city/pincode pins and no pin are "approximate".
    if (f.locationPrecision === 'approximate') {
      qb.andWhere(
        `(p.latitude IS NULL OR p.longitude IS NULL OR p.geocode_precision IS NULL OR p.geocode_precision IN ('city','pincode'))`,
      );
    } else if (f.locationPrecision === 'exact') {
      qb.andWhere(
        `(p.latitude IS NOT NULL AND p.longitude IS NOT NULL AND p.geocode_precision IN ('manual','rooftop','street','locality'))`,
      );
    }
    if (f.notContactedDays) {
      qb.andWhere(
        `NOT EXISTS (
           SELECT 1 FROM whatsapp_messages m
            WHERE m.provider_id = p.id AND m.direction = 'outbound'
              AND m.status IN ('queued','sending','sent','delivered','read')
              AND m.created_at > now() - (:nc || ' days')::interval)`,
        { nc: String(f.notContactedDays) },
      );
    }
  }

  private applyContactExclusions(
    qb: SelectQueryBuilder<Provider>,
    f: AudienceFilters,
  ): void {
    const consent = f.consent ?? 'not_opted_out';
    if (consent === 'not_opted_out') {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE c.provider_id = p.id AND c.consent = 'opted_out')`,
      );
    } else if (consent === 'opted_in') {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE c.provider_id = p.id AND c.consent = 'opted_in')`,
      );
    }
    if (f.reachableOnly !== false) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE c.provider_id = p.id AND c.reachable = false)`,
      );
    }
  }

  // ── Classification (shared by preview and campaign send) ─────────────────

  async loadContactsByPhone(
    phones: string[],
  ): Promise<Map<string, WhatsAppContact>> {
    const map = new Map<string, WhatsAppContact>();
    const unique = [...new Set(phones.filter(Boolean))];
    for (let i = 0; i < unique.length; i += 1000) {
      const rows = await this.contactRepo.find({
        where: { phone: In(unique.slice(i, i + 1000)) },
      });
      for (const c of rows) map.set(c.phone, c);
    }
    return map;
  }

  classify(
    recipients: AudienceRecipient[],
    contacts: Map<string, WhatsAppContact>,
    category: WhatsAppTemplateCategory | 'marketing' | 'utility',
    settings: WhatsAppSettings,
  ): ClassifiedRecipient[] {
    const isMarketing = category === 'marketing';
    const seen = new Set<string>();
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return recipients.map((r) => {
      const contact = r.phone ? contacts.get(r.phone) : undefined;
      const consent = contact?.consent ?? 'unknown';
      let skip: ClassifiedRecipient['skipReason'] = null;
      if (!r.phone) {
        skip = r.hadRawPhone ? 'invalid_phone' : 'no_phone';
      } else if (seen.has(r.phone)) {
        skip = 'duplicate';
      } else {
        seen.add(r.phone);
        if (contact && contact.reachable === false) {
          skip = 'unreachable';
        } else if (
          isMarketing &&
          (consent === 'opted_out' ||
            (settings.requireOptInForMarketing && consent !== 'opted_in'))
        ) {
          skip = 'opted_out';
        } else if (
          isMarketing &&
          contact?.lastMarketingAt &&
          new Date(contact.lastMarketingAt).getTime() > since
        ) {
          skip = 'marketing_cap';
        }
      }
      return { ...r, consent, skipReason: skip };
    });
  }

  breakdown(classified: ClassifiedRecipient[]): SkipBreakdown {
    const out = emptySkipBreakdown();
    for (const c of classified) {
      if (c.skipReason) out[SKIP_REASON_TO_KEY[c.skipReason]]++;
    }
    return out;
  }

  async preview(
    filters: AudienceFilters,
    templateCategory: 'marketing' | 'utility' = 'marketing',
  ): Promise<AudiencePreview> {
    const settings = await this.settings.getRow();
    const recipients = await this.resolve(filters);
    const contacts = await this.loadContactsByPhone(
      recipients.map((r) => r.phone).filter((p): p is string => Boolean(p)),
    );
    const asMarketing = this.classify(
      recipients,
      contacts,
      'marketing',
      settings,
    );
    const asUtility = this.classify(recipients, contacts, 'utility', settings);
    const chosen = templateCategory === 'marketing' ? asMarketing : asUtility;
    const sendableMarketing = asMarketing.filter((c) => !c.skipReason).length;
    const sendableUtility = asUtility.filter((c) => !c.skipReason).length;
    const rates = settings.rates;
    return {
      total: recipients.length,
      sendable: chosen.filter((c) => !c.skipReason).length,
      skipped: this.breakdown(chosen),
      estimatedCost: {
        utility: round2(
          sendableUtility * this.settings.rateFor('utility', rates),
        ),
        marketing: round2(
          sendableMarketing * this.settings.rateFor('marketing', rates),
        ),
      },
      sample: chosen
        .filter((c) => !c.skipReason)
        .slice(0, 10)
        .map((c) => ({
          providerId: c.providerId,
          brandName: c.brandName,
          city: c.city,
          phone: c.phone,
          consent: c.consent,
        })),
    };
  }

  // ── Contacts ─────────────────────────────────────────────────────────────

  async listContacts(
    query: ContactsQueryDto,
  ): Promise<PaginatedResult<ContactJson>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.contactRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.provider', 'p')
      .orderBy('c.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        '(c.phone ILIKE :s OR c.display_name ILIKE :s OR p.brand_name ILIKE :s)',
        { s },
      );
    }
    if (query.consent)
      qb.andWhere('c.consent = :consent', { consent: query.consent });
    if (query.city)
      qb.andWhere('p.city ILIKE :city', { city: query.city.trim() });
    if (query.hasProvider === 'true') qb.andWhere('c.provider_id IS NOT NULL');
    if (query.hasProvider === 'false') qb.andWhere('c.provider_id IS NULL');
    if (query.tag) qb.andWhere(':tag = ANY(c.tags)', { tag: query.tag.trim() });

    const [rows, total] = await qb.getManyAndCount();
    const extras = await this.contactExtras(rows.map((r) => r.id));
    return paginate(
      rows.map((c) => toContactJson(c, extras.get(c.id) ?? {})),
      total,
      page,
      limit,
    );
  }

  async contactExtras(
    contactIds: string[],
  ): Promise<
    Map<string, { messagesSent: number; lastCampaignName: string | null }>
  > {
    const map = new Map<
      string,
      { messagesSent: number; lastCampaignName: string | null }
    >();
    if (!contactIds.length) return map;
    const rows = await this.dataSource.query<
      Array<{ contact_id: string; sent: string; last_campaign: string | null }>
    >(
      `SELECT m.contact_id,
              COUNT(*) FILTER (WHERE m.direction = 'outbound' AND m.status IN ('sent','delivered','read'))::text AS sent,
              (SELECT c.name FROM whatsapp_messages m2
                 JOIN whatsapp_campaigns c ON c.id = m2.campaign_id
                WHERE m2.contact_id = m.contact_id
                ORDER BY m2.created_at DESC LIMIT 1) AS last_campaign
         FROM whatsapp_messages m
        WHERE m.contact_id = ANY($1::uuid[])
        GROUP BY m.contact_id`,
      [contactIds],
    );
    for (const r of rows) {
      map.set(r.contact_id, {
        messagesSent: Number(r.sent),
        lastCampaignName: r.last_campaign,
      });
    }
    return map;
  }

  async getContact(id: string): Promise<WhatsAppContact> {
    const c = await this.contactRepo.findOne({
      where: { id },
      relations: ['provider'],
    });
    if (!c) throw new NotFoundException('Contact not found');
    return c;
  }

  async patchContact(id: string, dto: PatchContactDto): Promise<ContactJson> {
    const c = await this.getContact(id);
    if (dto.consent && dto.consent !== c.consent) {
      c.consent = dto.consent;
      c.consentChangedAt = new Date();
      c.consentSource = 'admin';
    }
    if (dto.tags)
      c.tags = [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))];
    if (dto.notes !== undefined) c.notes = dto.notes || null;
    await this.contactRepo.save(c);
    const extras = await this.contactExtras([id]);
    return toContactJson(c, extras.get(id) ?? {});
  }

  // ── Segments ─────────────────────────────────────────────────────────────

  async listSegments(): Promise<{ items: WhatsAppSegment[] }> {
    const items = await this.segmentRepo.find({ order: { updatedAt: 'DESC' } });
    return { items };
  }

  async createSegment(
    dto: UpsertSegmentDto,
    userId: string | null,
  ): Promise<WhatsAppSegment> {
    return this.segmentRepo.save(
      this.segmentRepo.create({
        name: dto.name.trim(),
        description: dto.description ?? null,
        filters: { ...dto.filters },
        createdBy: userId,
      }),
    );
  }

  async updateSegment(
    id: string,
    dto: UpsertSegmentDto,
  ): Promise<WhatsAppSegment> {
    const s = await this.segmentRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Segment not found');
    s.name = dto.name.trim();
    s.description = dto.description ?? s.description;
    s.filters = { ...dto.filters };
    return this.segmentRepo.save(s);
  }

  async deleteSegment(id: string): Promise<{ deleted: true }> {
    const res = await this.segmentRepo.delete({ id });
    if (!res.affected) throw new NotFoundException('Segment not found');
    return { deleted: true };
  }

  // ── Options ──────────────────────────────────────────────────────────────

  async options(): Promise<{
    cities: string[];
    categories: Array<{ id: string; name: string }>;
  }> {
    const cityRows = await this.providerRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.city', 'city')
      .where('p.deleted_at IS NULL')
      .andWhere("p.city IS NOT NULL AND p.city <> ''")
      .orderBy('p.city', 'ASC')
      .getRawMany<{ city: string }>();
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
      select: { id: true, name: true },
    });
    return {
      cities: cityRows.map((r) => r.city),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
