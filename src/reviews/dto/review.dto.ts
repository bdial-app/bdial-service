import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'uuid-of-listing' })
  @IsString()
  listingId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  starRating: number;

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
