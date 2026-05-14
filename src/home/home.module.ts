import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import {
  Provider,
  Category,
  Review,
  PromoBanner,
  Booking,
  Photo,
  ProviderOffer,
  SponsoredListing,
  UserCategoryInteraction,
  User,
  Product,
} from '../entities';
import { CategoryPersonalizationService } from '../users/category-personalization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      Category,
      Review,
      PromoBanner,
      Booking,
      Photo,
      ProviderOffer,
      SponsoredListing,
      UserCategoryInteraction,
      User,
      Product,
    ]),
  ],
  controllers: [HomeController],
  providers: [HomeService, CategoryPersonalizationService],
  exports: [HomeService],
})
export class HomeModule {}
