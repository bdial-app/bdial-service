import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService,StorageService],
})
export class ReviewsModule {}
