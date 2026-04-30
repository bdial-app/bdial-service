import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('Admin — Payments')
@Controller('admin')
@ApiBearerAuth()
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Payments ──────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List all payments (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  listPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.paymentService.getAdminPayments({ page, limit, status: status as any, type });
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Get revenue stats (admin)' })
  getRevenueStats() {
    return this.paymentService.getRevenueStats();
  }

  // ─── Subscriptions ────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  listSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.paymentService.getAdminSubscriptions({ page, limit, status: status as any });
  }

  // ─── Subscription Plans ───────────────

  @Get('subscription-plans')
  @ApiOperation({ summary: 'List all subscription plans (admin)' })
  listPlans() {
    return this.paymentService.getSubscriptionPlans();
  }

  @Post('subscription-plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createPlan(@Body() body: any) {
    return this.paymentService.createSubscriptionPlan(body);
  }

  @Patch('subscription-plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.paymentService.updateSubscriptionPlan(id, body);
  }
}
