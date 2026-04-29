import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsOptional,
  IsLatitude,
  IsLongitude,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ example: 'beauty', description: 'Search query' })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({ example: 18.5204 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 73.8567 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: 25, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  radius?: number = 25;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: ['all', 'providers', 'products', 'categories', 'services'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['all', 'providers', 'products', 'categories', 'services'])
  type?: 'all' | 'providers' | 'products' | 'categories' | 'services' = 'all';

  @ApiPropertyOptional({ description: 'Filter by category IDs (comma-separated or array)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (Array.isArray(value)) return value;
    return [value];
  })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    enum: ['relevance', 'distance', 'rating', 'newest'],
    default: 'relevance',
  })
  @IsOptional()
  @IsEnum(['relevance', 'distance', 'rating', 'newest'])
  sortBy?: 'relevance' | 'distance' | 'rating' | 'newest' = 'relevance';

  @ApiPropertyOptional({ example: 4, description: 'Minimum average rating (1-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;
}
