import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceableCitiesController } from './serviceable-cities.controller';
import { ServiceableCitiesService } from './serviceable-cities.service';
import { ServiceableCity, CityRequest } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceableCity, CityRequest])],
  controllers: [ServiceableCitiesController],
  providers: [ServiceableCitiesService],
  exports: [ServiceableCitiesService],
})
export class ServiceableCitiesModule {}
