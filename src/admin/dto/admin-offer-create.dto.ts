import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export const OFFER_DISCOUNT_TYPES = ['percentage', 'flat'] as const;
export const OFFER_APPROVAL_STATUSES = [
  'pending_approval',
  'approved',
  'rejected',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * An admin placing a deal on any business's listing. Mirrors the provider's own
 * CreateOfferDto, plus the fields only an admin can set (whose listing, whether
 * it goes live immediately, approval state and an internal note).
 */
export class AdminCreateOfferDto {
  @ApiProperty({ description: 'Business that gets the deal' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ example: '20% off all services' })
  @IsString()
  @Transform(trim)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ example: 'Valid on orders above ₹500' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: OFFER_DISCOUNT_TYPES, example: 'percentage' })
  @IsEnum(OFFER_DISCOUNT_TYPES)
  discountType: (typeof OFFER_DISCOUNT_TYPES)[number];

  @ApiProperty({ example: 20, description: 'Percent (1–100) or rupees off' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discountValue: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    example: 200,
    description: 'Caps a percentage discount; ignored for a flat discount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ example: '2026-10-05T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ example: 100, description: 'Omit for unlimited' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: OFFER_APPROVAL_STATUSES,
    default: 'approved',
    description: 'Admin-created deals are approved unless told otherwise',
  })
  @IsOptional()
  @IsEnum(OFFER_APPROVAL_STATUSES)
  approvalStatus?: (typeof OFFER_APPROVAL_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Internal note, shown only to admins' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(500)
  adminNotes?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Tell the owner a deal was added to their listing',
  })
  @IsOptional()
  @IsBoolean()
  notifyProvider?: boolean;
}
