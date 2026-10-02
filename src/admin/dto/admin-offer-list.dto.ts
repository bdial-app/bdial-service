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

export const OFFER_APPROVAL_FILTERS = [
  'pending_approval',
  'approved',
  'rejected',
] as const;
/** Computed in SQL: inactive → expired → exhausted → scheduled → live. */
export const OFFER_OP_STATUS_FILTERS = [
  'live',
  'scheduled',
  'expired',
  'exhausted',
  'inactive',
] as const;
export const OFFER_DISCOUNT_TYPE_FILTERS = ['percentage', 'flat'] as const;
export const OFFER_USAGE_FILTERS = ['never', 'used', 'exhausted'] as const;
export const OFFER_SORTS = [
  'newest',
  'ending_soon',
  'most_used',
  'discount_desc',
] as const;
const BOOL = ['true', 'false'] as const;

/** Query for GET /admin/offers. */
export class AdminOfferListQueryDto {
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

  @ApiPropertyOptional({ description: 'Offer title or business name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  isActive?: (typeof BOOL)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ enum: OFFER_APPROVAL_FILTERS })
  @IsOptional()
  @IsIn(OFFER_APPROVAL_FILTERS)
  approvalStatus?: (typeof OFFER_APPROVAL_FILTERS)[number];

  @ApiPropertyOptional({ enum: OFFER_OP_STATUS_FILTERS })
  @IsOptional()
  @IsIn(OFFER_OP_STATUS_FILTERS)
  opStatus?: (typeof OFFER_OP_STATUS_FILTERS)[number];

  @ApiPropertyOptional({ enum: OFFER_DISCOUNT_TYPE_FILTERS })
  @IsOptional()
  @IsIn(OFFER_DISCOUNT_TYPE_FILTERS)
  discountType?: (typeof OFFER_DISCOUNT_TYPE_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Discount value at least' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountMin?: number;

  @ApiPropertyOptional({ description: 'Discount value at most' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountMax?: number;

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

  @ApiPropertyOptional({
    enum: OFFER_USAGE_FILTERS,
    description: "'exhausted' = usage limit reached",
  })
  @IsOptional()
  @IsIn(OFFER_USAGE_FILTERS)
  usage?: (typeof OFFER_USAGE_FILTERS)[number];

  @ApiPropertyOptional({
    description: "Exact match on the business's city, case-insensitive",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'The business is listed in this category',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: OFFER_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(OFFER_SORTS)
  sort?: (typeof OFFER_SORTS)[number];
}
