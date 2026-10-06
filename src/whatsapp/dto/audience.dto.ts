import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type {
  AudienceFilters,
  AudienceOrder,
  AudienceType,
  YesNo,
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
const AUDIENCE_TYPES: AudienceType[] = ['businesses', 'customers', 'both'];
const AUDIENCE_ORDERS: AudienceOrder[] = ['newest', 'oldest', 'random'];
const YES_NO: YesNo[] = ['yes', 'no'];

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

  @ApiPropertyOptional({
    enum: ['approximate', 'exact'],
    description: 'approximate = city-centre pin or none',
  })
  @IsOptional()
  @IsIn(['approximate', 'exact'])
  locationPrecision?: 'approximate' | 'exact';

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

  @ApiPropertyOptional({ enum: AUDIENCE_TYPES, default: 'businesses' })
  @IsOptional()
  @IsIn(AUDIENCE_TYPES)
  audienceType?: AudienceType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(300)
  areas?: string[];

  @ApiPropertyOptional({ enum: YES_NO })
  @IsOptional()
  @IsIn(YES_NO)
  ownerSignedIn?: YesNo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  activeWithinDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  minProducts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  maxProducts?: number;

  @ApiPropertyOptional({ enum: YES_NO })
  @IsOptional()
  @IsIn(YES_NO)
  googleLinked?: YesNo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ enum: YES_NO })
  @IsOptional()
  @IsIn(YES_NO)
  paidPlan?: YesNo;

  @ApiPropertyOptional({ enum: YES_NO })
  @IsOptional()
  @IsIn(YES_NO)
  everContacted?: YesNo;

  @ApiPropertyOptional({ enum: YES_NO })
  @IsOptional()
  @IsIn(YES_NO)
  repliedEver?: YesNo;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(100)
  receivedCampaignIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(100)
  notReceivedCampaignIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @ArrayMaxSize(50)
  contactTags?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  customerSignedInOnly?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(5000)
  customerIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(5000)
  excludeProviderIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(5000)
  excludeCustomerIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5000)
  excludePhones?: string[];

  @ApiPropertyOptional({ description: 'Send to at most this many' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxRecipients?: number;

  @ApiPropertyOptional({ enum: AUDIENCE_ORDERS, default: 'oldest' })
  @IsOptional()
  @IsIn(AUDIENCE_ORDERS)
  order?: AudienceOrder;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  randomSeed?: string;
}

export class AudiencePreviewDtoBase {
  @ApiProperty({ type: AudienceFiltersDto })
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  filters: AudienceFiltersDto;

  @ApiPropertyOptional({ enum: ['marketing', 'utility'] })
  @IsOptional()
  @IsIn(['marketing', 'utility'])
  templateCategory?: 'marketing' | 'utility';
}

export class AudiencePreviewDto extends AudiencePreviewDtoBase {}

export class AudienceRecipientsDto extends AudiencePreviewDtoBase {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, description: 'Up to 10000 for export' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['all', 'sendable', 'skipped'] })
  @IsOptional()
  @IsIn(['all', 'sendable', 'skipped'])
  show?: 'all' | 'sendable' | 'skipped';
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
