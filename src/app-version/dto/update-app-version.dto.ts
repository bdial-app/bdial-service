import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VERSION_PATTERN } from '../app-version.constants';

const VERSION_MESSAGE = 'must look like 1.2.3';

export class PlatformVersionDto {
  @ApiProperty({
    example: '1.0.3',
    description: 'The version currently live in the store',
  })
  @IsString()
  @Matches(VERSION_PATTERN, { message: `latestVersion ${VERSION_MESSAGE}` })
  latestVersion: string;

  @ApiProperty({
    example: '1.0.0',
    description: 'Anything older is blocked until it updates',
  })
  @IsString()
  @Matches(VERSION_PATTERN, { message: `minVersion ${VERSION_MESSAGE}` })
  minVersion: string;

  @ApiPropertyOptional({ example: 'Faster search and a new Deals tab.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  releaseNotes?: string | null;
}

export class UpdateAppVersionDto {
  @ApiProperty({ type: PlatformVersionDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PlatformVersionDto)
  android: PlatformVersionDto;

  @ApiProperty({ type: PlatformVersionDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PlatformVersionDto)
  ios: PlatformVersionDto;
}
