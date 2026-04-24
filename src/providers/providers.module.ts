import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning } from '../entities';
import { GeocodeModule } from '../geocode/geocode.module';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning]), GeocodeModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
