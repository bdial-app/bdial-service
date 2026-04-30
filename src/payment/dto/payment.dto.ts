import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSponsorshipCheckoutDto {
  @ApiProperty({ enum: ['carousel', 'inline', 'top_result'] })
  @IsEnum(['carousel', 'inline', 'top_result'])
  type: 'carousel' | 'inline' | 'top_result';

  @ApiProperty()
  @IsNumber()
  @Min(100)
  budgetAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  targetCategoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  targetCities?: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  startsAt: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  endsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

export class CreateLeadUnlockCheckoutDto {
  @ApiProperty()
  @IsUUID()
  leadId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

export class CreateSubscriptionCheckoutDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsEnum(['monthly', 'yearly'])
  billingInterval: 'monthly' | 'yearly';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

export class ValidateVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: ['sponsorship', 'lead_unlock', 'badge', 'subscription', 'deal_unlock'] })
  @IsEnum(['sponsorship', 'lead_unlock', 'badge', 'subscription', 'deal_unlock'])
  purchaseType: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}
