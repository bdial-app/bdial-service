import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleSavedItemDto {
  @ApiProperty({ description: 'UUID of the provider or product' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: ['provider', 'product'], description: 'Type of item to save' })
  @IsEnum(['provider', 'product'])
  itemType: 'provider' | 'product';
}
