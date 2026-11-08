import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Query for GET /admin/dashboard/period. Dates are IST calendar days,
 * inclusive. No `from` means "since the first record" (all time).
 */
export class DashboardPeriodQueryDto {
  @ApiPropertyOptional({
    description: 'YYYY-MM-DD, inclusive. Omit for all time.',
  })
  @IsOptional()
  @Matches(YMD, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    description: 'YYYY-MM-DD, inclusive. Default: today (IST).',
  })
  @IsOptional()
  @Matches(YMD, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: 'Add the totals of the period of equal length just before',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  compare?: 'true' | 'false';
}
