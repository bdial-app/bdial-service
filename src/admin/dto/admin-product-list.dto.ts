import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PRODUCT_TYPE_FILTERS = ['product', 'service'] as const;
export const PRODUCT_PROVIDER_STATUS_FILTERS = [
  'unverified',
  'active',
  'suspended',
  'disabled',
] as const;
export const PRODUCT_SORTS = [
  'name_asc',
  'name_desc',
  'price_asc',
  'price_desc',
  'display_order',
] as const;
const BOOL = ['true', 'false'] as const;

/**
 * Query for GET /admin/products. Booleans stay strings ('true' | 'false') so
 * an absent param means "don't filter", never "false".
 */
export class AdminProductListQueryDto {
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

  @ApiPropertyOptional({ description: 'Name, description or business name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  isActive?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: PRODUCT_TYPE_FILTERS })
  @IsOptional()
  @IsIn(PRODUCT_TYPE_FILTERS)
  productType?: (typeof PRODUCT_TYPE_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Price at least' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Price at most' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ enum: BOOL, description: 'Has at least one photo' })
  @IsOptional()
  @IsIn(BOOL)
  hasImages?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: BOOL, description: 'Has a price set' })
  @IsOptional()
  @IsIn(BOOL)
  hasPrice?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  isHero?: (typeof BOOL)[number];

  @ApiPropertyOptional({ description: 'Product category id' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Exact match on the business's city, case-insensitive",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    enum: PRODUCT_PROVIDER_STATUS_FILTERS,
    description: 'Status of the owning business',
  })
  @IsOptional()
  @IsIn(PRODUCT_PROVIDER_STATUS_FILTERS)
  providerStatus?: (typeof PRODUCT_PROVIDER_STATUS_FILTERS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: 'display_order' })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: (typeof PRODUCT_SORTS)[number];

  /** Legacy pair the current admin-app still sends; folded into `sort`. */
  @ApiPropertyOptional({
    deprecated: true,
    enum: ['name', 'price', 'displayOrder'],
    description: 'Legacy — use `sort`',
  })
  @IsOptional()
  @IsIn(['name', 'price', 'displayOrder', 'createdAt'])
  sortBy?: 'name' | 'price' | 'displayOrder' | 'createdAt';

  @ApiPropertyOptional({
    deprecated: true,
    enum: ['asc', 'desc', 'ASC', 'DESC'],
    description: 'Legacy — use `sort`',
  })
  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
