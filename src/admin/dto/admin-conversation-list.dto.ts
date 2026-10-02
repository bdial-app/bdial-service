import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CONVERSATION_STATUS_FILTERS = [
  'active',
  'archived',
  'closed',
] as const;
export const CONVERSATION_TYPE_FILTERS = ['direct', 'enquiry'] as const;
export const CONVERSATION_CONTEXT_FILTERS = ['product', 'provider'] as const;
export const CONVERSATION_SORTS = [
  'recent',
  'oldest',
  'most_messages',
] as const;
const BOOL = ['true', 'false'] as const;

/**
 * Query for GET /admin/chat/conversations. Booleans stay strings so an absent
 * param means "don't filter".
 */
export class AdminConversationListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Participant name or mobile, or the context title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CONVERSATION_STATUS_FILTERS })
  @IsOptional()
  @IsIn(CONVERSATION_STATUS_FILTERS)
  status?: (typeof CONVERSATION_STATUS_FILTERS)[number];

  @ApiPropertyOptional({ enum: CONVERSATION_TYPE_FILTERS })
  @IsOptional()
  @IsIn(CONVERSATION_TYPE_FILTERS)
  type?: (typeof CONVERSATION_TYPE_FILTERS)[number];

  @ApiPropertyOptional({ enum: CONVERSATION_CONTEXT_FILTERS })
  @IsOptional()
  @IsIn(CONVERSATION_CONTEXT_FILTERS)
  contextType?: (typeof CONVERSATION_CONTEXT_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Started on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Started on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  /** Legacy names for createdFrom / createdTo, still sent by the admin-app. */
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Alias of createdFrom',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Alias of createdTo' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Last message on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  lastMessageFrom?: string;

  @ApiPropertyOptional({
    description: 'Last message on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  lastMessageTo?: string;

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'Has at least one admin-redacted message',
  })
  @IsOptional()
  @IsIn(BOOL)
  hasRedacted?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'Last message was sent by the customer',
  })
  @IsOptional()
  @IsIn(BOOL)
  unanswered?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'A message in the conversation has been reported',
  })
  @IsOptional()
  @IsIn(BOOL)
  reported?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'A participant has blocked the conversation',
  })
  @IsOptional()
  @IsIn(BOOL)
  blocked?: (typeof BOOL)[number];

  @ApiPropertyOptional({ description: 'At least this many messages' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minMessages?: number;

  @ApiPropertyOptional({
    description: 'No message for more than this many days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  inactiveDays?: number;

  @ApiPropertyOptional({
    description: "Exact match on the business participant's city",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: CONVERSATION_SORTS, default: 'recent' })
  @IsOptional()
  @IsIn(CONVERSATION_SORTS)
  sort?: (typeof CONVERSATION_SORTS)[number];
}
