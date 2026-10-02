import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
] as const;
export const PAYMENT_TYPES = [
  'sponsorship',
  'lead_unlock',
  'badge',
  'subscription',
  'deal_unlock',
  'deal_creation',
] as const;
export const PAYMENT_GATEWAYS = [
  'razorpay',
  'apple',
  'manual',
  'voucher',
] as const;
export const PAYMENT_SORTS = [
  'newest',
  'oldest',
  'amount_desc',
  'amount_asc',
] as const;

export const SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'paused',
] as const;
export const SUBSCRIPTION_GATEWAYS = ['razorpay', 'apple'] as const;
export const BILLING_INTERVALS = ['monthly', 'yearly'] as const;
export const SUBSCRIPTION_SORTS = [
  'newest',
  'period_end_asc',
  'period_end_desc',
] as const;

export const REVENUE_GRANULARITIES = ['day', 'week', 'month'] as const;
export type RevenueGranularity = (typeof REVENUE_GRANULARITIES)[number];

const BOOL = ['true', 'false'] as const;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Query for GET /admin/payments. Booleans stay strings ('true' | 'false') so an
 * absent param means "don't filter", never "false".
 */
export class AdminPaymentListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Provider brand, gateway payment/order id, or payment id',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: (typeof PAYMENT_STATUSES)[number];

  @ApiPropertyOptional({ enum: PAYMENT_TYPES })
  @IsOptional()
  @IsIn(PAYMENT_TYPES)
  type?: (typeof PAYMENT_TYPES)[number];

  @ApiPropertyOptional({ enum: PAYMENT_GATEWAYS })
  @IsOptional()
  @IsIn(PAYMENT_GATEWAYS)
  gateway?: (typeof PAYMENT_GATEWAYS)[number];

  @ApiPropertyOptional({
    description: 'Created on or after (IST calendar day)',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Created on or before (IST calendar day, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Amount >= (INR)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMin?: number;

  @ApiPropertyOptional({ description: 'Amount <= (INR)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMax?: number;

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'voucher_id set or discount_amount > 0',
  })
  @IsOptional()
  @IsIn(BOOL)
  hasVoucher?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    description: 'Exact provider city, case-insensitive',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Provider id' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ enum: PAYMENT_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(PAYMENT_SORTS)
  sort?: (typeof PAYMENT_SORTS)[number];
}

/** Query for GET /admin/subscriptions. */
export class AdminSubscriptionListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Provider brand, gateway subscription id, or subscription id',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: SUBSCRIPTION_STATUSES })
  @IsOptional()
  @IsIn(SUBSCRIPTION_STATUSES)
  status?: (typeof SUBSCRIPTION_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Plan id' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ enum: BILLING_INTERVALS })
  @IsOptional()
  @IsIn(BILLING_INTERVALS)
  billingInterval?: (typeof BILLING_INTERVALS)[number];

  @ApiPropertyOptional({ enum: SUBSCRIPTION_GATEWAYS })
  @IsOptional()
  @IsIn(SUBSCRIPTION_GATEWAYS)
  gateway?: (typeof SUBSCRIPTION_GATEWAYS)[number];

  @ApiPropertyOptional({
    description: 'Created on or after (IST calendar day)',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Created on or before (IST calendar day, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'Active/trialing, not cancelling, and current period ends within N days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  renewingWithinDays?: number;

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  cancelAtPeriodEnd?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    description: 'Current period ends on or after (IST calendar day)',
  })
  @IsOptional()
  @IsISO8601()
  periodEndFrom?: string;

  @ApiPropertyOptional({
    description:
      'Current period ends on or before (IST calendar day, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  periodEndTo?: string;

  @ApiPropertyOptional({ description: 'Exact provider city, case-insensitive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: SUBSCRIPTION_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(SUBSCRIPTION_SORTS)
  sort?: (typeof SUBSCRIPTION_SORTS)[number];
}

/** Query for GET /admin/payments/revenue. Dates are IST calendar days. */
export class AdminRevenueQueryDto {
  @ApiPropertyOptional({
    description: 'YYYY-MM-DD, inclusive. Default: 29 days before `to`.',
  })
  @IsOptional()
  @Matches(YMD, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    description: 'YYYY-MM-DD, inclusive. Default: today (IST).',
  })
  @IsOptional()
  @Matches(YMD, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @ApiPropertyOptional({
    enum: REVENUE_GRANULARITIES,
    description: 'Default: day for <= 31 days, week for <= 120, else month',
  })
  @IsOptional()
  @IsIn(REVENUE_GRANULARITIES)
  granularity?: RevenueGranularity;

  @ApiPropertyOptional({
    description: 'Comma-separated payment types',
    example: 'subscription,deal_unlock',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsIn(PAYMENT_TYPES, { each: true })
  types?: (typeof PAYMENT_TYPES)[number][];

  @ApiPropertyOptional({ enum: PAYMENT_GATEWAYS })
  @IsOptional()
  @IsIn(PAYMENT_GATEWAYS)
  gateway?: (typeof PAYMENT_GATEWAYS)[number];

  @ApiPropertyOptional({ description: 'Exact provider city, case-insensitive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: "Plan id, via the payment's linked subscription",
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    enum: BOOL,
    description: "'true' adds totals for the preceding window of equal length",
  })
  @IsOptional()
  @IsIn(BOOL)
  compare?: (typeof BOOL)[number];
}
