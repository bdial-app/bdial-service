import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConversationsQueryDto {
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

  @ApiPropertyOptional({
    enum: ['all', 'unread', 'open_window'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'unread', 'open_window'])
  filter?: 'all' | 'unread' | 'open_window';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class ThreadQueryDto {
  @ApiPropertyOptional({
    description: 'ISO datetime; return messages created before this',
  })
  @IsOptional()
  @IsDateString()
  before?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/** `{ text }` or `{ templateId, variables }` */
export class DirectSendDto {
  @ApiPropertyOptional({ description: 'Free text; only inside the 24h window' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ example: { '1': 'Pronttera' } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
