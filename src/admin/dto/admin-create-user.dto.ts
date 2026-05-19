import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength, Matches, IsEmail } from 'class-validator';

export class AdminCreateUserDto {
  @ApiProperty({ example: '9876543210', description: '10-digit mobile number' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'male', enum: ['male', 'female', 'other'] })
  @IsEnum(['male', 'female', 'other'])
  gender: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Dadar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: '400014' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ example: '19.0760' })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({ example: '72.8777' })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiPropertyOptional({ description: 'Skip OTP verification for this user (admin privilege)', default: true })
  @IsOptional()
  skipOtp?: boolean;
}

export class AdminCreateProviderWithUserDto {
  // ── User fields ─────────────────────────────────────────
  @ApiProperty({ example: '9876543210', description: '10-digit user mobile number' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'User mobile number must be exactly 10 digits' })
  userMobileNumber: string;

  @ApiProperty({ example: 'Fatema Khan' })
  @IsString()
  @MaxLength(100)
  userName: string;

  @ApiProperty({ example: 'female', enum: ['male', 'female', 'other'] })
  @IsEnum(['male', 'female', 'other'])
  userGender: string;

  @ApiPropertyOptional({ example: 'fatema@example.com' })
  @IsOptional()
  @IsEmail()
  userEmail?: string;

  // ── Provider fields ─────────────────────────────────────
  @ApiProperty({ example: 'Fatema Beauty Salon' })
  @IsString()
  @MaxLength(150)
  brandName: string;

  @ApiPropertyOptional({ example: 'Professional beauty services' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Dadar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: '400014' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ example: '19.0760' })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({ example: '72.8777' })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiProperty({ example: '+919876543210', description: 'Business contact number' })
  @IsString()
  @MaxLength(15)
  contactNumber: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isWomenLed?: boolean;

  @ApiPropertyOptional({ description: 'Category IDs to assign', type: [String] })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Initial provider status', enum: ['pending', 'active', 'unverified'], default: 'active' })
  @IsOptional()
  @IsEnum(['pending', 'active', 'unverified'])
  providerStatus?: string;

  // ── Products ────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Products to add to the provider',
    type: 'array',
    example: [{ name: 'Haircut', price: 200, description: 'Basic haircut' }],
  })
  @IsOptional()
  products?: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    productType?: 'product' | 'service';
    categoryId?: string;
    subcategoryId?: string;
  }>;

  // ── Location for both user and provider ─────────────────
  @ApiPropertyOptional({ description: 'Apply location (lat/lng/city/area/pincode) to both user and provider', default: true })
  @IsOptional()
  syncLocation?: boolean;

  // ── OTP bypass ──────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Skip OTP for user mobile', default: true })
  @IsOptional()
  skipUserOtp?: boolean;

  @ApiPropertyOptional({ description: 'Skip OTP for business contact number', default: true })
  @IsOptional()
  skipBusinessOtp?: boolean;
}

export class AdminSendOtpDto {
  @ApiProperty({ example: '9876543210', description: '10-digit mobile number to send OTP to' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber: string;

  @ApiPropertyOptional({ description: 'Purpose of OTP', enum: ['user_verification', 'business_verification'], default: 'user_verification' })
  @IsOptional()
  @IsEnum(['user_verification', 'business_verification'])
  purpose?: string;
}

export class AdminVerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}
