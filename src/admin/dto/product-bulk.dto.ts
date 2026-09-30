import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, ValidateNested,
} from 'class-validator';

export class ProductBulkRowDto {
  @ApiProperty({ description: 'Client-side row id, echoed back in the report' })
  @IsString()
  rowId: string;

  @ApiPropertyOptional({ description: 'Whatever the sheet said: an id, a business name, or a phone number' })
  @IsOptional()
  @IsString()
  providerRef?: string;

  @ApiPropertyOptional({ description: 'Business chosen in the UI — wins over providerRef' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'A number, or text like "₹1,200" — cleaned up server-side' })
  @IsOptional()
  price?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: ['product', 'service'] })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class BulkProductsDto {
  @ApiProperty({ type: [ProductBulkRowDto], description: 'At most 500 rows per call' })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ProductBulkRowDto)
  rows: ProductBulkRowDto[];
}
