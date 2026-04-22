import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsInt, Min, Max, IsString, IsEnum, IsArray, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class NearbyProvidersDto {
  @ApiProperty({ example: 18.5204, description: 'User latitude' })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 73.8567, description: 'User longitude' })
  @Type(() => Number)
  @IsLongitude()
  lng: number;

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

  @ApiPropertyOptional({ enum: ['distance', 'rating', 'newest'], default: 'distance', description: 'Sort order' })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'newest'])
  sortBy?: 'distance' | 'rating' | 'newest' = 'distance';

  @ApiPropertyOptional({ description: 'Filter by category IDs', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
