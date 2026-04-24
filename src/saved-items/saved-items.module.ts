import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedItemsController } from './saved-items.controller';
import { SavedItemsService } from './saved-items.service';
import { SavedItem, Provider, Product, Review } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([SavedItem, Provider, Product, Review])],
  controllers: [SavedItemsController],
  providers: [SavedItemsService],
  exports: [SavedItemsService],
})
export class SavedItemsModule {}
