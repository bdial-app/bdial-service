import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const REVIEW_STATUS_FILTERS = ['active', 'removed', 'flagged'] as const;
export const REVIEW_SOURCES = ['app', 'link', 'admin'] as const;
export const REVIEW_SORTS = ['recent', 'oldest', 'lowest', 'highest'] as const;
const BOOL = ['true', 'false'] as const;

/**
 * Query for GET /admin/reviews. Booleans stay strings so an absent param means
 * "don't filter".
 */
export class AdminReviewListQueryDto {
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
    description: 'Reviewer name or mobile, business name, review or reply text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: REVIEW_STATUS_FILTERS })
  @IsOptional()
  @IsIn(REVIEW_STATUS_FILTERS)
  status?: (typeof REVIEW_STATUS_FILTERS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({ description: 'Posted on or after (IST day)' })
  @IsOptional()
  @IsISO8601()
  postedFrom?: string;

  @ApiPropertyOptional({ description: 'Posted on or before (IST day)' })
  @IsOptional()
  @IsISO8601()
  postedTo?: string;

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  hasPhotos?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: BOOL, description: 'The owner has replied' })
  @IsOptional()
  @IsIn(BOOL)
  hasReply?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'Has written text, not just stars',
  })
  @IsOptional()
  @IsIn(BOOL)
  hasText?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: BOOL, description: 'Has an open report' })
  @IsOptional()
  @IsIn(BOOL)
  reported?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: REVIEW_SOURCES })
  @IsOptional()
  @IsIn(REVIEW_SOURCES)
  source?: (typeof REVIEW_SOURCES)[number];

  @ApiPropertyOptional({ description: 'Business city' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ enum: REVIEW_SORTS, default: 'recent' })
  @IsOptional()
  @IsIn(REVIEW_SORTS)
  sort?: (typeof REVIEW_SORTS)[number];
}

export class AdminReviewStatusDto {
  @IsIn(['active', 'removed'])
  status: 'active' | 'removed';

  /** Why, for the audit log. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
