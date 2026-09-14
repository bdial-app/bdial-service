import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsInt,
  IsArray,
  IsUUID,
  IsBoolean,
  Min,
  MaxLength,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SPONSORSHIP_TYPES = ['carousel', 'inline', 'top_result'] as const;
export const BILLING_MODES = ['paid', 'free'] as const;
export const APPROVAL_STATUSES = ['pending_approval', 'approved', 'rejected'] as const;

/**
 * Admin places a sponsorship on behalf of any provider. Unlike the provider
 * checkout flow there is no minimum budget and no gateway round-trip — the
 * placement can be complimentary (`billingMode: 'free'`) or backed by a
 * payment the admin records manually.
 */
export class AdminCreateSponsorshipDto {
  @ApiProperty({ description: 'Provider that gets the placement' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ enum: SPONSORSHIP_TYPES, example: 'carousel' })
  @IsEnum(SPONSORSHIP_TYPES)
  type: (typeof SPONSORSHIP_TYPES)[number];

  @ApiPropertyOptional({
    enum: BILLING_MODES,
    default: 'free',
    description: "'free' never burns budget and never expires on spend; 'paid' behaves like a purchased boost",
  })
  @IsOptional()
  @IsEnum(BILLING_MODES)
  billingMode?: (typeof BILLING_MODES)[number];

  @ApiPropertyOptional({ example: 1000, description: 'Ignored for free placements' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetAmount?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerClick?: number;

  @ApiPropertyOptional({ example: 0.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPerImpression?: number;

  @ApiPropertyOptional({ example: ['uuid-cat-1'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetCategoryIds?: string[];

  @ApiPropertyOptional({ example: ['Mumbai', 'Pune'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCities?: string[];

  @ApiPropertyOptional({ example: 25, description: 'Kilometres' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetRadius?: number;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-11-01T00:00:00.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ default: 0, description: 'Higher priority wins the slot ahead of higher bids' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: true, description: 'Start serving immediately' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: APPROVAL_STATUSES, default: 'approved' })
  @IsOptional()
  @IsEnum(APPROVAL_STATUSES)
  approvalStatus?: (typeof APPROVAL_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Admin-only note, never shown to the provider' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNote?: string;

  @ApiPropertyOptional({ description: 'Notify the provider that the placement went live', default: true })
  @IsOptional()
  @IsBoolean()
  notifyProvider?: boolean;

  // ─── Offline payment record (billingMode: 'paid' only) ───────────
  @ApiPropertyOptional({ description: 'Record a payment collected outside the app for this placement' })
  @IsOptional()
  @IsBoolean()
  recordPayment?: boolean;

  @ApiPropertyOptional({ example: 1499, description: 'Amount collected. Defaults to budgetAmount.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paymentAmount?: number;

  @ApiPropertyOptional({ example: 'UPI 4821xxxx / cash receipt #42' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentReference?: string;
}

/** Every field an admin may change on an existing placement. */
export class AdminUpdateSponsorshipDto {
  @ApiPropertyOptional({ enum: SPONSORSHIP_TYPES })
  @IsOptional()
  @IsEnum(SPONSORSHIP_TYPES)
  type?: (typeof SPONSORSHIP_TYPES)[number];

  @ApiPropertyOptional({ enum: BILLING_MODES })
  @IsOptional()
  @IsEnum(BILLING_MODES)
  billingMode?: (typeof BILLING_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerClick?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPerImpression?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetCategoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetRadius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: APPROVAL_STATUSES })
  @IsOptional()
  @IsEnum(APPROVAL_STATUSES)
  approvalStatus?: (typeof APPROVAL_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNote?: string;

  @ApiPropertyOptional({ description: 'Reset accrued spend back to zero (fresh budget)' })
  @IsOptional()
  @IsBoolean()
  resetSpend?: boolean;
}

export class StopSponsorshipDto {
  @ApiPropertyOptional({ example: 'Advertiser requested a pause' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Tell the provider their placement was stopped', default: true })
  @IsOptional()
  @IsBoolean()
  notifyProvider?: boolean;
}

export class TopUpSponsorshipDto {
  @ApiProperty({ example: 500, description: 'Budget to add on top of the current budget' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Also record a payment for the added budget' })
  @IsOptional()
  @IsBoolean()
  recordPayment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Extend the end date by this many days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extendDays?: number;
}

export const BULK_SPONSORSHIP_ACTIONS = ['stop', 'resume', 'approve', 'reject', 'delete'] as const;

export class BulkSponsorshipDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({ enum: BULK_SPONSORSHIP_ACTIONS })
  @IsEnum(BULK_SPONSORSHIP_ACTIONS)
  action: (typeof BULK_SPONSORSHIP_ACTIONS)[number];

  @ApiPropertyOptional({ description: 'Reason recorded on stop / reject' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class StopAllSponsorshipsDto {
  @ApiPropertyOptional({ example: 'Emergency pause — billing incident' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Also flip the sponsorships_enabled feature flag off, hiding every placement platform-wide',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  disableFeatureFlag?: boolean;

  @ApiPropertyOptional({ enum: BILLING_MODES, description: 'Limit the stop to one billing mode' })
  @IsOptional()
  @IsEnum(BILLING_MODES)
  billingMode?: (typeof BILLING_MODES)[number];
}
