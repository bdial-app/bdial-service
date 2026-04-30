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
  ValidateVoucherDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Sponsorship ────────────────────────

  @Post('sponsorship/checkout')
  @ApiOperation({ summary: 'Create a Stripe Checkout session for sponsorship purchase' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  createSponsorshipCheckout(@Request() req, @Body() dto: CreateSponsorshipCheckoutDto) {
    return this.paymentService.createSponsorshipCheckout(req.user.id, dto);
  }

  // ─── Lead Unlock ────────────────────────

  @Post('lead-unlock/checkout')
  @ApiOperation({ summary: 'Unlock a lead — uses subscription credits or creates Stripe Checkout' })
  @ApiResponse({ status: 201, description: 'Lead unlocked or checkout session created' })
  createLeadUnlockCheckout(@Request() req, @Body() dto: CreateLeadUnlockCheckoutDto) {
    return this.paymentService.createLeadUnlockCheckout(req.user.id, dto);
  }

  // ─── Subscriptions ─────────────────────

  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  getSubscriptionPlans() {
    return this.paymentService.getSubscriptionPlans();
  }

  @Post('subscriptions/checkout')
  @ApiOperation({ summary: 'Create a Stripe Checkout session for subscription' })
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

  @Get('subscriptions/portal')
  @ApiOperation({ summary: 'Get Stripe Customer Portal URL for billing management' })
  getCustomerPortal(@Request() req) {
    return this.paymentService.getCustomerPortalUrl(req.user.id);
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

  // ─── Payment Confirmation ──────────────

  @Get('confirm')
  @ApiOperation({ summary: 'Confirm a checkout session and fulfill if paid (handles redirect-before-webhook race)' })
  @ApiQuery({ name: 'session_id', required: true })
  confirmPayment(@Request() req, @Query('session_id') sessionId: string) {
    return this.paymentService.confirmCheckoutSession(req.user.id, sessionId);
  }
}
