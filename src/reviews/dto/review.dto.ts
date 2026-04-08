import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional, IsNotEmpty } from 'class-validator';
import { IsEnum } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}

export class CreateReviewDto {
  @ApiProperty({ example: 'uuid-of-listing' })
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  starRating!: number;

  @ApiPropertyOptional({ example: 'Excellent work!' })
  @IsOptional()
  @IsString()
  reviewText?: string;
}

export class ReportReviewDto {
  @ApiPropertyOptional({ example: 'This review is fake' })
  @IsOptional()
  @IsString()
  reason?: string;
}
