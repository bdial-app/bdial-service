import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Review, ReviewPhoto, ReviewReport, Provider } from '../entities';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewPhoto) private reviewPhotoRepo: Repository<ReviewPhoto>,
    @InjectRepository(ReviewReport) private reportRepo: Repository<ReviewReport>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    private storageService: StorageService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.reviewRepo.findOneBy({
      providerId: dto.providerId!,
      reviewerId: userId,
    });
    if (existing) throw new ConflictException('You have already reviewed this provider');

    const review = this.reviewRepo.create({
      providerId: dto.providerId,
      reviewerId: userId,
      starRating: dto.starRating!,
      reviewText: dto.reviewText,
    });
    return this.reviewRepo.save(review);
  }

  async getForProvider(providerId: string) {
    return this.reviewRepo.find({
      where: { providerId, status: 'active' },
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

    return { reviewId, url, storageKey, imageUrl: saved.imageUrl };
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const qb = this.reviewRepo.createQueryBuilder('review')
      .leftJoinAndSelect('review.reviewer', 'reviewer')
      .orderBy('review.postedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.name) {
      qb.andWhere('reviewer.name ILIKE :name', { name: `%${query.name}%` });
    }
    if (query.contact) {
      qb.andWhere('reviewer.mobileNumber ILIKE :contact', { contact: `%${query.contact}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async replyToReview(userId: string, reviewId: string, replyText: string) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException('Review not found');

    // Verify user owns the provider
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new ForbiddenException('Not a provider');
    if (review.providerId !== provider.id) throw new ForbiddenException();

    review.replyText = replyText;
    review.repliedAt = new Date();
    return this.reviewRepo.save(review);
  }
}
