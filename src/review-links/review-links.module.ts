import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../entities/provider.entity';
import { ReviewIntent } from '../entities/review-intent.entity';
import { User } from '../entities/user.entity';
import { ReviewLinksController } from './review-links.controller';
import { ReviewLinksService } from './review-links.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewIntent, Provider, User])],
  controllers: [ReviewLinksController],
  providers: [ReviewLinksService],
})
export class ReviewLinksModule {}
