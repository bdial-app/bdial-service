import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchLocationDto {
  @ApiProperty({ example: 'Koregaon Park', description: 'Search query for location autocomplete' })
  @IsString()
  @MinLength(2)
  query: string;
}
