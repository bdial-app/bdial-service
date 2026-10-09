import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { IST_DATE_OR_MINUTE } from '../../common/ist-range';

/** "a,b,c" (or a repeated query param) → ['a', 'b', 'c']. */
const CommaList = () =>
  Transform(({ value }) => {
    const parts = (Array.isArray(value) ? value : String(value ?? '').split(','))
      .map((v: unknown) => String(v).trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  });

const YES_NO = ['true', 'false'] as const;

/**
 * Filters for the admin provider list and its CSV export. Every filter is
 * optional and they combine with AND; list-valued ones (cities, categories)
 * match any of their values.
 */
export class AdminProviderFiltersDto {
  @ApiPropertyOptional({ description: 'Business name, owner name or mobile, business phone, area, pincode, Instagram or website' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'unverified', 'disabled'] })
  @IsOptional()
  @IsIn(['active', 'suspended', 'unverified', 'disabled', ''])
  status?: string;

  @ApiPropertyOptional({ description: 'City contains this text (older clients)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ description: 'Comma-separated cities (exact, any of)' })
  @IsOptional()
  @CommaList()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  cities?: string[];

  @ApiPropertyOptional({ description: 'Area / locality contains this text' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  area?: string;

  @ApiPropertyOptional({ description: 'One category (older clients)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Comma-separated category ids (any of)' })
  @IsOptional()
  @CommaList()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ enum: YES_NO })
  @IsOptional()
  @IsIn(YES_NO)
  isFeatured?: string;

  @ApiPropertyOptional({ enum: ['true', 'false', 'pending', 'approved'], description: 'true = declared women-led' })
  @IsOptional()
  @IsIn(['true', 'false', 'pending', 'approved'])
  isWomenLed?: string;

  @ApiPropertyOptional({ enum: YES_NO, description: 'Community verified badge' })
  @IsOptional()
  @IsIn(YES_NO)
  verified?: string;

  @ApiPropertyOptional({ enum: YES_NO, description: 'Open for business (false = shows "Closed")' })
  @IsOptional()
  @IsIn(YES_NO)
  available?: string;

  @ApiPropertyOptional({ enum: ['real', 'generated', 'none', 'missing'], description: 'missing = none or generated' })
  @IsOptional()
  @IsIn(['real', 'generated', 'none', 'missing'])
  logo?: string;

  @ApiPropertyOptional({ enum: ['has', 'none'] })
  @IsOptional()
  @IsIn(['has', 'none'])
  banner?: string;

  @ApiPropertyOptional({ enum: ['has', 'none'] })
  @IsOptional()
  @IsIn(['has', 'none'])
  products?: string;

  @ApiPropertyOptional({ enum: ['has', 'none'], description: 'Gallery photos' })
  @IsOptional()
  @IsIn(['has', 'none'])
  photos?: string;

  @ApiPropertyOptional({ enum: ['website', 'instagram', 'whatsapp', 'none'], description: 'none = no website, Instagram or WhatsApp' })
  @IsOptional()
  @IsIn(['website', 'instagram', 'whatsapp', 'none'])
  online?: string;

  @ApiPropertyOptional({ enum: ['precise', 'neighbourhood', 'approximate', 'missing'] })
  @IsOptional()
  @IsIn(['precise', 'neighbourhood', 'approximate', 'missing'])
  location?: string;

  @ApiPropertyOptional({ enum: YES_NO, description: 'Owner has signed in themselves (not just imported)' })
  @IsOptional()
  @IsIn(YES_NO)
  claimed?: string;

  @ApiPropertyOptional({ description: 'Owner seen in the app within this many days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  activeWithinDays?: number;

  @ApiPropertyOptional({ description: 'Average rating at least this (1–5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ enum: ['has', 'none'] })
  @IsOptional()
  @IsIn(['has', 'none'])
  reviews?: string;

  @ApiPropertyOptional({ description: "Added on or after: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm', India time" })
  @IsOptional()
  @Matches(IST_DATE_OR_MINUTE, { message: 'createdFrom must be YYYY-MM-DD or YYYY-MM-DDTHH:mm' })
  createdFrom?: string;

  @ApiPropertyOptional({ description: "Added on or before: 'YYYY-MM-DD' (whole day) or 'YYYY-MM-DDTHH:mm', India time" })
  @IsOptional()
  @Matches(IST_DATE_OR_MINUTE, { message: 'createdTo must be YYYY-MM-DD or YYYY-MM-DDTHH:mm' })
  createdTo?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'name', 'rating', 'reviews', 'updated'] })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'name', 'rating', 'reviews', 'updated'])
  sort?: string;
}

export class AdminProviderListDto extends AdminProviderFiltersDto {
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
}
