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
      ProviderOffer,
      SponsoredListing,
    ]),
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
