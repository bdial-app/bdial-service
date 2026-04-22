import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProviderDto } from './create-provider.dto';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class BecomeProviderDto extends CreateProviderDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Aadhaar card image file' })
  @IsOptional()
  file?: any;

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
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
