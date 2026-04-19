import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo, Listing, Review, ReviewPhoto } from '../entities';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(Listing) private listingRepo: Repository<Listing>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewPhoto) private reviewPhotoRepo: Repository<ReviewPhoto>,
    private storage: StorageService,
  ) {}

  async uploadListingPhotos(listingId: string, userId: string, files: Express.Multer.File[]) {
    const listing = await this.listingRepo.findOneBy({ id: listingId });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();

    const existing = await this.photoRepo.count({ where: { listingId } });
    if (existing + files.length > 10) {
      throw new BadRequestException(`Max 10 photos per listing. You have ${existing}, uploading ${files.length} would exceed the limit.`);
    }

    const uploaded = await Promise.all(
      files.map(async (file, i) => {
        const { url, storageKey } = await this.storage.upload('listings', file);
        const photo = this.photoRepo.create({ listingId, imageUrl: url, storageKey, displayOrder: existing + i });
        return this.photoRepo.save(photo);
      }),
    );
    return uploaded;
  }

  async deleteListingPhoto(photoId: string, userId: string) {
    const photo = await this.photoRepo.findOne({ where: { id: photoId }, relations: ['listing'] });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.listing.providerId !== userId) throw new ForbiddenException();
    await this.storage.delete(photo.storageKey);
    await this.photoRepo.remove(photo);
    return { message: 'Photo deleted' };
  }

  async reorderPhotos(listingId: string, userId: string, orderedIds: string[]) {
    const listing = await this.listingRepo.findOneBy({ id: listingId });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();
    await Promise.all(orderedIds.map((id, index) => this.photoRepo.update(id, { displayOrder: index })));
    return { message: 'Order updated' };
  }

  async uploadReviewPhotos(reviewId: string, userId: string, files: Express.Multer.File[]) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException('Review not found');
    if (review.reviewerId !== userId) throw new ForbiddenException();

    const existing = await this.reviewPhotoRepo.count({ where: { reviewId } });
    if (existing + files.length > 3) {
      throw new BadRequestException(`Max 3 photos per review. Already have ${existing}.`);
    }

    return Promise.all(
      files.map(async (file) => {
        const { url, storageKey } = await this.storage.upload('reviews', file);
        const p = this.reviewPhotoRepo.create({ reviewId, imageUrl: url, storageKey });
        return this.reviewPhotoRepo.save(p);
      }),
    );
  }

  async deleteReviewPhoto(photoId: string, userId: string) {
    const photo = await this.reviewPhotoRepo.findOne({ where: { id: photoId }, relations: ['review'] });
    if (!photo) throw new NotFoundException('Review photo not found');
    if (photo.review.reviewerId !== userId) throw new ForbiddenException();
    await this.storage.delete(photo.storageKey);
    await this.reviewPhotoRepo.remove(photo);
    return { message: 'Photo deleted' };
  }
}
