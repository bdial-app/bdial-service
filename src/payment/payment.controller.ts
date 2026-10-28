import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  CreateSponsorshipCheckoutDto,
  CreateLeadUnlockCheckoutDto,
  CreateSubscriptionCheckoutDto,
  CreateDealCreationCheckoutDto,
  ValidateVoucherDto,
  VerifyAppleConsumableDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Sponsorship ────────────────────────

  @Post('sponsorship/checkout')
  @ApiOperation({ summary: 'Create a Razorpay Order for sponsorship purchase' })
  @ApiResponse({ status: 201, description: 'Order created' })
  createSponsorshipCheckout(@Request() req, @Body() dto: CreateSponsorshipCheckoutDto) {
    return this.paymentService.createSponsorshipCheckout(req.user.id, dto);
  }

  // ─── Lead Unlock ────────────────────────

  @Post('lead-unlock/checkout')
  @ApiOperation({ summary: 'Unlock a lead — uses subscription credits or creates Razorpay Order' })
  @ApiResponse({ status: 201, description: 'Lead unlocked or order created' })
  createLeadUnlockCheckout(@Request() req, @Body() dto: CreateLeadUnlockCheckoutDto) {
    return this.paymentService.createLeadUnlockCheckout(req.user.id, dto);
  }

  @Get('lead-unlock/info')
  @ApiOperation({ summary: 'Get lead unlock pricing info and remaining credits' })
  getLeadUnlockInfo(@Request() req) {
    return this.paymentService.getLeadUnlockInfo(req.user.id);
  }

  // ─── Deal Creation ─────────────────────

  @Post('deal-creation/checkout')
  @ApiOperation({ summary: 'Check deal creation eligibility or create Razorpay Order for paid deal' })
  @ApiResponse({ status: 201, description: 'Deal creation allowed or order created' })
  createDealCreationCheckout(@Request() req, @Body() dto: CreateDealCreationCheckoutDto) {
    return this.paymentService.createDealCreationCheckout(req.user.id, dto);
  }

  @Get('deal-creation/info')
  @ApiOperation({ summary: 'Get deal creation pricing info and remaining quotas' })
  getDealCreationInfo(@Request() req) {
    return this.paymentService.getDealCreationInfo(req.user.id);
  }

  // ─── Subscriptions ─────────────────────

  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  getSubscriptionPlans() {
    return this.paymentService.getSubscriptionPlans();
  }

  @Post('subscriptions/checkout')
  @ApiOperation({ summary: 'Create a Razorpay Subscription for a plan' })
  createSubscriptionCheckout(@Request() req, @Body() dto: CreateSubscriptionCheckoutDto) {
    return this.paymentService.createSubscriptionCheckout(req.user.id, dto);
  }

  @Get('subscriptions/current')
  @ApiOperation({ summary: 'Get current provider subscription' })
  getCurrentSubscription(@Request() req) {
    return this.paymentService.getCurrentSubscription(req.user.id);
  }

  @Post('subscriptions/cancel')
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  cancelSubscription(@Request() req) {
    return this.paymentService.cancelSubscription(req.user.id);
  }

  @Post('subscriptions/resume')
  @ApiOperation({ summary: 'Resume a cancelled subscription' })
  resumeSubscription(@Request() req) {
    return this.paymentService.resumeSubscription(req.user.id);
  }

  // ─── Payment Verification ──────────────

  @Post('verify/razorpay')
  @ApiOperation({ summary: 'Verify Razorpay payment signature and fulfill the order' })
  verifyRazorpayPayment(@Body() body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return this.paymentService.verifyRazorpayPayment(body);
  }

  @Post('verify/razorpay-subscription')
  @ApiOperation({ summary: 'Verify Razorpay subscription signature and activate subscription' })
  verifyRazorpaySubscription(@Body() body: {
    razorpay_subscription_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    providerId: string;
    billingInterval: 'monthly' | 'yearly';
  }) {
    return this.paymentService.verifyRazorpaySubscription(body);
  }

  @Post('verify/apple')
  @ApiOperation({ summary: 'Verify Apple IAP receipt and activate subscription' })
  verifyAppleReceipt(@Request() req, @Body() body: {
    transactionId: string;
    originalTransactionId: string;
    productId: string;
  }) {
    return this.paymentService.verifyAppleReceipt(req.user.id, body);
  }

  @Post('verify/apple-consumable')
  @ApiOperation({ summary: 'Verify an Apple IAP consumable (boost/lead/deal) and fulfil the pending payment' })
  verifyAppleConsumable(@Request() req, @Body() dto: VerifyAppleConsumableDto) {
    return this.paymentService.verifyAppleConsumable(req.user.id, dto);
  }

  // ─── Voucher Validation ─────────────────

  @Post('vouchers/validate')
  @ApiOperation({ summary: 'Validate a voucher code before checkout' })
  validateVoucher(@Request() req, @Body() dto: ValidateVoucherDto) {
    return this.paymentService.validateVoucher(dto.code, dto.purchaseType, dto.amount);
  }

  // ─── Payment History ────────────────────

  @Get('history')
  @ApiOperation({ summary: 'Get provider payment history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getPaymentHistory(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentService.getPaymentHistory(req.user.id, page, limit);
  }
}
