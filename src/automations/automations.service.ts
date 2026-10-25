import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AutomationJob } from '../entities/automation-job.entity';
import { MessagingAutomation } from '../entities/messaging-automation.entity';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { WhatsAppContact } from '../entities/whatsapp-contact.entity';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { GoLinksService } from '../go-links/go-links.service';
import { WhatsAppConsentService } from '../whatsapp/whatsapp-consent.service';
import { WhatsAppInboxService } from '../whatsapp/whatsapp-inbox.service';
import { WhatsAppSettingsService } from '../whatsapp/whatsapp-settings.service';
import { MetaCloudApiService } from '../whatsapp/meta-cloud-api.service';
import { toE164 } from '../whatsapp/whatsapp-phone.util';
import { isAppLinkUrl } from '../whatsapp/whatsapp-variable.service';
import { appLinkOrigin } from '../common/app-links';
import {
  AUTOMATIONS,
  AUTOMATION_BY_KEY,
  AutomationDef,
  AutomationKey,
} from './automation-catalog';

const IST_OFFSET_MS = 330 * 60_000;
/** Sending hours, India time: 10 AM–8 PM, never Friday 12–2 PM. */
const WINDOW_START_H = 10;
const WINDOW_END_H = 20;
const MAX_PER_DAY = 1;
const MAX_ENQUIRY_PER_DAY = 2;
const MAX_PER_WEEK = 3;
const MARKETING_GAP_DAYS = 30;
/** After this many untapped messages in a row, only essential ones go out. */
const IGNORED_IN_A_ROW = 3;

export type ScheduleOpts = {
  /** One event never sends twice (e.g. review_alert:<shop>:<day>). */
  dedupeKey: string;
  userId?: string | null;
  providerId?: string | null;
  context?: Record<string, unknown>;
  /** Override the automation's own delay. */
  delayMinutes?: number;
};

type Outcome =
  | {
      status: 'sent';
      messageId: string;
      phone: string;
      cost: number;
      linkCode: string;
    }
  | {
      status: 'skipped' | 'failed' | 'cancelled';
      reason: string;
      phone?: string | null;
    }
  | { status: 'pending'; dueAt: Date; reason: string };

/** Is `d` inside sending hours (India time)? */
export function inSendWindow(d: Date): boolean {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const h = ist.getUTCHours();
  if (h < WINDOW_START_H || h >= WINDOW_END_H) return false;
  if (ist.getUTCDay() === 5 && h >= 12 && h < 14) return false; // Friday prayers
  return true;
}

/** The next moment inside sending hours (India time). */
export function nextSendWindow(d: Date): Date {
  let t = new Date(d.getTime());
  for (let i = 0; i < 48 * 4 && !inSendWindow(t); i++) {
    const ist = new Date(t.getTime() + IST_OFFSET_MS);
    const h = ist.getUTCHours();
    if (h >= WINDOW_END_H || h < WINDOW_START_H) {
      // Jump to 10:00 IST (today if before 10, else tomorrow).
      const day = new Date(
        Date.UTC(
          ist.getUTCFullYear(),
          ist.getUTCMonth(),
          ist.getUTCDate() + (h >= WINDOW_END_H ? 1 : 0),
          WINDOW_START_H,
        ),
      );
      t = new Date(day.getTime() - IST_OFFSET_MS);
    } else {
      // Friday prayer gap: 14:00 IST.
      const day = new Date(
        Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 14),
      );
      t = new Date(day.getTime() - IST_OFFSET_MS);
    }
  }
  return t;
}

/** Meta rejects parameters with new lines, tabs or 4+ spaces. */
function param(v: unknown, max = 120): string {
  const raw =
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      ? String(v)
      : '';
  const s = raw.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** How many distinct {{n}} blanks the template's body has. */
function bodyBlanks(t: WhatsAppTemplate): number {
  const body = t.components.find((c) => c.type === 'BODY')?.text ?? '';
  return new Set(body.match(/\{\{\s*\d+\s*\}\}/g) ?? []).size;
}

/** A business's public page on the website. */
const businessPageLink = (slug: string) =>
  `${appLinkOrigin()}/business/${slug}/`;

/** Today in India, for "once a day" dedupe keys. */
function istDay(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
const istShortDate = () =>
  new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

/** The listing fields an admin changed, in words ("opening hours and address"). */
const CHANGE_WORDS: Array<[string[], string]> = [
  [['brandName'], 'name'],
  [['description'], 'description'],
  [['openTime', 'closeTime'], 'opening hours'],
  [['city', 'area', 'pincode', 'address', 'latitude', 'longitude'], 'address'],
  [['whatsappNumber'], 'WhatsApp number'],
  [
    ['websiteUrl', 'instagramHandle', 'facebookHandle', 'youtubeHandle'],
    'website and social links',
  ],
  [['isAvailable'], 'availability'],
];
export function describeChanges(keys: string[]): string | null {
  const words = CHANGE_WORDS.filter(([fields]) =>
    fields.some((f) => keys.includes(f)),
  ).map(([, w]) => w);
  if (!words.length) return null;
  return words.length === 1
    ? words[0]
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** What a customer who saved the business needs to know, if anything. */
export function savedBusinessChange(
  before: Partial<Provider>,
  after: Partial<Provider>,
): { what: string; newDetails: string } | null {
  const asText = (v: unknown): string =>
    v === null || v === undefined
      ? ''
      : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v as string | number | boolean);
  const changed = (k: keyof Provider) =>
    after[k] !== undefined && asText(after[k]) !== asText(before[k]);
  const parts: Array<{ what: string; value: string }> = [];
  if (changed('openTime') || changed('closeTime')) {
    const open = after.openTime ?? before.openTime;
    const close = after.closeTime ?? before.closeTime;
    if (open && close)
      parts.push({
        what: 'opening hours',
        value: `${fmtTime(open)} to ${fmtTime(close)}`,
      });
  }
  if (changed('contactNumber') || changed('whatsappNumber')) {
    const n =
      after.contactNumber ?? after.whatsappNumber ?? before.contactNumber;
    if (n) parts.push({ what: 'phone number', value: String(n) });
  }
  if (changed('address') || changed('area') || changed('city')) {
    const a = [
      after.address ?? before.address,
      after.area ?? before.area,
      after.city ?? before.city,
    ]
      .filter(Boolean)
      .join(', ');
    if (a) parts.push({ what: 'address', value: a });
  }
  if (!parts.length) return null;
  return {
    what: parts.map((p) => p.what).join(' and '),
    newDetails: parts.map((p) => p.value).join('; '),
  };
}

/** "09:30" → "9:30 AM". */
function fmtTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m[2] === '00' ? `${h12} ${suffix}` : `${h12}:${m[2]} ${suffix}`;
}

const maskPhone = (e164: string) =>
  e164.length > 8 ? `${e164.slice(3, 5)}••••${e164.slice(-4)}` : e164;

/**
 * Automated WhatsApp messages: scheduling, every check before a send, and the
 * send itself (through the inbox's direct send, so messages, statuses and
 * costs are recorded like any other). Every automation starts switched off.
 */
@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);
  private enabledCache: { at: number; keys: Set<string> } | null = null;
  /** The clock (replaceable in tests). */
  now = () => new Date();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MessagingAutomation)
    private readonly automationRepo: Repository<MessagingAutomation>,
    @InjectRepository(AutomationJob)
    private readonly jobRepo: Repository<AutomationJob>,
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    @InjectRepository(WhatsAppTemplate)
    private readonly templateRepo: Repository<WhatsAppTemplate>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly inbox: WhatsAppInboxService,
    private readonly consent: WhatsAppConsentService,
    private readonly settings: WhatsAppSettingsService,
    private readonly meta: MetaCloudApiService,
    private readonly links: GoLinksService,
  ) {}

  // ── Switches ──────────────────────────────────────────────────────────────

  async isEnabled(key: AutomationKey): Promise<boolean> {
    if (!this.enabledCache || Date.now() - this.enabledCache.at > 30_000) {
      const rows = await this.automationRepo.find({ where: { enabled: true } });
      this.enabledCache = {
        at: Date.now(),
        keys: new Set(rows.map((r) => r.key)),
      };
    }
    return this.enabledCache.keys.has(key);
  }

  async setEnabled(
    key: AutomationKey,
    enabled: boolean,
    adminId: string | null,
  ) {
    if (!AUTOMATION_BY_KEY.has(key))
      throw new NotFoundException('Unknown automation');
    await this.automationRepo.upsert({ key, enabled, updatedBy: adminId }, [
      'key',
    ]);
    this.enabledCache = null;
  }

  async setBudget(
    key: AutomationKey,
    budget: number | null,
    adminId: string | null,
  ) {
    if (!AUTOMATION_BY_KEY.has(key))
      throw new NotFoundException('Unknown automation');
    const existing = await this.automationRepo.findOne({ where: { key } });
    await this.automationRepo.upsert(
      {
        key,
        enabled: existing?.enabled ?? false,
        monthlyBudgetInr: budget == null ? null : String(budget),
        updatedBy: adminId,
      },
      ['key'],
    );
  }

  // ── Scheduling ────────────────────────────────────────────────────────────

  /**
   * Schedule an automated message. Does nothing while the automation is off,
   * or if this exact event was already scheduled (dedupe key).
   */
  async schedule(
    key: AutomationKey,
    opts: ScheduleOpts,
  ): Promise<AutomationJob | null> {
    try {
      if (!(await this.isEnabled(key))) return null;
      const def = AUTOMATION_BY_KEY.get(key)!;
      const delay = opts.delayMinutes ?? def.delayMinutes;
      const rows = await this.dataSource.query<{ id: string }[]>(
        `INSERT INTO automation_jobs (automation_key, dedupe_key, user_id, provider_id, due_at, context)
         VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval, $6)
         ON CONFLICT (dedupe_key) DO NOTHING
         RETURNING id`,
        [
          key,
          opts.dedupeKey.slice(0, 200),
          opts.userId ?? null,
          opts.providerId ?? null,
          String(delay),
          JSON.stringify(opts.context ?? {}),
        ],
      );
      return rows[0]
        ? this.jobRepo.findOne({ where: { id: rows[0].id } })
        : null;
    } catch (err) {
      // Never let messaging break the action that triggered it.
      this.logger.warn(`Could not schedule ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Triggers used by chat and reviews ────────────────────────────────────

  /** A customer messaged a business: alert the owner (or ask them to agree, once). */
  async onCustomerMessage(e: {
    conversationId: string;
    ownerUserId: string;
    customerName: string;
    excerpt: string;
  }) {
    try {
      const [enquiryOn, waitingOn] = await Promise.all([
        this.isEnabled('enquiry_alert'),
        this.isEnabled('customer_waiting'),
      ]);
      if (!enquiryOn && !waitingOn) return;
      const provider = await this.providerRepo.findOne({
        where: { userId: e.ownerUserId },
      });
      if (!provider || provider.deletedAt) return;
      const owner = await this.userRepo.findOne({
        where: { id: provider.userId },
      });
      const phone = this.consent.businessPhone(provider, owner?.mobileNumber);
      if (!phone) return;
      const contact = await this.contactRepo.findOne({ where: { phone } });
      const consent = contact?.consent ?? 'unknown';
      const sixHours = Math.floor(Date.now() / (6 * 3_600_000));
      const context = {
        conversationId: e.conversationId,
        customerName: e.customerName,
        excerpt: e.excerpt,
      };
      if (consent === 'opted_in') {
        // One alert per business per 6 hours; the 6 PM reminder covers the rest.
        await this.schedule('enquiry_alert', {
          dedupeKey: `enquiry_alert:${provider.id}:${sixHours}`,
          providerId: provider.id,
          context,
        });
      } else if (consent === 'unknown') {
        const week = Math.floor(Date.now() / (7 * 86_400_000));
        await this.schedule('customer_waiting', {
          dedupeKey: `customer_waiting:${provider.id}:${week}`,
          providerId: provider.id,
          context,
        });
      }
    } catch (err) {
      this.logger.warn(`Enquiry automation skipped: ${(err as Error).message}`);
    }
  }

  /** A business replied: tell the customer if they don't read it within the hour. */
  async onBusinessReply(e: {
    conversationId: string;
    customerUserId: string;
    ownerUserId: string;
    excerpt: string;
  }) {
    try {
      if (!(await this.isEnabled('business_replied'))) return;
      const provider = await this.providerRepo.findOne({
        where: { userId: e.ownerUserId },
      });
      if (!provider) return;
      const sixHours = Math.floor(Date.now() / (6 * 3_600_000));
      await this.schedule('business_replied', {
        dedupeKey: `business_replied:${e.conversationId}:${sixHours}`,
        userId: e.customerUserId,
        providerId: provider.id,
        context: {
          conversationId: e.conversationId,
          brandName: provider.brandName,
          excerpt: e.excerpt,
        },
      });
    } catch (err) {
      this.logger.warn(`Reply automation skipped: ${(err as Error).message}`);
    }
  }

  /** A new review: one WhatsApp a day per business, if the owner hasn't seen it. */
  async onReview(e: {
    providerId: string;
    reviewerName: string;
    stars: number;
    text: string | null | undefined;
  }) {
    const { y, m, d } = (() => {
      const t = new Date(Date.now() + IST_OFFSET_MS);
      return {
        y: t.getUTCFullYear(),
        m: t.getUTCMonth() + 1,
        d: t.getUTCDate(),
      };
    })();
    await this.schedule('review_alert', {
      dedupeKey: `review_alert:${e.providerId}:${y}-${m}-${d}`,
      providerId: e.providerId,
      context: {
        reviewerName: e.reviewerName || 'A customer',
        stars: e.stars,
        excerpt: e.text?.trim() || 'No written comment, just the stars.',
      },
    });
  }

  // ── Triggers for updates about a listing ─────────────────────────────────
  // Each is fire-and-forget: a messaging problem never breaks the action.

  /** An admin or a bulk import made a listing with this owner's number. */
  async onListingCreated(providerId: string): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
    });
    if (!provider?.slug) return;
    await this.schedule('listing_created_for_you', {
      dedupeKey: `listing_created_for_you:${providerId}`,
      providerId,
      context: { pageLink: businessPageLink(provider.slug) },
    });
  }

  /** The business's web address changed. */
  async onLinkChanged(
    providerId: string,
    oldSlug: string,
    newSlug: string,
  ): Promise<void> {
    await this.schedule('link_changed', {
      dedupeKey: `link_changed:${providerId}:${newSlug}`,
      providerId,
      context: {
        newLink: businessPageLink(newSlug),
        oldLink: businessPageLink(oldSlug),
      },
    });
  }

  /** An admin changed the listing (not the owner): once a day per business. */
  async onDetailsChangedByAdmin(
    providerId: string,
    changedKeys: string[],
  ): Promise<void> {
    const what = describeChanges(changedKeys);
    if (!what) return;
    await this.schedule('details_updated', {
      dedupeKey: `details_updated:${providerId}:${istDay()}`,
      providerId,
      context: { what, when: istShortDate() },
    });
  }

  /** Moderation removed one of the business's (or its products') photos. */
  async onPhotoRemoved(providerId: string, reason?: string): Promise<void> {
    await this.schedule('photo_removed', {
      dedupeKey: `photo_removed:${providerId}:${istDay()}`,
      providerId,
      context: { reason: reason || 'it did not meet our photo guidelines' },
    });
  }

  /** An admin hid a product or service. */
  async onItemHidden(productId: string, reason?: string): Promise<void> {
    const [row] = await this.dataSource.query<
      { name: string; provider_id: string }[]
    >(`SELECT name, provider_id FROM products WHERE id = $1`, [productId]);
    if (!row) return;
    await this.schedule('item_hidden', {
      dedupeKey: `item_hidden:${productId}:${istDay()}`,
      providerId: row.provider_id,
      context: { itemName: row.name, reason: reason || 'our team reviewed it' },
    });
  }

  /** The owner sent verification documents. */
  async onVerificationSubmitted(userId: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { userId } });
    if (!provider) return;
    await this.schedule('verification_received', {
      dedupeKey: `verification_received:${provider.id}:${istDay()}`,
      providerId: provider.id,
      context: { reviewTime: '2 working days' },
    });
  }

  /** A customer's review went live. */
  async onReviewPublished(e: {
    reviewId: string;
    customerUserId: string;
    providerId: string;
  }): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id: e.providerId },
    });
    if (!provider?.slug) return;
    await this.schedule('review_published', {
      dedupeKey: `review_published:${e.reviewId}`,
      userId: e.customerUserId,
      providerId: provider.id,
      context: {
        businessId: provider.id,
        businessName: provider.brandName,
        businessLink: businessPageLink(provider.slug),
      },
    });
  }

  /**
   * A business changed its hours, phone or address: tell the customers who
   * saved it (once that day each), whoever made the change.
   */
  async onBusinessDetailsChanged(
    providerId: string,
    before: Partial<Provider>,
    after: Partial<Provider>,
  ): Promise<void> {
    if (!(await this.isEnabled('saved_business_update'))) return;
    const change = savedBusinessChange(before, after);
    if (!change) return;
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
    });
    if (!provider || provider.deletedAt) return;
    const savers = await this.dataSource.query<{ user_id: string }[]>(
      `SELECT DISTINCT user_id FROM saved_items WHERE item_id = $1 AND item_type = 'provider' AND user_id <> $2`,
      [providerId, provider.userId],
    );
    for (const s of savers.slice(0, 500)) {
      await this.schedule('saved_business_update', {
        dedupeKey: `saved_business_update:${providerId}:${s.user_id}:${istDay()}`,
        userId: s.user_id,
        providerId,
        context: {
          businessId: providerId,
          businessName: provider.brandName,
          what: change.what,
          newDetails: change.newDetails,
        },
      });
    }
  }

  // ── Running ───────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async runDue(): Promise<void> {
    // Jobs stuck "processing" (a crash mid-send) go back in the queue.
    await this.dataSource.query(
      `UPDATE automation_jobs SET status = 'pending' WHERE status = 'processing' AND updated_at < now() - interval '10 minutes'`,
    );
    const jobs = await this.dataSource.query<{ id: string }[]>(
      `UPDATE automation_jobs SET status = 'processing', updated_at = now()
        WHERE id IN (
          SELECT id FROM automation_jobs
           WHERE status = 'pending' AND due_at <= now()
           ORDER BY due_at LIMIT 50
           FOR UPDATE SKIP LOCKED)
        RETURNING id`,
    );
    for (const { id } of jobs) {
      const job = await this.jobRepo.findOne({ where: { id } });
      if (job) await this.runJob(job);
    }
  }

  /** Decide and send one job; records the outcome on it. */
  async runJob(job: AutomationJob): Promise<Outcome> {
    let outcome: Outcome;
    try {
      outcome = await this.decideAndSend(job);
    } catch (err) {
      outcome = { status: 'failed', reason: param((err as Error).message, 80) };
    }
    if (outcome.status === 'pending') {
      await this.jobRepo.update(
        { id: job.id },
        { status: 'pending', dueAt: outcome.dueAt, skipReason: outcome.reason },
      );
    } else if (outcome.status === 'sent') {
      await this.jobRepo.update(
        { id: job.id },
        {
          status: 'sent',
          messageId: outcome.messageId,
          phone: outcome.phone,
          costInr: String(outcome.cost),
          skipReason: null,
          context: { ...(job.context ?? {}), linkCode: outcome.linkCode },
        },
      );
    } else {
      await this.jobRepo.update(
        { id: job.id },
        {
          status: outcome.status,
          skipReason: outcome.reason,
          phone: outcome.phone ?? job.phone,
        },
      );
    }
    return outcome;
  }

  private async decideAndSend(
    job: AutomationJob,
    opts: { test?: boolean; testPhone?: string } = {},
  ): Promise<Outcome> {
    const def = AUTOMATION_BY_KEY.get(job.automationKey as AutomationKey);
    if (!def) return { status: 'skipped', reason: 'unknown_automation' };
    if (!opts.test && !(await this.isEnabled(def.key)))
      return { status: 'cancelled', reason: 'switched_off' };

    // Who and which number
    const who = await this.recipient(def, job);
    const phone = opts.testPhone ?? who.phone;
    if (!phone) return { status: 'skipped', reason: 'no_phone' };

    if (!opts.test) {
      const stale = await this.noLongerRelevant(def, job, who);
      if (stale) return { status: 'cancelled', reason: stale, phone };

      if (!inSendWindow(this.now())) {
        return {
          status: 'pending',
          dueAt: nextSendWindow(this.now()),
          reason: 'waiting_for_sending_hours',
        };
      }

      if (def.appFirstMinutes > 0 && who.lastSeenAt) {
        const since = Date.now() - def.appFirstMinutes * 60_000;
        if (
          who.lastSeenAt.getTime() >
          Math.max(since, job.createdAt.getTime() - 60_000)
        ) {
          return { status: 'skipped', reason: 'used_the_app', phone };
        }
      }
    }

    if (!this.meta.isConfigured())
      return { status: 'skipped', reason: 'whatsapp_not_configured', phone };

    const contact = await this.inbox.ensureContact(
      phone,
      who.providerId,
      who.userId,
    );
    if (!opts.test) {
      if (!contact.reachable)
        return { status: 'skipped', reason: 'not_on_whatsapp', phone };
      if (def.consent === 'opted_in' && contact.consent !== 'opted_in') {
        return { status: 'skipped', reason: 'not_agreed', phone };
      }
      if (def.consent === 'not_opted_out' && contact.consent === 'opted_out') {
        return { status: 'skipped', reason: 'opted_out', phone };
      }
      if (def.consent === 'not_decided' && contact.consent !== 'unknown') {
        return {
          status: 'skipped',
          reason:
            contact.consent === 'opted_in' ? 'already_agreed' : 'opted_out',
          phone,
        };
      }
    }

    const template = await this.templateRepo.findOne({
      where: { name: def.template.name, language: 'en' },
    });
    if (!template || template.status !== 'approved') {
      return { status: 'skipped', reason: 'template_not_approved', phone };
    }
    if (bodyBlanks(template) !== def.template.vars.length) {
      // Approved with a different set of blanks: Meta would refuse the send.
      return { status: 'skipped', reason: 'template_differs', phone };
    }
    if (template.category !== def.template.category) {
      // Meta re-filed it (e.g. utility → marketing): stop rather than pay more.
      return {
        status: 'skipped',
        reason: `template_is_${template.category}`,
        phone,
      };
    }

    if (!opts.test) {
      const limit = await this.overLimit(def, phone, contact);
      if (limit) return { status: 'skipped', reason: limit, phone };
      const budget = await this.overBudget(def);
      if (budget) return { status: 'skipped', reason: budget, phone };
    }

    // Fill the template
    const ctx: Record<string, unknown> = {
      ...(job.context ?? {}),
      ...who.extra,
    };
    const variables: Record<string, string> = {};
    for (const [i, v] of def.template.vars.entries()) {
      const value = opts.test ? (ctx[v.key] ?? v.sample) : ctx[v.key];
      if (value === undefined || value === null || value === '') {
        return {
          status: 'skipped',
          reason: `missing_${v.key}`.slice(0, 80),
          phone,
        };
      }
      variables[String(i + 1)] = param(
        value,
        v.key === 'excerpt' || v.key === 'reason' ? 140 : 60,
      );
    }

    const link = await this.links.create({
      target: this.targetFor(def, job, who.providerId),
      userId: who.userId,
      providerId: who.providerId,
      automationKey: def.key,
    });
    const message = await this.inbox.sendDirect(
      contact,
      {
        template,
        variables,
        buttonValues: this.buttonValuesFor(
          template,
          link.code,
          job,
          who.providerId,
        ),
      },
      who.providerId,
    );
    if (message.status === 'failed') {
      return {
        status: 'failed',
        reason: param(message.errorMessage ?? 'send_failed', 80),
        phone,
      };
    }
    if (def.template.category === 'marketing') {
      await this.contactRepo.update(
        { id: contact.id },
        { lastMarketingAt: new Date() },
      );
    }
    const rates = (await this.settings.getRow()).rates as unknown as Record<
      string,
      number
    >;
    return {
      status: 'sent',
      messageId: message.id,
      phone,
      cost: Number(rates?.[def.template.category] ?? 0),
      linkCode: link.code,
    };
  }

  /**
   * What fills the template's link button: a smart link (…/go?c={{1}}) takes
   * the code; an older /b/{{1}} link takes the business id; a fixed link
   * takes nothing.
   */
  private buttonValuesFor(
    template: WhatsAppTemplate,
    code: string,
    job: AutomationJob,
    providerId: string | null,
  ): Record<string, string> {
    const buttons =
      template.components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
    const out: Record<string, string> = {};
    buttons.forEach((b, i) => {
      if (b.type !== 'URL' || !/\{\{1\}\}/.test(b.url ?? '')) return;
      if (isAppLinkUrl(b.url)) out[String(i)] = code;
      else
        out[String(i)] =
          (job.context?.businessId as string | undefined) ?? providerId ?? '';
    });
    return out;
  }

  /** The owner (business number) or the customer (their mobile). */
  private async recipient(
    def: AutomationDef,
    job: AutomationJob,
  ): Promise<{
    phone: string | null;
    userId: string | null;
    providerId: string | null;
    lastSeenAt: Date | null;
    extra: Record<string, unknown>;
  }> {
    if (def.audience === 'owner') {
      const provider = job.providerId
        ? await this.providerRepo.findOne({ where: { id: job.providerId } })
        : null;
      if (!provider)
        return {
          phone: null,
          userId: job.userId,
          providerId: job.providerId,
          lastSeenAt: null,
          extra: {},
        };
      const owner = await this.userRepo.findOne({
        where: { id: provider.userId },
      });
      const phone = this.consent.businessPhone(provider, owner?.mobileNumber);
      return {
        phone,
        userId: provider.userId,
        providerId: provider.id,
        lastSeenAt: owner?.lastSeenAt ?? null,
        extra: {
          brandName: provider.brandName,
          ownerFirstName:
            (owner?.name ?? '').trim().split(/\s+/)[0] || provider.brandName,
          maskedPhone: maskPhone(toE164(owner?.mobileNumber) ?? phone ?? ''),
          signedIn: !!(owner?.supabaseId || owner?.googleId),
        },
      };
    }
    const user = job.userId
      ? await this.userRepo.findOne({ where: { id: job.userId } })
      : null;
    return {
      phone: toE164(user?.mobileNumber),
      userId: user?.id ?? job.userId,
      providerId: job.providerId,
      lastSeenAt: user?.lastSeenAt ?? null,
      extra: {
        customerFirstName: (user?.name ?? '').trim().split(/\s+/)[0] || 'there',
      },
    };
  }

  /** Something already took care of it: the enquiry was read, the owner signed in… */
  private async noLongerRelevant(
    def: AutomationDef,
    job: AutomationJob,
    who: { userId: string | null; extra: Record<string, unknown> },
  ): Promise<string | null> {
    const conversationId = job.context?.conversationId as string | undefined;
    if (
      (def.key === 'enquiry_alert' ||
        def.key === 'customer_waiting' ||
        def.key === 'business_replied') &&
      conversationId &&
      who.userId
    ) {
      const [row] = await this.dataSource.query<{ unread: number }[]>(
        `SELECT unread_count AS unread FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, who.userId],
      );
      if (!row || Number(row.unread) === 0) return 'already_read';
    }
    if (
      def.key === 'shop_live' &&
      job.context?.onlyIfNotSignedIn &&
      who.extra.signedIn
    )
      return 'already_signed_in';
    return null;
  }

  /** Daily, weekly, marketing and "ignored" limits for this number. */
  private async overLimit(
    def: AutomationDef,
    phone: string,
    contact: WhatsAppContact,
  ): Promise<string | null> {
    const enquiryKeys = AUTOMATIONS.filter((a) => a.enquiry).map((a) => a.key);
    const [c] = await this.dataSource.query<
      {
        day: string;
        day_enquiry: string;
        week: string;
        this_key_week: string;
        this_key_ever: string;
      }[]
    >(
      `SELECT
         count(*) FILTER (WHERE updated_at > now() - interval '24 hours') AS day,
         count(*) FILTER (WHERE updated_at > now() - interval '24 hours' AND automation_key = ANY($2)) AS day_enquiry,
         count(*) FILTER (WHERE updated_at > now() - interval '7 days') AS week,
         count(*) FILTER (WHERE updated_at > now() - interval '7 days' AND automation_key = $3) AS this_key_week,
         count(*) FILTER (WHERE automation_key = $3) AS this_key_ever
       FROM automation_jobs WHERE phone = $1 AND status = 'sent'`,
      [phone, enquiryKeys, def.key],
    );
    const n = (k: keyof typeof c) => Number(c?.[k] ?? 0);

    if (def.template.category === 'marketing') {
      if (
        contact.lastMarketingAt &&
        Date.now() - contact.lastMarketingAt.getTime() <
          MARKETING_GAP_DAYS * 86_400_000
      ) {
        return 'marketing_limit';
      }
      if (
        def.key === 'customer_waiting' &&
        (n('this_key_week') >= 1 || n('this_key_ever') >= 3)
      )
        return 'marketing_limit';
    }
    if (!def.essential) {
      if (
        def.enquiry
          ? n('day_enquiry') >= MAX_ENQUIRY_PER_DAY ||
            n('day') - n('day_enquiry') >= MAX_PER_DAY
          : n('day') >= MAX_PER_DAY
      ) {
        return 'daily_limit';
      }
      if (n('week') >= MAX_PER_WEEK) return 'weekly_limit';

      // Three untapped messages in a row (over a day old, last 30 days): back off.
      const recent = await this.dataSource.query<{ opened: boolean }[]>(
        `SELECT (g.opened_at IS NOT NULL) AS opened
           FROM automation_jobs j
           LEFT JOIN go_links g ON g.code = j.context->>'linkCode'
          WHERE j.phone = $1 AND j.status = 'sent'
            AND j.updated_at BETWEEN now() - interval '30 days' AND now() - interval '24 hours'
          ORDER BY j.updated_at DESC LIMIT ${IGNORED_IN_A_ROW}`,
        [phone],
      );
      if (recent.length === IGNORED_IN_A_ROW && recent.every((r) => !r.opened))
        return 'ignored_recently';
    }
    return null;
  }

  private async overBudget(def: AutomationDef): Promise<string | null> {
    const row = await this.automationRepo.findOne({ where: { key: def.key } });
    if (!row?.monthlyBudgetInr) return null;
    const [s] = await this.dataSource.query<{ spent: string }[]>(
      `SELECT COALESCE(sum(cost_inr), 0) AS spent FROM automation_jobs
        WHERE automation_key = $1 AND status = 'sent' AND updated_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`,
      [def.key],
    );
    return Number(s?.spent ?? 0) >= Number(row.monthlyBudgetInr)
      ? 'budget_reached'
      : null;
  }

  /** The app screen each message opens. Owner screens switch to business mode. */
  private targetFor(
    def: AutomationDef,
    job: AutomationJob,
    providerId: string | null,
  ): string {
    const conv = job.context?.conversationId as string | undefined;
    const owner = (path: string) =>
      `${path}${path.includes('?') ? '&' : '?'}mode=provider`;
    switch (def.key) {
      case 'enquiry_alert':
      case 'customer_waiting':
        return owner(
          conv ? `/?tab=chats&conversationId=${conv}` : '/?tab=chats',
        );
      case 'enquiries_waiting':
        return owner('/?tab=chats');
      case 'business_replied':
        return conv
          ? `/?tab=chats&conversationId=${conv}&mode=customer`
          : '/?tab=chats&mode=customer';
      case 'weekly_summary':
      case 'monthly_summary':
      case 'free_leads_left':
        return owner('/?tab=analytics');
      case 'review_alert':
        return owner('/?tab=listings&subTab=reviews');
      case 'verification_approved':
      case 'verification_not_approved':
        return owner('/provider-onboarding/verify');
      case 'deal_approved':
      case 'deal_not_approved':
        return owner('/?tab=listings&subTab=deals');
      case 'plan_renewal':
      case 'payment_failed':
        return owner('/?tab=listings&subTab=plans');
      case 'boost_ending':
        return owner('/?tab=listings&subTab=boost');
      case 'listing_created_for_you':
      case 'details_updated':
        return owner('/?tab=listings&subTab=details');
      case 'photo_removed':
        return owner('/?tab=listings&subTab=photos');
      case 'item_hidden':
        return owner('/?tab=listings&subTab=products');
      case 'verification_received':
        return owner('/provider-onboarding/verify');
      case 'review_published':
      case 'saved_business_update': {
        const businessId = job.context?.businessId as string | undefined;
        return businessId
          ? `/provider-details?id=${businessId}&mode=customer`
          : '/?mode=customer';
      }
      case 'link_changed':
        return owner(providerId ? `/provider-details?id=${providerId}` : '/');
      case 'women_led_approved':
      case 'shop_live':
      default:
        return owner(providerId ? `/provider-details?id=${providerId}` : '/');
    }
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  /** Every automation with its switch, template state and last 7 days. */
  async list() {
    const [rows, templates, stats] = await Promise.all([
      this.automationRepo.find(),
      this.templateRepo.find({
        where: AUTOMATIONS.map((a) => ({
          name: a.template.name,
          language: 'en',
        })),
      }),
      this.dataSource.query<
        {
          key: string;
          status: string;
          reason: string | null;
          n: string;
          cost: string;
        }[]
      >(
        `SELECT automation_key AS key, status, skip_reason AS reason, count(*) AS n, COALESCE(sum(cost_inr), 0) AS cost
           FROM automation_jobs WHERE created_at > now() - interval '7 days'
          GROUP BY 1, 2, 3`,
      ),
    ]);
    const opens = await this.dataSource.query<
      { key: string; opened: string }[]
    >(
      `SELECT automation_key AS key, count(*) FILTER (WHERE opened_at IS NOT NULL) AS opened
         FROM go_links WHERE automation_key IS NOT NULL AND created_at > now() - interval '7 days' GROUP BY 1`,
    );
    return AUTOMATIONS.map((a) => {
      const row = rows.find((r) => r.key === a.key);
      const t = templates.find((x) => x.name === a.template.name);
      const mine = stats.filter((s) => s.key === a.key);
      const count = (status: string) =>
        mine
          .filter((s) => s.status === status)
          .reduce((n, s) => n + Number(s.n), 0);
      const skipped: Record<string, number> = {};
      for (const s of mine.filter(
        (m) => m.status === 'skipped' || m.status === 'cancelled',
      )) {
        skipped[s.reason ?? 'other'] =
          (skipped[s.reason ?? 'other'] ?? 0) + Number(s.n);
      }
      return {
        key: a.key,
        name: a.name,
        when: a.when,
        audience: a.audience,
        category: a.template.category,
        templateName: a.template.name,
        templateBody: a.template.body,
        templateStatus: t ? t.status : 'missing',
        templateCategory: t?.category ?? null,
        // An existing template with a different number of blanks can't be sent.
        templateMatches: t ? bodyBlanks(t) === a.template.vars.length : true,
        section:
          a.section ??
          (a.template.category === 'marketing'
            ? 'asking'
            : a.audience === 'customer'
              ? 'customers'
              : 'alerts'),
        enabled: !!row?.enabled,
        monthlyBudgetInr: row?.monthlyBudgetInr
          ? Number(row.monthlyBudgetInr)
          : null,
        last7Days: {
          scheduled: mine.reduce((n, s) => n + Number(s.n), 0),
          sent: count('sent'),
          failed: count('failed'),
          waiting: count('pending') + count('processing'),
          opened: Number(opens.find((o) => o.key === a.key)?.opened ?? 0),
          costInr: mine
            .filter((s) => s.status === 'sent')
            .reduce((n, s) => n + Number(s.cost), 0),
          skipped,
        },
      };
    });
  }

  async recentJobs(key: AutomationKey, limit = 50) {
    if (!AUTOMATION_BY_KEY.has(key))
      throw new NotFoundException('Unknown automation');
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT j.id, j.created_at, j.updated_at, j.due_at, j.status, j.skip_reason, j.phone, j.provider_id, j.user_id,
              p.brand_name, u.name AS user_name
         FROM automation_jobs j
         LEFT JOIN providers p ON p.id = j.provider_id
         LEFT JOIN users u ON u.id = j.user_id
        WHERE j.automation_key = $1
        ORDER BY j.created_at DESC LIMIT $2`,
      [key, Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      dueAt: r.due_at,
      status: r.status,
      reason: r.skip_reason,
      phone: typeof r.phone === 'string' ? maskPhone(r.phone) : null,
      providerId: r.provider_id,
      businessName: r.brand_name ?? null,
      userName: r.user_name ?? null,
    }));
  }

  /** Send this automation's template to any number with sample values (admin test). */
  async sendTest(key: AutomationKey, rawPhone: string, adminId: string | null) {
    const def = AUTOMATION_BY_KEY.get(key);
    if (!def) throw new NotFoundException('Unknown automation');
    const phone = toE164(rawPhone);
    if (!phone) return { ok: false, reason: 'invalid_phone' };
    const job = this.jobRepo.create({
      automationKey: key,
      dedupeKey: `test:${key}:${Date.now()}`,
      userId: adminId,
      providerId: null,
      dueAt: new Date(),
      context: {},
    });
    job.createdAt = new Date();
    const outcome = await this.decideAndSend(job, {
      test: true,
      testPhone: phone,
    });
    if (outcome.status === 'sent') return { ok: true };
    return { ok: false, reason: outcome.reason };
  }
}
