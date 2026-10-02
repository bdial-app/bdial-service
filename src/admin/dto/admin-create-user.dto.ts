import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength, Matches, IsEmail, IsBoolean } from 'class-validator';

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

  @ApiPropertyOptional({
    example: false,
    description: 'Mark the business community-verified (the verified badge shown to customers)',
  })
  @IsOptional()
  @IsBoolean()
  communityVerified?: boolean;

  // ── Online presence (all optional) ──────────────────────
  @ApiPropertyOptional({ example: 'pehnawaridas', description: 'Instagram handle without @' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagramHandle?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'pehnawaridas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  facebookHandle?: string;

  @ApiPropertyOptional({ description: 'Category IDs to assign', type: [String] })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Initial provider status', enum: ['unverified', 'active'], default: 'active' })
  @IsOptional()
  @IsEnum(['unverified', 'active'])
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

  @ApiPropertyOptional({ description: 'Purpose of OTP', enum: ['user_verification', 'business_verification', 'user_mobile_change'], default: 'user_verification' })
  @IsOptional()
  @IsEnum(['user_verification', 'business_verification', 'user_mobile_change'])
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

/**
 * Admin edit of a user's profile. The login mobile number is deliberately
 * absent: it is identity, so it changes only through
 * AdminUpdateUserMobileDto, which carries a one-time code.
 */
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Send an empty string to clear it',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ example: 'Pune' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Wanowrie' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({
    example: '411040',
    description: '6 digits, or an empty string to clear it',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{6})?$/, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;

  @ApiPropertyOptional({
    enum: ['customer', 'associate', 'moderator', 'admin', 'super_admin'],
  })
  @IsOptional()
  @IsEnum(['customer', 'associate', 'moderator', 'admin', 'super_admin'])
  role?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'paused', 'deleted'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'paused', 'deleted'])
  status?: string;
}

/** Changing the number a user signs in with. The OTP proves they hold it. */
export class AdminUpdateUserMobileDto {
  @ApiProperty({
    example: '9876543210',
    description: 'The new 10-digit number',
  })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber: string;

  @ApiProperty({
    example: '123456',
    description: 'Code sent to the NEW number',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}
