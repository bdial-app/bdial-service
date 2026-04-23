import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExploreFeedDto {
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

  @ApiPropertyOptional({ description: 'City name', example: 'Pune' })
  @IsOptional()
  @IsString()
  city?: string;
}
