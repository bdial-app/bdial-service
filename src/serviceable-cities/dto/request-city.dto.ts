import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

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
}
