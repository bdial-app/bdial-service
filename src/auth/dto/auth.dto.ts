// ─── Auth DTOs ───────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  Length,
  IsEmail,
  IsOptional,
  IsIn,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '9876543210', description: 'Mobile number (10 digits)' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString({ message: 'Mobile number must be a string' })
  @Matches(/^[0-9]\d{9}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString({ message: 'Mobile number must be a string' })
  @Matches(/^[0-9]\d{9}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'OTP is required' })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain only digits' })
  otp!: string;
}

// ─── Google SSO DTOs ───────────────────────────────────────

export class GoogleSignInDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'Email from Google' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({ example: 'John Doe', description: 'User name from Google' })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @ApiProperty({ example: 'google_id_12345', description: 'Google ID' })
  @IsOptional()
  @IsString({ message: 'Google ID must be a string' })
  googleId?: string;
}

// ─── Registration DTOs ───────────────────────────────────────

export class RegisterWithPhoneDto {
  @ApiProperty({ example: '9876543210', description: 'Mobile number (10 digits)' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString({ message: 'Mobile number must be a string' })
  @Matches(/^[0-9]\d{9}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobileNumber!: string;

  @ApiProperty({ example: 'Adeeb Shah', description: 'Full name' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;

  @ApiProperty({ enum: ['male', 'female', 'other'], description: 'Gender' })
  @IsNotEmpty({ message: 'Gender is required' })
  @IsString({ message: 'Gender must be a string' })
  @IsIn(['male', 'female', 'other'], { message: 'Gender must be one of: male, female, other' })
  gender!: string;
}

export class RegisterWithEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({ example: 'Adeeb Shah', description: 'Full name' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password (min 8 chars)' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  password!: string;

  @ApiProperty({ enum: ['male', 'female', 'other'], description: 'Gender' })
  @IsNotEmpty({ message: 'Gender is required' })
  @IsString({ message: 'Gender must be a string' })
  @IsIn(['male', 'female', 'other'], { message: 'Gender must be one of: male, female, other' })
  gender!: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({ example: '123456', description: 'OTP sent to email' })
  @IsNotEmpty({ message: 'OTP is required' })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain only digits' })
  otp!: string;
}

export class CompleteProfileDto {
  @ApiPropertyOptional({ example: 'Mumbai', description: 'City name' })
  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @ApiPropertyOptional({ example: 'Dadar', description: 'Area/Locality' })
  @IsOptional()
  @IsString({ message: 'Area must be a string' })
  @MaxLength(100, { message: 'Area must not exceed 100 characters' })
  area?: string;

  @ApiPropertyOptional({ example: '400014', description: 'Postal code' })
  @IsOptional()
  @IsString({ message: 'Pincode must be a string' })
  @MaxLength(20, { message: 'Pincode must not exceed 20 characters' })
  pincode?: string;

  @ApiPropertyOptional({ example: '+91-22-1234-5678', description: 'Business phone (if applicable)' })
  @IsOptional()
  @IsString({ message: 'Business phone must be a string' })
  @MaxLength(20, { message: 'Business phone must not exceed 20 characters' })
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'I am a home-based artisan', description: 'Bio' })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;
}

export class RegistrationResponseDto {
  @ApiProperty({ example: 'registration_step_1' })
  step!: string;

  @ApiProperty({ example: 'Verify your email/phone' })
  message!: string;

  @ApiPropertyOptional({ example: { userId: 'uuid' } })
  data?: any;

  @ApiPropertyOptional({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken?: string;

  @ApiPropertyOptional()
  user?: any;
}

// ─── Supabase OAuth DTOs ───────────────────────────────────────

export class SupabaseOAuthSessionDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Supabase OAuth access token from OAuth callback',
  })
  @IsString()
  accessToken!: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Supabase refresh token (optional)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}



