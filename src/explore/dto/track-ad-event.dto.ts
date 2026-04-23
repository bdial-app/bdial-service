import { IsEnum, IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackAdEventDto {
  @ApiProperty({ enum: ['impression', 'click'] })
  @IsEnum(['impression', 'click'])
  eventType: 'impression' | 'click';

  @ApiProperty({ enum: ['sponsored_listing', 'promo_banner', 'provider_offer'] })
  @IsEnum(['sponsored_listing', 'promo_banner', 'provider_offer'])
  entityType: 'sponsored_listing' | 'promo_banner' | 'provider_offer';

  @ApiProperty({ description: 'ID of the tracked entity' })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({ description: 'Screen position or section name' })
  @IsOptional()
  @IsString()
  position?: string;
}
