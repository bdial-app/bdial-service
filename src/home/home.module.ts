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
  SystemSetting,
  HomeCollection,
} from '../entities';
import { CategoryPersonalizationService } from '../users/category-personalization.service';
import { HomeCollectionsService } from './home-collections.service';
import { AdminHomeCollectionsController } from './admin-home-collections.controller';
import { ProductsModule } from '../products/products.module';

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
      SystemSetting,
      HomeCollection,
    ]),
    ProductsModule,
  ],
  controllers: [HomeController, AdminHomeCollectionsController],
  providers: [
    HomeService,
    HomeCollectionsService,
    CategoryPersonalizationService,
  ],
  exports: [HomeService, HomeCollectionsService],
})
export class HomeModule {}
