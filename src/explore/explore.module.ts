import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import {
  Provider,
  Category,
  Review,
  PromoBanner,
  Booking,
  Photo,
  SponsoredListing,
  ProviderBadge,
  ProviderOffer,
  AdEvent,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      Category,
      Review,
      PromoBanner,
      Booking,
      Photo,
      SponsoredListing,
      ProviderBadge,
      ProviderOffer,
      AdEvent,
    ]),
  ],
  controllers: [ExploreController],
  providers: [ExploreService],
  exports: [ExploreService],
})
export class ExploreModule {}
