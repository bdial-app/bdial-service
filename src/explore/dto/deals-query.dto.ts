import { IsOptional, IsNumber, IsString, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DealsQueryDto {
  @ApiPropertyOptional({ description: 'User latitude', example: 18.9647 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'User longitude', example: 72.8358 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'Search radius in km (use 0 for all areas)', example: 25, default: 25 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ description: 'City name', example: 'Pune' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Category ID filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Discount type filter', enum: ['percentage', 'flat'] })
  @IsOptional()
  @IsIn(['percentage', 'flat'])
  discountType?: 'percentage' | 'flat';

  @ApiPropertyOptional({ description: 'Minimum discount value', example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minDiscount?: number;

  @ApiPropertyOptional({ description: 'Only show verified providers', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Minimum provider rating', example: 4 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Only show deals ending within 7 days', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  endingSoon?: boolean;

  @ApiPropertyOptional({ description: 'Only show women-led businesses', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  womenLed?: boolean;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['discount', 'ending_soon', 'distance', 'newest'],
    default: 'discount',
  })
  @IsOptional()
  @IsIn(['discount', 'ending_soon', 'distance', 'newest'])
  sort?: 'discount' | 'ending_soon' | 'distance' | 'newest';
}
