import { IsEnum, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum BugCategory {
  CRASH = 'crash',
  UI_ISSUE = 'ui_issue',
  FEATURE_NOT_WORKING = 'feature_not_working',
  PERFORMANCE = 'performance',
  LOGIN_AUTH = 'login_auth',
  PAYMENT = 'payment',
  OTHER = 'other',
}

export class CreateBugReportDto {
  @ApiProperty({ enum: BugCategory })
  @IsEnum(BugCategory)
  category: BugCategory;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(10, { message: 'Please describe the bug in at least 10 characters.' })
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiPropertyOptional({ description: 'Steps to reproduce the bug', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  stepsToReproduce?: string;

  @ApiPropertyOptional({ description: 'Device and app version info', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  deviceInfo?: string;
}
