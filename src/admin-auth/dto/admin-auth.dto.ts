// ─── Admin Auth DTOs ───────────────────────────────────────

import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, Length } from 'class-validator';

export class SendAdminOtpDto {
  @ApiProperty({ 
    example: '911234567890', 
    description: 'Admin mobile number (10 digits or 12 digits with country code)' 
  })
  @IsString()
  @Matches(/^(?:\+91[6-9]\d{9}|[6-9]\d{9})$/, { message: 'Invalid Indian mobile number. Use 10 digits (e.g., 9876543210) or 12 digits with country code (e.g., +919876543210)' })
  mobileNumber: string;
}

export class VerifyAdminOtpDto {
  @ApiProperty({ example: '911234567890', description: 'Admin mobile number' })
  @IsString()
  @Matches(/^(?:\+91[6-9]\d{9}|[6-9]\d{9})$/, { message: 'Invalid Indian mobile number. Use 10 digits (e.g., 9876543210) or 12 digits with country code (e.g., +919876543210)' })
  mobileNumber: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to admin mobile' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
