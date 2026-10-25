import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Review, ReviewPhoto, ReviewReport, Provider, User } from '../entities';
import { AutomationsService } from '../automations/automations.service';
import { CreateReviewDto, ReportReviewDto } from './dto/review.dto';
import { StorageService } from '../storage/storage.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ContentSanitizerService } from '../common/content-sanitizer';
import { compressImage } from '../common/image-processor';
import { GoogleReviewsService } from '../google-reviews/google-reviews.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewPhoto) private reviewPhotoRepo: Repository<ReviewPhoto>,
    @InjectRepository(ReviewReport) private reportRepo: Repository<ReviewReport>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    private storageService: StorageService,
    private notificationDispatch: NotificationDispatchService,
    private contentSanitizer: ContentSanitizerService,
    private googleReviewsService: GoogleReviewsService,
    private automations: AutomationsService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    // Owners can't rate their own business (the app hides the button, the
    // API must refuse too — review links make this easy to try).
    const reviewed = await this.providerRepo.findOne({
      where: { id: dto.providerId },
      select: ['id', 'userId'],
    });
    if (!reviewed) throw new NotFoundException('Business not found');
    if (reviewed.userId === userId) {
      throw new ForbiddenException("You can't review your own business");
    }

    const existing = await this.reviewRepo.findOneBy({
      providerId: dto.providerId!,
      reviewerId: userId,
    });
    if (existing) throw new ConflictException('You have already reviewed this provider');

    // Content moderation: check for profanity
    let flagged = false;
    let flagReason: string | null = null;
    if (dto.reviewText) {
      const check = this.contentSanitizer.check(dto.reviewText);
      if (check.flagged) {
        flagged = true;
        flagReason = `Profanity detected: ${check.flaggedWords.join(', ')}`;
      }
    }

    if (flagged) {
      throw new BadRequestException(
        'Your review contains inappropriate language. Please revise and try again.',
      );
    }

    const review = this.reviewRepo.create({
      providerId: dto.providerId,
      reviewerId: userId,
      starRating: dto.starRating!,
      reviewText: dto.reviewText,
      source: dto.source ?? null,
    });
    const saved = await this.reviewRepo.save(review);

    // Recompute combined rating (includes Google aggregates if linked)
    this.googleReviewsService.recomputeByProviderId(dto.providerId).catch(() => {});

    // Notify the provider about the new review
    const provider = await this.providerRepo.findOneBy({ id: dto.providerId });
    if (provider) {
      this.notificationDispatch.sendToUser(
        provider.userId,
        'review_received',
        'New Review Received',
        `You received a ${dto.starRating}-star review${dto.reviewText ? ': ' + dto.reviewText.substring(0, 80) : ''}`,
        { route: '/provider-details', params: { id: dto.providerId, tab: 'reviews' } },
        undefined,
        undefined,
        'provider',
      ).catch(() => {}); // Fire-and-forget

      // Automated WhatsApp (when switched on): if the owner hasn't seen it in 2 hours.
      const reviewer = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'name'] });
      void this.automations.onReview({
        providerId: provider.id,
        reviewerName: reviewer?.name ?? '',
        stars: dto.starRating,
        text: dto.reviewText,
      });
      // And the customer: their review is live (if they've left the app).
      void this.automations
        .onReviewPublished({
          reviewId: saved.id,
          customerUserId: userId,
          providerId: provider.id,
        })
        .catch(() => {});

      // Written from the owner's review link: tell them it's working.
      if (dto.source === 'link') {
        const viaLink = await this.reviewRepo.count({ where: { providerId: provider.id, source: 'link' } });
        this.notificationDispatch
          .sendTemplated(provider.userId, 'review_link_joined', { count: String(viaLink), brandName: provider.brandName }, undefined, 'provider')
          .catch(() => {});
      }
    }

    return saved;
  }

  async getForProvider(providerId: string, page = 1, limit = 20) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { providerId, status: 'active' },
      order: { postedAt: 'DESC' },
      relations: ['reviewer', 'photos'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async uploadPhoto(reviewId: string, file: Express.Multer.File, userId?: string) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException('Review not found');

    // Only the review author can upload photos to their review
    if (userId && review.reviewerId !== userId) {
      throw new ForbiddenException('You can only upload photos to your own reviews');
    }

    const compressed = await compressImage(file, 'standard');
    const { url, storageKey } = await this.storageService.upload('reviews', compressed);
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

    // Content moderation: check reply text for profanity
    const check = this.contentSanitizer.check(replyText);
    if (check.flagged) {
      throw new BadRequestException(
        'Your reply contains inappropriate language. Please revise and try again.',
      );
    }

    const firstReply = !review.replyText;
    review.replyText = replyText;
    review.repliedAt = new Date();
    const saved = await this.reviewRepo.save(review);

    // Let the customer know the owner answered them (first reply only).
    if (firstReply && review.reviewerId) {
      this.notificationDispatch
        .sendTemplated(
          review.reviewerId,
          'review_replied',
          { brandName: provider.brandName, reply: replyText.slice(0, 120) },
          { params: { id: provider.id } },
          'customer',
        )
        .catch(() => {});
    }
    return saved;
  }
}
