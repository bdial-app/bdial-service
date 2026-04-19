import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Review, ReviewPhoto, ReviewReport } from '../entities';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewPhoto) private reviewPhotoRepo: Repository<ReviewPhoto>,
    @InjectRepository(ReviewReport) private reportRepo: Repository<ReviewReport>,
    private storageService: StorageService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.reviewRepo.findOneBy({
      listingId: dto.listingId!,
      reviewerId: userId,
    });
    if (existing) throw new ConflictException('You have already reviewed this listing');

    const review = this.reviewRepo.create({
      listingId: dto.listingId,
      reviewerId: userId,
      starRating: dto.starRating!,
      reviewText: dto.reviewText,
    });
    return this.reviewRepo.save(review);
  }

  async getForListing(listingId: string) {
    return this.reviewRepo.find({
      where: { listingId, status: 'active' },
      order: { postedAt: 'DESC' },
      relations: ['reviewer', 'photos'],
    });
  }

  async report(reviewId: string, userId: string, dto: ReportReviewDto) {
    const existing = await this.reportRepo.findOneBy({
      reviewId,
      reporterId: userId,
    });
    if (existing) throw new ConflictException('Already reported');

    const report = this.reportRepo.create({
      reviewId,
      reporterId: userId,
      reason: dto.reason,
    });
    return this.reportRepo.save(report);
  }

  async findOne(id: string) {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['reviewer', 'photos'],
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async updateStatus(id: string, status: string, adminId: string) {
    const review = await this.reviewRepo.findOneBy({ id });
    if (!review) throw new NotFoundException('Review not found');
    review.status = status;
    review.moderatedAt = new Date();
    review.moderatedBy = adminId;
    return this.reviewRepo.save(review);
  }

  async uploadPhoto(reviewId: string, file: Express.Multer.File) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException('Review not found');

    const { url, storageKey } = await this.storageService.upload('reviews', file);
    const photo = this.reviewPhotoRepo.create({ reviewId, imageUrl: url, storageKey });
    const saved = await this.reviewPhotoRepo.save(photo);

    return { review_id: reviewId, url, storageKey, image_url: saved.imageUrl };
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const qb = this.reviewRepo.createQueryBuilder('review')
      .leftJoinAndSelect('review.reviewer', 'reviewer')
      .orderBy('review.posted_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.name) {
      qb.andWhere('reviewer.name ILIKE :name', { name: `%${query.name}%` });
    }
    if (query.contact) {
      qb.andWhere('reviewer.mobile_number ILIKE :contact', { contact: `%${query.contact}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
