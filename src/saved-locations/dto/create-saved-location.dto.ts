import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsLatitude, IsLongitude, MaxLength, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSavedLocationDto {
  @ApiPropertyOptional({ enum: ['home', 'work', 'other'], default: 'other' })
  @IsOptional()
  @IsEnum(['home', 'work', 'other'])
  title?: string;

  @ApiProperty({ example: 'Koregaon Park, Pune' })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiProperty({ example: 18.5362 })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 73.8939 })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: 'Pune' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Koregaon Park' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Koregaon Park, Pune' })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({ example: 'ChIJ2w9...' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  placeId?: string;
}
