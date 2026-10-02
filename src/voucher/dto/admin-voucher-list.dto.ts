import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const VOUCHER_DISCOUNT_TYPES = ['percentage', 'fixed_amount'] as const;
/**
 * Mutually exclusive, checked in this order: inactive (is_active = false),
 * expired (valid_until passed), scheduled (valid_from in the future),
 * exhausted (max_uses reached), live (everything else).
 */
export const VOUCHER_OP_STATUSES = [
  'live',
  'scheduled',
  'expired',
  'exhausted',
  'inactive',
] as const;
export const VOUCHER_APPLICABLE_TO = [
  'sponsorship',
  'lead_unlock',
  'badge',
  'subscription',
  'deal_unlock',
  'deal_creation',
] as const;
export const VOUCHER_USAGES = ['never', 'used', 'exhausted'] as const;
export const VOUCHER_SORTS = ['newest', 'expiring_soon', 'most_used'] as const;
const BOOL = ['true', 'false'] as const;

/** Query for GET /admin/vouchers. */
export class AdminVoucherListQueryDto {
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

  @ApiPropertyOptional({ description: 'Code or description' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  isActive?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: VOUCHER_DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(VOUCHER_DISCOUNT_TYPES)
  discountType?: (typeof VOUCHER_DISCOUNT_TYPES)[number];

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

  @ApiPropertyOptional({ enum: VOUCHER_OP_STATUSES })
  @IsOptional()
  @IsIn(VOUCHER_OP_STATUSES)
  opStatus?: (typeof VOUCHER_OP_STATUSES)[number];

  @ApiPropertyOptional({
    enum: VOUCHER_APPLICABLE_TO,
    description: 'One payment type contained in applicable_to',
  })
  @IsOptional()
  @IsIn(VOUCHER_APPLICABLE_TO)
  applicableTo?: (typeof VOUCHER_APPLICABLE_TO)[number];

  @ApiPropertyOptional({
    enum: VOUCHER_USAGES,
    description: "'exhausted' = max_uses reached",
  })
  @IsOptional()
  @IsIn(VOUCHER_USAGES)
  usage?: (typeof VOUCHER_USAGES)[number];

  @ApiPropertyOptional({
    description: 'valid_until is between now and N days from now',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  expiringWithinDays?: number;

  @ApiPropertyOptional({
    description: 'valid_until on or after (IST calendar day)',
  })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'valid_until on or before (IST calendar day, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Creating admin user id' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ enum: VOUCHER_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(VOUCHER_SORTS)
  sort?: (typeof VOUCHER_SORTS)[number];
}
