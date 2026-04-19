import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { StorageService } from '../storage/storage.service';
import { AuthModule } from '../auth/auth.module';
import { Review, ReviewPhoto, ReviewReport } from '../entities';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Review, ReviewPhoto, ReviewReport])],
  controllers: [ReviewsController],
  providers: [ReviewsService, StorageService],
})
export class ReviewsModule {}
