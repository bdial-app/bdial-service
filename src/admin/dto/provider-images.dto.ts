import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';

/** Image links taken from a spreadsheet — Google Drive and Dropbox share links are accepted. */
export class ImportProviderImageUrlsDto {
  @ApiPropertyOptional({ example: 'https://drive.google.com/open?id=1AbC...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://drive.google.com/file/d/1XyZ.../view' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bannerUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Gallery photo links (a provider can hold 10 in total)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  galleryUrls?: string[];
}
