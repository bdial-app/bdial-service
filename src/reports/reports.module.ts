import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report, Provider, Product, Message, User } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Provider, Product, Message, User])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
