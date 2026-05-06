import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CreateProviderDto } from './create-provider.dto';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class BecomeProviderDto extends CreateProviderDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Aadhaar card image file' })
  @IsOptional()
  file?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Banner image file' })
  @IsOptional()
  bannerImage?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile image file' })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Product image files' })
  @IsOptional()
  productImages?: any;

  @ApiPropertyOptional({ description: 'iJamat card number (optional)' })
  @IsOptional()
  @IsString()
  ijamatNumber?: string;

  @ApiPropertyOptional({ description: 'iJamat card expiry date (ISO string)' })
  @IsOptional()
  ijamatExpiry?: string;

  @ApiPropertyOptional({ description: 'iJamat document storage URL/path' })
  @IsOptional()
  @IsString()
  ijamatDocUrl?: string;

  @ApiPropertyOptional({ description: 'Category IDs to associate with this provider', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Products JSON array: [{name, description?, price?, currency?}]' })
  @IsOptional()
  @IsString()
  products?: string;
}
