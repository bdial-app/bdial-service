import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProviderOnboardingController } from './provider-onboarding.controller';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { WebsiteMetaService } from './website-meta.service';
import { InstagramFeedService } from './instagram-feed.service';
import { Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning, SystemSetting, Subscription, ProviderOnboardingDraft } from '../entities';
import { GeocodeModule } from '../geocode/geocode.module';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning, SystemSetting, Subscription, ProviderOnboardingDraft]), GeocodeModule],
  controllers: [ProvidersController, ProviderOnboardingController],
  providers: [ProvidersService, WebsiteMetaService, InstagramFeedService, ProviderOnboardingService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
