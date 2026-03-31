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

  async uploadListingPhotos(
    listingId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    // Verify ownership
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { _count: { select: { photos: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();

    const existing = (listing as any)._count.photos;
    if (existing + files.length > 10) {
      throw new BadRequestException(
        `Max 10 photos per listing. You have ${existing}, uploading ${files.length} would exceed the limit.`,
      );
    }

    const uploaded = await Promise.all(
      files.map(async (file, i) => {
        const { url, storageKey } = await this.storage.upload('listings', file);
        return this.prisma.photo.create({
          data: {
            listingId,
            imageUrl: url,
            storageKey,
            displayOrder: existing + i,
          },
        });
      }),
    );

    return uploaded;
  }

  async deleteListingPhoto(photoId: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      include: { listing: true },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.listing.providerId !== userId) throw new ForbiddenException();

    await this.storage.delete(photo.storageKey);
    await this.prisma.photo.delete({ where: { id: photoId } });
    return { message: 'Photo deleted' };
  }

  async reorderPhotos(listingId: string, userId: string, orderedIds: string[]) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();

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
