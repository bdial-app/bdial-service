import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsInt, Min, Max, IsString, IsEnum, IsArray, IsUUID, IsNumber, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class NearbyProvidersDto {
  @ApiPropertyOptional({ example: 18.5204, description: 'User latitude (optional — omit for city-only browsing)' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 73.8567, description: 'User longitude (optional — omit for city-only browsing)' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: 10, description: 'Radius in km (default 10, max 100)' })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  radius?: number = 10;

  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'beauty', description: 'Search by brand name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Mumbai', description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['distance', 'rating', 'newest', 'reviews'], default: 'distance', description: 'Sort order' })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'newest', 'reviews'])
  sortBy?: 'distance' | 'rating' | 'newest' | 'reviews' = 'distance';

  @ApiPropertyOptional({ description: 'Filter by category IDs', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ example: 4, description: 'Minimum average rating (0-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Only show verified (active) providers' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only show women-led providers' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  womenLedOnly?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Only show providers created within the last N days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  sinceDays?: number;
}
