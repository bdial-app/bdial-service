import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const SPONSORSHIP_TYPE_FILTERS = [
  'carousel',
  'inline',
  'top_result',
] as const;
export const SPONSORSHIP_APPROVAL_FILTERS = [
  'pending_approval',
  'approved',
  'rejected',
] as const;
export const SPONSORSHIP_SOURCE_FILTERS = [
  'provider_paid',
  'admin_granted',
] as const;
export const SPONSORSHIP_BILLING_FILTERS = ['paid', 'free'] as const;
/** Computed in SQL the same way the admin UI's getOperationalStatus does. */
export const SPONSORSHIP_OP_STATUS_FILTERS = [
  'live',
  'scheduled',
  'expired',
  'stopped',
  'exhausted',
  'pending',
  'rejected',
] as const;
export const SPONSORSHIP_SORTS = [
  'newest',
  'ending_soon',
  'spend_desc',
  'impressions_desc',
  'clicks_desc',
  'ctr_desc',
] as const;
const BOOL = ['true', 'false'] as const;

/** Query for GET /admin/sponsorships. */
export class AdminSponsorshipListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Business name or city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: BOOL, description: 'Running flag' })
  @IsOptional()
  @IsIn(BOOL)
  isActive?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: SPONSORSHIP_TYPE_FILTERS })
  @IsOptional()
  @IsIn(SPONSORSHIP_TYPE_FILTERS)
  type?: (typeof SPONSORSHIP_TYPE_FILTERS)[number];

  @ApiPropertyOptional({ enum: SPONSORSHIP_APPROVAL_FILTERS })
  @IsOptional()
  @IsIn(SPONSORSHIP_APPROVAL_FILTERS)
  approvalStatus?: (typeof SPONSORSHIP_APPROVAL_FILTERS)[number];

  @ApiPropertyOptional({ enum: SPONSORSHIP_SOURCE_FILTERS })
  @IsOptional()
  @IsIn(SPONSORSHIP_SOURCE_FILTERS)
  source?: (typeof SPONSORSHIP_SOURCE_FILTERS)[number];

  @ApiPropertyOptional({ enum: SPONSORSHIP_BILLING_FILTERS })
  @IsOptional()
  @IsIn(SPONSORSHIP_BILLING_FILTERS)
  billingMode?: (typeof SPONSORSHIP_BILLING_FILTERS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ enum: SPONSORSHIP_OP_STATUS_FILTERS })
  @IsOptional()
  @IsIn(SPONSORSHIP_OP_STATUS_FILTERS)
  opStatus?: (typeof SPONSORSHIP_OP_STATUS_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Created on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Created on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Ends on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  endsFrom?: string;

  @ApiPropertyOptional({
    description: 'Ends on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  endsTo?: string;

  @ApiPropertyOptional({ description: 'Budget at least' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ description: 'Budget at most' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description: 'Spent at least this percentage of the budget',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  spentPctMin?: number;

  @ApiPropertyOptional({
    description: "The business's city, or a targeted city — case-insensitive",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'At least this many impressions' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minImpressions?: number;

  @ApiPropertyOptional({ enum: SPONSORSHIP_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(SPONSORSHIP_SORTS)
  sort?: (typeof SPONSORSHIP_SORTS)[number];
}
