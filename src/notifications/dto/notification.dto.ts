import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  IsUUID,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
  Matches,
  ArrayMaxSize,
  IsIn,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ──────────────────────────────────────────────
// Device Token
// ──────────────────────────────────────────────

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM registration token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;

  @ApiProperty({ enum: ['web', 'android', 'ios'], default: 'web' })
  @IsEnum(['web', 'android', 'ios'])
  platform: 'web' | 'android' | 'ios';

  @ApiPropertyOptional({ description: 'Device metadata (browser, OS, model)' })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

export class UnregisterDeviceDto {
  @ApiProperty({ description: 'FCM registration token to remove' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;
}

// ──────────────────────────────────────────────
// Notification Preferences
// ──────────────────────────────────────────────

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Master push notification toggle' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatMessages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reviewsReceived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  providerStatusUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verificationUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bookingUpdates?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  promotional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  systemAnnouncements?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:mm)', example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quietHoursStart must be in HH:mm format' })
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:mm)', example: '07:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quietHoursEnd must be in HH:mm format' })
  quietHoursEnd?: string;
}

// ──────────────────────────────────────────────
// Notification Queries
// ──────────────────────────────────────────────

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: [
      'chat_message', 'review_received', 'provider_status', 'verification_update',
      'booking_update', 'promotional', 'system_announcement', 'report_update', 'new_enquiry',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['all', 'read', 'unread'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'read', 'unread'])
  status?: 'all' | 'read' | 'unread' = 'all';

  @ApiPropertyOptional({ enum: ['customer', 'provider'], description: 'Filter by target mode (provider view vs customer view)' })
  @IsOptional()
  @IsEnum(['customer', 'provider'])
  targetMode?: 'customer' | 'provider';
}

// ──────────────────────────────────────────────
// Admin — Send Notification
// ──────────────────────────────────────────────

export class SendNotificationDto {
  @ApiProperty({ description: 'Notification title', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Notification body text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ description: 'Image URL for rich notification' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiProperty({ enum: ['all', 'segment', 'individual'] })
  @IsEnum(['all', 'segment', 'individual'])
  targetType: 'all' | 'segment' | 'individual';

  @ApiPropertyOptional({ description: 'Target criteria for segment/individual', example: { userIds: ['uuid'], city: 'Mumbai', role: 'customer' } })
  @IsOptional()
  @IsObject()
  targetCriteria?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Deep link data',
    example: { route: '/provider-details', params: { id: 'uuid' } },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    enum: [
      'chat_message', 'review_received', 'provider_status', 'verification_update',
      'booking_update', 'promotional', 'system_announcement', 'report_update', 'new_enquiry',
    ],
    default: 'promotional',
  })
  @IsOptional()
  @IsEnum([
    'chat_message', 'review_received', 'provider_status', 'verification_update',
    'booking_update', 'promotional', 'system_announcement', 'report_update', 'new_enquiry',
  ])
  type?: string = 'promotional';
}

// ──────────────────────────────────────────────
// Admin — Batch Queries
// ──────────────────────────────────────────────

export class GetBatchesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['draft', 'sending', 'sent', 'failed'] })
  @IsOptional()
  @IsEnum(['draft', 'sending', 'sent', 'failed'])
  status?: string;
}

// ──────────────────────────────────────────────
// Admin — Push campaigns
// ──────────────────────────────────────────────

export class PushAudienceDto {
  @ApiProperty({ enum: ['everyone', 'businesses', 'customers', 'people'] })
  @IsEnum(['everyone', 'businesses', 'customers', 'people'])
  kind: 'everyone' | 'businesses' | 'customers' | 'people';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  cities?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(200)
  categoryIds?: string[];

  @ApiPropertyOptional({ enum: ['android', 'ios', 'web'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(['android', 'ios', 'web'], { each: true })
  platforms?: ('android' | 'ios' | 'web')[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  joinedWithinDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  activeWithinDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  inactiveDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  womenLed?: boolean;

  @ApiPropertyOptional({ enum: ['yes', 'no'] })
  @IsOptional()
  @IsIn(['yes', 'no'])
  paidPlan?: 'yes' | 'no';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  noProducts?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(5000)
  userIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(5000)
  providerIds?: string[];
}

export class PushAudiencePreviewDto {
  @ApiProperty({ type: PushAudienceDto })
  @ValidateNested()
  @Type(() => PushAudienceDto)
  audience: PushAudienceDto;

  @ApiPropertyOptional({ enum: ['promotional', 'system_announcement'] })
  @IsOptional()
  @IsIn(['promotional', 'system_announcement'])
  type?: 'promotional' | 'system_announcement';
}

export class PushMessageDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'App screen to open, e.g. "/deals?mode=customer"' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(/^\//, { message: 'The screen to open must start with /' })
  route?: string;

  @ApiPropertyOptional({ enum: ['promotional', 'system_announcement'], default: 'promotional' })
  @IsOptional()
  @IsIn(['promotional', 'system_announcement'])
  type?: 'promotional' | 'system_announcement';
}

export class CreateCampaignDto extends PushMessageDto {
  @ApiProperty({ type: PushAudienceDto })
  @ValidateNested()
  @Type(() => PushAudienceDto)
  audience: PushAudienceDto;

  @ApiPropertyOptional({ description: 'ISO time to send at; omit to send now' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class TestPushDto extends PushMessageDto {
  @ApiPropertyOptional({ description: 'Send to this account instead of yourself' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Send to the owner of this business' })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}

export class TestTemplateDto {
  @ApiPropertyOptional({ description: 'Sample values for the template variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  providerId?: string;
}

const TEMPLATE_TYPES = [
  'chat_message', 'review_received', 'provider_status', 'verification_update',
  'booking_update', 'promotional', 'system_announcement', 'report_update', 'new_enquiry',
  'payment_update', 'voucher_update', 'subscription_update', 'invite_update',
];

export class UpdateTemplateDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  bodyTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  defaultRoute?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultImageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Saved messages only' })
  @IsOptional()
  @IsIn(TEMPLATE_TYPES)
  type?: string;
}

export class CreateTemplateDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleTemplate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  bodyTemplate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  defaultRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultImageUrl?: string;

  @ApiPropertyOptional({ enum: ['promotional', 'system_announcement'] })
  @IsOptional()
  @IsIn(['promotional', 'system_announcement'])
  type?: 'promotional' | 'system_announcement';
}
