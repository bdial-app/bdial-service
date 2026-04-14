import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProviderDto } from './create-provider.dto';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class BecomeProviderDto extends CreateProviderDto {
  
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
}
