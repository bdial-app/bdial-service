import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import {
  WhatsAppConsent,
  WhatsAppContact,
} from '../entities/whatsapp-contact.entity';
import { WhatsAppConsentEvent } from '../entities/whatsapp-consent-event.entity';
import { toE164 } from './whatsapp-phone.util';

/** Where consent came from. The app_* sources are the owner deciding themselves. */
export type ConsentSource =
  | 'app_onboarding'
  | 'app_prompt'
  | 'app_settings'
  | 'admin_recorded'
  | 'bulk_import'
  | 'admin'
  | 'keyword'
  | 'whatsapp_button';

/** How an admin got consent from the owner. */
export const ADMIN_CONSENT_METHODS = [
  'in_person',
  'phone_call',
  'paper_form',
  'whatsapp_chat',
  'import_file',
] as const;
export type AdminConsentMethod = (typeof ADMIN_CONSENT_METHODS)[number];

const OWNER_SOURCES: ConsentSource[] = [
  'app_onboarding',
  'app_prompt',
  'app_settings',
  'whatsapp_button',
];

/** The consent text the app shows owners; bump when it changes. */
export const OWNER_CONSENT_WORDING = 'owner_alerts_v1';

/**
 * The line under "Submit" when an owner lists their business: "By listing
 * your business, you agree to receive customer enquiries and account updates
 * from Tijarah on WhatsApp…". Submitting is their yes.
 */
export const SIGNUP_NOTICE_WORDING = 'signup_notice_v1';

/** Ask again after "Not now", at most this often and this many times. */
const REASK_AFTER_DAYS = 30;
const MAX_PROMPTS = 3;

export interface OwnerConsentStatus {
  /** False when the user has no usable phone number. */
  applicable: boolean;
  /** owner: alerts about their business · customer: replies from businesses */
  role: 'owner' | 'customer';
  providerId: string | null;
  brandName: string | null;
  /** The number alerts go to, e.g. +91 98••••3210. */
  phoneMasked: string | null;
  consent: WhatsAppConsent;
  /** Recorded by an admin and not yet confirmed by the owner. */
  recordedByAdmin: boolean;
  ownerConfirmed: boolean;
  /** Show the in-app question now. */
  shouldPrompt: boolean;
  /** ask: never agreed · confirm: an admin recorded it, owner hasn't confirmed */
  promptKind: 'ask' | 'confirm' | null;
}

const mask = (e164: string) =>
  e164.length > 8
    ? `${e164.slice(0, 3)} ${e164.slice(3, 5)}••••${e164.slice(-4)}`
    : e164;

/**
 * One place that records WhatsApp consent — from the app, from admins, from
 * imports and from STOP/START replies — so the current state (on the contact)
 * and its history (whatsapp_consent_events) always agree.
 */
@Injectable()
export class WhatsAppConsentService {
  private readonly logger = new Logger(WhatsAppConsentService.name);

  constructor(
    @InjectRepository(WhatsAppContact)
    private readonly contactRepo: Repository<WhatsAppContact>,
    @InjectRepository(WhatsAppConsentEvent)
    private readonly eventRepo: Repository<WhatsAppConsentEvent>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * The number we message a business on — the same order campaigns use:
   * its WhatsApp number, then its contact number, then the owner's mobile.
   */
  businessPhone(
    provider: Pick<Provider, 'whatsappNumber' | 'contactNumber'>,
    ownerMobile: string | null | undefined,
  ): string | null {
    for (const raw of [
      provider.whatsappNumber,
      provider.contactNumber,
      ownerMobile,
    ]) {
      const phone = toE164(raw);
      if (phone) return phone;
    }
    return null;
  }

  /** The business a user owns (one per user), with its owner. */
  private async ownedBusiness(
    userId: string,
  ): Promise<{ provider: Provider; user: User } | null> {
    const provider = await this.providerRepo.findOne({
      where: { userId, deletedAt: IsNull() },
    });
    if (!provider) return null;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user ? { provider, user } : null;
  }

  async ownerStatus(userId: string): Promise<OwnerConsentStatus> {
    const none: OwnerConsentStatus = {
      applicable: false,
      role: 'owner',
      providerId: null,
      brandName: null,
      phoneMasked: null,
      consent: 'unknown',
      recordedByAdmin: false,
      ownerConfirmed: false,
      shouldPrompt: false,
      promptKind: null,
    };
    const owned = await this.ownedBusiness(userId);
    if (!owned) return this.customerStatus(userId, none);
    const phone = this.businessPhone(owned.provider, owned.user.mobileNumber);
    if (!phone)
      return {
        ...none,
        providerId: owned.provider.id,
        brandName: owned.provider.brandName,
      };

    const contact = await this.contactRepo.findOne({ where: { phone } });
    const consent = contact?.consent ?? 'unknown';
    const ownerConfirmed = !!contact?.ownerConfirmedAt;
    const recordedByAdmin =
      consent === 'opted_in' &&
      !ownerConfirmed &&
      !OWNER_SOURCES.includes((contact?.consentSource ?? '') as ConsentSource);

    // Never nag someone who said no, or who already decided in the app.
    let shouldPrompt = consent !== 'opted_out' && !ownerConfirmed;
    if (shouldPrompt && contact) {
      const asked = contact.consentPromptCount ?? 0;
      const last = contact.consentPromptedAt?.getTime() ?? 0;
      if (asked >= MAX_PROMPTS) shouldPrompt = false;
      else if (last && Date.now() - last < REASK_AFTER_DAYS * 86_400_000)
        shouldPrompt = false;
    }

    return {
      applicable: true,
      role: 'owner',
      providerId: owned.provider.id,
      brandName: owned.provider.brandName,
      phoneMasked: mask(phone),
      consent,
      recordedByAdmin,
      ownerConfirmed,
      shouldPrompt,
      promptKind: shouldPrompt ? (recordedByAdmin ? 'confirm' : 'ask') : null,
    };
  }

  /**
   * Customers (no business): replies from businesses on WhatsApp, to their
   * own mobile. Only ever turned on from Settings, never prompted.
   */
  private async customerStatus(
    userId: string,
    none: OwnerConsentStatus,
  ): Promise<OwnerConsentStatus> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const phone = toE164(user?.mobileNumber);
    if (!phone) return { ...none, role: 'customer' };
    const contact = await this.contactRepo.findOne({ where: { phone } });
    return {
      ...none,
      applicable: true,
      role: 'customer',
      phoneMasked: mask(phone),
      consent: contact?.consent ?? 'unknown',
      ownerConfirmed: !!contact?.ownerConfirmedAt,
    };
  }

  /** The owner (or a customer, for their own number) chose in the app: yes or no. */
  async setByOwner(
    userId: string,
    consent: 'opted_in' | 'opted_out',
    source: 'app_onboarding' | 'app_prompt' | 'app_settings',
  ): Promise<OwnerConsentStatus> {
    const owned = await this.ownedBusiness(userId);
    let phone = owned
      ? this.businessPhone(owned.provider, owned.user.mobileNumber)
      : null;
    if (!owned) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      phone = toE164(user?.mobileNumber);
    }
    if (!phone) return this.ownerStatus(userId);
    await this.record({
      phone,
      providerId: owned?.provider.id ?? null,
      userId,
      consent,
      source,
      wording:
        source === 'app_onboarding'
          ? SIGNUP_NOTICE_WORDING
          : OWNER_CONSENT_WORDING,
      ownerConfirmed: true,
    });
    return this.ownerStatus(userId);
  }

  /** The owner chose "Not now": ask again later, a limited number of times. */
  async ownerLater(userId: string): Promise<OwnerConsentStatus> {
    const owned = await this.ownedBusiness(userId);
    const phone = owned
      ? this.businessPhone(owned.provider, owned.user.mobileNumber)
      : null;
    if (!owned || !phone) return this.ownerStatus(userId);
    const contact = await this.ensureContact(phone, owned.provider.id, userId);
    await this.contactRepo.update(
      { id: contact.id },
      {
        consentPromptedAt: new Date(),
        consentPromptCount: (contact.consentPromptCount ?? 0) + 1,
      },
    );
    await this.eventRepo.save(
      this.eventRepo.create({
        phone,
        contactId: contact.id,
        userId,
        providerId: owned.provider.id,
        consent: 'later',
        source: 'app_prompt',
        wording: OWNER_CONSENT_WORDING,
      }),
    );
    return this.ownerStatus(userId);
  }

  /**
   * An admin records that the owner agreed (in person, on a call…), when
   * onboarding the business. The owner still confirms in the app later.
   */
  async recordForBusiness(opts: {
    providerId: string;
    adminId: string;
    method: AdminConsentMethod;
    source: 'admin_recorded' | 'bulk_import';
  }): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id: opts.providerId },
    });
    if (!provider) return;
    const owner = await this.userRepo.findOne({
      where: { id: provider.userId },
    });
    const phone = this.businessPhone(provider, owner?.mobileNumber);
    if (!phone) return;
    // Never override someone who said no themselves.
    const existing = await this.contactRepo.findOne({ where: { phone } });
    if (existing?.consent === 'opted_out') return;
    await this.record({
      phone,
      providerId: provider.id,
      userId: provider.userId,
      consent: 'opted_in',
      source: opts.source,
      method: opts.method,
      actorId: opts.adminId,
    });
  }

  /** STOP / START replies on WhatsApp. */
  /**
   * The owner tapped "Yes, alert me" / "Not interested" on one of our
   * WhatsApp messages: their own decision, so no need to confirm in the app.
   */
  async recordButton(
    contact: WhatsAppContact,
    consent: 'opted_in' | 'opted_out',
  ): Promise<void> {
    await this.record({
      phone: contact.phone,
      providerId: contact.providerId,
      userId: contact.userId,
      consent,
      source: 'whatsapp_button',
      ownerConfirmed: true,
    });
  }

  async recordKeyword(
    contact: WhatsAppContact,
    consent: 'opted_in' | 'opted_out',
  ): Promise<void> {
    await this.record({
      phone: contact.phone,
      providerId: contact.providerId,
      userId: contact.userId,
      consent,
      source: 'keyword',
    });
  }

  /** An admin changed consent on a contact in the WhatsApp Audience. */
  async recordAdminEdit(
    contact: WhatsAppContact,
    consent: WhatsAppConsent,
    adminId: string | null,
  ): Promise<void> {
    await this.eventRepo.save(
      this.eventRepo.create({
        phone: contact.phone,
        contactId: contact.id,
        userId: contact.userId,
        providerId: contact.providerId,
        consent,
        source: 'admin',
        actorId: adminId,
      }),
    );
  }

  private async ensureContact(
    phone: string,
    providerId: string | null,
    userId: string | null,
  ): Promise<WhatsAppContact> {
    let contact = await this.contactRepo.findOne({ where: { phone } });
    if (!contact) {
      try {
        contact = await this.contactRepo.save(
          this.contactRepo.create({ phone, providerId, userId }),
        );
      } catch {
        // Created at the same moment elsewhere (unique phone): use that one.
        contact = await this.contactRepo.findOneOrFail({ where: { phone } });
      }
    } else if (
      (!contact.providerId && providerId) ||
      (!contact.userId && userId)
    ) {
      await this.contactRepo.update(
        { id: contact.id },
        {
          providerId: contact.providerId ?? providerId,
          userId: contact.userId ?? userId,
        },
      );
    }
    return contact;
  }

  private async record(e: {
    phone: string;
    providerId: string | null;
    userId: string | null;
    consent: 'opted_in' | 'opted_out';
    source: ConsentSource;
    method?: AdminConsentMethod;
    actorId?: string;
    wording?: string;
    ownerConfirmed?: boolean;
  }): Promise<void> {
    const contact = await this.ensureContact(e.phone, e.providerId, e.userId);
    const now = new Date();
    await this.contactRepo.update(
      { id: contact.id },
      {
        consent: e.consent,
        consentChangedAt: now,
        consentSource: e.source,
        consentMethod: e.method ?? null,
        ...(e.ownerConfirmed
          ? { ownerConfirmedAt: now, consentPromptedAt: now }
          : {}),
      },
    );
    await this.eventRepo.save(
      this.eventRepo.create({
        phone: e.phone,
        contactId: contact.id,
        userId: e.userId,
        providerId: e.providerId,
        consent: e.consent,
        source: e.source,
        method: e.method ?? null,
        actorId: e.actorId ?? null,
        wording: e.wording ?? null,
      }),
    );
    this.logger.log(
      `WhatsApp consent ${e.consent} for ${mask(e.phone)} (${e.source}${e.method ? `/${e.method}` : ''})`,
    );
  }
}
