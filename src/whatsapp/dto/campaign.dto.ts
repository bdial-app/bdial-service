import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AudienceFiltersDto } from './audience.dto';
import {
  WHATSAPP_CAMPAIGN_STATUS_VALUES,
  WHATSAPP_HEADER_MEDIA_SOURCES,
} from '../../entities/whatsapp-campaign.entity';
import type { WhatsAppHeaderMediaSource } from '../../entities/whatsapp-campaign.entity';
import type {
  WhatsAppCampaignStatus,
  WhatsAppVariableMapping,
} from '../../entities/whatsapp-campaign.entity';
import { WHATSAPP_MESSAGE_STATUS_VALUES } from '../../entities/whatsapp-message.entity';
import type { WhatsAppMessageStatus } from '../../entities/whatsapp-message.entity';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsUUID()
  templateId: string;

  @ApiProperty({ type: AudienceFiltersDto })
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  audience: AudienceFiltersDto;

  @ApiPropertyOptional({
    example: {
      '1': { source: 'brand_name' },
      '2': { source: 'custom', value: '20% off' },
    },
  })
  @IsOptional()
  @IsObject()
  variableMapping?: WhatsAppVariableMapping;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  headerMediaUrl?: string;

  @ApiPropertyOptional({
    enum: WHATSAPP_HEADER_MEDIA_SOURCES,
    description:
      "Image header: 'fixed' sends headerMediaUrl to everyone; 'provider_logo' sends each business its own logo card",
  })
  @IsOptional()
  @IsIn(WHATSAPP_HEADER_MEDIA_SOURCES)
  headerMediaSource?: WhatsAppHeaderMediaSource;

  @ApiPropertyOptional({ example: { '0': { source: 'profile_url' } } })
  @IsOptional()
  @IsObject()
  buttonUrlParams?: WhatsAppVariableMapping;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  ratePerMinute?: number;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ type: AudienceFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  audience?: AudienceFiltersDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variableMapping?: WhatsAppVariableMapping;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  headerMediaUrl?: string | null;

  @ApiPropertyOptional({
    enum: WHATSAPP_HEADER_MEDIA_SOURCES,
    description:
      "Image header: 'fixed' sends headerMediaUrl to everyone; 'provider_logo' sends each business its own logo card",
  })
  @IsOptional()
  @IsIn(WHATSAPP_HEADER_MEDIA_SOURCES)
  headerMediaSource?: WhatsAppHeaderMediaSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  buttonUrlParams?: WhatsAppVariableMapping | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  ratePerMinute?: number | null;
}

export class SendCampaignDto {
  @ApiPropertyOptional({ description: 'ISO datetime; omit to send now' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class CampaignTestSendDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MaxLength(20)
  phone: string;
}

export class CampaignListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ enum: WHATSAPP_CAMPAIGN_STATUS_VALUES })
  @IsOptional()
  @IsEnum(WHATSAPP_CAMPAIGN_STATUS_VALUES)
  status?: WhatsAppCampaignStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CampaignMessagesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ enum: WHATSAPP_MESSAGE_STATUS_VALUES })
  @IsOptional()
  @IsEnum(WHATSAPP_MESSAGE_STATUS_VALUES)
  status?: WhatsAppMessageStatus;

  @ApiPropertyOptional({ description: 'phone or brand name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
