import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import {
  Provider,
  Listing,
  Category,
  Review,
  PromoBanner,
  Booking,
  Photo,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      Listing,
      Category,
      Review,
      PromoBanner,
      Booking,
      Photo,
    ]),
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
