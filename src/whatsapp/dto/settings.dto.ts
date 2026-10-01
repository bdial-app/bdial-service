import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RatesDto {
  @ApiPropertyOptional({ example: 0.8631 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  marketing?: number;

  @ApiPropertyOptional({ example: 0.115 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  utility?: number;

  @ApiPropertyOptional({ example: 0.115 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  authentication?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  service?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Our own unique-recipients/24h ceiling' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  dailyCap?: number;

  @ApiPropertyOptional({ description: 'Default campaign throttle' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  ratePerMinute?: number;

  @ApiPropertyOptional({ description: 'Hour (IST) sending may start' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  sendWindowStart?: number;

  @ApiPropertyOptional({ description: 'Hour (IST) sending stops' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  sendWindowEnd?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  optOutKeywords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  optInKeywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireOptInForMarketing?: boolean;

  @ApiPropertyOptional({ type: RatesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RatesDto)
  rates?: RatesDto;
}

export class SettingsTestSendDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description: 'Local template id; defaults to hello_world',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Free text (only inside an open 24h window)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  text?: string;
}
