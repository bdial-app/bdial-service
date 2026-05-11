import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, Min, MinLength, MaxLength, Matches, IsLatitude, IsLongitude } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Fatema Hussain' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  @Matches(/[a-zA-Z]/, { message: 'Name must contain at least one letter' })
  name?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @ApiPropertyOptional({ example: 'Dadar' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Area must not exceed 100 characters' })
  area?: string;

  @ApiPropertyOptional({ example: '400014' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;

  @ApiPropertyOptional({ example: 18.5204, description: 'User latitude' })
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 73.8567, description: 'User longitude' })
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ enum: ['customer', 'provider'], example: 'provider' })
  @IsOptional()
  @IsEnum(['customer', 'provider'])
  preferredMode?: 'customer' | 'provider';

  @ApiPropertyOptional({ example: 'en', description: 'Preferred language code (en, hi, ar, fr, ur, etc.)' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;
}

export class UserListQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Number of rows per page (min: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
