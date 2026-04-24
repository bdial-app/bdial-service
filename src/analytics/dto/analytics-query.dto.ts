import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsSummaryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '7d' })
  @IsOptional()
  @IsEnum(['7d', '30d', '90d'])
  period?: '7d' | '30d' | '90d';
}

export class LeadsQueryDto {
  @ApiPropertyOptional({ enum: ['hot', 'warm', 'soft', 'cold'] })
  @IsOptional()
  @IsEnum(['hot', 'warm', 'soft', 'cold'])
  tier?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
