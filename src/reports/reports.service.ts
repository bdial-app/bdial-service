import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, Not, IsNull } from 'typeorm';
import { Report } from '../entities/report.entity';
import { Provider, Product, Message, User } from '../entities';
import { CreateReportDto, REASONS_BY_ENTITY_TYPE } from './dto/create-report.dto';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ContentSanitizerService } from '../common/content-sanitizer';
import { Logger } from '@nestjs/common';

const MAX_REPORTS_PER_DAY = 5;
const DISMISSAL_COOLDOWN_DAYS = 30;
const ACCOUNT_MIN_AGE_HOURS = 24;
const HIGH_SEVERITY_REASONS = ['fraud_scam', 'fraud', 'fake_business', 'fake_product', 'counterfeit'];
const FRAUD_SCORE_THRESHOLD = 3.0;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly contentSanitizer: ContentSanitizerService,
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

    // 3b. Content moderation on description
    if (dto.description) {
      const check = this.contentSanitizer.check(dto.description);
      if (check.flagged) {
        throw new BadRequestException('Your report description contains inappropriate language. Please revise.');
      }
    }

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

    // Notify reporter: report received confirmation
    this.notificationDispatch.sendTemplated(reporter.id, 'report_submitted', {}).catch(() => {});

    // 8. Fraud score check — flag for admin if threshold exceeded
    if (HIGH_SEVERITY_REASONS.includes(dto.reason)) {
      this.computeFraudScoreAndNotify(dto.entityType, dto.entityId).catch((err) =>
        this.logger.error(`Fraud score computation failed: ${err.message}`),
      );
    }

    return { message: 'Report received. Our team will review it shortly.' };
  }

  /**
   * Compute a credibility-weighted fraud score for an entity.
   * If score >= threshold, mark pending reports as under_review and notify all admins.
   */
  private async computeFraudScoreAndNotify(entityType: string, entityId: string) {
    // Get all high-severity reports on this entity from unique reporters
    const highSeverityReports = await this.reportRepo.find({
      where: {
        entityType: entityType as any,
        entityId,
        reason: In(HIGH_SEVERITY_REASONS as any[]),
      },
      select: ['reporterId'],
    });

    // Deduplicate by reporterId
    const uniqueReporterIds = [...new Set(
      highSeverityReports.map((r) => r.reporterId).filter(Boolean),
    )] as string[];

    if (uniqueReporterIds.length < 2) return; // Need at least 2 unique reporters

    // Compute credibility weight for each reporter
    let fraudScore = 0;
    for (const reporterId of uniqueReporterIds) {
      const [totalFiled, dismissedCount] = await Promise.all([
        this.reportRepo.count({ where: { reporterId } }),
        this.reportRepo.count({ where: { reporterId, status: 'dismissed' as any } }),
      ]);

      let weight = 1.0;
      if (totalFiled >= 3) {
        const credibilityRatio = (totalFiled - dismissedCount) / totalFiled;
        if (credibilityRatio >= 0.7) weight = 1.5;
        else if (credibilityRatio < 0.4) weight = 0.5;
      }
      fraudScore += weight;
    }

    if (fraudScore < FRAUD_SCORE_THRESHOLD) return;

    this.logger.warn(
      `Fraud score ${fraudScore.toFixed(1)} for ${entityType}:${entityId} — flagging for admin review`,
    );

    // Mark all pending reports on this entity as under_review
    await this.reportRepo.update(
      { entityType: entityType as any, entityId, status: 'pending' as any },
      { status: 'under_review' },
    );

    // Resolve target name for notification
    let targetName = `${entityType} ${entityId.slice(0, 8)}`;
    try {
      if (entityType === 'provider') {
        const provider = await this.providerRepo.findOne({ where: { id: entityId }, select: ['brandName'] });
        if (provider?.brandName) targetName = provider.brandName;
      } else if (entityType === 'product') {
        const product = await this.providerRepo.manager.getRepository('Product')
          .findOne({ where: { id: entityId }, select: ['name'] });
        if ((product as any)?.name) targetName = (product as any).name;
      }
    } catch {}

    // Notify all admin users
    const admins = await this.userRepo.find({ where: { role: 'admin' as any, status: 'active' as any } });
    for (const admin of admins) {
      this.notificationDispatch.sendToUser(
        admin.id,
        'system_announcement',
        '⚠️ Suspected Fraud Alert',
        `"${targetName}" has ${uniqueReporterIds.length} fraud reports from credible users (score: ${fraudScore.toFixed(1)}). Immediate review recommended.`,
        { route: '/reports' },
      ).catch(() => {});
    }
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
