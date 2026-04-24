import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnalyticsEventItem {
  @ApiProperty({ example: 'uuid-provider-1' })
  @IsUUID()
  providerId: string;

  @ApiProperty({
    enum: [
      'profile_view', 'product_view', 'search_appearance', 'search_click',
      'chat_initiated', 'call_clicked', 'direction_clicked', 'share_clicked',
      'saved', 'unsaved', 'offer_viewed', 'photo_viewed', 'review_read', 'tab_switched',
    ],
  })
  @IsEnum([
    'profile_view', 'product_view', 'search_appearance', 'search_click',
    'chat_initiated', 'call_clicked', 'direction_clicked', 'share_clicked',
    'saved', 'unsaved', 'offer_viewed', 'photo_viewed', 'review_read', 'tab_switched',
  ])
  eventType: string;

  @ApiPropertyOptional({ example: 'uuid-product-1' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({
    enum: ['home_feed', 'explore', 'search', 'direct', 'saved', 'chat', 'product_link'],
  })
  @IsOptional()
  @IsEnum(['home_feed', 'explore', 'search', 'direct', 'saved', 'chat', 'product_link'])
  source?: string;

  @ApiProperty({ example: '2026-04-24T10:00:00.000Z' })
  @IsDateString()
  timestamp: string;
}

export class TrackEventsDto {
  @ApiProperty({ example: 'session-uuid-123' })
  @IsString()
  @MaxLength(64)
  sessionId: string;

  @ApiProperty({ type: [AnalyticsEventItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventItem)
  events: AnalyticsEventItem[];
}
