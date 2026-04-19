import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class ReverseGeocodeDto {
  @ApiProperty({ example: 18.5204, description: 'Latitude' })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 73.8567, description: 'Longitude' })
  @Type(() => Number)
  @IsLongitude()
  lng: number;
}
