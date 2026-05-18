import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { StorageService } from '../storage/storage.service';
import { AuthModule } from '../auth/auth.module';
import { Review, ReviewPhoto, ReviewReport, Provider } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleReviewsModule } from '../google-reviews/google-reviews.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Review, ReviewPhoto, ReviewReport, Provider]), NotificationsModule, GoogleReviewsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, StorageService],
})
export class ReviewsModule {}
