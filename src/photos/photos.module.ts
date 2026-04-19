import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { AuthModule } from '../auth/auth.module';
import { Photo, Listing, Review, ReviewPhoto } from '../entities';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Photo, Listing, Review, ReviewPhoto])],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
