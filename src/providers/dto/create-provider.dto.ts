import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength, Matches, IsEnum, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

/** Trim, strip seconds (HH:MM:SS → HH:MM), and convert blank to undefined */
const NormalizeTime = () =>
  Transform(({ value }) => {
    if (value == null || typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const m = trimmed.match(/^(\d{1,2}:\d{2})/);
    return m ? m[1] : trimmed;
  });

export class CreateProviderDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Fatema Beauty Salon' })
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(150)
  brandName: string;

  @ApiPropertyOptional({ example: 'Professional beauty services for women' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Near City Center' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(300)
  address?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Dadar' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
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
  @Matches(/^-?\d+\.?\d*$/, { message: 'Latitude must be a valid decimal' })
  latitude?: string;

  @ApiPropertyOptional({ example: '72.8777' })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+\.?\d*$/, { message: 'Longitude must be a valid decimal' })
  longitude?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'Contact number must be a valid international format' })
  @MaxLength(15)
  contactNumber: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @NormalizeTime()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Open time must be in HH:MM format' })
  openTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @NormalizeTime()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Close time must be in HH:MM format' })
  closeTime?: string;


  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark as featured provider' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Mark as women-led business' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isWomenLed?: boolean;

  @ApiPropertyOptional({ example: 'https://mybusiness.com', description: 'Business website URL' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(512)
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'mybusiness', description: 'Instagram handle (without @)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/^@/, '') : value)
  @Matches(/^[a-zA-Z0-9._]{1,30}$/, { message: 'Instagram handle must be 1-30 alphanumeric characters, dots, or underscores' })
  instagramHandle?: string;

  @ApiPropertyOptional({ example: 'mybusinesspage', description: 'Facebook page handle or URL' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(128)
  facebookHandle?: string;

  @ApiPropertyOptional({ example: '@mybusiness', description: 'YouTube channel handle or URL' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MaxLength(128)
  youtubeHandle?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'WhatsApp Business number' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // Strip spaces, dashes, parens — keep leading + and digits
    const cleaned = value.replace(/[\s\-().]/g, '');
    // Ensure it starts with + if it has a country code
    return cleaned;
  })
  @Matches(/^\+\d{7,15}$/, { message: 'WhatsApp number must start with + followed by 7-15 digits (e.g. +919876543210)' })
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: 'in/mybusiness', description: 'LinkedIn profile or company page path (e.g. in/name or company/name)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // Strip full URL prefix — normalize to just the path
    return value.trim()
      .replace(/^https?:\/\/(www\.)?linkedin\.com\/?/, '')
      .replace(/^(www\.)?linkedin\.com\/?/, '')
      .replace(/\/+$/, '')
      .replace(/^\/+/, '');
  })
  @MaxLength(128)
  linkedinHandle?: string;
}
