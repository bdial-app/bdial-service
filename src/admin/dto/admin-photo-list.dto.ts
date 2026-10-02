import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PHOTO_TYPE_FILTERS = ['provider', 'review', 'product'] as const;
export const PHOTO_PROVIDER_STATUS_FILTERS = [
  'unverified',
  'active',
  'suspended',
  'disabled',
] as const;
export const PHOTO_SORTS = ['newest', 'oldest'] as const;

/** Query for GET /admin/photos — one grid over gallery, review and product photos. */
export class AdminPhotoListQueryDto {
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

  @ApiPropertyOptional({ enum: PHOTO_TYPE_FILTERS })
  @IsOptional()
  @IsIn(PHOTO_TYPE_FILTERS)
  type?: (typeof PHOTO_TYPE_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Business name or product name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: "Exact match on the business's city, case-insensitive",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: PHOTO_PROVIDER_STATUS_FILTERS })
  @IsOptional()
  @IsIn(PHOTO_PROVIDER_STATUS_FILTERS)
  providerStatus?: (typeof PHOTO_PROVIDER_STATUS_FILTERS)[number];

  @ApiPropertyOptional({
    description:
      'Uploaded on or after (ISO date). Only gallery photos carry a date; the rest drop out when this is set.',
  })
  @IsOptional()
  @IsISO8601()
  uploadedFrom?: string;

  @ApiPropertyOptional({
    description: 'Uploaded on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  uploadedTo?: string;

  @ApiPropertyOptional({
    enum: PHOTO_SORTS,
    default: 'newest',
    description: 'Rows without a date sort last either way',
  })
  @IsOptional()
  @IsIn(PHOTO_SORTS)
  sort?: (typeof PHOTO_SORTS)[number];
}
