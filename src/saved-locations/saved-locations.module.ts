import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedLocationsController } from './saved-locations.controller';
import { SavedLocationsService } from './saved-locations.service';
import { SavedLocation } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([SavedLocation])],
  controllers: [SavedLocationsController],
  providers: [SavedLocationsService],
  exports: [SavedLocationsService],
})
export class SavedLocationsModule {}
