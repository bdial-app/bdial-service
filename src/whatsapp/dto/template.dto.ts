import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  WHATSAPP_TEMPLATE_CATEGORY_VALUES,
  WHATSAPP_TEMPLATE_STATUS_VALUES,
  WHATSAPP_VARIABLE_SOURCES,
} from '../../entities/whatsapp-template.entity';
import type {
  WhatsAppTemplateCategory,
  WhatsAppTemplateComponent,
  WhatsAppTemplateStatus,
  WhatsAppVariableLocation,
  WhatsAppVariableSource,
} from '../../entities/whatsapp-template.entity';

export class TemplateVariableDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  index: number;

  @ApiProperty({ enum: ['body', 'header', 'button'] })
  @IsIn(['body', 'header', 'button'])
  location: WhatsAppVariableLocation;

  @ApiProperty({ example: 'Business name' })
  @IsString()
  @MaxLength(80)
  label: string;

  @ApiProperty({ enum: WHATSAPP_VARIABLE_SOURCES })
  @IsIn(WHATSAPP_VARIABLE_SOURCES)
  source: WhatsAppVariableSource;

  @ApiProperty({ example: 'Pronttera' })
  @IsString()
  @MaxLength(500)
  sample: string;
}

export class UpsertTemplateDto {
  @ApiProperty({ example: 'tijarah_weekly_visits' })
  @IsString()
  @Matches(/^[a-z0-9_]{1,512}$/, {
    message: 'name must be lowercase letters, digits and underscores',
  })
  name: string;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiProperty({ enum: WHATSAPP_TEMPLATE_CATEGORY_VALUES })
  @IsIn(WHATSAPP_TEMPLATE_CATEGORY_VALUES)
  category: WhatsAppTemplateCategory;

  @ApiProperty({
    description: 'Meta component array (HEADER/BODY/FOOTER/BUTTONS)',
  })
  @IsArray()
  components: WhatsAppTemplateComponent[];

  @ApiPropertyOptional({ type: [TemplateVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Also submit to Meta' })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class TemplateListQueryDto {
  @ApiPropertyOptional({ enum: WHATSAPP_TEMPLATE_STATUS_VALUES })
  @IsOptional()
  @IsEnum(WHATSAPP_TEMPLATE_STATUS_VALUES)
  status?: WhatsAppTemplateStatus;

  @ApiPropertyOptional({ enum: WHATSAPP_TEMPLATE_CATEGORY_VALUES })
  @IsOptional()
  @IsEnum(WHATSAPP_TEMPLATE_CATEGORY_VALUES)
  category?: WhatsAppTemplateCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class TemplatePreviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Components when previewing an unsaved draft',
  })
  @IsOptional()
  @IsArray()
  components?: WhatsAppTemplateComponent[];

  @ApiPropertyOptional({ example: { '1': 'Pronttera' } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
