import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString, IsString } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Filter by unlock status', enum: ['unlocked', 'locked'] })
  @IsOptional()
  @IsEnum(['unlocked', 'locked'])
  status?: 'unlocked' | 'locked';

  @ApiPropertyOptional({ description: 'Filter by lead source', enum: ['home_feed', 'explore', 'search', 'direct', 'saved', 'chat', 'product_link'] })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filter leads seen on or after this date (ISO)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter leads seen on or before this date (ISO)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Minimum lead score' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Maximum lead score' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['score', 'lastSeen', 'firstSeen', 'duration'] })
  @IsOptional()
  @IsEnum(['score', 'lastSeen', 'firstSeen', 'duration'])
  sortBy?: 'score' | 'lastSeen' | 'firstSeen' | 'duration';

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Search leads by visitor name' })
  @IsOptional()
  @IsString()
  search?: string;
}
