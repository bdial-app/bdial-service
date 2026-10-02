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

export const VERIFICATION_STATUS_FILTERS = [
  'pending',
  'in_review',
  'approved',
  'rejected',
] as const;
export const VERIFICATION_AADHAAR_FILTERS = [
  'pending',
  'approved',
  'rejected',
] as const;
export const VERIFICATION_IJAMAT_FILTERS = [
  'pending',
  'approved',
  'rejected',
  'not_submitted',
] as const;
export const VERIFICATION_SORTS = [
  'oldest',
  'newest',
  'waiting_longest',
] as const;
const BOOL = ['true', 'false'] as const;

/**
 * Query for GET /admin/verifications. `status` is the overall review status;
 * the Aadhaar and iJamat documents each have their own filter.
 */
export class AdminVerificationListQueryDto {
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

  /** Legacy name for `limit`, still sent by the current admin-app. */
  @ApiPropertyOptional({ deprecated: true, description: 'Alias of `limit`' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  rows?: number;

  @ApiPropertyOptional({ description: 'Applicant name or mobile' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: VERIFICATION_STATUS_FILTERS,
    description: 'Overall review status',
  })
  @IsOptional()
  @IsIn(VERIFICATION_STATUS_FILTERS)
  status?: (typeof VERIFICATION_STATUS_FILTERS)[number];

  @ApiPropertyOptional({ enum: VERIFICATION_AADHAAR_FILTERS })
  @IsOptional()
  @IsIn(VERIFICATION_AADHAAR_FILTERS)
  aadhaar?: (typeof VERIFICATION_AADHAAR_FILTERS)[number];

  @ApiPropertyOptional({ enum: VERIFICATION_IJAMAT_FILTERS })
  @IsOptional()
  @IsIn(VERIFICATION_IJAMAT_FILTERS)
  ijamat?: (typeof VERIFICATION_IJAMAT_FILTERS)[number];

  @ApiPropertyOptional({ description: 'Submitted on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  submittedFrom?: string;

  @ApiPropertyOptional({
    description: 'Submitted on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  submittedTo?: string;

  @ApiPropertyOptional({ description: 'Reviewed on or after (ISO date)' })
  @IsOptional()
  @IsISO8601()
  reviewedFrom?: string;

  @ApiPropertyOptional({
    description: 'Reviewed on or before (ISO date, inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  reviewedTo?: string;

  @ApiPropertyOptional({
    description: 'Still undecided and submitted more than this many days ago',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  waitingDays?: number;

  @ApiPropertyOptional({
    description: "Exact match on the applicant's city, case-insensitive",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    enum: BOOL,
    description: 'Applicant owns a (non-deleted) business listing',
  })
  @IsOptional()
  @IsIn(BOOL)
  hasProvider?: (typeof BOOL)[number];

  @ApiPropertyOptional({ description: 'Reviewed by this admin (user id)' })
  @IsOptional()
  @IsUUID()
  reviewer?: string;

  @ApiPropertyOptional({ enum: VERIFICATION_SORTS, default: 'oldest' })
  @IsOptional()
  @IsIn(VERIFICATION_SORTS)
  sort?: (typeof VERIFICATION_SORTS)[number];
}
