import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// ──────────────────────────────────────────────
// Conversation
// ──────────────────────────────────────────────

export class CreateConversationDto {
  @ApiProperty({ description: 'Provider ID to start a conversation with' })
  @IsUUID()
  providerId: string;

  @ApiPropertyOptional({ enum: ['product', 'provider'] })
  @IsOptional()
  @IsEnum(['product', 'provider'])
  contextType?: 'product' | 'provider';

  @ApiPropertyOptional({ description: 'UUID of the context entity' })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({ description: 'Optional first message text' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  initialMessage?: string;

  @ApiPropertyOptional({ description: 'Metadata for enquiry-type first messages' })
  @IsOptional()
  @IsObject()
  initialMessageMetadata?: Record<string, any>;
}

export class GetConversationsQueryDto {
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

  @ApiPropertyOptional({ enum: ['all', 'unread', 'enquiries'] })
  @IsOptional()
  @IsEnum(['all', 'unread', 'enquiries'])
  filter?: 'all' | 'unread' | 'enquiries' = 'all';

  @ApiPropertyOptional({ enum: ['customer', 'provider'], description: 'Filter by participant role' })
  @IsOptional()
  @IsEnum(['customer', 'provider'])
  role?: 'customer' | 'provider';

  @ApiPropertyOptional({ description: 'Search by participant name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

// ──────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Message text content' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(4000)
  content?: string;

  @ApiPropertyOptional({ enum: ['text', 'image', 'enquiry', 'quote_request'], default: 'text' })
  @IsOptional()
  @IsEnum(['text', 'image', 'enquiry', 'quote_request'])
  messageType?: 'text' | 'image' | 'enquiry' | 'quote_request' = 'text';

  @ApiPropertyOptional({ description: 'Rich metadata (image url, product info, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  /** Client-generated UUID for idempotency & optimistic UI matching */
  @ApiPropertyOptional({ description: 'Client-generated message ID for dedup' })
  @IsOptional()
  @IsUUID()
  clientMessageId?: string;
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;

  /** Cursor-based: get messages created before this timestamp */
  @ApiPropertyOptional({ description: 'ISO timestamp cursor — get messages before this' })
  @IsOptional()
  @IsDateString()
  before?: string;
}

// ──────────────────────────────────────────────
// Read receipts
// ──────────────────────────────────────────────

export class MarkReadDto {
  @ApiPropertyOptional({ description: 'Mark all messages up to (and including) this one as read' })
  @IsOptional()
  @IsUUID()
  upToMessageId?: string;
}

// ──────────────────────────────────────────────
// Typing indicator
// ──────────────────────────────────────────────

export class TypingDto {
  @ApiProperty()
  @IsNotEmpty()
  isTyping: boolean;
}
