import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'Mobile number must be a valid international format' })
  @MaxLength(15)
  mobileNumber: string;

  @ApiProperty({ example: 'Fatema Hussain' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: ['male', 'female', 'other'], example: 'female' })
  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @ApiPropertyOptional({ enum: ['customer', 'admin'], example: 'customer' })
  @IsOptional()
  @IsEnum(['customer', 'admin'])
  role?: 'customer' | 'admin';

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'], example: 'active' })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';

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
}
