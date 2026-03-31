import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { listingId_reviewerId: { listingId: dto.listingId, reviewerId: userId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this listing');

    return this.prisma.review.create({
      data: {
        listingId: dto.listingId,
        reviewerId: userId,
        starRating: dto.starRating,
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
      where: { reviewId_reporterId: { reviewId, reporterId: userId } },
    });
    if (existing) throw new ConflictException('Already reported');

    return this.prisma.reviewReport.create({
      data: { reviewId, reporterId: userId, reason: dto.reason },
    });
  }
}
