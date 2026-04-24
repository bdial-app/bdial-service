import { IsEnum, IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum ReportEntityTypeDto {
  PROVIDER = 'provider',
  PRODUCT = 'product',
  MESSAGE = 'message',
}

export enum ReportReasonDto {
  // Provider reasons
  FAKE_BUSINESS = 'fake_business',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FRAUD_SCAM = 'fraud_scam',
  HARASSMENT = 'harassment',
  IMPERSONATION = 'impersonation',
  WRONG_CATEGORY = 'wrong_category',
  // Product reasons
  FAKE_PRODUCT = 'fake_product',
  COUNTERFEIT = 'counterfeit',
  PROHIBITED_ITEM = 'prohibited_item',
  WRONG_PRICE = 'wrong_price',
  // Message reasons
  SPAM = 'spam',
  FRAUD = 'fraud',
  // Shared
  OTHER = 'other',
}

/** Valid reasons per entity type — enforced in service layer */
export const REASONS_BY_ENTITY_TYPE: Record<ReportEntityTypeDto, ReportReasonDto[]> = {
  [ReportEntityTypeDto.PROVIDER]: [
    ReportReasonDto.FAKE_BUSINESS,
    ReportReasonDto.INAPPROPRIATE_CONTENT,
    ReportReasonDto.FRAUD_SCAM,
    ReportReasonDto.HARASSMENT,
    ReportReasonDto.IMPERSONATION,
    ReportReasonDto.WRONG_CATEGORY,
    ReportReasonDto.OTHER,
  ],
  [ReportEntityTypeDto.PRODUCT]: [
    ReportReasonDto.FAKE_PRODUCT,
    ReportReasonDto.INAPPROPRIATE_CONTENT,
    ReportReasonDto.COUNTERFEIT,
    ReportReasonDto.PROHIBITED_ITEM,
    ReportReasonDto.WRONG_PRICE,
    ReportReasonDto.OTHER,
  ],
  [ReportEntityTypeDto.MESSAGE]: [
    ReportReasonDto.HARASSMENT,
    ReportReasonDto.SPAM,
    ReportReasonDto.INAPPROPRIATE_CONTENT,
    ReportReasonDto.FRAUD,
    ReportReasonDto.OTHER,
  ],
};

export class CreateReportDto {
  @ApiProperty({ enum: ReportEntityTypeDto })
  @IsEnum(ReportEntityTypeDto)
  entityType: ReportEntityTypeDto;

  @ApiProperty({ description: 'UUID of the target entity' })
  @IsUUID()
  entityId: string;

  @ApiProperty({ enum: ReportReasonDto })
  @IsEnum(ReportReasonDto)
  reason: ReportReasonDto;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/<[^>]*>/g, '').trim()
      : value,
  )
  description?: string;
}
