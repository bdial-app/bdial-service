import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewStatus } from '@prisma/client';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class ReviewsService {

  constructor(private prisma: PrismaService,private storageService:StorageService) {}


  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: {
        listingId_reviewerId: {
          listingId: dto.listingId!,
          reviewerId: userId,
        },
      },
    });



    if (existing) {
      throw new ConflictException('You have already reviewed this listing');
    }

    return this.prisma.review.create({
      data: {
        listingId: dto.listingId,
        reviewerId: userId,
        starRating: dto.starRating!,
        reviewText: dto.reviewText,
      },
    });
  }

 
  async getForListing(listingId: string) {
    return this.prisma.review.findMany({
      where: { listingId, status: 'active' },
      orderBy: { postedAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true } },
        photos: true,
      },
    });
  }


  async report(reviewId: string, userId: string, dto: ReportReviewDto) {
    const existing = await this.prisma.reviewReport.findUnique({
      where: {
        reviewId_reporterId: {
          reviewId,
          reporterId: userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already reported');
    }

    return this.prisma.reviewReport.create({
      data: {
        reviewId,
        reporterId: userId,
        reason: dto.reason,
      },
    });
  }


  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        reviewer: { select: { id: true, name: true } },
        photos: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  
  async updateStatus(id: string, status: ReviewStatus, adminId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        status,
        moderatedAt: new Date(),
        moderatedBy: adminId,
      },
    });
  }
  
  async uploadPhoto(reviewId: string, file: Express.Multer.File) {
  
  const review = await this.prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new NotFoundException('Review not found');
  }


  const { url, storageKey } = await this.storageService.upload(
    'reviews',
    file,
  );

 
  const photo = await this.prisma.reviewPhoto.create({
    data: {
      reviewId,
      imageUrl: url,
      storageKey,
    },
  });


  return {
    review_id: reviewId,
    url,
    storageKey,
    image_url: photo.imageUrl,
  };
}


  async findAll(query: any) {
const page = Number(query.page) || 1;
const limit = Number(query.limit) || 10;
const skip = (page - 1) * limit;

const where = {
  reviewer: {
    ...(query.name && {
      name: {
        contains: query.name,
        mode: 'insensitive',
      },
    }),
    ...(query.contact && {
      mobileNumber: {
        contains: query.contact,
      },
    }),
  },
};


const [data, total] = await Promise.all([
  this.prisma.review.findMany({
    skip,
    take: limit,
    orderBy: { postedAt: 'desc' },
    where,
    include: {
      reviewer: {
        select: { id: true, name: true, mobileNumber: true },
      },
    },
  }),
  this.prisma.review.count({ where }),
]);

return {
  data,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
}
}