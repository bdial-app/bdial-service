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
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { RAZORPAY_CLIENT } from './razorpay.provider';
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
    @Inject(RAZORPAY_CLIENT) private readonly razorpay: Razorpay,
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
  // Razorpay Customer Management
  // ──────────────────────────────────────────

  async getOrCreateRazorpayCustomer(provider: Provider): Promise<string> {
    if (provider.gatewayCustomerId) {
      return provider.gatewayCustomerId;
    }

    const user = await this.providerRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.id = :id', { id: provider.id })
      .getOne();

    const customer = await (this.razorpay.customers as any).create({
      name: provider.brandName,
      email: user?.user?.email ?? undefined,
      contact: provider.contactNumber ?? undefined,
      notes: { providerId: provider.id, userId: provider.userId },
    });

    await this.providerRepo.update(provider.id, { gatewayCustomerId: customer.id });
    provider.gatewayCustomerId = customer.id;

    return customer.id;
  }

  // ──────────────────────────────────────────
  // Sponsorship Checkout (Razorpay Order)
  // ──────────────────────────────────────────

  async createSponsorshipCheckout(userId: string, dto: CreateSponsorshipCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    let amount = dto.budgetAmount;
    let discountAmount = 0;
    let voucherId: string | null = null;

    if (dto.voucherCode) {
      const result = await this.applyVoucher(dto.voucherCode, 'sponsorship', amount, provider.id);
      amount = result.finalAmount;
      discountAmount = result.discountAmount;
      voucherId = result.voucherId;
    }

    // Read CPC/CPI from system settings (fallback to defaults)
    const [cpcSetting, cpiSetting] = await Promise.all([
      this.settingsRepo.findOneBy({ key: 'sponsorship_cost_per_click' }),
      this.settingsRepo.findOneBy({ key: 'sponsorship_cost_per_impression' }),
    ]);
    const costPerClick = cpcSetting ? parseFloat(cpcSetting.value) : 5.0;
    const costPerImpression = cpiSetting ? parseFloat(cpiSetting.value) : 0.10;

    // Create sponsored listing (pending payment)
    const listing = this.sponsoredListingRepo.create({
      providerId: provider.id,
      type: dto.type,
      budgetAmount: dto.budgetAmount,
      costPerClick,
      costPerImpression,
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
      paymentGateway: 'razorpay',
      metadata: { sponsoredListingId: listing.id },
      voucherId,
      discountAmount,
    });
    await this.paymentRepo.save(payment);

    // Link payment to listing
    await this.sponsoredListingRepo.update(listing.id, { paymentId: payment.id });

    // Create Razorpay Order
    const amountInPaise = Math.round(amount * 100);
    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: {
        paymentId: payment.id,
        type: 'sponsorship',
        sponsoredListingId: listing.id,
      },
    });

    await this.paymentRepo.update(payment.id, {
      gatewayOrderId: order.id,
      status: 'processing',
    });

    return {
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      paymentId: payment.id,
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
      description: `Sponsored Listing — ${dto.type}`,
      prefill: await this.getPrefillData(provider),
    };
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

    // Anonymous leads (no userId) are free — no contact info to sell
    if (!lead.userId) {
      lead.isUnlocked = true;
      await this.leadRepo.save(lead);
      return { unlocked: true, method: 'free', remainingCredits: -1 };
    }

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
    const defaultPrices: Record<string, string> = { hot: '99', warm: '69', soft: '49', cold: '29', hot_discounted: '49', warm_discounted: '35', soft_discounted: '25', cold_discounted: '15' };
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

    const payment = this.paymentRepo.create({
      providerId: provider.id,
      amount,
      currency: 'INR',
      status: 'pending',
      type: 'lead_unlock',
      paymentGateway: 'razorpay',
      metadata: { leadId: dto.leadId, tier, discounted: isGrowthSubscriber },
      voucherId,
      discountAmount,
    });
    await this.paymentRepo.save(payment);

    const amountInPaise = Math.round(amount * 100);
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: {
        paymentId: payment.id,
        type: 'lead_unlock',
        leadId: dto.leadId,
      },
    });

    await this.paymentRepo.update(payment.id, {
      gatewayOrderId: order.id,
      status: 'processing',
    });

    return {
      unlocked: false,
      method: 'payment_required',
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      paymentId: payment.id,
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
      description: `${tierLabel} Lead Unlock`,
      price: amount,
      tier,
      prefill: await this.getPrefillData(provider),
    };
  }

  // ──────────────────────────────────────────
  // Subscription Checkout (Razorpay Subscription)
  // ──────────────────────────────────────────

  async createSubscriptionCheckout(userId: string, dto: CreateSubscriptionCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Check for existing active subscription
    const existing = await this.subscriptionRepo.findOneBy({ providerId: provider.id, status: 'active' });
    if (existing) throw new BadRequestException('Provider already has an active subscription. Cancel first to change plans.');

    const plan = await this.planRepo.findOneBy({ id: dto.planId, isActive: true });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const razorpayPlanId = dto.billingInterval === 'yearly'
      ? plan.razorpayPlanIdYearly
      : plan.razorpayPlanIdMonthly;
    if (!razorpayPlanId) throw new BadRequestException('Plan not configured for this billing interval');

    const customerId = await this.getOrCreateRazorpayCustomer(provider);

    const subscriptionParams: Record<string, any> = {
      plan_id: razorpayPlanId,
      customer_id: customerId,
      total_count: dto.billingInterval === 'yearly' ? 10 : 120,
      notes: {
        type: 'subscription',
        planId: plan.id,
        providerId: provider.id,
        billingInterval: dto.billingInterval,
      },
    };

    // Apply voucher as offer (discount on first payment)
    if (dto.voucherCode) {
      const price = dto.billingInterval === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
      const result = await this.applyVoucher(dto.voucherCode, 'subscription', price, provider.id);
      if (result.discountAmount > 0) {
        subscriptionParams.notes.voucherCode = dto.voucherCode;
        subscriptionParams.notes.discountAmount = result.discountAmount;
      }
    }

    const rzpSubscription = await (this.razorpay.subscriptions as any).create(subscriptionParams);

    return {
      subscriptionId: rzpSubscription.id,
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
      amount: rzpSubscription.amount ?? null,
      planName: plan.name,
      billingInterval: dto.billingInterval,
      prefill: await this.getPrefillData(provider),
      metadata: {
        planId: plan.id,
        providerId: provider.id,
        billingInterval: dto.billingInterval,
      },
    };
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

    if (subscription.paymentGateway === 'razorpay') {
      await (this.razorpay.subscriptions as any).cancel(subscription.gatewaySubscriptionId, { cancel_at_cycle_end: 1 });
    }

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

    if (subscription.paymentGateway === 'razorpay') {
      this.logger.log(`Resume requested for Razorpay subscription ${subscription.gatewaySubscriptionId}; updating local state`);
    }

    subscription.cancelAtPeriodEnd = false;
    await this.subscriptionRepo.save(subscription);

    return { resumed: true };
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
  // Payment Verification (Razorpay callback from client)
  // ──────────────────────────────────────────

  async verifyRazorpayPayment(body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // Verify signature
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    const generatedSignature = createHmac('sha256', keySecret!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Find and fulfill payment
    const payment = await this.paymentRepo.findOneBy({ gatewayOrderId: razorpay_order_id });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === 'succeeded') {
      return { status: 'succeeded', paymentId: payment.id };
    }

    payment.status = 'succeeded';
    payment.gatewayPaymentId = razorpay_payment_id;
    await this.paymentRepo.save(payment);

    await this.fulfillPayment(payment);

    return { status: 'succeeded', paymentId: payment.id };
  }

  async verifyRazorpaySubscription(body: {
    razorpay_subscription_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    providerId: string;
    billingInterval: 'monthly' | 'yearly';
  }) {
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = body;

    // Verify subscription signature
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    const generatedSignature = createHmac('sha256', keySecret!)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      throw new BadRequestException('Invalid subscription signature');
    }

    // Check idempotency
    const existing = await this.subscriptionRepo.findOneBy({ gatewaySubscriptionId: razorpay_subscription_id });
    if (existing) {
      return { status: 'active', subscriptionId: existing.id };
    }

    const { planId, providerId, billingInterval } = body;

    const rzpSub = await (this.razorpay.subscriptions as any).fetch(razorpay_subscription_id);
    const now = new Date();

    const subscription = this.subscriptionRepo.create({
      providerId,
      planId,
      paymentGateway: 'razorpay',
      gatewaySubscriptionId: razorpay_subscription_id,
      gatewayCustomerId: rzpSub.customer_id ?? null,
      status: 'active',
      billingInterval: billingInterval ?? 'monthly',
      currentPeriodStart: rzpSub.current_start ? new Date(rzpSub.current_start * 1000) : now,
      currentPeriodEnd: rzpSub.current_end ? new Date(rzpSub.current_end * 1000) : this.addInterval(now, billingInterval),
      leadUnlocksUsed: 0,
      leadUnlocksResetAt: now,
    });
    await this.subscriptionRepo.save(subscription);

    const plan = await this.planRepo.findOneBy({ id: planId });
    const amount = billingInterval === 'yearly' ? Number(plan?.priceYearly ?? 0) : Number(plan?.priceMonthly ?? 0);

    const payment = this.paymentRepo.create({
      providerId,
      amount,
      currency: 'INR',
      status: 'succeeded',
      type: 'subscription',
      paymentGateway: 'razorpay',
      gatewayPaymentId: razorpay_payment_id,
      gatewayOrderId: razorpay_subscription_id,
      metadata: { planId, subscriptionId: subscription.id },
    });
    await this.paymentRepo.save(payment);

    this.logger.log(`Subscription created: ${subscription.id} for provider: ${providerId}`);

    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'subscription_activated', {
        planName: plan?.name || 'Premium',
      }).catch(() => {});
    }

    return { status: 'active', subscriptionId: subscription.id };
  }

  // ──────────────────────────────────────────
  // Apple IAP Verification
  // ──────────────────────────────────────────

  async verifyAppleReceipt(userId: string, body: {
    transactionId: string;
    originalTransactionId: string;
    productId: string;
  }) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const { transactionId, originalTransactionId, productId } = body;

    // Find the subscription plan matching this Apple product ID
    const plan = await this.planRepo
      .createQueryBuilder('p')
      .where('p.apple_product_id_monthly = :pid OR p.apple_product_id_yearly = :pid', { pid: productId })
      .getOne();

    if (!plan) throw new BadRequestException('Unknown Apple product ID');

    const billingInterval = plan.appleProductIdYearly === productId ? 'yearly' : 'monthly';

    // Check idempotency
    const existing = await this.subscriptionRepo.findOneBy({ gatewaySubscriptionId: originalTransactionId });
    if (existing) {
      existing.status = 'active';
      await this.subscriptionRepo.save(existing);
      return { status: 'active', subscriptionId: existing.id };
    }

    // Delete any existing subscription for this provider (one subscription at a time)
    await this.subscriptionRepo.delete({ providerId: provider.id });

    const now = new Date();
    const subscription = this.subscriptionRepo.create({
      providerId: provider.id,
      planId: plan.id,
      paymentGateway: 'apple',
      gatewaySubscriptionId: originalTransactionId,
      gatewayCustomerId: null,
      status: 'active',
      billingInterval,
      currentPeriodStart: now,
      currentPeriodEnd: this.addInterval(now, billingInterval),
      leadUnlocksUsed: 0,
      leadUnlocksResetAt: now,
    });
    await this.subscriptionRepo.save(subscription);

    const amount = billingInterval === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
    const payment = this.paymentRepo.create({
      providerId: provider.id,
      amount,
      currency: 'INR',
      status: 'succeeded',
      type: 'subscription',
      paymentGateway: 'apple',
      gatewayPaymentId: transactionId,
      gatewayOrderId: originalTransactionId,
      metadata: { planId: plan.id, subscriptionId: subscription.id, productId },
    });
    await this.paymentRepo.save(payment);

    this.logger.log(`Apple IAP subscription created: ${subscription.id} for provider: ${provider.id}`);

    this.notificationDispatch.sendTemplated(provider.userId, 'subscription_activated', {
      planName: plan.name,
    }).catch(() => {});

    return { status: 'active', subscriptionId: subscription.id };
  }

  // ──────────────────────────────────────────
  // Razorpay Webhook Handling
  // ──────────────────────────────────────────

  async handleRazorpayWebhook(signature: string, rawBody: Buffer) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) throw new BadRequestException('Webhook secret not configured');

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.error('Razorpay webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString());
    this.logger.log(`Razorpay webhook received: ${event.event} [${event.payload?.payment?.entity?.id ?? ''}]`);

    switch (event.event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'subscription.activated':
        await this.handleSubscriptionActivated(event.payload.subscription.entity);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(event.payload.subscription.entity);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(event.payload.subscription.entity);
        break;
      case 'subscription.halted':
        await this.handleSubscriptionHalted(event.payload.subscription.entity);
        break;
      default:
        this.logger.log(`Unhandled Razorpay event: ${event.event}`);
    }

    return { received: true };
  }

  // ──────────────────────────────────────────
  // Apple Server Notification v2 Handling
  // ──────────────────────────────────────────

  async handleAppleWebhook(body: any) {
    const notificationType = body.notificationType;
    const subtype = body.subtype;
    const data = body.data;

    this.logger.log(`Apple webhook received: ${notificationType} ${subtype ?? ''}`);

    const originalTransactionId = data?.signedTransactionInfo?.originalTransactionId
      ?? data?.originalTransactionId;

    if (!originalTransactionId) {
      this.logger.warn('Apple webhook: no originalTransactionId found');
      return { received: true };
    }

    const subscription = await this.subscriptionRepo.findOneBy({
      gatewaySubscriptionId: originalTransactionId,
      paymentGateway: 'apple',
    });

    if (!subscription) {
      this.logger.warn(`Apple webhook: subscription not found for ${originalTransactionId}`);
      return { received: true };
    }

    switch (notificationType) {
      case 'DID_RENEW':
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = this.addInterval(new Date(), subscription.billingInterval);
        subscription.leadUnlocksUsed = 0;
        subscription.leadUnlocksResetAt = new Date();
        await this.subscriptionRepo.save(subscription);
        this.logger.log(`Apple subscription renewed: ${subscription.id}`);
        break;

      case 'EXPIRED':
        subscription.status = 'canceled';
        await this.subscriptionRepo.save(subscription);
        this.logger.log(`Apple subscription expired: ${subscription.id}`);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        if (subtype === 'AUTO_RENEW_DISABLED') {
          subscription.cancelAtPeriodEnd = true;
        } else if (subtype === 'AUTO_RENEW_ENABLED') {
          subscription.cancelAtPeriodEnd = false;
        }
        await this.subscriptionRepo.save(subscription);
        break;

      case 'REVOKE':
      case 'REFUND':
        subscription.status = 'canceled';
        await this.subscriptionRepo.save(subscription);
        this.logger.log(`Apple subscription revoked/refunded: ${subscription.id}`);
        break;

      case 'GRACE_PERIOD_EXPIRED':
        subscription.status = 'past_due';
        await this.subscriptionRepo.save(subscription);
        break;

      default:
        this.logger.log(`Unhandled Apple notification: ${notificationType}`);
    }

    return { received: true };
  }

  // ──────────────────────────────────────────
  // Razorpay Webhook Handlers
  // ──────────────────────────────────────────

  private async handlePaymentCaptured(rzpPayment: any) {
    const orderId = rzpPayment.order_id;
    if (!orderId) return;

    const payment = await this.paymentRepo.findOneBy({ gatewayOrderId: orderId });
    if (!payment || payment.status === 'succeeded') return;

    payment.status = 'succeeded';
    payment.gatewayPaymentId = rzpPayment.id;
    await this.paymentRepo.save(payment);

    await this.fulfillPayment(payment);
  }

  private async handlePaymentFailed(rzpPayment: any) {
    const orderId = rzpPayment.order_id;
    if (!orderId) return;

    const payment = await this.paymentRepo.findOneBy({ gatewayOrderId: orderId });
    if (!payment || payment.status === 'succeeded') return;

    payment.status = 'failed';
    payment.gatewayPaymentId = rzpPayment.id;
    await this.paymentRepo.save(payment);

    this.logger.warn(`Payment failed: ${payment.id}`);

    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'payment_failed', {
        amount: `₹${payment.amount}`,
      }).catch(() => {});
    }
  }

  private async handleSubscriptionActivated(rzpSub: any) {
    const existing = await this.subscriptionRepo.findOneBy({ gatewaySubscriptionId: rzpSub.id });
    if (existing) return;

    const notes = rzpSub.notes || {};
    const providerId = notes.providerId;
    const planId = notes.planId;
    const billingInterval = notes.billingInterval || 'monthly';

    if (!providerId || !planId) {
      this.logger.warn('Subscription activated webhook missing providerId/planId in notes');
      return;
    }

    const now = new Date();
    const subscription = this.subscriptionRepo.create({
      providerId,
      planId,
      paymentGateway: 'razorpay',
      gatewaySubscriptionId: rzpSub.id,
      gatewayCustomerId: rzpSub.customer_id ?? null,
      status: 'active',
      billingInterval,
      currentPeriodStart: rzpSub.current_start ? new Date(rzpSub.current_start * 1000) : now,
      currentPeriodEnd: rzpSub.current_end ? new Date(rzpSub.current_end * 1000) : this.addInterval(now, billingInterval),
      leadUnlocksUsed: 0,
      leadUnlocksResetAt: now,
    });

    try {
      await this.subscriptionRepo.save(subscription);
      this.logger.log(`Subscription created via webhook: ${subscription.id}`);

      const provider = await this.providerRepo.findOneBy({ id: providerId });
      const plan = await this.planRepo.findOneBy({ id: planId });
      if (provider) {
        this.notificationDispatch.sendTemplated(provider.userId, 'subscription_activated', {
          planName: plan?.name || 'Premium',
        }).catch(() => {});
      }
    } catch (err) {
      this.logger.warn(`Subscription save failed (likely duplicate): ${(err as Error).message}`);
    }
  }

  private async handleSubscriptionCharged(rzpSub: any) {
    const subscription = await this.subscriptionRepo.findOneBy({ gatewaySubscriptionId: rzpSub.id });
    if (!subscription) return;

    subscription.status = 'active';
    subscription.currentPeriodStart = rzpSub.current_start ? new Date(rzpSub.current_start * 1000) : new Date();
    subscription.currentPeriodEnd = rzpSub.current_end ? new Date(rzpSub.current_end * 1000) : this.addInterval(new Date(), subscription.billingInterval);
    subscription.leadUnlocksUsed = 0;
    subscription.leadUnlocksResetAt = new Date();
    await this.subscriptionRepo.save(subscription);

    this.logger.log(`Subscription renewed: ${subscription.id}`);

    const provider = await this.providerRepo.findOneBy({ id: subscription.providerId });
    if (provider) {
      const plan = await this.planRepo.findOneBy({ id: subscription.planId });
      this.notificationDispatch.sendTemplated(provider.userId, 'subscription_renewal_success', {
        planName: plan?.name || 'Premium',
      }).catch(() => {});
    }
  }

  private async handleSubscriptionCancelled(rzpSub: any) {
    const subscription = await this.subscriptionRepo.findOneBy({ gatewaySubscriptionId: rzpSub.id });
    if (!subscription) return;

    subscription.status = 'canceled';
    await this.subscriptionRepo.save(subscription);
    this.logger.log(`Subscription canceled: ${subscription.id}`);

    const provider = await this.providerRepo.findOneBy({ id: subscription.providerId });
    if (provider) {
      const plan = await this.planRepo.findOneBy({ id: subscription.planId });
      this.notificationDispatch.sendTemplated(provider.userId, 'subscription_cancelled', {
        planName: plan?.name || 'Premium',
      }).catch(() => {});
    }
  }

  private async handleSubscriptionHalted(rzpSub: any) {
    const subscription = await this.subscriptionRepo.findOneBy({ gatewaySubscriptionId: rzpSub.id });
    if (!subscription) return;

    subscription.status = 'past_due';
    await this.subscriptionRepo.save(subscription);
    this.logger.warn(`Subscription halted (payment failed): ${subscription.id}`);

    const provider = await this.providerRepo.findOneBy({ id: subscription.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'payment_failed', {
        amount: '',
      }).catch(() => {});
    }
  }

  // ──────────────────────────────────────────
  // Payment Fulfillment
  // ──────────────────────────────────────────

  private async fulfillPayment(payment: Payment) {
    switch (payment.type) {
      case 'sponsorship':
        await this.fulfillSponsorshipPayment(payment);
        break;
      case 'lead_unlock':
        await this.fulfillLeadUnlockPayment(payment);
        break;
      case 'deal_creation':
        await this.fulfillDealCreationPayment(payment);
        break;
    }
  }

  private async fulfillSponsorshipPayment(payment: Payment) {
    const listingId = payment.metadata?.sponsoredListingId;
    if (!listingId) return;

    await this.sponsoredListingRepo.update(listingId, { isActive: true, approvalStatus: 'approved' });

    if (payment.voucherId) {
      await this.recordVoucherRedemption(payment);
    }

    this.logger.log(`Sponsorship payment fulfilled: ${payment.id}`);

    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'payment_success', {
        amount: `₹${payment.amount}`,
        description: 'Sponsorship',
      }).catch(() => {});
    }
  }

  private async fulfillLeadUnlockPayment(payment: Payment) {
    const leadId = payment.metadata?.leadId;
    if (!leadId) return;

    await this.leadRepo.update(leadId, { isUnlocked: true });

    if (payment.voucherId) {
      await this.recordVoucherRedemption(payment);
    }

    this.logger.log(`Lead unlock payment fulfilled: ${payment.id}, lead: ${leadId}`);

    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'lead_unlocked', {
        customerName: 'a customer',
      }).catch(() => {});
    }
  }

  private async fulfillDealCreationPayment(payment: Payment) {
    if (payment.voucherId) {
      await this.recordVoucherRedemption(payment);
    }

    this.logger.log(`Deal creation payment fulfilled: ${payment.id}`);

    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'payment_success', {
        amount: `₹${payment.amount}`,
        description: 'Deal Creation',
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

    await this.voucherRepo.increment({ id: payment.voucherId }, 'usedCount', 1);

    const voucher = await this.voucherRepo.findOneBy({ id: payment.voucherId });
    const provider = await this.providerRepo.findOneBy({ id: payment.providerId });
    if (voucher && provider) {
      const discount = payment.discountAmount ? `₹${payment.discountAmount}` : 'a discount';
      this.notificationDispatch.sendTemplated(
        provider.userId,
        'voucher_redeemed',
        { voucherCode: voucher.code, discount },
        undefined,
        'provider',
      ).catch(() => {});
    }
  }

  // ──────────────────────────────────────────
  // Deal Creation Checkout
  // ──────────────────────────────────────────

  async createDealCreationCheckout(userId: string, dto: CreateDealCreationCheckoutDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const monetizationEnabled = (await this.getSetting('deals_monetization_enabled', 'false')) === 'true';
    if (!monetizationEnabled) {
      return { requiresPayment: false, method: 'free' };
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    if (subscription?.plan && subscription.plan.maxTotalDeals === -1) {
      return { requiresPayment: false, method: 'subscription_unlimited' };
    }

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

    const isWomenLedApprovedDeal = provider.womenLedStatus === 'approved';
    const dealQuotaKey = isWomenLedApprovedDeal ? 'women_led_free_deals_lifetime' : 'free_deal_quota_lifetime';
    const dealQuotaDefault = isWomenLedApprovedDeal ? '5' : '3';
    const freeQuotaStr = await this.getSetting(dealQuotaKey, dealQuotaDefault);
    const freeQuota = parseInt(freeQuotaStr, 10);

    if (provider.freeDealsCreated < freeQuota) {
      return { requiresPayment: false, method: 'free_quota', freeRemaining: freeQuota - provider.freeDealsCreated };
    }

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

    const payment = this.paymentRepo.create({
      providerId: provider.id,
      amount,
      currency: 'INR',
      status: 'pending',
      type: 'deal_creation' as any,
      paymentGateway: 'razorpay',
      metadata: { dealData: dto.dealData },
      voucherId,
      discountAmount,
    });
    await this.paymentRepo.save(payment);

    const amountInPaise = Math.round(amount * 100);
    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: {
        paymentId: payment.id,
        type: 'deal_creation',
      },
    });

    await this.paymentRepo.update(payment.id, {
      gatewayOrderId: order.id,
      status: 'processing',
    });

    return {
      requiresPayment: true,
      method: 'payment_required',
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      paymentId: payment.id,
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
      description: 'Deal Creation',
      price: amount,
      discounted: isGrowthSubscriber,
      prefill: await this.getPrefillData(provider),
    };
  }

  // ──────────────────────────────────────────
  // Get Lead Unlock Pricing Info
  // ──────────────────────────────────────────

  async getLeadUnlockInfo(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const monetizationEnabled = (await this.getSetting('leads_monetization_enabled', 'false')) === 'true';

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

  private async getPrefillData(provider: Provider) {
    const user = await this.providerRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.id = :id', { id: provider.id })
      .getOne();

    return {
      name: provider.brandName,
      email: user?.user?.email ?? undefined,
      contact: provider.contactNumber ?? undefined,
    };
  }

  private addInterval(date: Date, interval: 'monthly' | 'yearly'): Date {
    const result = new Date(date);
    if (interval === 'yearly') {
      result.setFullYear(result.getFullYear() + 1);
    } else {
      result.setMonth(result.getMonth() + 1);
    }
    return result;
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
