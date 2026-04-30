import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Unique voucher code (will be uppercased)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['percentage', 'fixed_amount'] })
  @IsEnum(['percentage', 'fixed_amount'])
  discountType: 'percentage' | 'fixed_amount';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Max total uses (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Max uses per provider (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerProvider?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiPropertyOptional({ description: 'Cap for percentage discounts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({
    description: 'Purchase types this voucher applies to (null = all)',
    example: ['sponsorship', 'subscription'],
  })
  @IsOptional()
  @IsString({ each: true })
  applicableTo?: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  validFrom: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  validUntil: string;
}

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
