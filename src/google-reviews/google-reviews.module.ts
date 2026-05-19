import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleReviewsController } from './google-reviews.controller';
import { GoogleReviewsService } from './google-reviews.service';
import { Provider, Review } from '../entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Provider, Review])],
  controllers: [GoogleReviewsController],
  providers: [GoogleReviewsService],
  exports: [GoogleReviewsService],
})
export class GoogleReviewsModule {}
