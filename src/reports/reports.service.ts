import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Report } from '../entities/report.entity';
import { Provider, Product, Message, User } from '../entities';
import { CreateReportDto, REASONS_BY_ENTITY_TYPE } from './dto/create-report.dto';

const MAX_REPORTS_PER_DAY = 5;
const DISMISSAL_COOLDOWN_DAYS = 30;
const ACCOUNT_MIN_AGE_HOURS = 24;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async createReport(reporterUser: any, dto: CreateReportDto) {
    const reporter = await this.userRepo.findOneBy({ id: reporterUser.id });
    if (!reporter) throw new ForbiddenException('User not found');

    // 1. Account age gate — must be 24h+ old
    const accountAge = Date.now() - new Date(reporter.createdAt).getTime();
    const minAge = ACCOUNT_MIN_AGE_HOURS * 60 * 60 * 1000;
    if (accountAge < minAge) {
      throw new ForbiddenException(
        'Your account must be at least 24 hours old to submit reports.',
      );
    }

    // 2. Validate reason is valid for entity type
    const validReasons = REASONS_BY_ENTITY_TYPE[dto.entityType];
    if (!validReasons?.includes(dto.reason)) {
      throw new BadRequestException(
        `Reason '${dto.reason}' is not valid for entity type '${dto.entityType}'.`,
      );
    }

    // 3. Target existence + self-report prevention
    await this.validateTargetAndOwnership(reporter.id, dto);

    // 4. Duplicate check — no active report for same (reporter, target)
    const existingActive = await this.reportRepo.findOne({
      where: {
        reporterId: reporter.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: In(['pending', 'under_review']),
      },
    });
    if (existingActive) {
      throw new ConflictException('You have already reported this. Our team is reviewing it.');
    }

    // 5. Dismissal cooldown — 30 days after admin dismissed same pair
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - DISMISSAL_COOLDOWN_DAYS);
    const recentDismissed = await this.reportRepo.findOne({
      where: {
        reporterId: reporter.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: 'dismissed' as any,
        reviewedAt: MoreThan(cooldownDate),
      },
    });
    if (recentDismissed) {
      throw new ForbiddenException(
        'Your previous report on this was reviewed. You can report again after 30 days.',
      );
    }

    // 6. Daily rate limit — max 5 reports per user per 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.reportRepo.count({
      where: {
        reporterId: reporter.id,
        createdAt: MoreThan(oneDayAgo),
      },
    });
    if (recentCount >= MAX_REPORTS_PER_DAY) {
      throw new ForbiddenException(
        'You have reached the daily report limit. Please try again tomorrow.',
      );
    }

    // 7. Save report
    const report = this.reportRepo.create({
      reporterId: reporter.id,
      entityType: dto.entityType,
      entityId: dto.entityId,
      reason: dto.reason,
      description: dto.description || null,
      status: 'pending',
    });
    await this.reportRepo.save(report);

    return { message: 'Report received. Our team will review it shortly.' };
  }

  private async validateTargetAndOwnership(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<void> {
    switch (dto.entityType) {
      case 'provider': {
        const provider = await this.providerRepo.findOneBy({ id: dto.entityId });
        if (!provider || provider.status === 'suspended') {
          throw new NotFoundException('Provider not found.');
        }
        if (provider.userId === reporterId) {
          throw new BadRequestException('You cannot report your own business.');
        }
        break;
      }
      case 'product': {
        const product = await this.productRepo.findOne({
          where: { id: dto.entityId },
          relations: ['provider'],
        });
        if (!product || !product.isActive) {
          throw new NotFoundException('Product not found.');
        }
        if (product.provider?.userId === reporterId) {
          throw new BadRequestException('You cannot report your own product.');
        }
        break;
      }
      case 'message': {
        const message = await this.messageRepo.findOneBy({ id: dto.entityId });
        if (!message || message.deletedAt) {
          throw new NotFoundException('Message not found.');
        }
        if (message.senderId === reporterId) {
          throw new BadRequestException('You cannot report your own message.');
        }
        break;
      }
      default:
        throw new BadRequestException('Invalid entity type.');
    }
  }
}
