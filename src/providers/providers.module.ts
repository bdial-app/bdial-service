import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { WebsiteMetaService } from './website-meta.service';
import { Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning, SystemSetting, Subscription } from '../entities';
import { GeocodeModule } from '../geocode/geocode.module';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning, SystemSetting, Subscription]), GeocodeModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, WebsiteMetaService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
