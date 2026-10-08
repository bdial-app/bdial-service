import {
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const CATALOG_SORTS = [
  'recommended',
  'popular',
  'nearest',
  'price_low',
  'price_high',
  'newest',
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_AREAS = ['nearby', 'city', 'all'] as const;
export type CatalogArea = (typeof CATALOG_AREAS)[number];

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

/** Location context shared by every catalog endpoint. */
class CatalogLocationDto {
  @ApiPropertyOptional({ description: 'User latitude', example: 18.5204 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'User longitude', example: 73.8567 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: 'City name', example: 'Pune' })
  @IsOptional()
  @IsString()
  city?: string;
}

export class CatalogShelvesDto extends CatalogLocationDto {
  @ApiPropertyOptional({ enum: ['product', 'service'], default: 'product' })
  @IsOptional()
  @IsIn(['product', 'service'])
  type?: 'product' | 'service' = 'product';
}

export class CatalogBrowseDto extends CatalogLocationDto {
  @ApiPropertyOptional({ enum: ['product', 'service'], default: 'product' })
  @IsOptional()
  @IsIn(['product', 'service'])
  type?: 'product' | 'service' = 'product';

  @ApiPropertyOptional({
    description: 'Category (any level) — includes its sub-categories',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Several categories (comma-separated, any level) — e.g. a home collection',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    (Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : []
    )
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean),
  )
  @IsUUID('all', { each: true })
  @ArrayMaxSize(40)
  categoryIds?: string[];

  @ApiPropertyOptional({ enum: CATALOG_SORTS, default: 'recommended' })
  @IsOptional()
  @IsIn(CATALOG_SORTS as unknown as string[])
  sort?: CatalogSort = 'recommended';

  @ApiPropertyOptional({
    enum: CATALOG_AREAS,
    default: 'all',
    description: 'nearby = 10 km, city = 50 km (or city match), all = anywhere',
  })
  @IsOptional()
  @IsIn(CATALOG_AREAS as unknown as string[])
  area?: CatalogArea = 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Only sellers with an average rating at or above this',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Only verified sellers' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Only women-led sellers' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  womenLed?: boolean;

  @ApiPropertyOptional({ description: 'Only items that show a price' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  priced?: boolean;

  @ApiPropertyOptional({ description: 'Only hero / featured items' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class SimilarProductsDto extends CatalogLocationDto {
  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 12;
}
