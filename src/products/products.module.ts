import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CatalogService } from './catalog.service';
import { Product, Provider, Review, Photo, ProviderCategory } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule, TypeOrmModule.forFeature([Product, Provider, Review, Photo, ProviderCategory])],
  controllers: [ProductsController],
  providers: [ProductsService, CatalogService],
  exports: [ProductsService, CatalogService],
})
export class ProductsModule {}
