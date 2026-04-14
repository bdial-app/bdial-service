import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength, Matches, IsEnum, IsEmpty } from 'class-validator';
import {Transform} from 'class-transformer';
export class CreateProviderDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'Fatema Beauty Salon' })
  @IsString()
  @MaxLength(150)
  brandName!: string;

  @ApiPropertyOptional({ example: 'Professional beauty services for women' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Near City Center' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ example: 'Dadar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @Transform(({ value }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
})
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: '400014' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

 @Transform(({ value }) => value === '' ? undefined : value)
@IsOptional()
@IsString()
@Matches(/^-?\d+\.?\d*$/, { message: 'Latitude must be a valid decimal' })
latitude?: string;


@Transform(({ value }) => value === '' ? undefined : value)
@IsOptional()
@IsString()
@Matches(/^-?\d+\.?\d*$/, { message: 'Longitude must be a valid decimal' })
longitude?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'Contact number must be a valid international format' })
  @MaxLength(15)
  contactNumber!: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Open time must be in HH:MM format' })
  openTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Close time must be in HH:MM format' })
  closeTime?: string;


  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended'], example: 'active' })
  @IsOptional()
  @IsEnum(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
