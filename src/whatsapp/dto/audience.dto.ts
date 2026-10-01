import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
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
import type {
  AudienceFilters,
  ConsentFilter,
  ProviderStatusFilter,
  TrustLevelFilter,
  VerificationFilter,
} from '../whatsapp.types';
import { WHATSAPP_CONSENT_VALUES } from '../../entities/whatsapp-contact.entity';
import type { WhatsAppConsent } from '../../entities/whatsapp-contact.entity';

const PROVIDER_STATUSES: ProviderStatusFilter[] = [
  'unverified',
  'active',
  'suspended',
  'disabled',
];
const TRUST_LEVELS: TrustLevelFilter[] = [
  'unverified',
  'basic',
  'verified',
  'trusted',
];
const VERIFICATIONS: VerificationFilter[] = [
  'none',
  'pending',
  'in_review',
  'approved',
  'rejected',
];
const CONSENTS: ConsentFilter[] = ['any', 'opted_in', 'not_opted_out'];

export class AudienceFiltersDto implements AudienceFilters {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  cities?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(200)
  categoryIds?: string[];

  @ApiPropertyOptional({ enum: PROVIDER_STATUSES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(PROVIDER_STATUSES, { each: true })
  statuses?: ProviderStatusFilter[];

  @ApiPropertyOptional({ enum: TRUST_LEVELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(TRUST_LEVELS, { each: true })
  trustLevels?: TrustLevelFilter[];

  @ApiPropertyOptional({ enum: VERIFICATIONS })
  @IsOptional()
  @IsIn(VERIFICATIONS)
  verification?: VerificationFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  womenLed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  createdWithinDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  createdBeforeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  inactiveDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  missingLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  missingProducts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  notContactedDays?: number;

  @ApiPropertyOptional({ enum: CONSENTS, default: 'not_opted_out' })
  @IsOptional()
  @IsIn(CONSENTS)
  consent?: ConsentFilter;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  reachableOnly?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(5000)
  providerIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5000)
  phones?: string[];

  @ApiPropertyOptional({ enum: ['filters', 'manual'], default: 'filters' })
  @IsOptional()
  @IsIn(['filters', 'manual'])
  mode?: 'filters' | 'manual';
}

export class AudiencePreviewDto {
  @ApiProperty({ type: AudienceFiltersDto })
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  filters: AudienceFiltersDto;

  @ApiPropertyOptional({ enum: ['marketing', 'utility'] })
  @IsOptional()
  @IsIn(['marketing', 'utility'])
  templateCategory?: 'marketing' | 'utility';
}

export class ContactsQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: WHATSAPP_CONSENT_VALUES })
  @IsOptional()
  @IsIn(WHATSAPP_CONSENT_VALUES)
  consent?: WhatsAppConsent;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: '"true" | "false"' })
  @IsOptional()
  @IsIn(['true', 'false'])
  hasProvider?: 'true' | 'false';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;
}

export class PatchContactDto {
  @ApiPropertyOptional({ enum: WHATSAPP_CONSENT_VALUES })
  @IsOptional()
  @IsIn(WHATSAPP_CONSENT_VALUES)
  consent?: WhatsAppConsent;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @ArrayMaxSize(50)
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpsertSegmentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: AudienceFiltersDto })
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  filters: AudienceFiltersDto;
}
