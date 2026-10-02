import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
} from 'class-validator';

/**
 * A review entered by an admin — typically feedback collected offline or
 * carried over from an older system. The reviewer is optional because the
 * column is nullable, but naming one keeps the review attributable.
 */
export class AdminCreateReviewDto {
  @ApiProperty({ description: 'The business being reviewed' })
  @IsUUID()
  providerId: string;

  @ApiPropertyOptional({
    description:
      'The user this review belongs to. Omit for an unattributed entry.',
  })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  starRating: number;

  @ApiPropertyOptional({ example: 'Excellent service, delivered on time.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewText?: string;

  @ApiPropertyOptional({
    description: 'When the feedback was originally given. Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  postedAt?: string;
}
