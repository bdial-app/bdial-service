import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeenMark } from '../entities/admin-seen-mark.entity';
import { AdminAttentionController } from './admin-attention.controller';
import { AdminAttentionService } from './admin-attention.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSeenMark])],
  controllers: [AdminAttentionController],
  providers: [AdminAttentionService],
})
export class AdminAttentionModule {}
