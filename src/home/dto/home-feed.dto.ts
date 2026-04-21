import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HomeFeedDto {
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

  @ApiPropertyOptional({ description: 'City name for fallback filtering', example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;
}
