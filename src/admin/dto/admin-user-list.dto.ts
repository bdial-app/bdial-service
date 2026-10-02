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

export const USER_STATUS_FILTERS = [
  'active',
  'suspended',
  'paused',
  'deleted',
] as const;
export const USER_ROLE_FILTERS = [
  'customer',
  'associate',
  'moderator',
  'admin',
  'super_admin',
  'staff',
] as const;
export const USER_GENDER_FILTERS = ['male', 'female', 'other'] as const;
export const USER_PROVIDER_STATUS_FILTERS = [
  'unverified',
  'active',
  'suspended',
  'disabled',
] as const;
/** `seen_*`: last seen within the window. `inactive_30d`: seen, but not for 30+ days. `never`: no heartbeat on record. */
export const USER_ACTIVITY_FILTERS = [
  'seen_24h',
  'seen_7d',
  'seen_30d',
  'inactive_30d',
  'never',
] as const;
export const USER_PUSH_FILTERS = ['enabled', 'android', 'ios', 'none'] as const;
export const USER_ENGAGEMENT_FILTERS = [
  'reviewed',
  'saved',
  'chatted',
  'invited',
  'none',
] as const;
export const USER_SORTS = ['newest', 'oldest', 'last_seen', 'name'] as const;
const BOOL = ['true', 'false'] as const;

/**
 * Query for GET /admin/users. Booleans stay strings ('true' | 'false') so an
 * absent param means "don't filter", never "false".
 */
export class AdminUserListQueryDto {
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

  @ApiPropertyOptional({ description: 'Name, mobile or email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: USER_STATUS_FILTERS })
  @IsOptional()
  @IsIn(USER_STATUS_FILTERS)
  status?: (typeof USER_STATUS_FILTERS)[number];

  @ApiPropertyOptional({
    enum: USER_ROLE_FILTERS,
    description: "'staff' = any admin role",
  })
  @IsOptional()
  @IsIn(USER_ROLE_FILTERS)
  role?: (typeof USER_ROLE_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Exact city, case-insensitive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'Owns a (non-deleted) business listing',
  })
  @IsOptional()
  @IsIn(BOOL)
  hasProvider?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    enum: USER_PROVIDER_STATUS_FILTERS,
    description: "Status of the user's business",
  })
  @IsOptional()
  @IsIn(USER_PROVIDER_STATUS_FILTERS)
  providerStatus?: (typeof USER_PROVIDER_STATUS_FILTERS)[number];

  @ApiPropertyOptional({ enum: USER_GENDER_FILTERS })
  @IsOptional()
  @IsIn(USER_GENDER_FILTERS)
  gender?: (typeof USER_GENDER_FILTERS)[number];

  @ApiPropertyOptional({
    enum: ['customer', 'provider'],
    description: 'Mode the user last chose in the app',
  })
  @IsOptional()
  @IsIn(['customer', 'provider'])
  mode?: 'customer' | 'provider';

  @ApiPropertyOptional({ enum: USER_ACTIVITY_FILTERS })
  @IsOptional()
  @IsIn(USER_ACTIVITY_FILTERS)
  activity?: (typeof USER_ACTIVITY_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Joined on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  joinedFrom?: string;

  @ApiPropertyOptional({
    description: 'Joined on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  joinedTo?: string;

  @ApiPropertyOptional({
    enum: USER_PUSH_FILTERS,
    description: 'Active push token',
  })
  @IsOptional()
  @IsIn(USER_PUSH_FILTERS)
  push?: (typeof USER_PUSH_FILTERS)[number];

  @ApiPropertyOptional({ enum: BOOL })
  @IsOptional()
  @IsIn(BOOL)
  hasEmail?: (typeof BOOL)[number];

  @ApiPropertyOptional({ enum: BOOL, description: 'Has map coordinates' })
  @IsOptional()
  @IsIn(BOOL)
  hasLocation?: (typeof BOOL)[number];

  @ApiPropertyOptional({
    enum: USER_ENGAGEMENT_FILTERS,
    description: "'none' = none of the other four",
  })
  @IsOptional()
  @IsIn(USER_ENGAGEMENT_FILTERS)
  engagement?: (typeof USER_ENGAGEMENT_FILTERS)[number];

  @ApiPropertyOptional({ enum: USER_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(USER_SORTS)
  sort?: (typeof USER_SORTS)[number];
}
