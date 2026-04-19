import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { AuthModule } from '../auth/auth.module';
import { Listing, ListingCategory, User } from '../entities';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Listing, ListingCategory, User])],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
