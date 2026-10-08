import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  HOME_COLLECTION_ILLUSTRATIONS,
  HOME_COLLECTION_THEMES,
  HOME_COLLECTION_TYPES,
  type HomeCollectionIllustration,
  type HomeCollectionTheme,
  type HomeCollectionType,
} from '../../entities/home-collection.entity';

export class CreateHomeCollectionDto {
  @ApiProperty({ example: 'Get your home fixed' })
  @IsString()
  @Length(2, 80)
  title: string;

  @ApiPropertyOptional({ example: 'Plumbers, electricians & more' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(160)
  subtitle?: string | null;

  @ApiPropertyOptional({ enum: HOME_COLLECTION_THEMES, default: 'amber' })
  @IsOptional()
  @IsIn(HOME_COLLECTION_THEMES as unknown as string[])
  theme?: HomeCollectionTheme;

  @ApiPropertyOptional({
    enum: HOME_COLLECTION_ILLUSTRATIONS,
    default: 'shopping',
  })
  @IsOptional()
  @IsIn(HOME_COLLECTION_ILLUSTRATIONS as unknown as string[])
  illustration?: HomeCollectionIllustration;

  @ApiPropertyOptional({ enum: HOME_COLLECTION_TYPES, default: 'all' })
  @IsOptional()
  @IsIn(HOME_COLLECTION_TYPES as unknown as string[])
  listingType?: HomeCollectionType;

  @ApiProperty({ type: [String], description: 'Categories at any level' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsUUID('all', { each: true })
  categoryIds: string[];

  @ApiPropertyOptional({ description: 'Optional cover photo URL' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl()
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  endsAt?: string | null;
}

export class UpdateHomeCollectionDto extends PartialType(
  CreateHomeCollectionDto,
) {}

export class ReorderHomeCollectionsDto {
  @ApiProperty({ type: [String], description: 'Collection ids, top first' })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids: string[];
}
