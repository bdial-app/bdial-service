import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class EnrichProvidersDto {
  @ApiProperty({
    type: [String],
    maxItems: 10,
    description: 'Provider IDs — each one can take several seconds (Google + website + images), so batches are small',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  ids: string[];
}
