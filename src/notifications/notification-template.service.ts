import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  /** In-memory cache of templates by slug — refreshed on mutations */
  private cache: Map<string, NotificationTemplate> = new Map();
  private cacheLoaded = false;

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Core API — used by dispatch service
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if a notification slug is enabled by admin.
   * Returns false if template doesn't exist (not yet seeded) — defaults to enabled.
   */
  async isEnabled(slug: string): Promise<boolean> {
    const template = await this.getBySlug(slug);
    if (!template) return true; // Not configured yet = enabled by default
    return template.isActive;
  }

  /**
   * Resolve a template: interpolate variables into title + body.
   * Returns null if template is disabled.
   */
  async resolve(
    slug: string,
    variables: Record<string, string> = {},
  ): Promise<{ title: string; body: string; route?: string; imageUrl?: string } | null> {
    const template = await this.getBySlug(slug);

    // No template configured — caller should use fallback text
    if (!template) return null;

    // Admin disabled this notification
    if (!template.isActive) return null;

    const title = this.interpolate(template.titleTemplate, variables);
    const body = this.interpolate(template.bodyTemplate, variables);
    const route = template.defaultRoute
      ? this.interpolate(template.defaultRoute, variables)
      : undefined;

    return {
      title,
      body,
      route,
      imageUrl: template.defaultImageUrl || undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Admin CRUD
  // ─────────────────────────────────────────────────────────────

  async findAll(category?: string): Promise<NotificationTemplate[]> {
    const qb = this.templateRepo.createQueryBuilder('t').orderBy('t.category').addOrderBy('t.name');
    if (category) qb.where('t.category = :category', { category });
    return qb.getMany();
  }

  async findById(id: string): Promise<NotificationTemplate> {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async getBySlug(slug: string): Promise<NotificationTemplate | null> {
    await this.ensureCache();
    return this.cache.get(slug) || null;
  }

  async create(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const t = this.templateRepo.create(data);
    const saved = await this.templateRepo.save(t);
    this.invalidateCache();
    return saved;
  }

  async update(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.templateRepo.update(id, data);
    this.invalidateCache();
    return this.findById(id);
  }

  async toggleActive(id: string, isActive: boolean): Promise<NotificationTemplate> {
    await this.templateRepo.update(id, { isActive });
    this.invalidateCache();
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.templateRepo.delete(id);
    this.invalidateCache();
  }

  // ─────────────────────────────────────────────────────────────
  // Seed default templates — called on module init
  // ─────────────────────────────────────────────────────────────

  async seedDefaults(): Promise<void> {
    const existing = await this.templateRepo.count();
    if (existing > 0) {
      this.logger.log(`${existing} notification templates already exist — skipping seed`);
      return;
    }

    const defaults = this.getDefaultTemplates();
    await this.templateRepo.save(defaults.map((d) => this.templateRepo.create(d)));
    this.invalidateCache();
    this.logger.log(`Seeded ${defaults.length} default notification templates`);
  }

  // ─────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheLoaded) return;
    const all = await this.templateRepo.find();
    this.cache.clear();
    all.forEach((t) => this.cache.set(t.slug, t));
    this.cacheLoaded = true;
  }

  private invalidateCache(): void {
    this.cacheLoaded = false;
    this.cache.clear();
  }

  private getDefaultTemplates(): Partial<NotificationTemplate>[] {
    return [
      // ─── Onboarding ───
      {
        slug: 'welcome',
        name: 'Welcome Message',
        description: 'Sent immediately after user registration',
        type: 'system_announcement',
        titleTemplate: 'Welcome to Tijarah! 🎉',
        bodyTemplate: 'Hi {{userName}}, welcome to Tijarah Connect — your local services marketplace.',
        variables: ['userName'],
        category: 'onboarding',
        isActive: true,
        defaultRoute: '/',
      },
      {
        slug: 'complete_profile',
        name: 'Complete Profile Reminder',
        description: 'Sent 24h after signup if profile is incomplete',
        type: 'system_announcement',
        titleTemplate: 'Complete your profile',
        bodyTemplate: 'Add your photo and details to get the best experience on Tijarah.',
        variables: ['userName'],
        category: 'onboarding',
        isActive: true,
        defaultRoute: '/auth/create-account',
      },
      {
        slug: 'become_provider',
        name: 'Become a Provider CTA',
        description: 'Sent 7 days after signup to customer-only users',
        type: 'promotional',
        titleTemplate: 'Offer your services on Tijarah',
        bodyTemplate: 'Hi {{userName}}, did you know you can list your services and reach thousands of customers?',
        variables: ['userName'],
        category: 'onboarding',
        isActive: true,
        defaultRoute: '/provider-onboarding',
      },

      // ─── Payment & Subscription ───
      {
        slug: 'payment_success',
        name: 'Payment Successful',
        description: 'Sent when a payment is confirmed',
        type: 'payment_update',
        titleTemplate: 'Payment Confirmed ✓',
        bodyTemplate: 'Your payment of {{amount}} has been processed successfully.',
        variables: ['amount', 'description'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'payment_failed',
        name: 'Payment Failed',
        description: 'Sent when a payment fails',
        type: 'payment_update',
        titleTemplate: 'Payment Failed',
        bodyTemplate: 'Your payment could not be processed. Please update your payment method.',
        variables: ['amount'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'subscription_activated',
        name: 'Subscription Activated',
        description: 'Sent when subscription starts',
        type: 'subscription_update',
        titleTemplate: 'Subscription Active! 🚀',
        bodyTemplate: 'Your {{planName}} subscription is now active. Enjoy premium features!',
        variables: ['planName'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'subscription_renewal_success',
        name: 'Subscription Renewal Success',
        description: 'Sent on successful recurring payment',
        type: 'subscription_update',
        titleTemplate: 'Subscription Renewed',
        bodyTemplate: 'Your {{planName}} subscription has been renewed successfully.',
        variables: ['planName'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'subscription_expiring',
        name: 'Subscription Expiring Soon',
        description: 'Sent 7 days before subscription ends',
        type: 'subscription_update',
        titleTemplate: 'Subscription expiring soon',
        bodyTemplate: 'Your {{planName}} subscription expires in {{daysLeft}} days. Renew to keep your benefits.',
        variables: ['planName', 'daysLeft'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'subscription_cancelled',
        name: 'Subscription Cancelled',
        description: 'Sent when subscription is cancelled',
        type: 'subscription_update',
        titleTemplate: 'Subscription Cancelled',
        bodyTemplate: 'Your {{planName}} subscription has been cancelled. You can resubscribe anytime.',
        variables: ['planName'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },

      // ─── Voucher ───
      {
        slug: 'voucher_available',
        name: 'New Voucher Available',
        description: 'Sent when admin creates a new voucher for users',
        type: 'voucher_update',
        titleTemplate: 'New Voucher: {{voucherCode}} 🎟️',
        bodyTemplate: 'Use code {{voucherCode}} to get {{discount}} off! Valid until {{expiryDate}}.',
        variables: ['voucherCode', 'discount', 'expiryDate'],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'voucher_expiring',
        name: 'Voucher Expiring Soon',
        description: 'Sent 48h before voucher expires',
        type: 'voucher_update',
        titleTemplate: 'Voucher expiring soon!',
        bodyTemplate: 'Your voucher {{voucherCode}} expires in 48 hours. Use it before it\'s gone!',
        variables: ['voucherCode'],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },
      {
        slug: 'voucher_redeemed',
        name: 'Voucher Redeemed',
        description: 'Sent after successful voucher redemption',
        type: 'voucher_update',
        titleTemplate: 'Voucher Applied ✓',
        bodyTemplate: 'Voucher {{voucherCode}} applied — you saved {{discount}}!',
        variables: ['voucherCode', 'discount'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/subscription',
      },

      // ─── Reports ───
      {
        slug: 'report_submitted',
        name: 'Report Submitted',
        description: 'Confirmation when user submits a report',
        type: 'report_update',
        titleTemplate: 'Report Received',
        bodyTemplate: 'We\'ve received your report and will review it shortly.',
        variables: [],
        category: 'transactional',
        isActive: true,
      },
      {
        slug: 'report_resolved',
        name: 'Report Resolved',
        description: 'Sent when admin resolves a user report',
        type: 'report_update',
        titleTemplate: 'Report Resolved',
        bodyTemplate: 'Your report has been reviewed and appropriate action has been taken. Thank you for keeping Tijarah safe.',
        variables: ['outcome'],
        category: 'transactional',
        isActive: true,
      },

      // ─── Provider Business ───
      {
        slug: 'warning_issued',
        name: 'Warning Issued',
        description: 'Sent when admin issues a warning to provider',
        type: 'provider_status',
        titleTemplate: 'Account Warning',
        bodyTemplate: 'A warning has been issued on your account: {{reason}}. Please review our guidelines.',
        variables: ['reason'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider-details',
      },
      {
        slug: 'provider_disabled',
        name: 'Provider Disabled',
        description: 'Sent when admin disables a provider profile',
        type: 'provider_status',
        titleTemplate: 'Provider Profile Disabled',
        bodyTemplate: 'Your provider profile has been disabled. Contact support for more information.',
        variables: [],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider-details',
      },
      {
        slug: 'provider_enabled',
        name: 'Provider Re-enabled',
        description: 'Sent when admin re-enables a provider profile',
        type: 'provider_status',
        titleTemplate: 'Provider Profile Restored',
        bodyTemplate: 'Your provider profile has been re-enabled and is now visible to customers again.',
        variables: [],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider-details',
      },
      {
        slug: 'sponsorship_approved',
        name: 'Sponsorship Approved',
        description: 'Sent when admin approves a sponsorship request',
        type: 'provider_status',
        titleTemplate: 'Sponsorship Approved! 🌟',
        bodyTemplate: 'Your sponsored listing is now live and visible to customers in your target area.',
        variables: [],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/sponsorships',
      },
      {
        slug: 'offer_approved',
        name: 'Offer Approved',
        description: 'Sent when admin approves an offer/deal request',
        type: 'provider_status',
        titleTemplate: 'Offer Approved! 🎯',
        bodyTemplate: 'Your offer is now live and visible to customers.',
        variables: [],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/deals',
      },
      {
        slug: 'sponsorship_expiring',
        name: 'Sponsorship Expiring Soon',
        description: 'Sent 3 days before sponsorship ends',
        type: 'provider_status',
        titleTemplate: 'Sponsorship ending soon',
        bodyTemplate: 'Your sponsored listing expires in {{daysLeft}} days. Renew to maintain visibility.',
        variables: ['daysLeft'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/sponsorships',
      },
      {
        slug: 'lead_unlocked',
        name: 'Lead Unlocked',
        description: 'Sent when provider unlocks a lead',
        type: 'new_enquiry',
        titleTemplate: 'New Lead Unlocked 🔓',
        bodyTemplate: 'You unlocked a lead from {{customerName}}. Start the conversation now!',
        variables: ['customerName'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/provider/leads',
      },

      // ─── Engagement ───
      {
        slug: 'saved_provider_new_product',
        name: 'Saved Provider: New Product',
        description: 'Sent when a saved provider adds a new product',
        type: 'promotional',
        titleTemplate: '{{providerName}} added something new',
        bodyTemplate: '{{providerName}} added "{{productName}}" — check it out!',
        variables: ['providerName', 'productName', 'providerId'],
        category: 'engagement',
        isActive: true,
        defaultRoute: '/provider-details/{{providerId}}',
      },
      {
        slug: 'saved_provider_new_deal',
        name: 'Saved Provider: New Deal',
        description: 'Sent when a saved provider posts a deal',
        type: 'promotional',
        titleTemplate: '{{providerName}} has a new deal! 🔥',
        bodyTemplate: '{{providerName}} just posted a new offer. Don\'t miss out!',
        variables: ['providerName', 'providerId'],
        category: 'engagement',
        isActive: true,
        defaultRoute: '/provider-details/{{providerId}}',
      },
      {
        slug: 'inactive_reminder',
        name: 'We Miss You',
        description: 'Sent after 14 days of inactivity',
        type: 'promotional',
        titleTemplate: 'We miss you! 👋',
        bodyTemplate: 'It\'s been a while, {{userName}}. New services and providers are waiting for you.',
        variables: ['userName'],
        category: 'engagement',
        isActive: true,
        defaultRoute: '/',
      },
      {
        slug: 'new_providers_nearby',
        name: 'New Providers in Your Area',
        description: 'Weekly digest of new providers in user area',
        type: 'promotional',
        titleTemplate: '{{count}} new providers near you',
        bodyTemplate: 'New service providers have joined Tijarah in your area. Explore now!',
        variables: ['count', 'city'],
        category: 'engagement',
        isActive: true,
        defaultRoute: '/search',
      },

      // ─── Referral ───
      {
        slug: 'invite_accepted',
        name: 'Invite Accepted',
        description: 'Sent when someone you invited joins Tijarah',
        type: 'invite_update',
        titleTemplate: 'Your invite was accepted! 🎉',
        bodyTemplate: 'Someone you invited just joined Tijarah. Thanks for spreading the word!',
        variables: [],
        category: 'engagement',
        isActive: true,
        defaultRoute: '/invite',
      },
      {
        slug: 'invite_cta',
        name: 'Invite Friends CTA',
        description: 'Periodic reminder to invite friends',
        type: 'invite_update',
        titleTemplate: 'Invite friends to Tijarah',
        bodyTemplate: 'Share Tijarah with friends and family. Help your community find great local services!',
        variables: [],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/invite',
      },

      // ─── Branding ───
      {
        slug: 'feature_announcement',
        name: 'Feature Announcement',
        description: 'Used for new feature launches',
        type: 'system_announcement',
        titleTemplate: '{{featureName}} is here! ✨',
        bodyTemplate: '{{description}}',
        variables: ['featureName', 'description'],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/',
      },
      {
        slug: 'community_milestone',
        name: 'Community Milestone',
        description: 'Community growth celebrations',
        type: 'system_announcement',
        titleTemplate: '🎉 {{milestone}}',
        bodyTemplate: '{{description}} Thank you for being part of the Tijarah community!',
        variables: ['milestone', 'description'],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/',
      },
    ];
  }
}
