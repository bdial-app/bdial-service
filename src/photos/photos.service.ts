import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PhotosService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async uploadProviderPhotos(
    providerId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    // Verify ownership
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();

    // Check existing photos count
    const existingPhotos = await this.prisma.photo.count({
      where: { providerId },
    });
    if (existingPhotos + files.length > 10) {
      throw new BadRequestException(
        `Max 10 photos per provider. You have ${existingPhotos}, uploading ${files.length} would exceed the limit.`,
      );
    }

    const uploaded = await Promise.all(
      files.map(async (file, i) => {
        const { url, storageKey } = await this.storage.upload('providers', file);
        return this.prisma.photo.create({
          data: {
            providerId,
            imageUrl: url,
            storageKey,
            displayOrder: existingPhotos + i,
          },
        });
      }),
    );

    return uploaded;
  }

  async deleteProviderPhoto(photoId: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    
    const provider = await this.prisma.provider.findUnique({
      where: { id: photo.providerId },
    });
    if (!provider || provider.userId !== userId) throw new ForbiddenException();

    await this.storage.delete(photo.storageKey);
    await this.prisma.photo.delete({ where: { id: photoId } });
    return { message: 'Photo deleted' };
  }

  async reorderProviderPhotos(providerId: string, userId: string, orderedIds: string[]) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();

    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.photo.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );
    return { message: 'Order updated' };
  }

  async uploadReviewPhotos(
    reviewId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { _count: { select: { photos: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.reviewerId !== userId) throw new ForbiddenException();

    const existing = (review as any)._count.photos;
    if (existing + files.length > 3) {
      throw new BadRequestException(
        `Max 3 photos per review. Already have ${existing}.`,
      );
    }

    return Promise.all(
      files.map(async (file) => {
        const { url, storageKey } = await this.storage.upload('reviews', file);
        return this.prisma.reviewPhoto.create({
          data: { reviewId, imageUrl: url, storageKey },
        });
      }),
    );
  }

  async deleteReviewPhoto(photoId: string, userId: string) {
    const photo = await this.prisma.reviewPhoto.findUnique({
      where: { id: photoId },
      include: { review: true },
    });
    if (!photo) throw new NotFoundException('Review photo not found');
    if (photo.review.reviewerId !== userId) throw new ForbiddenException();

    await this.storage.delete(photo.storageKey);
    await this.prisma.reviewPhoto.delete({ where: { id: photoId } });
    return { message: 'Photo deleted' };
  }
}
