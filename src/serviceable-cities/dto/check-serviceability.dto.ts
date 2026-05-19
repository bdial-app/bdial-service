import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckServiceabilityDto {
  @ApiPropertyOptional({ example: 'Pune', description: 'City name from reverse geocode' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 18.5204, description: 'User latitude for proximity fallback' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 73.8567, description: 'User longitude for proximity fallback' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}
