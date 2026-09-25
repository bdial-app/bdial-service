import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class ImageCandidateRowDto {
  @ApiProperty({ description: 'Caller-side row id, echoed back so results can be matched' })
  @IsString()
  @MaxLength(64)
  rowId: string;

  @ApiPropertyOptional({ description: 'Handle, @handle or profile URL from the sheet' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  @ApiPropertyOptional({ description: 'Website from the sheet' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}

export class ImageCandidatesDto {
  @ApiProperty({ type: [ImageCandidateRowDto], maxItems: 10 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImageCandidateRowDto)
  rows: ImageCandidateRowDto[];
}
