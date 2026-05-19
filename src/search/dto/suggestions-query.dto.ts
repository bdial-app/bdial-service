import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsLatitude, IsLongitude, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SuggestionsQueryDto {
  @ApiProperty({ example: 'bea', description: 'Autocomplete query (min 1 char)' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ example: 18.5204 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 73.8567 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: 8, default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
