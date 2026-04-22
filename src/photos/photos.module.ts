import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { AuthModule } from '../auth/auth.module';
import { Photo, Provider, Review, ReviewPhoto } from '../entities';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Photo, Provider, Review, ReviewPhoto])],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
