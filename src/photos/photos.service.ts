import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo, Provider, Review, ReviewPhoto } from '../entities';
import { StorageService } from '../storage/storage.service';
import { compressImage, compressImages } from '../common/image-processor';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewPhoto) private reviewPhotoRepo: Repository<ReviewPhoto>,
    private storage: StorageService,
  ) {}

  async uploadProviderPhotos(providerId: string, userId: string, files: Express.Multer.File[]) {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();

    const existing = await this.photoRepo.count({ where: { providerId } });
    if (existing + files.length > 10) {
      throw new BadRequestException(`Max 10 photos per provider. You have ${existing}, uploading ${files.length} would exceed the limit.`);
    }

    const compressed = await compressImages(files, 'standard');
    const uploaded = await Promise.all(
      compressed.map(async (file, i) => {
        const { url, storageKey } = await this.storage.upload('providers', file);
        const photo = this.photoRepo.create({ providerId, imageUrl: url, storageKey, displayOrder: existing + i });
        return this.photoRepo.save(photo);
      }),
    );
    return uploaded;
  }

  async deleteProviderPhoto(photoId: string, userId: string) {
    const photo = await this.photoRepo.findOne({ where: { id: photoId }, relations: ['provider'] });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.provider.userId !== userId) throw new ForbiddenException();
    await this.storage.delete(photo.storageKey);
    await this.photoRepo.remove(photo);
    return { message: 'Photo deleted' };
  }

  async reorderPhotos(providerId: string, userId: string, orderedIds: string[]) {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();
    await Promise.all(orderedIds.map((id, index) => this.photoRepo.update(id, { displayOrder: index })));
    return { message: 'Order updated' };
  }

  async uploadProviderProfileImage(
    providerId: string,
    userId: string,
    field: string,
    file: Express.Multer.File,
  ) {
    const allowedFields = ['bannerImageUrl', 'profilePhotoUrl'];
    if (!allowedFields.includes(field)) {
      throw new BadRequestException(`Field must be one of: ${allowedFields.join(', ')}`);
    }
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();

    const preset = field === 'bannerImageUrl' ? 'banner' : 'avatar';
    const compressed = await compressImage(file, preset);
    const { url } = await this.storage.upload('providers', compressed);
    await this.providerRepo.update(providerId, { [field]: url });
    return { url, field };
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
        const compressed = await compressImage(file, 'standard');
        const { url, storageKey } = await this.storage.upload('reviews', compressed);
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
