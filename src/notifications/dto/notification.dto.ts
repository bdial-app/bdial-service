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
