import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateVerificationDto {
  @ApiProperty({ description: 'Aadhaar document storage URL/path' })
  @IsString()
  @MinLength(5)
  aadhaarDocUrl: string;

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
