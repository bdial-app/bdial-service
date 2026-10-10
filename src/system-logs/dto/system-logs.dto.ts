import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IST_DATE_OR_MINUTE } from '../../common/ist-range';

const LEVELS = ['error', 'warn', 'info'] as const;
const SOURCES = [
  'server',
  'app',
  'auth',
  'admin',
  'activity',
  'search',
  'notification',
  'whatsapp',
  'payment',
  'report',
  'bug',
  'review',
  'verification',
  'signup',
  'listing',
] as const;

const CommaList = () =>
  Transform(({ value }) => {
    const parts = (
      Array.isArray(value) ? value : String(value ?? '').split(',')
    )
      .map((v: unknown) => String(v).trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  });

/** Filters for GET /admin/logs (and its counts). All optional, combined with AND. */
export class LogFeedQueryDto {
  @ApiPropertyOptional({
    description:
      "From: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm', India time (default: last 24 hours)",
  })
  @IsOptional()
  @Matches(IST_DATE_OR_MINUTE)
  from?: string;

  @ApiPropertyOptional({
    description:
      "To: 'YYYY-MM-DD' (whole day) or 'YYYY-MM-DDTHH:mm', India time",
  })
  @IsOptional()
  @Matches(IST_DATE_OR_MINUTE)
  to?: string;

  @ApiPropertyOptional({
    description: `Comma-separated: ${SOURCES.join(', ')}`,
  })
  @IsOptional()
  @CommaList()
  @IsIn(SOURCES, { each: true })
  sources?: string[];

  @ApiPropertyOptional({ description: 'Comma-separated: error, warn, info' })
  @IsOptional()
  @CommaList()
  @IsIn(LEVELS, { each: true })
  levels?: string[];

  @ApiPropertyOptional({
    description: 'Text in the message, event, path, ids or details',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: 'A user: phone number, name, email or id',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  user?: string;

  @ApiPropertyOptional({ description: 'A business: name, phone or id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  business?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  event?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestId?: string;
  @ApiPropertyOptional({ description: 'API route contains' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  status?: number;
  @ApiPropertyOptional({ description: 'android, ios, web or admin' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Continue after this item (nextCursor of the previous page)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  before?: string;

  @ApiPropertyOptional({ default: 50, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

/** One error an app reports. */
export class ClientLogEventDto {
  @IsOptional() @IsIn(LEVELS) level?: 'error' | 'warn' | 'info';
  /** js_error · unhandled_rejection · api_error · native */
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsString() @MaxLength(2000) message: string;
  @IsOptional() @IsString() @MaxLength(8000) stack?: string;
  /** The screen (route) the person was on. */
  @IsOptional() @IsString() @MaxLength(300) screen?: string;
  /** For a failed API call: its method, path, status and request id. */
  @IsOptional() @IsString() @MaxLength(10) method?: string;
  @IsOptional() @IsString() @MaxLength(300) apiPath?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(999) status?: number;
  @IsOptional() @IsString() @MaxLength(64) requestId?: string;
  @IsOptional() @IsString() @MaxLength(64) sessionId?: string;
  @IsOptional() @IsString() @MaxLength(20) platform?: string;
  @IsOptional() @IsString() @MaxLength(30) appVersion?: string;
  @IsOptional() @IsObject() details?: Record<string, unknown>;
}

export class ClientLogBatchDto {
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => ClientLogEventDto)
  events: ClientLogEventDto[];
}
