import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ArrayMaxSize, ArrayMinSize, ValidateNested, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminCreateProviderWithUserDto } from './admin-create-user.dto';

/** One sheet row. Identical to the single-create payload plus a client-side row key. */
export class BulkProviderRowDto extends AdminCreateProviderWithUserDto {
  @ApiProperty({ description: 'Client-generated key so results can be matched back to the sheet row' })
  @IsString()
  @MaxLength(64)
  rowId: string;
}

export class BulkValidateProvidersDto {
  @ApiProperty({ type: [BulkProviderRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkProviderRowDto)
  rows: BulkProviderRowDto[];
}

export class BulkImportProvidersDto {
  @ApiProperty({ type: [BulkProviderRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkProviderRowDto)
  rows: BulkProviderRowDto[];

  @ApiPropertyOptional({ default: true, description: 'Keep going after a failed row' })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;

  @ApiPropertyOptional({ example: 'Meena Bazaar 6 responses.xlsx', description: 'Recorded in the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceLabel?: string;
}
