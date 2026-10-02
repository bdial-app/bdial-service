import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AdminPaymentListQueryDto,
  AdminRevenueQueryDto,
  AdminSubscriptionListQueryDto,
} from './dto/admin-payment-query.dto';

@ApiTags('Admin — Payments')
@Controller('admin')
@ApiBearerAuth()
@Roles('associate') // Base: read access for any admin role
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Payments ──────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List all payments (admin)' })
  listPayments(@Query() query: AdminPaymentListQueryDto) {
    return this.paymentService.getAdminPayments(query);
  }

  @Get('payments/filter-options')
  @ApiOperation({
    summary: 'Cities, gateways and quick-segment counts for the payment list',
  })
  getPaymentFilterOptions() {
    return this.paymentService.getPaymentFilterOptions();
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Get revenue stats (admin)' })
  getRevenueStats() {
    return this.paymentService.getRevenueStats();
  }

  @Roles('admin')
  @Get('payments/analytics')
  @ApiOperation({ summary: 'Get detailed revenue analytics (admin)' })
  getRevenueAnalytics() {
    return this.paymentService.getRevenueAnalytics();
  }

  @Roles('admin')
  @Get('payments/revenue')
  @ApiOperation({
    summary: 'Filtered revenue over a date range (admin)',
    description:
      'Succeeded payments count as revenue; refunds are the refunded amounts. Buckets are IST calendar days/weeks/months.',
  })
  getRevenue(@Query() query: AdminRevenueQueryDto) {
    return this.paymentService.getRevenue(query);
  }

  // ─── Subscriptions ────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (admin)' })
  listSubscriptions(@Query() query: AdminSubscriptionListQueryDto) {
    return this.paymentService.getAdminSubscriptions(query);
  }

  @Get('subscriptions/filter-options')
  @ApiOperation({
    summary: 'Cities, plans and quick-segment counts for the subscription list',
  })
  getSubscriptionFilterOptions() {
    return this.paymentService.getSubscriptionFilterOptions();
  }

  @Get('subscriptions/stats')
  @ApiOperation({ summary: 'Get subscription stats (admin)' })
  getSubscriptionStats() {
    return this.paymentService.getSubscriptionStats();
  }

  // ─── Subscription Plans ───────────────

  @Get('subscription-plans')
  @ApiOperation({
    summary: 'List all subscription plans (admin, including inactive)',
  })
  listPlans() {
    return this.paymentService.getAdminSubscriptionPlans();
  }

  @Roles('admin')
  @Post('subscription-plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createPlan(@Body() body: any) {
    return this.paymentService.createSubscriptionPlan(body);
  }

  @Roles('admin')
  @Patch('subscription-plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.paymentService.updateSubscriptionPlan(id, body);
  }
}
