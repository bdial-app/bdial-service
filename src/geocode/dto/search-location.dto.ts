import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class SearchLocationDto {
  @ApiProperty({ example: 'Koregaon Park', description: 'Search query for location autocomplete' })
  @IsString()
  @MinLength(2)
  query: string;

  @ApiPropertyOptional({ description: 'Session token to bundle autocomplete + place details billing' })
  @IsString()
  @IsOptional()
  sessionToken?: string;
}
