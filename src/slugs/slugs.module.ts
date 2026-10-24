import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Product, Provider } from '../entities';
import { SlugsAdminController, SlugsController } from './slugs.controller';
import { SlugsService } from './slugs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, Product, AuditLog])],
  controllers: [SlugsController, SlugsAdminController],
  providers: [SlugsService],
  exports: [SlugsService],
})
export class SlugsModule {}
