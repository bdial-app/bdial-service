import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleReviewsController } from './google-reviews.controller';
import { AdminGoogleReviewsController } from './admin-google-reviews.controller';
import { GoogleReviewsService } from './google-reviews.service';
import { GoogleReviewsSyncService } from './google-reviews-sync.service';
import { GoogleReview, Provider, Review } from '../entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Provider, Review, GoogleReview]),
  ],
  controllers: [GoogleReviewsController, AdminGoogleReviewsController],
  providers: [GoogleReviewsService, GoogleReviewsSyncService],
  exports: [GoogleReviewsService],
})
export class GoogleReviewsModule {}
