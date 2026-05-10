import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestCityDto {
  @ApiProperty({ example: 'Mumbai', description: 'City name to request' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ description: 'Anonymous device identifier for throttling' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;

  @ApiPropertyOptional({ example: 'android', description: 'Platform: android, ios, or web' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @ApiPropertyOptional({ example: 'mobile', description: 'Device type: mobile, tablet, or desktop' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  deviceType?: string;

  @ApiPropertyOptional({ example: 'Android 14', description: 'OS version string' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  osVersion?: string;

  @ApiPropertyOptional({ example: '1.2.0', description: 'App version' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;

  @ApiPropertyOptional({ description: 'Latitude of the user when requesting' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of the user when requesting' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
