import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { STRIPE_CLIENT } from './stripe.provider';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Provider } from '../entities/provider.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { ProviderLead } from '../entities/provider-lead.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { ProviderOffer } from '../entities/provider-offer.entity';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import {
  CreateSponsorshipCheckoutDto,
  CreateLeadUnlockCheckoutDto,
  CreateSubscriptionCheckoutDto,
  CreateDealCreationCheckoutDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: any,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
    @InjectRepository(SponsoredListing) private readonly sponsoredListingRepo: Repository<SponsoredListing>,
    @InjectRepository(ProviderLead) private readonly leadRepo: Repository<ProviderLead>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan) private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Voucher) private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherRedemption) private readonly redemptionRepo: Repository<VoucherRedemption>,
    @InjectRepository(SystemSetting) private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(ProviderOffer) private readonly offerRepo: Repository<ProviderOffer>,
    private readonly config: ConfigService,
    private readonly notificationDispatch: NotificationDispatchService,
  ) {}

  // ──────────────────────────────────────────
  // Stripe Customer Management
  // ──────────────────────────────────────────

  async getOrCreateStripeCustomer(provider: Provider): Promise<string> {
    if (provider.stripeCustomerId) {
      return provider.stripeCustomerId;
    }

    const user = await this.providerRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.id = :id', { id: provider.id })
      .getOne();

    const customer = await this.stripe.customers.create({
      metadata: { providerId: provider.id, userId: provider.userId },
      name: provider.brandName,
      email: user?.user?.email ?? undefined,
      phone: provider.contactNumber ?? undefined,
    });

    await this.providerRepo.update(provider.id, { stripeCustomerId: customer.id });
    provider.stripeCustomerId = customer.id;

    return customer.id;
  }

  // ──────────────────────────────────────────
  // Sponsorship Checkout
  // ──────────────────────────────────────────

  async createSponsorshipCheckout(userId: string, dto: CreateSponsorshipCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const customerId = await this.getOrCreateStripeCustomer(provider);

    let amount = dto.budgetAmount;
    let discountAmount = 0;
    let voucherId: string | null = null;

    if (dto.voucherCode) {
      const result = await this.applyVoucher(dto.voucherCode, 'sponsorship', amount, provider.id);
      amount = result.finalAmount;
      discountAmount = result.discountAmount;
      voucherId = result.voucherId;
    }

    // Create sponsored listing (pending payment)
    const listing = this.sponsoredListingRepo.create({
      providerId: provider.id,
      type: dto.type,
      budgetAmount: dto.budgetAmount,
      costPerClick: 5.0,
      targetCategoryIds: dto.targetCategoryIds ?? null,
      targetCities: dto.targetCities ?? null,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isActive: false,
      approvalStatus: 'approved',
    });
    await this.sponsoredListingRepo.save(listing);

    // Create pending payment record
    const payment = this.paymentRepo.create({
      providerId: provider.id,
      amount,
      currency: 'INR',
      status: 'pending',
      type: 'sponsorship',
      metadata: { sponsoredListingId: listing.id },
      voucherId,
      discountAmount,
    });
    await this.paymentRepo.save(payment);

    // Link payment to listing
    await this.sponsoredListingRepo.update(listing.id, { paymentId: payment.id });

    // Create Stripe Checkout Session
    const amountInPaise = Math.round(amount * 100);
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Sponsored Listing — ${dto.type}`,
              description: `Budget: ₹${dto.budgetAmount}${discountAmount > 0 ? ` (Discount: ₹${discountAmount})` : ''}`,
            },
            unit_amount: amountInPaise,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        type: 'sponsorship',
        sponsoredListingId: listing.id,
      },
      success_url: `${this.getAppUrl()}/provider/sponsorships?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.getAppUrl()}/provider/sponsorships?payment=cancelled`,
    });

    await this.paymentRepo.update(payment.id, {
      stripeCheckoutSessionId: session.id,
      status: 'processing',
    });

    return { checkoutUrl: session.url, paymentId: payment.id, sessionId: session.id };
  }

  // ──────────────────────────────────────────
  // Lead Unlock Checkout
  // ──────────────────────────────────────────

  async createLeadUnlockCheckout(userId: string, dto: CreateLeadUnlockCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const lead = await this.leadRepo.findOneBy({ id: dto.leadId, providerId: provider.id });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.isUnlocked) throw new BadRequestException('Lead already unlocked');

    // Check if monetization is disabled — free unlock for all
    const monetizationEnabled = (await this.getSetting('leads_monetization_enabled', 'false')) === 'true';
    if (!monetizationEnabled) {
      lead.isUnlocked = true;
      await this.leadRepo.save(lead);
      return { unlocked: true, method: 'free', remainingCredits: -1 };
    }

    // Check subscription credits first
    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    // Pro plan (unlimited leads = -1) → always free
    if (subscription?.plan && subscription.plan.monthlyLeadUnlocks === -1) {
      lead.isUnlocked = true;
      await this.leadRepo.save(lead);
      return { unlocked: true, method: 'subscription_credit', remainingCredits: -1 };
    }

    // Subscription monthly credits
    if (subscription && subscription.plan) {
      const remaining = subscription.plan.monthlyLeadUnlocks - subscription.leadUnlocksUsed;
      if (remaining > 0) {
        lead.isUnlocked = true;
        await this.leadRepo.save(lead);
        subscription.leadUnlocksUsed += 1;
        await this.subscriptionRepo.save(subscription);
        return { unlocked: true, method: 'subscription_credit', remainingCredits: remaining - 1 };
      }
    }

    // Check free monthly quota (resets monthly)
    const isWomenLedApproved = provider.womenLedStatus === 'approved';
    const freeQuotaKey = isWomenLedApproved ? 'women_led_free_leads_per_month' : 'free_lead_quota_monthly';
    const freeQuotaDefault = isWomenLedApproved ? '8' : '5';
    const freeQuotaStr = await this.getSetting(freeQuotaKey, freeQuotaDefault);
    const freeQuota = parseInt(freeQuotaStr, 10);
    const now = new Date();

    // Reset monthly counter if needed
    if (provider.freeLeadsResetAt) {
      const resetDate = new Date(provider.freeLeadsResetAt);
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        provider.freeLeadsUsedThisMonth = 0;
        provider.freeLeadsResetAt = now;
        await this.providerRepo.save(provider);
      }
    } else {
      provider.freeLeadsResetAt = now;
      await this.providerRepo.save(provider);
    }

    if (provider.freeLeadsUsedThisMonth < freeQuota) {
      lead.isUnlocked = true;
      await this.leadRepo.save(lead);
      provider.freeLeadsUsedThisMonth += 1;
      await this.providerRepo.save(provider);
      return {
        unlocked: true,
        method: 'free_quota',
        remainingCredits: freeQuota - provider.freeLeadsUsedThisMonth,
      };
    }

    // Determine tier-based price
    const tier = lead.tier || 'cold';
    const isGrowthSubscriber = subscription?.plan?.slug === 'growth';
    const priceKey = isGrowthSubscriber ? `lead_price_${tier}_discounted` : `lead_price_${tier}`;
    const defaultPrices = { hot: '99', warm: '69', soft: '49', cold: '29', hot_discounted: '49', warm_discounted: '35', soft_discounted: '25', cold_discounted: '15' };
    const priceStr = await this.getSetting(priceKey, defaultPrices[isGrowthSubscriber ? `${tier}_discounted` : tier] || '49');
    let amount = parseFloat(priceStr);
    let discountAmount = 0;
    let voucherId: string | null = null;

    if (dto.voucherCode) {
      const result = await this.applyVoucher(dto.voucherCode, 'lead_unlock', amount, provider.id);
      amount = result.finalAmount;
      discountAmount = result.discountAmount;
      voucherId = result.voucherId;
    }

    const customerId = await this.getOrCreateStripeCustomer(provider);

    const payment = this.paymentRepo.create({
      providerId: provider.id,
      amount,
      currency: 'INR',
      status: 'pending',
      type: 'lead_unlock',
      metadata: { leadId: dto.leadId, tier, discounted: isGrowthSubscriber },
      voucherId,
      discountAmount,
    });
    await this.paymentRepo.save(payment);

    const amountInPaise = Math.round(amount * 100);
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${tierLabel} Lead Unlock`,
              description: `Reveal visitor identity — ${tierLabel} Lead #${dto.leadId.substring(0, 8)}`,
            },
            unit_amount: amountInPaise,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        type: 'lead_unlock',
        leadId: dto.leadId,
      },
      success_url: `${this.getAppUrl()}/provider/leads?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.getAppUrl()}/provider/leads?payment=cancelled`,
    });

    await this.paymentRepo.update(payment.id, {
      stripeCheckoutSessionId: session.id,
      status: 'processing',
    });

    return { unlocked: false, method: 'payment_required', checkoutUrl: session.url, paymentId: payment.id, price: amount, tier };
  }

  // ──────────────────────────────────────────
  // Subscription Checkout
  // ──────────────────────────────────────────

  async createSubscriptionCheckout(userId: string, dto: CreateSubscriptionCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Check for existing active subscription
    const existing = await this.subscriptionRepo.findOneBy({ providerId: provider.id, status: 'active' });
    if (existing) throw new BadRequestException('Provider already has an active subscription. Cancel first or use the Stripe portal to change plans.');

    const plan = await this.planRepo.findOneBy({ id: dto.planId, isActive: true });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const stripePriceId = dto.billingInterval === 'yearly'
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;
    if (!stripePriceId) throw new BadRequestException('Price not configured for this billing interval');

    const customerId = await this.getOrCreateStripeCustomer(provider);

    const sessionParams: any = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: {
        type: 'subscription',
        planId: plan.id,
        providerId: provider.id,
        billingInterval: dto.billingInterval,
      },
      subscription_data: {
        metadata: {
          planId: plan.id,
          providerId: provider.id,
        },
      },
      success_url: `${this.getAppUrl()}/provider/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.getAppUrl()}/provider/subscription?payment=cancelled`,
    };

    // Apply voucher as Stripe coupon for subscriptions
    if (dto.voucherCode) {
      const price = dto.billingInterval === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
      const result = await this.applyVoucher(dto.voucherCode, 'subscription', price, provider.id);
      if (result.discountAmount > 0) {
        const coupon = await this.stripe.coupons.create({
          amount_off: Math.round(result.discountAmount * 100),
          currency: 'inr',
          duration: 'once',
          name: `Voucher: ${dto.voucherCode}`,
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // ──────────────────────────────────────────
  // Subscription Management
  // ──────────────────────────────────────────

  async getCurrentSubscription(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id },
      relations: ['plan'],
    });

    return subscription ?? null;
  }

  async cancelSubscription(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const subscription = await this.subscriptionRepo.findOneBy({ providerId: provider.id, status: 'active' });
    if (!subscription) throw new NotFoundException('No active subscription found');

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscription.cancelAtPeriodEnd = true;
    await this.subscriptionRepo.save(subscription);

    return { cancelled: true, endsAt: subscription.currentPeriodEnd };
  }

  async resumeSubscription(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const subscription = await this.subscriptionRepo.findOneBy({ providerId: provider.id, status: 'active' });
    if (!subscription) throw new NotFoundException('No active subscription found');
    if (!subscription.cancelAtPeriodEnd) throw new BadRequestException('Subscription is not scheduled for cancellation');

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    subscription.cancelAtPeriodEnd = false;
    await this.subscriptionRepo.save(subscription);

    return { resumed: true };
  }

  async getCustomerPortalUrl(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.stripeCustomerId) throw new BadRequestException('No billing account found');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: provider.stripeCustomerId,
      return_url: `${this.getAppUrl()}/provider/subscription`,
    });

    return { url: session.url };
  }

  async getSubscriptionPlans() {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ──────────────────────────────────────────
  // Payment History
  // ──────────────────────────────────────────

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const [payments, total] = await this.paymentRepo.findAndCount({
      where: { providerId: provider.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { payments, total, page, limit };
  }

  // ──────────────────────────────────────────
  // Payment Confirmation (polling after redirect)
  // ──────────────────────────────────────────

  async confirmCheckoutSession(userId: string, sessionId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Find payment by checkout session
    const payment = await this.paymentRepo.findOneBy({ stripeCheckoutSessionId: sessionId, providerId: provider.id });
    if (!payment) throw new NotFoundException('Payment not found');

    // Already fulfilled by webhook
    if (payment.status === 'succeeded') {
      return { status: 'succeeded', paymentId: payment.id };
    }

    // Check with Stripe directly
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' || session.status === 'complete') {
      // Webhook hasn't fired yet — fulfill now
      await this.handleCheckoutCompleted(session);
      return { status: 'succeeded', paymentId: payment.id };
    }

    return { status: payment.status, paymentId: payment.id };
  }

  // ──────────────────────────────────────────
  // Webhook Handling
  // ──────────────────────────────────────────

  async handleWebhook(signature: string, rawBody: Buffer) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new BadRequestException('Webhook secret not configured');

    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: any) {
    const paymentType = session.metadata?.type;

    if (paymentType === 'sponsorship') {
      await this.fulfillSponsorshipPayment(session);
    } else if (paymentType === 'lead_unlock') {
      await this.fulfillLeadUnlockPayment(session);
    } else if (paymentType === 'subscription' || session.mode === 'subscription') {
      await this.fulfillSubscriptionPayment(session);
    }
  }

  private async fulfillSponsorshipPayment(session: any) {
    const paymentId = session.metadata?.paymentId;
    const listingId = session.metadata?.sponsoredListingId;
    if (!paymentId || !listingId) return;

    const payment = await this.paymentRepo.findOneBy({ id: paymentId });
    if (!payment || payment.status === 'succeeded') return; // idempotent

    payment.status = 'succeeded';
    payment.stripePaymentIntentId = session.payment_intent as string;
    await this.paymentRepo.save(payment);

    // Auto-activate the sponsored listing on successful payment
    await this.sponsoredListingRepo.update(listingId, { isActive: true, approvalStatus: 'approved' });

    // Record voucher redemption if applicable
    if (payment.voucherId) {
      await this.recordVoucherRedemption(payment);
    }

    this.logger.log(`Sponsorship payment fulfilled: ${paymentId}`);

    // Notify provider: payment success + sponsorship approved
    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'payment_success', {
        amount: `₹${payment.amount}`,
        description: 'Sponsorship',
      }).catch(() => {});
    }
  }

  private async fulfillLeadUnlockPayment(session: any) {
    const paymentId = session.metadata?.paymentId;
    const leadId = session.metadata?.leadId;
    if (!paymentId || !leadId) return;

    const payment = await this.paymentRepo.findOneBy({ id: paymentId });
    if (!payment || payment.status === 'succeeded') return; // idempotent

    payment.status = 'succeeded';
    payment.stripePaymentIntentId = session.payment_intent as string;
    await this.paymentRepo.save(payment);

    // Unlock the lead
    await this.leadRepo.update(leadId, { isUnlocked: true });

    // Record voucher redemption if applicable
    if (payment.voucherId) {
      await this.recordVoucherRedemption(payment);
    }

    this.logger.log(`Lead unlock payment fulfilled: ${paymentId}, lead: ${leadId}`);

    // Notify provider: lead unlocked
    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'lead_unlocked', {
        customerName: 'a customer',
      }).catch(() => {});
    }
  }

  private async fulfillSubscriptionPayment(session: any) {
    const providerId = session.metadata?.providerId;
    const planId = session.metadata?.planId;
    const billingInterval = session.metadata?.billingInterval as 'monthly' | 'yearly';
    if (!providerId || !planId) return;

    const stripeSubscriptionId = session.subscription as string;
    const stripeSubscription: any = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Check idempotency
    const existing = await this.subscriptionRepo.findOneBy({ stripeSubscriptionId });
    if (existing) return;

    const subscription = this.subscriptionRepo.create({
      providerId,
      planId,
      stripeSubscriptionId,
      stripeCustomerId: session.customer as string,
      status: 'active',
      billingInterval: billingInterval ?? 'monthly',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      leadUnlocksUsed: 0,
      leadUnlocksResetAt: new Date(stripeSubscription.current_period_start * 1000),
    });
    await this.subscriptionRepo.save(subscription);

    // Create a payment record for the subscription
    const payment = this.paymentRepo.create({
      providerId,
      amount: (session.amount_total ?? 0) / 100,
      currency: 'INR',
      status: 'succeeded',
      type: 'subscription',
      stripeCheckoutSessionId: session.id,
      metadata: { planId, subscriptionId: subscription.id },
    });
    await this.paymentRepo.save(payment);

    this.logger.log(`Subscription created: ${subscription.id} for provider: ${providerId}`);

    // Notify provider: subscription activated
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (provider) {
      const plan = await this.planRepo.findOneBy({ id: planId });
      this.notificationDispatch.sendTemplated(provider.userId, 'subscription_activated', {
        planName: plan?.name || 'Premium',
      }).catch(() => {});
    }
  }

  private async handleInvoicePaid(invoice: any) {
    if (!invoice.subscription) return;

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    const subscription = await this.subscriptionRepo.findOneBy({ stripeSubscriptionId: subscriptionId });
    if (!subscription) return;

    const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    subscription.status = 'active';
    subscription.currentPeriodStart = new Date((stripeSubscription as any).current_period_start * 1000);
    subscription.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);

    // Reset monthly lead unlock counter on renewal
    subscription.leadUnlocksUsed = 0;
    subscription.leadUnlocksResetAt = new Date();

    await this.subscriptionRepo.save(subscription);
    this.logger.log(`Subscription renewed: ${subscription.id}`);

    // Notify provider: renewal success
    const provider = await this.providerRepo.findOneBy({ id: subscription.providerId });
    if (provider) {
      const plan = await this.planRepo.findOneBy({ id: subscription.planId });
      this.notificationDispatch.sendTemplated(provider.userId, 'subscription_renewal_success', {
        planName: plan?.name || 'Premium',
      }).catch(() => {});
    }
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    if (!invoice.subscription) return;

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    const subscription = await this.subscriptionRepo.findOneBy({ stripeSubscriptionId: subscriptionId });
    if (!subscription) return;

    subscription.status = 'past_due';
    await this.subscriptionRepo.save(subscription);
    this.logger.warn(`Subscription payment failed: ${subscription.id}`);

    // Notify provider: payment failed
    const provider = await this.providerRepo.findOneBy({ id: subscription.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'payment_failed', {
        amount: '',
      }).catch(() => {});
    }
  }

  private async handleSubscriptionUpdated(stripeSub: any) {
    const subscription = await this.subscriptionRepo.findOneBy({ stripeSubscriptionId: stripeSub.id });
    if (!subscription) return;

    subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
    subscription.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

    const statusMap: Record<string, any> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      trialing: 'trialing',
      paused: 'paused',
    };
    if (statusMap[stripeSub.status]) {
      subscription.status = statusMap[stripeSub.status];
    }

    await this.subscriptionRepo.save(subscription);
    this.logger.log(`Subscription updated: ${subscription.id} → ${subscription.status}`);
  }

  private async handleSubscriptionDeleted(stripeSub: any) {
    const subscription = await this.subscriptionRepo.findOneBy({ stripeSubscriptionId: stripeSub.id });
    if (!subscription) return;

    subscription.status = 'canceled';
    await this.subscriptionRepo.save(subscription);
    this.logger.log(`Subscription canceled: ${subscription.id}`);

    // Notify provider: subscription cancelled
    const provider = await this.providerRepo.findOneBy({ id: subscription.providerId });
    if (provider) {
      const plan = await this.planRepo.findOneBy({ id: subscription.planId });
      this.notificationDispatch.sendTemplated(provider.userId, 'subscription_cancelled', {
        planName: plan?.name || 'Premium',
      }).catch(() => {});
    }
  }

  // ──────────────────────────────────────────
  // Voucher Logic
  // ──────────────────────────────────────────

  async validateVoucher(code: string, purchaseType: string, amount: number, providerId?: string) {
    const voucher = await this.voucherRepo.findOneBy({ code: code.toUpperCase(), isActive: true });
    if (!voucher) return { valid: false, message: 'Invalid voucher code' };

    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validUntil) {
      return { valid: false, message: 'Voucher has expired or is not yet active' };
    }

    if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
      return { valid: false, message: 'Voucher has reached its usage limit' };
    }

    if (voucher.applicableTo && !voucher.applicableTo.includes(purchaseType)) {
      return { valid: false, message: 'Voucher is not applicable to this purchase type' };
    }

    if (voucher.minPurchaseAmount !== null && amount < Number(voucher.minPurchaseAmount)) {
      return { valid: false, message: `Minimum purchase amount is ₹${voucher.minPurchaseAmount}` };
    }

    // Check per-provider usage limit
    if (providerId && voucher.maxUsesPerProvider !== null) {
      const providerUses = await this.redemptionRepo.count({
        where: { voucherId: voucher.id, providerId },
      });
      if (providerUses >= voucher.maxUsesPerProvider) {
        return { valid: false, message: 'You have already used this voucher the maximum number of times' };
      }
    }

    const discount = this.calculateDiscount(voucher, amount);
    const finalAmount = Math.max(amount - discount, 0);

    return {
      valid: true,
      voucherId: voucher.id,
      discountType: voucher.discountType,
      discountValue: Number(voucher.discountValue),
      discount,
      finalAmount,
      message: `Discount of ₹${discount} applied`,
    };
  }

  private async applyVoucher(code: string, purchaseType: string, amount: number, providerId: string) {
    const result = await this.validateVoucher(code, purchaseType, amount, providerId);
    if (!result.valid) {
      throw new BadRequestException(result.message);
    }

    return {
      voucherId: result.voucherId!,
      discountAmount: result.discount!,
      finalAmount: result.finalAmount!,
    };
  }

  private calculateDiscount(voucher: Voucher, amount: number): number {
    let discount: number;

    if (voucher.discountType === 'percentage') {
      discount = (amount * Number(voucher.discountValue)) / 100;
      if (voucher.maxDiscountAmount !== null) {
        discount = Math.min(discount, Number(voucher.maxDiscountAmount));
      }
    } else {
      discount = Number(voucher.discountValue);
    }

    return Math.min(discount, amount);
  }

  private async recordVoucherRedemption(payment: Payment) {
    if (!payment.voucherId) return;

    const redemption = this.redemptionRepo.create({
      voucherId: payment.voucherId,
      providerId: payment.providerId,
      paymentId: payment.id,
      discountAmount: payment.discountAmount,
    });
    await this.redemptionRepo.save(redemption);

    // Increment usage count
    await this.voucherRepo.increment({ id: payment.voucherId }, 'usedCount', 1);
  }

  // ──────────────────────────────────────────
  // Deal Creation Checkout
  // ──────────────────────────────────────────

  async createDealCreationCheckout(userId: string, dto: CreateDealCreationCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Check if monetization is disabled — free creation for all
    const monetizationEnabled = (await this.getSetting('deals_monetization_enabled', 'false')) === 'true';
    if (!monetizationEnabled) {
      return { requiresPayment: false, method: 'free' };
    }

    // Check subscription — Pro (unlimited = -1) → always free
    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    if (subscription?.plan && subscription.plan.maxTotalDeals === -1) {
      return { requiresPayment: false, method: 'subscription_unlimited' };
    }

    // Check subscription active deal limit
    const now = new Date();
    const activeCount = await this.offerRepo
      .createQueryBuilder('o')
      .where('o.providerId = :pid', { pid: provider.id })
      .andWhere('o.isActive = true')
      .andWhere('o.endsAt > :now', { now })
      .andWhere('o.startsAt <= :now', { now })
      .getCount();

    if (subscription?.plan) {
      const maxActive = subscription.plan.maxActiveDeals;
      if (maxActive === -1 || activeCount < maxActive) {
        return { requiresPayment: false, method: 'subscription_credit' };
      }
    }

    // Check free lifetime quota
    const isWomenLedApprovedDeal = provider.womenLedStatus === 'approved';
    const dealQuotaKey = isWomenLedApprovedDeal ? 'women_led_free_deals_lifetime' : 'free_deal_quota_lifetime';
    const dealQuotaDefault = isWomenLedApprovedDeal ? '5' : '3';
    const freeQuotaStr = await this.getSetting(dealQuotaKey, dealQuotaDefault);
    const freeQuota = parseInt(freeQuotaStr, 10);

    if (provider.freeDealsCreated < freeQuota) {
      return { requiresPayment: false, method: 'free_quota', freeRemaining: freeQuota - provider.freeDealsCreated };
    }

    // Determine price — Growth gets discounted rate
    const isGrowthSubscriber = subscription?.plan?.slug === 'growth';
    const priceKey = isGrowthSubscriber ? 'deal_creation_price_discounted' : 'deal_creation_price';
    const defaultPrice = isGrowthSubscriber ? '79' : '149';
    const priceStr = await this.getSetting(priceKey, defaultPrice);
    let amount = parseFloat(priceStr);
    let discountAmount = 0;
    let voucherId: string | null = null;

    if (dto.voucherCode) {
      const result = await this.applyVoucher(dto.voucherCode, 'deal_creation', amount, provider.id);
      amount = result.finalAmount;
      discountAmount = result.discountAmount;
      voucherId = result.voucherId;
    }

    const customerId = await this.getOrCreateStripeCustomer(provider);

    const payment = this.paymentRepo.create({
      providerId: provider.id,
      amount,
      currency: 'INR',
      status: 'pending',
      type: 'deal_creation' as any,
      metadata: { dealData: dto.dealData },
      voucherId,
      discountAmount,
    });
    await this.paymentRepo.save(payment);

    const amountInPaise = Math.round(amount * 100);
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Deal Creation',
              description: `Create a new deal/offer for your business`,
            },
            unit_amount: amountInPaise,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        type: 'deal_creation',
      },
      success_url: `${this.getAppUrl()}/provider/deals?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.getAppUrl()}/provider/deals?payment=cancelled`,
    });

    await this.paymentRepo.update(payment.id, {
      stripeCheckoutSessionId: session.id,
      status: 'processing',
    });

    return {
      requiresPayment: true,
      method: 'payment_required',
      checkoutUrl: session.url,
      paymentId: payment.id,
      price: amount,
      discounted: isGrowthSubscriber,
    };
  }

  // ──────────────────────────────────────────
  // Get Lead Unlock Pricing Info
  // ──────────────────────────────────────────

  async getLeadUnlockInfo(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const monetizationEnabled = (await this.getSetting('leads_monetization_enabled', 'false')) === 'true';

    // Reset monthly counter if needed
    const now = new Date();
    if (provider.freeLeadsResetAt) {
      const resetDate = new Date(provider.freeLeadsResetAt);
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        provider.freeLeadsUsedThisMonth = 0;
        provider.freeLeadsResetAt = now;
        await this.providerRepo.save(provider);
      }
    }

    const freeQuota = parseInt(await this.getSetting('free_lead_quota_monthly', '5'), 10);

    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    const isProSubscriber = subscription?.plan?.monthlyLeadUnlocks === -1;
    const isGrowthSubscriber = subscription?.plan?.slug === 'growth';
    const subscriptionCreditsRemaining = subscription?.plan
      ? subscription.plan.monthlyLeadUnlocks - subscription.leadUnlocksUsed
      : 0;

    return {
      monetizationEnabled,
      freeQuota,
      freeUsedThisMonth: provider.freeLeadsUsedThisMonth,
      freeRemaining: Math.max(0, freeQuota - provider.freeLeadsUsedThisMonth),
      subscriptionCreditsRemaining: isProSubscriber ? -1 : Math.max(0, subscriptionCreditsRemaining),
      isProSubscriber,
      isGrowthSubscriber,
      currentPlan: subscription?.plan?.slug || 'free',
    };
  }

  // ──────────────────────────────────────────
  // Get Deal Creation Info
  // ──────────────────────────────────────────

  async getDealCreationInfo(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const monetizationEnabled = (await this.getSetting('deals_monetization_enabled', 'false')) === 'true';
    const freeQuota = parseInt(await this.getSetting('free_deal_quota_lifetime', '3'), 10);

    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    const isProSubscriber = subscription?.plan?.maxTotalDeals === -1;
    const isGrowthSubscriber = subscription?.plan?.slug === 'growth';

    const now = new Date();
    const activeCount = await this.offerRepo
      .createQueryBuilder('o')
      .where('o.providerId = :pid', { pid: provider.id })
      .andWhere('o.isActive = true')
      .andWhere('o.endsAt > :now', { now })
      .andWhere('o.startsAt <= :now', { now })
      .getCount();

    const maxActiveDeals = subscription?.plan?.maxActiveDeals ?? 3;

    return {
      monetizationEnabled,
      freeQuotaLifetime: freeQuota,
      freeDealsCreated: provider.freeDealsCreated,
      freeRemaining: Math.max(0, freeQuota - provider.freeDealsCreated),
      activeDeals: activeCount,
      maxActiveDeals: isProSubscriber ? -1 : maxActiveDeals,
      isProSubscriber,
      isGrowthSubscriber,
      currentPlan: subscription?.plan?.slug || 'free',
    };
  }

  // ──────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────

  private getAppUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  private async getSetting(key: string, defaultValue: string): Promise<string> {
    const setting = await this.settingsRepo.findOneBy({ key });
    return setting?.value ?? defaultValue;
  }

  // ──────────────────────────────────────────
  // Admin Methods
  // ──────────────────────────────────────────

  async getAdminPayments(filters: { page?: number; limit?: number; status?: PaymentStatus; type?: string }) {
    const { page = 1, limit = 20, status, type } = filters;
    const qb = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.provider', 'provider')
      .orderBy('p.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (status) qb.andWhere('p.status = :status', { status });
    if (type) qb.andWhere('p.type = :type', { type });

    const [payments, total] = await qb.getManyAndCount();
    return { payments, total, page, limit };
  }

  async getRevenueStats() {
    const result = await this.paymentRepo
      .createQueryBuilder('p')
      .select('p.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'totalRevenue')
      .where('p.status = :status', { status: 'succeeded' })
      .groupBy('p.type')
      .getRawMany();

    const totalRevenue = result.reduce((sum, r) => sum + Number(r.totalRevenue), 0);
    const totalTransactions = result.reduce((sum, r) => sum + Number(r.count), 0);

    // MRR from active subscriptions
    const activeSubscriptions = await this.subscriptionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .where('s.status = :status', { status: 'active' })
      .getMany();

    const mrr = activeSubscriptions.reduce((sum, s) => {
      const price = s.billingInterval === 'yearly'
        ? Number(s.plan.priceYearly) / 12
        : Number(s.plan.priceMonthly);
      return sum + price;
    }, 0);

    return {
      totalRevenue,
      totalTransactions,
      mrr,
      activeSubscriptions: activeSubscriptions.length,
      breakdown: result,
    };
  }

  // ──────────────────────────────────────────
  // Admin Subscription Methods
  // ──────────────────────────────────────────

  async getAdminSubscriptions(filters: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = filters;
    const qb = this.subscriptionRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.plan', 'plan')
      .leftJoinAndSelect('s.provider', 'provider')
      .orderBy('s.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (status) qb.andWhere('s.status = :status', { status });

    const [subscriptions, total] = await qb.getManyAndCount();
    return { subscriptions, total, page, limit };
  }

  async createSubscriptionPlan(dto: {
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
    features?: Record<string, any>;
    maxActiveDeals?: number;
    maxTotalDeals?: number;
    monthlyLeadUnlocks?: number;
    sponsorshipTypes?: string[];
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const existing = await this.planRepo.findOneBy({ slug: dto.slug });
    if (existing) {
      throw new ConflictException(`Plan with slug "${dto.slug}" already exists`);
    }

    const plan = this.planRepo.create({
      name: dto.name,
      slug: dto.slug.toLowerCase().trim(),
      priceMonthly: dto.priceMonthly,
      priceYearly: dto.priceYearly,
      features: dto.features ?? {},
      maxActiveDeals: dto.maxActiveDeals ?? 3,
      maxTotalDeals: dto.maxTotalDeals ?? 5,
      monthlyLeadUnlocks: dto.monthlyLeadUnlocks ?? 0,
      sponsorshipTypes: dto.sponsorshipTypes ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.planRepo.save(plan);
  }

  async updateSubscriptionPlan(id: string, dto: Partial<{
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
    features: Record<string, any>;
    maxActiveDeals: number;
    maxTotalDeals: number;
    monthlyLeadUnlocks: number;
    sponsorshipTypes: string[];
    isActive: boolean;
    sortOrder: number;
  }>) {
    const plan = await this.planRepo.findOneBy({ id });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);

    if (dto.slug && dto.slug !== plan.slug) {
      const dup = await this.planRepo.findOneBy({ slug: dto.slug });
      if (dup) throw new ConflictException(`Slug "${dto.slug}" is taken`);
    }

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }
}
