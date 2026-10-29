import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LEAD_PERIODS = ['7d', '30d', '90d', 'all'] as const;
export type LeadPeriod = (typeof LEAD_PERIODS)[number];

export const LEAD_TIERS = ['hot', 'warm', 'soft', 'cold'] as const;
export const LEAD_STATUSES = ['locked', 'unlocked'] as const;
export const LEAD_UNLOCK_METHODS = [
  'anonymous',
  'free',
  'plan',
  'quota',
  'paid',
  'unknown',
] as const;
export const LEAD_SORTS = ['recent', 'score', 'unlocked', 'checked'] as const;
export const LEAD_SOURCES = [
  'home_feed',
  'explore',
  'search',
  'direct',
  'saved',
  'chat',
  'product_link',
] as const;
export const INTERACTION_TYPES = [
  'profile_view',
  'product_view',
  'search_appearance',
  'search_click',
  'chat_initiated',
  'call_clicked',
  'direction_clicked',
  'share_clicked',
  'saved',
  'unsaved',
  'offer_viewed',
  'photo_viewed',
  'review_read',
  'tab_switched',
] as const;
const BOOL = ['true', 'false'] as const;

export class AdminLeadsPeriodDto {
  @ApiPropertyOptional({ enum: LEAD_PERIODS, default: '30d' })
  @IsOptional()
  @IsIn(LEAD_PERIODS)
  period?: LeadPeriod;
}

class PagedDto extends AdminLeadsPeriodDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Customer name or mobile, or business name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Only this business' })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}

/** GET /admin/leads — the period filters on the lead's last activity. */
export class AdminLeadListQueryDto extends PagedDto {
  @ApiPropertyOptional({ enum: LEAD_TIERS })
  @IsOptional()
  @IsIn(LEAD_TIERS)
  tier?: (typeof LEAD_TIERS)[number];

  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: (typeof LEAD_STATUSES)[number];

  @ApiPropertyOptional({
    enum: LEAD_UNLOCK_METHODS,
    description: 'unknown = unlocked before methods were recorded',
  })
  @IsOptional()
  @IsIn(LEAD_UNLOCK_METHODS)
  method?: (typeof LEAD_UNLOCK_METHODS)[number];

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'The business has opened the lead',
  })
  @IsOptional()
  @IsIn(BOOL)
  checked?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: LEAD_SOURCES })
  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: (typeof LEAD_SOURCES)[number];

  @ApiPropertyOptional({ enum: LEAD_SORTS, default: 'recent' })
  @IsOptional()
  @IsIn(LEAD_SORTS)
  sort?: (typeof LEAD_SORTS)[number];
}

/** GET /admin/leads/interactions — raw customer actions on businesses. */
export class AdminLeadInteractionQueryDto extends PagedDto {
  @ApiPropertyOptional({ enum: INTERACTION_TYPES })
  @IsOptional()
  @IsIn(INTERACTION_TYPES)
  eventType?: (typeof INTERACTION_TYPES)[number];

  @ApiPropertyOptional({
    enum: BOOL,
    description:
      'Only signed-in customers (true) or anonymous visitors (false)',
  })
  @IsOptional()
  @IsIn(BOOL)
  registered?: (typeof BOOL)[number];
}

export class AdminLeadRescoreDto {
  @ApiPropertyOptional({
    description:
      'One business; omitted = every business with activity in the last 30 days',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
