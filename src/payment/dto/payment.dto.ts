import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, IsDateString } from 'class-validator';
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
  @IsDateString()
  startsAt: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ enum: ['razorpay', 'apple'], description: 'Defaults to razorpay; "apple" returns an appleProductId to purchase via IAP instead of a Razorpay order.' })
  @IsOptional()
  @IsEnum(['razorpay', 'apple'])
  gateway?: 'razorpay' | 'apple';
}

export class CreateLeadUnlockCheckoutDto {
  @ApiProperty()
  @IsUUID()
  leadId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ enum: ['razorpay', 'apple'] })
  @IsOptional()
  @IsEnum(['razorpay', 'apple'])
  gateway?: 'razorpay' | 'apple';
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

  @ApiProperty({ enum: ['sponsorship', 'lead_unlock', 'badge', 'subscription', 'deal_unlock', 'deal_creation'] })
  @IsEnum(['sponsorship', 'lead_unlock', 'badge', 'subscription', 'deal_unlock', 'deal_creation'])
  purchaseType: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateDealCreationCheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Deal data to create after payment succeeds' })
  @IsOptional()
  dealData?: Record<string, any>;

  @ApiPropertyOptional({ enum: ['razorpay', 'apple'] })
  @IsOptional()
  @IsEnum(['razorpay', 'apple'])
  gateway?: 'razorpay' | 'apple';
}

/**
 * Sent by iOS after a StoreKit consumable purchase completes. The backend
 * re-verifies the transaction with Apple and fulfils the pending payment.
 */
export class VerifyAppleConsumableDto {
  @ApiProperty({ description: 'The pending payment id returned by the checkout call' })
  @IsUUID()
  paymentId: string;

  @ApiProperty({ description: 'The StoreKit transaction id from the completed purchase' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
