import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { IsEnum, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ReviewStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  flagged = 'flagged',
  active = 'active',
  removed = 'removed',
}

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}

export class CreateReviewDto {
  @ApiProperty({ example: 'uuid-of-provider' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  starRating!: number;

  @ApiPropertyOptional({ example: 'Excellent work!' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(2000)
  reviewText?: string;
}

export class ReportReviewDto {
  @ApiPropertyOptional({ example: 'This review is fake' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(500)
  reason?: string;
}
