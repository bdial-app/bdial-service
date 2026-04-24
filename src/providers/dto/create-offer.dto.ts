import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @ApiProperty({ example: '20% off all services' })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ example: 'Valid on orders above ₹500' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['percentage', 'flat'], example: 'percentage' })
  @IsEnum(['percentage', 'flat'])
  discountType: 'percentage' | 'flat';

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discountValue: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;
}
