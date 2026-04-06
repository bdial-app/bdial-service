import { IsInt, IsOptional, Min, Max, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserPaginationDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: ['customer', 'admin'],
    example: 'customer',
  })
  @IsOptional()
  @IsEnum(['customer', 'admin'])
  role?: 'customer' | 'admin';

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: ['active', 'suspended', 'deleted'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';

  @ApiPropertyOptional({
    description: 'Search by name or mobile number',
    example: 'Fatema',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
