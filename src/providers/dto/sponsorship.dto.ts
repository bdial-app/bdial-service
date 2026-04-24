import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsInt,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSponsorshipDto {
  @ApiProperty({ enum: ['carousel', 'inline', 'top_result'], example: 'carousel' })
  @IsEnum(['carousel', 'inline', 'top_result'])
  type: 'carousel' | 'inline' | 'top_result';

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  budgetAmount: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  costPerClick?: number;

  @ApiPropertyOptional({ example: ['uuid-cat-1'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetCategoryIds?: string[];

  @ApiPropertyOptional({ example: ['Mumbai', 'Pune'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCities?: string[];

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetRadius?: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  endsAt: string;
}

export class UpdateSponsorshipDto {
  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  budgetAmount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
