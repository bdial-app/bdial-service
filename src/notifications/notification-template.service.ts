import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
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

  /**
   * A saved message for campaigns ("campaign" category). The app's own
   * notifications are seeded from code and only ever edited, never created.
   */
  async create(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const t = this.templateRepo.create({
      ...data,
      slug: `custom_${randomBytes(5).toString('hex')}`,
      category: 'campaign',
      type: data.type ?? 'promotional',
      isActive: true,
      variables: this.variablesIn(data),
    });
    const saved = await this.templateRepo.save(t);
    this.invalidateCache();
    return saved;
  }

  async update(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const current = await this.findById(id);
    const patch: Partial<NotificationTemplate> = { ...data };
    // What the code fills in is fixed for the app's own notifications.
    if (current.category === 'campaign') {
      patch.variables = this.variablesIn({ ...current, ...data });
    } else {
      delete patch.type;
      delete patch.variables;
    }
    await this.templateRepo.update(id, patch);
    this.invalidateCache();
    return this.findById(id);
  }

  /** Back to the wording it shipped with; on/off is left as it is. */
  async reset(id: string): Promise<NotificationTemplate> {
    const current = await this.findById(id);
    const d = this.defaultFor(current.slug);
    if (!d) throw new BadRequestException('Saved messages have no default to go back to');
    await this.templateRepo.update(id, {
      name: d.name,
      description: d.description ?? null,
      titleTemplate: d.titleTemplate,
      bodyTemplate: d.bodyTemplate,
      defaultRoute: d.defaultRoute ?? null,
      defaultImageUrl: d.defaultImageUrl ?? null,
    });
    this.invalidateCache();
    return this.findById(id);
  }

  defaultFor(slug: string): Partial<NotificationTemplate> | null {
    return [...this.getDefaultTemplates(), ...this.getEngagementTemplates()].find((d) => d.slug === slug) ?? null;
  }

  /** Title and body with these values, even while switched off (for previews and tests). */
  async render(
    id: string,
    variables: Record<string, string> = {},
  ): Promise<{ template: NotificationTemplate; title: string; body: string; route?: string; imageUrl?: string }> {
    const template = await this.findById(id);
    return {
      template,
      title: this.interpolate(template.titleTemplate, variables),
      body: this.interpolate(template.bodyTemplate, variables),
      route: template.defaultRoute ? this.interpolate(template.defaultRoute, variables) : undefined,
      imageUrl: template.defaultImageUrl || undefined,
    };
  }

  /**
   * Sent and opened per template over the last `days` days. Counted from the
   * inbox rows, which carry the template since the admin stats went live.
   */
  async stats(days = 30): Promise<{ slug: string; sent: number; opened: number; lastSentAt: string | null }[]> {
    const rows: { slug: string; sent: string; opened: string; last: Date | null }[] = await this.templateRepo.query(
      `SELECT data->>'template' AS slug, COUNT(*) AS sent, COUNT(*) FILTER (WHERE is_read) AS opened, MAX(created_at) AS last
         FROM notifications
        WHERE created_at >= now() - make_interval(days => $1::int) AND data ? 'template'
        GROUP BY 1`,
      [days],
    );
    return rows.map((r) => ({
      slug: r.slug,
      sent: Number(r.sent),
      opened: Number(r.opened),
      lastSentAt: r.last ? new Date(r.last).toISOString() : null,
    }));
  }

  private variablesIn(t: Partial<NotificationTemplate>): string[] {
    const text = `${t.titleTemplate ?? ''} ${t.bodyTemplate ?? ''} ${t.defaultRoute ?? ''}`;
    return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
  }

  async toggleActive(id: string, isActive: boolean): Promise<NotificationTemplate> {
    await this.templateRepo.update(id, { isActive });
    this.invalidateCache();
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const t = await this.findById(id);
    if (t.category !== 'campaign') {
      throw new BadRequestException('The app sends this one itself. Switch it off instead of deleting it.');
    }
    await this.templateRepo.delete(id);
    this.invalidateCache();
  }

  // ─────────────────────────────────────────────────────────────
  // Seed default templates — called on module init
  // ─────────────────────────────────────────────────────────────

  /**
   * Adds any default template that doesn't exist yet. Existing ones (which
   * admins may have edited or switched off) are never touched. New engagement
   * pushes arrive switched off, for an admin to turn on.
   */
  async seedDefaults(): Promise<void> {
    const existing = new Set((await this.templateRepo.find({ select: ['slug'] })).map((t) => t.slug));
    const fresh = existing.size === 0;
    const missing = [
      ...this.getDefaultTemplates(),
      ...this.getEngagementTemplates(),
    ].filter((d) => d.slug && !existing.has(d.slug));
    if (!missing.length) return;
    await this.templateRepo.save(missing.map((d) => this.templateRepo.create(d)));
    this.invalidateCache();
    this.logger.log(
      fresh
        ? `Seeded ${missing.length} default notification templates`
        : `Added ${missing.length} new notification templates: ${missing.map((m) => m.slug).join(', ')}`,
    );
  }

  /** Pushes that bring owners and customers back; all start switched off. */
  private getEngagementTemplates(): Partial<NotificationTemplate>[] {
    const t = (
      slug: string,
      name: string,
      description: string,
      type: NotificationTemplate['type'],
      titleTemplate: string,
      bodyTemplate: string,
      defaultRoute: string,
      category: NotificationTemplate['category'] = 'engagement',
    ): Partial<NotificationTemplate> => ({
      slug,
      name,
      description,
      type,
      titleTemplate,
      bodyTemplate,
      variables: [...new Set([...`${titleTemplate} ${bodyTemplate} ${defaultRoute}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))],
      category,
      isActive: false,
      defaultRoute,
    });
    return [
      t('review_replied', 'Owner replied to your review', 'Customer: the business answered their review', 'review_received',
        '{{brandName}} replied to your review', '{{reply}}', '/provider-details', 'transactional'),
      t('review_link_joined', 'Review link is working', 'Owner: someone reviewed through their review link', 'provider_status',
        'Your review link is working', '{{count}} customers have reviewed {{brandName}} through your link. Each one joined Tijarah to do it.', '/?tab=listings&subTab=reviews'),
      t('free_leads_back', 'Free leads are back', 'Owner, 1st of the month', 'provider_status',
        'Your {{quota}} free lead unlocks are back', '{{waiting}} people showed interest in {{brandName}} recently. See who they are.', '/?tab=analytics'),
      t('free_leads_ending', 'Free leads ending', 'Owner, 25th, if unused and leads are waiting', 'provider_status',
        '{{left}} free lead unlocks left this month', 'They reset on {{resetDate}}. {{waiting}} people are waiting to be seen.', '/?tab=analytics'),
      t('weekly_report', 'Weekly report', 'Owner, Monday, with activity', 'provider_status',
        'Your week on Tijarah', '{{brandName}}: {{views}} views, {{searches}} times in search and {{enquiries}} enquiries this week.', '/?tab=analytics'),
      t('search_demand', 'What Mumineen are searching for', 'Owner, Thursday: a popular search in their city they don\'t list', 'promotional',
        'Mumineen in {{city}} are searching for "{{term}}"', '{{count}} searches this week. Add it to {{brandName}} so they find you.', '/?tab=listings&subTab=products'),
      t('shop_step', 'Wake-up step', 'Owner, weekly for quiet shops: one thing to add next', 'promotional',
        '{{title}}', '{{body}}', '{{route}}'),
      t('boost_ready', 'Boost: shop is ready', 'Owner: listing strong enough to boost, never boosted', 'promotional',
        '{{brandName}} is ready to be seen', 'Boost it to the top of {{city}} on Tijarah, from ₹{{price}} for 7 days.', '/?tab=listings&subTab=boost', 'marketing'),
      t('boost_good_week', 'Boost: after a good week', 'Owner: views up 30%+ this week', 'promotional',
        '{{views}} views this week, up {{pct}}%', 'Boost {{brandName}} now to keep it going.', '/?tab=listings&subTab=boost', 'marketing'),
      t('boost_results', 'Boost results', 'Owner: a boost just ended', 'provider_status',
        'Your boost brought {{impressions}} views', '{{clicks}} people visited {{brandName}} from it. Run it again?', '/?tab=listings&subTab=boost'),
      t('deal_nudge', 'Run a deal', 'Owner, monthly: has products, no deal in 45 days', 'promotional',
        'Customers see deals first on Tijarah', '{{offer}} Put {{brandName}} at the top of Deals this week.', '/?tab=listings&subTab=deals', 'marketing'),
      t('weekend_deals', 'Weekend deals', 'Customers, Thursday 7 PM, if 3+ deals in their city', 'promotional',
        '{{count}} community businesses in {{city}} have deals this weekend', 'Take a look before they end.', '/deals'),
      t('saved_by_families', 'Families saved you', 'Owner, monthly', 'provider_status',
        '{{count}} families saved {{brandName}} this month', "They'll see your new products and deals first.", '/?tab=analytics'),
      t('shop_anniversary', 'Anniversary', 'Owner, yearly', 'provider_status',
        '{{years}} on Tijarah', 'Since joining, {{views}} people have found {{brandName}}. Thank you for being part of the community.', '/?tab=analytics'),
    ];
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
      // ─── Deal lifecycle (owner) ───
      {
        slug: 'deal_live',
        name: 'Deal is live',
        description: 'Owner: their deal has started showing to customers',
        type: 'provider_status',
        titleTemplate: '🎉 Your deal is live!',
        bodyTemplate: '"{{title}}" is now showing to customers until {{endDate}}. Share it on WhatsApp to bring even more people in.',
        variables: ['title', 'endDate'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/?tab=listings&subTab=deals',
      },
      {
        slug: 'deal_free_halfway',
        name: 'Free deal: halfway',
        description: 'Owner: day 3 of a free 5-day deal — offer the 15-day upgrade',
        type: 'provider_status',
        titleTemplate: '👀 {{views}} people have seen your deal',
        bodyTemplate: 'Your free deal ends in 2 days. Make it a 15-day deal for ₹{{price}} — 15-day deals show first in search and Deals.',
        variables: ['views', 'price'],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/?tab=listings&subTab=deals',
      },
      {
        slug: 'deal_ending_free',
        name: 'Free deal ends tomorrow',
        description: 'Owner: a free deal ends tomorrow — offer the 15-day upgrade',
        type: 'provider_status',
        titleTemplate: '⏳ Your free deal ends tomorrow',
        bodyTemplate: 'Keep "{{title}}" running 15 more days for ₹{{price}} and stay at the top of Deals.',
        variables: ['title', 'price'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/?tab=listings&subTab=deals',
      },
      {
        slug: 'deal_ending_paid',
        name: 'Paid deal ends tomorrow',
        description: 'Owner: a 15-day deal ends tomorrow — offer an extension',
        type: 'provider_status',
        titleTemplate: '⏳ "{{title}}" ends tomorrow',
        bodyTemplate: '{{seen}}Extend it 15 more days for just ₹{{price}}.',
        variables: ['title', 'seen', 'price'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/?tab=listings&subTab=deals',
      },
      {
        slug: 'deal_ended',
        name: 'Deal ended — results',
        description: 'Owner: a deal just ended, with how it did',
        type: 'provider_status',
        titleTemplate: '"{{title}}" has ended',
        bodyTemplate: '{{result}}Start a new deal to stay at the top of Deals.',
        variables: ['title', 'result'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/?tab=listings&subTab=deals',
      },
      // ─── Chat (owner) ───
      {
        slug: 'chat_unanswered',
        name: 'Customer waiting for a reply',
        description: 'Owner: a customer message has gone unanswered for 2+ hours (once per chat per day)',
        type: 'chat_message',
        titleTemplate: '⏰ {{name}} is waiting for your reply',
        bodyTemplate: '"{{excerpt}}" — {{ago}} ago. Businesses that reply quickly win more customers.',
        variables: ['name', 'excerpt', 'ago'],
        category: 'transactional',
        isActive: true,
        defaultRoute: '/chat',
      },
      // ─── Deals (customer) ───
      {
        slug: 'saved_business_deal',
        name: 'Saved business has a deal',
        description: 'Customer: a business they saved started a 15-day deal (a paid-deal perk)',
        type: 'promotional',
        titleTemplate: '🏷️ {{brandName}}: {{discount}} OFF',
        bodyTemplate: '"{{title}}" — ends {{endDate}}. You saved them, so you hear first.',
        variables: ['brandName', 'discount', 'title', 'endDate', 'providerId'],
        category: 'marketing',
        isActive: true,
        defaultRoute: '/provider-details?id={{providerId}}',
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
