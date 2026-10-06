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
import { createHash } from 'node:crypto';
import { toE164 } from './whatsapp-phone.util';
import { hasSignedIn, notInternal } from '../audience/audience.sql';
import { WhatsAppSettingsService } from './whatsapp-settings.service';
import {
  AudienceFilters,
  AudienceRecipient,
  ClassifiedRecipient,
  emptySkipBreakdown,
  paginate,
  PaginatedResult,
  RecipientKind,
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
  created_at: Date | null;
}

interface CustomerRow {
  id: string;
  name: string | null;
  city: string | null;
  mobile_number: string | null;
  created_at: Date | null;
}

/** How a recipient is tied to WhatsApp messages and contacts, for the SQL filters. */
interface ContactLink {
  /** Predicate on `m` (whatsapp_messages) for this recipient's messages. */
  message: string;
  /** Predicate on `c` (whatsapp_contacts) for this recipient's contact rows. */
  contact: string;
}

const BUSINESS_LINK: ContactLink = {
  message: 'm.provider_id = p.id',
  contact: 'c.provider_id = p.id',
};
const CUSTOMER_LINK: ContactLink = {
  message:
    'm.contact_id IN (SELECT c2.id FROM whatsapp_contacts c2 WHERE c2.user_id = u.id)',
  contact: 'c.user_id = u.id',
};
/** Outbound messages that count as "we messaged them". */
const DELIVERED_ISH = `('queued','sending','sent','delivered','read')`;

export interface AudiencePreview {
  total: number;
  sendable: number;
  /** Sendable before "send to at most N" trimmed it; null when no limit applied. */
  limitedFrom: number | null;
  /** How many of the recipients are businesses, customers and pasted numbers. */
  byKind: Record<RecipientKind, number>;
  skipped: SkipBreakdown;
  estimatedCost: { utility: number; marketing: number };
  sample: Array<{
    kind: RecipientKind;
    providerId: string | null;
    userId: string | null;
    brandName: string | null;
    name: string | null;
    city: string | null;
    phone: string | null;
    consent: string;
  }>;
}

export interface RecipientRow {
  kind: RecipientKind;
  providerId: string | null;
  userId: string | null;
  name: string;
  ownerName: string | null;
  city: string | null;
  phone: string | null;
  consent: string;
  skipReason: string | null;
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

  /**
   * Everyone the audience describes: businesses and/or customers matching the
   * filters (filters mode only), plus the picked businesses, customers and
   * pasted numbers (both modes), minus the exclusions, in the chosen order.
   */
  async resolve(filters: AudienceFilters): Promise<AudienceRecipient[]> {
    const f = filters ?? {};
    const manual = f.mode === 'manual';
    const type = f.audienceType ?? 'businesses';
    const out: AudienceRecipient[] = [];

    // Businesses
    const businessIds = new Set<string>();
    const addBusinesses = (rows: ProviderRow[]) => {
      for (const r of rows) {
        if (businessIds.has(r.id)) continue;
        businessIds.add(r.id);
        out.push(this.businessRecipient(r));
      }
    };
    if (!manual && type !== 'customers') {
      addBusinesses(await this.queryBusinesses(f, null));
    }
    const pickedBusinesses = (f.providerIds ?? []).filter(
      (id) => !businessIds.has(id),
    );
    if (pickedBusinesses.length) {
      addBusinesses(await this.queryBusinesses(f, pickedBusinesses));
    }

    // Customers
    const customerIds = new Set<string>();
    const addCustomers = (rows: CustomerRow[]) => {
      for (const r of rows) {
        if (customerIds.has(r.id)) continue;
        customerIds.add(r.id);
        out.push(this.customerRecipient(r));
      }
    };
    if (!manual && type !== 'businesses') {
      addCustomers(await this.queryCustomers(f, null));
    }
    const pickedCustomers = (f.customerIds ?? []).filter(
      (id) => !customerIds.has(id),
    );
    if (pickedCustomers.length) {
      addCustomers(await this.queryCustomers(f, pickedCustomers));
    }

    // Pasted numbers
    for (const raw of f.phones ?? []) {
      out.push({
        kind: 'number',
        providerId: null,
        userId: null,
        joinedAt: null,
        phone: toE164(raw),
        hadRawPhone: Boolean(raw && raw.trim()),
        brandName: null,
        city: null,
        ownerName: null,
      });
    }

    // Exclusions
    const exBusiness = new Set(f.excludeProviderIds ?? []);
    const exCustomer = new Set(f.excludeCustomerIds ?? []);
    const exPhone = new Set(
      (f.excludePhones ?? [])
        .map((x) => toE164(x))
        .filter((x): x is string => !!x),
    );
    const kept = out.filter(
      (r) =>
        !(r.providerId && exBusiness.has(r.providerId)) &&
        !(r.kind === 'customer' && r.userId && exCustomer.has(r.userId)) &&
        !(r.phone && exPhone.has(r.phone)),
    );
    return this.ordered(kept, f);
  }

  private businessRecipient(r: ProviderRow): AudienceRecipient {
    const candidates = [r.whatsapp_number, r.contact_number, r.mobile_number];
    let phone: string | null = null;
    for (const c of candidates) {
      phone = toE164(c);
      if (phone) break;
    }
    return {
      kind: 'business',
      providerId: r.id,
      userId: r.user_id,
      joinedAt: r.created_at ? new Date(r.created_at) : null,
      phone,
      hadRawPhone: candidates.some((c) => c && c.trim()),
      brandName: r.brand_name,
      city: r.city,
      ownerName: r.owner_name,
    };
  }

  private customerRecipient(r: CustomerRow): AudienceRecipient {
    return {
      kind: 'customer',
      providerId: null,
      userId: r.id,
      joinedAt: r.created_at ? new Date(r.created_at) : null,
      phone: toE164(r.mobile_number),
      hadRawPhone: Boolean(r.mobile_number && r.mobile_number.trim()),
      brandName: null,
      city: r.city,
      ownerName: r.name,
    };
  }

  /** Newest / oldest by join date, or a fixed shuffle so preview and send agree. */
  private ordered(
    list: AudienceRecipient[],
    f: AudienceFilters,
  ): AudienceRecipient[] {
    const order = f.order ?? 'oldest';
    if (order === 'random') {
      const seed = f.randomSeed ?? 'tijarah';
      const key = (r: AudienceRecipient) =>
        createHash('sha1')
          .update(`${seed}:${r.providerId ?? r.userId ?? r.phone ?? ''}`)
          .digest('hex');
      const keyed = list.map((r) => ({ r, k: key(r) }));
      keyed.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
      return keyed.map((x) => x.r);
    }
    const t = (r: AudienceRecipient) =>
      r.joinedAt ? r.joinedAt.getTime() : Number.MAX_SAFE_INTEGER;
    return [...list].sort((a, b) =>
      order === 'newest' ? t(b) - t(a) : t(a) - t(b),
    );
  }

  /** Businesses matching the filters, or exactly `ids` (picked: filters ignored). */
  private async queryBusinesses(
    f: AudienceFilters,
    ids: string[] | null,
  ): Promise<ProviderRow[]> {
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
        'p.created_at AS created_at',
      ])
      .where('p.deleted_at IS NULL')
      .orderBy('p.createdAt', 'ASC');
    if (ids) {
      qb.andWhere('p.id IN (:...ids)', { ids });
    } else {
      this.applyProviderFilters(qb, f);
      this.applyHistoryFilters(qb, f, BUSINESS_LINK);
    }
    // Safety exclusions apply to picks too.
    this.applyContactExclusions(qb, f, BUSINESS_LINK);
    return qb.getRawMany<ProviderRow>();
  }

  /**
   * App customers: real people who use Tijarah to find businesses — not staff,
   * not business owners — matching the filters, or exactly `ids` (picked).
   */
  private async queryCustomers(
    f: AudienceFilters,
    ids: string[] | null,
  ): Promise<CustomerRow[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .from('users', 'u')
      .select([
        'u.id AS id',
        'u.name AS name',
        'u.city AS city',
        'u.mobile_number AS mobile_number',
        'u.created_at AS created_at',
      ])
      .where('u.mobile_number IS NOT NULL')
      .andWhere(notInternal('u'))
      .orderBy('u.created_at', 'ASC');
    if (ids) {
      qb.andWhere('u.id IN (:...ids)', { ids });
    } else {
      qb.andWhere(`u.status = 'active'`).andWhere(
        `NOT EXISTS (SELECT 1 FROM providers p WHERE p.user_id = u.id AND p.deleted_at IS NULL)`,
      );
      if (f.customerSignedInOnly !== false) qb.andWhere(hasSignedIn('u'));
      this.applyPlaceFilters(qb, f, 'u');
      if (f.categoryIds?.length) {
        qb.andWhere(`u.preferred_category_ids && CAST(:catIds AS uuid[])`, {
          catIds: f.categoryIds,
        });
      }
      this.applyAgeAndActivity(qb, f, 'u.created_at');
      this.applyHistoryFilters(qb, f, CUSTOMER_LINK);
    }
    this.applyContactExclusions(qb, f, CUSTOMER_LINK);
    return qb.getRawMany<CustomerRow>();
  }

  /** Cities and areas, on the business (`p`) or the customer (`u`). */
  private applyPlaceFilters(
    qb: SelectQueryBuilder<any>,
    f: AudienceFilters,
    alias: 'p' | 'u',
  ): void {
    if (f.cities?.length) {
      qb.andWhere(
        new Brackets((w) => {
          f.cities!.forEach((city, i) => {
            w.orWhere(`${alias}.city ILIKE :city${i}`, {
              [`city${i}`]: city.trim(),
            });
          });
        }),
      );
    }
    if (f.areas?.length) {
      qb.andWhere(
        new Brackets((w) => {
          f.areas!.forEach((area, i) => {
            w.orWhere(`${alias}.area ILIKE :area${i}`, {
              [`area${i}`]: area.trim(),
            });
          });
        }),
      );
    }
  }

  /** Join date, and app activity of the owner / customer (`u`). */
  private applyAgeAndActivity(
    qb: SelectQueryBuilder<any>,
    f: AudienceFilters,
    createdCol: string,
  ): void {
    if (f.createdWithinDays) {
      qb.andWhere(`${createdCol} >= now() - (:cw || ' days')::interval`, {
        cw: String(f.createdWithinDays),
      });
    }
    if (f.createdBeforeDays) {
      qb.andWhere(`${createdCol} < now() - (:cb || ' days')::interval`, {
        cb: String(f.createdBeforeDays),
      });
    }
    if (f.inactiveDays) {
      qb.andWhere(
        `(u.last_seen_at IS NULL OR u.last_seen_at < now() - (:inactive || ' days')::interval)`,
        { inactive: String(f.inactiveDays) },
      );
    }
    if (f.activeWithinDays) {
      qb.andWhere(`u.last_seen_at >= now() - (:active || ' days')::interval`, {
        active: String(f.activeWithinDays),
      });
    }
  }

  private applyProviderFilters(
    qb: SelectQueryBuilder<Provider>,
    f: AudienceFilters,
  ): void {
    const statuses = f.statuses?.length ? f.statuses : ['active', 'unverified'];
    qb.andWhere('p.status IN (:...statuses)', { statuses });

    this.applyPlaceFilters(qb, f, 'p');
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
    this.applyAgeAndActivity(qb, f, 'p.created_at');
    if (f.ownerSignedIn === 'yes') qb.andWhere(hasSignedIn('u'));
    if (f.ownerSignedIn === 'no') qb.andWhere(`NOT ${hasSignedIn('u')}`);
    if (f.missingLogo) {
      qb.andWhere(`(p.profile_photo_url IS NULL OR p.profile_photo_url = '')`);
    }
    if (f.missingProducts) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM products pr WHERE pr.provider_id = p.id)`,
      );
    }
    const productCount = `(SELECT COUNT(*) FROM products pr WHERE pr.provider_id = p.id AND pr.is_active = true)`;
    if (f.minProducts != null) {
      qb.andWhere(`${productCount} >= :minProducts`, {
        minProducts: f.minProducts,
      });
    }
    if (f.maxProducts != null) {
      qb.andWhere(`${productCount} <= :maxProducts`, {
        maxProducts: f.maxProducts,
      });
    }
    if (f.googleLinked === 'yes') qb.andWhere('p.google_place_id IS NOT NULL');
    if (f.googleLinked === 'no') qb.andWhere('p.google_place_id IS NULL');
    if (f.minRating != null) {
      qb.andWhere('p.combined_rating >= :minRating', {
        minRating: f.minRating,
      });
    }
    const paid = `EXISTS (SELECT 1 FROM subscriptions s WHERE s.provider_id = p.id AND s.status IN ('active','trialing'))`;
    if (f.paidPlan === 'yes') qb.andWhere(paid);
    if (f.paidPlan === 'no') qb.andWhere(`NOT ${paid}`);
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
  }

  /** What we have (and haven't) sent them on WhatsApp, and how they answered. */
  private applyHistoryFilters(
    qb: SelectQueryBuilder<any>,
    f: AudienceFilters,
    link: ContactLink,
  ): void {
    const messaged = `EXISTS (SELECT 1 FROM whatsapp_messages m WHERE ${link.message} AND m.direction = 'outbound' AND m.status IN ${DELIVERED_ISH})`;
    if (f.everContacted === 'yes') qb.andWhere(messaged);
    if (f.everContacted === 'no') qb.andWhere(`NOT ${messaged}`);
    if (f.notContactedDays) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM whatsapp_messages m WHERE ${link.message} AND m.direction = 'outbound' AND m.status IN ${DELIVERED_ISH} AND m.created_at > now() - (:nc || ' days')::interval)`,
        { nc: String(f.notContactedDays) },
      );
    }
    const replied = `EXISTS (SELECT 1 FROM whatsapp_messages m WHERE ${link.message} AND m.direction = 'inbound')`;
    if (f.repliedEver === 'yes') qb.andWhere(replied);
    if (f.repliedEver === 'no') qb.andWhere(`NOT ${replied}`);
    if (f.receivedCampaignIds?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM whatsapp_messages m WHERE ${link.message} AND m.campaign_id IN (:...recvIds) AND m.status IN ${DELIVERED_ISH})`,
        { recvIds: f.receivedCampaignIds },
      );
    }
    if (f.notReceivedCampaignIds?.length) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM whatsapp_messages m WHERE ${link.message} AND m.campaign_id IN (:...notRecvIds) AND m.status IN ${DELIVERED_ISH})`,
        { notRecvIds: f.notReceivedCampaignIds },
      );
    }
    if (f.contactTags?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE ${link.contact} AND c.tags && CAST(:tags AS text[]))`,
        { tags: f.contactTags },
      );
    }
  }

  private applyContactExclusions(
    qb: SelectQueryBuilder<any>,
    f: AudienceFilters,
    link: ContactLink,
  ): void {
    const consent = f.consent ?? 'not_opted_out';
    if (consent === 'not_opted_out') {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE ${link.contact} AND c.consent = 'opted_out')`,
      );
    } else if (consent === 'opted_in') {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE ${link.contact} AND c.consent = 'opted_in')`,
      );
    }
    if (f.reachableOnly !== false) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM whatsapp_contacts c WHERE ${link.contact} AND c.reachable = false)`,
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

  /**
   * "Send to at most N": keep the first N sendable recipients in order and drop
   * the rest from the campaign (skipped ones stay, so the counts stay honest).
   */
  limitSendable(
    classified: ClassifiedRecipient[],
    max: number | undefined,
  ): { list: ClassifiedRecipient[]; limitedFrom: number | null } {
    const sendable = classified.filter((c) => !c.skipReason).length;
    if (!max || sendable <= max) return { list: classified, limitedFrom: null };
    let kept = 0;
    const list = classified.filter((c) => {
      if (c.skipReason) return true;
      kept++;
      return kept <= max;
    });
    return { list, limitedFrom: sendable };
  }

  /** Resolve, classify and limit: exactly who a campaign would reach. */
  private async evaluate(filters: AudienceFilters) {
    const settings = await this.settings.getRow();
    const recipients = await this.resolve(filters);
    const contacts = await this.loadContactsByPhone(
      recipients.map((r) => r.phone).filter((p): p is string => Boolean(p)),
    );
    const classify = (cat: 'marketing' | 'utility') =>
      this.limitSendable(
        this.classify(recipients, contacts, cat, settings),
        filters?.maxRecipients,
      );
    return { settings, recipients, classify };
  }

  async preview(
    filters: AudienceFilters,
    templateCategory: 'marketing' | 'utility' = 'marketing',
  ): Promise<AudiencePreview> {
    const { settings, classify } = await this.evaluate(filters);
    const asMarketing = classify('marketing');
    const asUtility = classify('utility');
    const chosen = templateCategory === 'marketing' ? asMarketing : asUtility;
    const sendableMarketing = asMarketing.list.filter(
      (c) => !c.skipReason,
    ).length;
    const sendableUtility = asUtility.list.filter((c) => !c.skipReason).length;
    const rates = settings.rates;
    const byKind: Record<RecipientKind, number> = {
      business: 0,
      customer: 0,
      number: 0,
    };
    for (const c of chosen.list) if (!c.skipReason) byKind[c.kind]++;
    return {
      total: chosen.list.length,
      sendable: chosen.list.filter((c) => !c.skipReason).length,
      limitedFrom: chosen.limitedFrom,
      byKind,
      skipped: this.breakdown(chosen.list),
      estimatedCost: {
        utility: round2(
          sendableUtility * this.settings.rateFor('utility', rates),
        ),
        marketing: round2(
          sendableMarketing * this.settings.rateFor('marketing', rates),
        ),
      },
      sample: chosen.list
        .filter((c) => !c.skipReason)
        .slice(0, 10)
        .map((c) => ({
          kind: c.kind,
          providerId: c.providerId,
          userId: c.userId,
          brandName: c.brandName,
          name: c.brandName ?? c.ownerName,
          city: c.city,
          phone: c.phone,
          consent: c.consent,
        })),
    };
  }

  /**
   * Every recipient, for reviewing (and excluding) people one by one or
   * exporting. `show` narrows to who will get it or who is skipped.
   */
  async recipients(
    filters: AudienceFilters,
    templateCategory: 'marketing' | 'utility',
    opts: {
      page: number;
      limit: number;
      search?: string;
      show?: 'all' | 'sendable' | 'skipped';
    },
  ): Promise<PaginatedResult<RecipientRow>> {
    const { classify } = await this.evaluate(filters);
    let list = classify(templateCategory).list;
    if (opts.show === 'sendable') list = list.filter((c) => !c.skipReason);
    if (opts.show === 'skipped') list = list.filter((c) => !!c.skipReason);
    const q = opts.search?.trim().toLowerCase();
    if (q) {
      const digits = q.replace(/\D/g, '');
      list = list.filter(
        (c) =>
          (c.brandName ?? '').toLowerCase().includes(q) ||
          (c.ownerName ?? '').toLowerCase().includes(q) ||
          (c.city ?? '').toLowerCase().includes(q) ||
          (digits.length >= 3 && (c.phone ?? '').includes(digits)),
      );
    }
    const start = (opts.page - 1) * opts.limit;
    const rows = list.slice(start, start + opts.limit).map((c) => ({
      kind: c.kind,
      providerId: c.providerId,
      userId: c.userId,
      name: c.brandName ?? c.ownerName ?? c.phone ?? 'Unknown',
      ownerName: c.kind === 'business' ? c.ownerName : null,
      city: c.city,
      phone: c.phone,
      consent: c.consent,
      skipReason: c.skipReason,
    }));
    return paginate(rows, list.length, opts.page, opts.limit);
  }

  /** Customers for the "pick customers" search: name or phone. */
  async searchCustomers(search: string): Promise<
    Array<{
      id: string;
      name: string;
      phone: string | null;
      city: string | null;
    }>
  > {
    const q = search.trim();
    if (q.length < 2) return [];
    const digits = q.replace(/\D/g, '');
    const rows = await this.dataSource
      .createQueryBuilder()
      .from('users', 'u')
      .select([
        'u.id AS id',
        'u.name AS name',
        'u.mobile_number AS phone',
        'u.city AS city',
      ])
      .where('u.mobile_number IS NOT NULL')
      .andWhere(notInternal('u'))
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM providers p WHERE p.user_id = u.id AND p.deleted_at IS NULL)`,
      )
      .andWhere(
        new Brackets((w) => {
          w.where('u.name ILIKE :s', { s: `%${q}%` });
          if (digits.length >= 3)
            w.orWhere('u.mobile_number LIKE :d', { d: `%${digits}%` });
        }),
      )
      .orderBy('u.name', 'ASC')
      .limit(20)
      .getRawMany<{
        id: string;
        name: string;
        phone: string | null;
        city: string | null;
      }>();
    return rows;
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
      .orderBy('c.updatedAt', 'DESC')
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
    areas: Array<{ city: string; area: string }>;
    campaigns: Array<{ id: string; name: string; createdAt: string }>;
    tags: string[];
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
    // Areas of businesses and of customers, grouped under their city.
    const areas = await this.dataSource.query<
      Array<{ city: string; area: string }>
    >(
      `SELECT DISTINCT INITCAP(TRIM(city)) AS city, INITCAP(TRIM(area)) AS area FROM (
         SELECT city, area FROM providers WHERE deleted_at IS NULL
         UNION ALL
         SELECT city, area FROM users
       ) x
       WHERE COALESCE(TRIM(city), '') <> '' AND COALESCE(TRIM(area), '') <> ''
       ORDER BY 1, 2
       LIMIT 2000`,
    );
    const campaigns = await this.dataSource.query<
      Array<{ id: string; name: string; created_at: Date }>
    >(
      `SELECT id, name, created_at FROM whatsapp_campaigns
        WHERE status <> 'draft' ORDER BY created_at DESC LIMIT 100`,
    );
    const tags = await this.dataSource.query<Array<{ tag: string }>>(
      `SELECT DISTINCT unnest(tags) AS tag FROM whatsapp_contacts ORDER BY 1 LIMIT 500`,
    );
    return {
      cities: cityRows.map((r) => r.city),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      areas,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: new Date(c.created_at).toISOString(),
      })),
      tags: tags.map((t) => t.tag).filter(Boolean),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
