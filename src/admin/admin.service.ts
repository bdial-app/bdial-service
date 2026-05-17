import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Not, In, MoreThan, ILike, Between } from 'typeorm';
import { Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, ProviderCategory, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting, Photo, ReviewPhoto, ServiceableCity, UserArchive } from '../entities';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { BugReport } from '../bug-reports/bug-report.entity';
import { AdminCreateUserDto, AdminCreateProviderWithUserDto } from './dto/admin-create-user.dto';
import { StorageService } from '../storage/storage.service';
import { OtpService } from '../otp/otp.service';
import { compressImage, compressImages } from '../common/image-processor';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { ServiceableCitiesService } from '../serviceable-cities/serviceable-cities.service';
import { ContentSanitizerService } from '../common/content-sanitizer';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verificationRepo: Repository<Verification>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewReport) private reportRepo: Repository<ReviewReport>,
    @InjectRepository(Report) private entityReportRepo: Repository<Report>,
    @InjectRepository(ProviderWarning) private warningRepo: Repository<ProviderWarning>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(PromoBanner) private bannerRepo: Repository<PromoBanner>,
    @InjectRepository(SponsoredListing) private sponsoredRepo: Repository<SponsoredListing>,
    @InjectRepository(ProviderOffer) private offerRepo: Repository<ProviderOffer>,
    @InjectRepository(ProviderBadge) private badgeRepo: Repository<ProviderBadge>,
    @InjectRepository(ProviderAnalyticsEvent) private analyticsEventRepo: Repository<ProviderAnalyticsEvent>,
    @InjectRepository(ProviderLead) private leadRepo: Repository<ProviderLead>,
    @InjectRepository(SearchLog) private searchLogRepo: Repository<SearchLog>,
    @InjectRepository(AdEvent) private adEventRepo: Repository<AdEvent>,
    @InjectRepository(AppInvite) private inviteRepo: Repository<AppInvite>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
    @InjectRepository(BugReport) private bugReportRepo: Repository<BugReport>,
    @InjectRepository(ProviderCategory) private providerCatRepo: Repository<ProviderCategory>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(ReviewPhoto) private reviewPhotoRepo: Repository<ReviewPhoto>,
    @InjectRepository(UserArchive) private userArchiveRepo: Repository<UserArchive>,
    private dataSource: DataSource,
    private notificationDispatch: NotificationDispatchService,
    private storageService: StorageService,
    private otpService: OtpService,
    private supabaseAuthService: SupabaseAuthService,
    private serviceableCitiesService: ServiceableCitiesService,
    private contentSanitizer: ContentSanitizerService,
  ) {}

  private assertAdmin(user: any) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  async getDashboard(admin: any) {
    this.assertAdmin(admin);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      pendingProviders, totalProviders, totalUsers, pendingVerifications,
      flaggedReviews, openReports, totalProducts, totalReviews,
      newUsersThisWeek, newUsersThisMonth, newProvidersThisWeek,
      totalSearches, totalLeads, totalConversations, totalInvites,
      activeOffers, activeSponsorships, activeBanners,
      pendingSponsorships, pendingOffers,
    ] = await Promise.all([
      this.providerRepo.count({ where: { status: 'pending' } }),
      this.providerRepo.count(),
      this.userRepo.count({ where: { status: 'active' } }),
      this.verificationRepo.count({ where: { aadhaarStatus: 'pending' } }),
      this.reportRepo.count({ where: { status: 'pending' } }),
      this.entityReportRepo.count({ where: { status: 'pending' } }),
      this.productRepo.count({ where: { isActive: true } }),
      this.reviewRepo.count(),
      this.userRepo.count({ where: { createdAt: MoreThan(oneWeekAgo) } }),
      this.userRepo.count({ where: { createdAt: MoreThan(oneMonthAgo) } }),
      this.providerRepo.count({ where: { createdAt: MoreThan(oneWeekAgo) } }),
      this.searchLogRepo.count(),
      this.leadRepo.count(),
      this.conversationRepo.count(),
      this.inviteRepo.count(),
      this.offerRepo.count({ where: { isActive: true } }),
      this.sponsoredRepo.count({ where: { isActive: true } }),
      this.bannerRepo.count({ where: { isActive: true } }),
      this.sponsoredRepo.count({ where: { approvalStatus: 'pending_approval' } }),
      this.offerRepo.count({ where: { approvalStatus: 'pending_approval' } }),
    ]);

    // Extended stats via raw queries
    const [
      revenueStats, leadBreakdown, adStats, womenLedPending,
      topCities, activeSubscriptions, totalMessages,
    ] = await Promise.all([
      this.dataSource.query(`
        SELECT COALESCE(SUM(amount)::int, 0) AS "totalRevenue",
               COALESCE(SUM(CASE WHEN created_at >= $1 THEN amount ELSE 0 END)::int, 0) AS "revenueThisMonth",
               COUNT(*)::int AS "totalPayments"
        FROM payments WHERE status = 'succeeded'
      `, [oneMonthAgo]).then(r => r[0] || { totalRevenue: 0, revenueThisMonth: 0, totalPayments: 0 }),
      this.dataSource.query(`
        SELECT tier, COUNT(*)::int AS count FROM provider_leads GROUP BY tier
      `).then(rows => {
        const map: Record<string, number> = {};
        for (const r of rows) map[r.tier] = r.count;
        return { hot: map['hot'] || 0, warm: map['warm'] || 0, cold: map['cold'] || 0 };
      }),
      this.dataSource.query(`
        SELECT
          COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END)::int, 0) AS impressions,
          COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END)::int, 0) AS clicks
        FROM ad_events
      `).then(r => r[0] || { impressions: 0, clicks: 0 }),
      this.providerRepo.count({ where: { womenLedStatus: 'pending' as any } }),
      this.dataSource.query(`
        SELECT city, COUNT(*)::int AS count FROM providers
        WHERE city IS NOT NULL AND status IN ('active','unverified')
        GROUP BY city ORDER BY count DESC LIMIT 8
      `),
      this.dataSource.query(`
        SELECT COUNT(*)::int AS count FROM subscriptions WHERE status = 'active'
      `).then(r => r[0]?.count || 0),
      this.messageRepo.count(),
    ]);

    return {
      pendingProviders, totalProviders, totalUsers, pendingVerifications,
      flaggedReviews, openReports, totalProducts, totalReviews,
      newUsersThisWeek, newUsersThisMonth, newProvidersThisWeek,
      totalSearches, totalLeads, totalConversations, totalInvites,
      activeOffers, activeSponsorships, activeBanners,
      pendingSponsorships, pendingOffers,
      // Extended
      totalRevenue: revenueStats.totalRevenue,
      revenueThisMonth: revenueStats.revenueThisMonth,
      totalPayments: revenueStats.totalPayments,
      activeSubscriptions,
      leadBreakdown,
      adImpressions: adStats.impressions,
      adClicks: adStats.clicks,
      adCtr: adStats.impressions > 0 ? Math.round((adStats.clicks / adStats.impressions) * 10000) / 100 : 0,
      womenLedPending,
      topCities,
      totalMessages,
    };
  }

  async getPendingProviders(admin: any) {
    this.assertAdmin(admin);
    return this.providerRepo.find({
      where: { status: In(['pending', 'in_review']) },
      relations: ['user', 'providerCategories', 'providerCategories.category'],
      order: { createdAt: 'ASC' },
    });
  }

  async approveProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    await this.providerRepo.update(providerId, { status: 'active' });
    const provider = await this.providerRepo.findOneBy({ id: providerId });

    // Notify provider of approval
    if (provider) {
      this.notificationDispatch.sendToUser(
        provider.userId,
        'provider_status',
        'Provider Approved!',
        'Congratulations! Your provider profile has been approved and is now live.',
        { route: '/provider-details', params: { id: providerId } },
        undefined,
        undefined,
        'provider',
      ).catch(() => {});
    }

    return provider;
  }

  async suspendProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    await this.providerRepo.update(providerId, { status: 'suspended' });
    const provider = await this.providerRepo.findOneBy({ id: providerId });

    // Notify provider of suspension
    if (provider) {
      this.notificationDispatch.sendToUser(
        provider.userId,
        'provider_status',
        'Provider Profile Suspended',
        'Your provider profile has been suspended. Please contact support for details.',
        { route: '/provider-details', params: { id: providerId } },
        undefined,
        undefined,
        'provider',
      ).catch(() => {});
    }

    return provider;
  }

  async unsuspendProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new Error('Provider not found');
    if (provider.status !== 'suspended') throw new Error('Provider is not suspended');

    // Restore to active status
    await this.providerRepo.update(providerId, { status: 'active' });

    // Notify provider of suspension revocation
    if (provider) {
      this.notificationDispatch.sendToUser(
        provider.userId,
        'provider_status',
        'Suspension Revoked',
        'Your provider profile suspension has been revoked. Your profile is now active again.',
        { route: '/provider-details', params: { id: providerId } },
        undefined,
        undefined,
        'provider',
      ).catch(() => {});
    }

    return { ...provider, status: 'active' };
  }

  async getVerifications(admin: any, page?: number, rows?: number, status?: string, search?: string) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, rows || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.verificationRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.user', 'user');

    if (status) {
      qb.andWhere('v.aadhaar_status = :status', { status });
    }
    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.mobile_number ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('v.createdAt', 'ASC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getVerificationStats(admin: any) {
    this.assertAdmin(admin);
    const [pending, approved, rejected, total] = await Promise.all([
      this.verificationRepo.count({ where: { aadhaarStatus: 'pending' } }),
      this.verificationRepo.count({ where: { aadhaarStatus: 'approved' } }),
      this.verificationRepo.count({ where: { aadhaarStatus: 'rejected' } }),
      this.verificationRepo.count(),
    ]);
    return { pending, approved, rejected, total };
  }

  async getVerificationById(admin: any, verificationId: string) {
    this.assertAdmin(admin);
    const verification = await this.verificationRepo.findOne({
      where: { id: verificationId },
      relations: ['user', 'reviewer'],
    });
    if (!verification) {
      throw new NotFoundException(`Verification with ID ${verificationId} not found`);
    }
    return verification;
  }

  async reviewVerification(
    admin: any,
    verificationId: string,
    aadhaarStatus: 'approved' | 'rejected',
    ijamatStatus?: string,
    adminNotes?: string,
  ) {
    this.assertAdmin(admin);
    const data: any = {
      aadhaarStatus,
      adminNotes,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
    };
    if (ijamatStatus) data.ijamatStatus = ijamatStatus;

    // Update overall status based on aadhaar review result
    data.status = aadhaarStatus;

    await this.verificationRepo.update(verificationId, data);

    const verification = await this.verificationRepo.findOne({
      where: { id: verificationId },
      relations: ['user'],
    });

    // If approved, also activate the provider
    if (verification && aadhaarStatus === 'approved') {
      const provider = await this.providerRepo.findOneBy({ userId: verification.userId });
      if (provider && provider.status === 'unverified') {
        provider.status = 'active';
        await this.providerRepo.save(provider);
      }
    }

    // Notify user of verification result
    if (verification) {
      const title = aadhaarStatus === 'approved'
        ? 'Verification Approved!'
        : 'Verification Update';
      const body = aadhaarStatus === 'approved'
        ? 'Your documents have been verified successfully.'
        : 'Your verification was not approved. Please review and resubmit your documents.';
      this.notificationDispatch.sendToUser(
        verification.userId,
        'verification_update',
        title,
        body,
        { route: '/provider-onboarding/verify' },
        undefined,
        undefined,
        'provider',
      ).catch(() => {});
    }

    return verification;
  }

  async removeReview(admin: any, reviewId: string) {
    this.assertAdmin(admin);
    await this.reviewRepo.update(reviewId, {
      status: 'removed',
      moderatedAt: new Date(),
      moderatedBy: admin.id,
    });
    return this.reviewRepo.findOneBy({ id: reviewId });
  }

  async getPendingReports(admin: any) {
    this.assertAdmin(admin);
    return this.reportRepo.find({
      where: { status: 'pending' },
      relations: ['review', 'reporter'],
    });
  }

  async pauseUser(admin: any, userId: string) {
    this.assertAdmin(admin);
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['provider'] });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') throw new BadRequestException('Cannot pause admin users');
    if (user.status === 'paused') throw new BadRequestException('User is already paused');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Set status to paused
      await queryRunner.manager.update(User, userId, {
        status: 'paused',
        pausedAt: new Date(),
      });

      // 2. Ban Supabase user (blocks all SSO re-login)
      if (user.supabaseId) {
        await this.supabaseAuthService.banUser(user.supabaseId);
      }

      // 3. Hide provider if exists
      if (user.provider) {
        await queryRunner.manager.update(Provider, user.provider.id, {
          isAvailable: false,
        });
      }

      // 4. Deactivate chat participations
      await queryRunner.manager.update(
        ConversationParticipant,
        { userId },
        { isActive: false },
      );

      await queryRunner.commitTransaction();
      await this.createAuditLog(admin.id, 'pause_user', 'user', userId, { status: user.status }, { status: 'paused' }, 'Admin paused user');
      return { ...user, status: 'paused', pausedAt: new Date() };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateVerificationStatus(
    admin: any,
    verificationId: string,
    aadhaarStatus?: 'pending' | 'approved' | 'rejected',
    ijamatStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted',
    status?: 'pending' | 'approved' | 'rejected',
  ) {
    this.assertAdmin(admin);
    const verification = await this.verificationRepo.findOneBy({ id: verificationId });
    if (!verification) {
      throw new NotFoundException(`Verification with ID ${verificationId} not found`);
    }
    const data: any = {};
    if (aadhaarStatus) data.aadhaarStatus = aadhaarStatus;
    if (ijamatStatus) data.ijamatStatus = ijamatStatus;
    if (status) data.status = status;
    await this.verificationRepo.update(verificationId, data);
    return this.verificationRepo.findOneBy({ id: verificationId });
  }

  // ============================================
  // Report Management
  // ============================================

  async getReportQueue(
    admin: any,
    page?: number,
    rows?: number,
    status?: string,
    entityType?: string,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, rows || 10));
    const skip = (currentPage - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    const [reports, totalCount] = await this.entityReportRepo.findAndCount({
      where,
      relations: ['reporter'],
      order: { createdAt: 'ASC' },
      skip,
      take: pageSize,
    });

    // Hydrate each report with target entity summary
    const hydratedReports = await Promise.all(
      reports.map(async (report) => {
        let targetSummary: { name: string; imageUrl?: string; status?: string; totalReports: number } | null = null;
        try {
          const totalReports = await this.entityReportRepo.count({
            where: { entityType: report.entityType, entityId: report.entityId },
          });
          if (report.entityType === 'provider') {
            const provider = await this.providerRepo.findOne({
              where: { id: report.entityId },
              select: ['id', 'brandName', 'profilePhotoUrl', 'status'],
            });
            if (provider) {
              targetSummary = {
                name: provider.brandName || 'Unknown Provider',
                imageUrl: provider.profilePhotoUrl || undefined,
                status: provider.status,
                totalReports,
              };
            }
          } else if (report.entityType === 'product') {
            const product: any = await this.providerRepo.manager
              .getRepository('Product')
              .findOne({ where: { id: report.entityId }, relations: ['provider'] });
            if (product) {
              targetSummary = {
                name: product.name || 'Unknown Product',
                imageUrl: product.photos?.[0]?.url || undefined,
                status: product.isActive ? 'active' : 'inactive',
                totalReports,
              };
            }
          } else if (report.entityType === 'message') {
            targetSummary = { name: 'Message', totalReports };
          }
        } catch {
          // Silently ignore hydration errors — target may have been deleted
        }
        return { ...report, targetSummary };
      }),
    );

    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      data: hydratedReports,
      pagination: {
        currentPage,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }

  async getReportDetail(admin: any, reportId: string) {
    this.assertAdmin(admin);
    const report = await this.entityReportRepo.findOne({
      where: { id: reportId },
      relations: ['reporter', 'reviewer'],
    });
    if (!report) throw new NotFoundException('Report not found');

    // Reporter credibility stats
    const [totalFiled, dismissedCount, actionCount] = await Promise.all([
      report.reporterId ? this.entityReportRepo.count({ where: { reporterId: report.reporterId } }) : Promise.resolve(0),
      report.reporterId ? this.entityReportRepo.count({ where: { reporterId: report.reporterId, status: 'dismissed' as any } }) : Promise.resolve(0),
      report.reporterId ? this.entityReportRepo.count({ where: { reporterId: report.reporterId, status: 'action_taken' as any } }) : Promise.resolve(0),
    ]);

    // Other reports against same target
    const otherReportsOnTarget = await this.entityReportRepo.find({
      where: { entityType: report.entityType, entityId: report.entityId },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    // Target entity details
    let targetEntity: any = null;
    if (report.entityType === 'provider') {
      targetEntity = await this.providerRepo.findOne({
        where: { id: report.entityId },
        relations: ['user'],
      });
    } else if (report.entityType === 'product') {
      targetEntity = await this.providerRepo.manager.getRepository('Product').findOne({
        where: { id: report.entityId },
        relations: ['provider'],
      });
    } else if (report.entityType === 'message') {
      targetEntity = await this.providerRepo.manager.getRepository('Message').findOneBy({
        id: report.entityId,
      });
    }

    return {
      report,
      reporterCredibility: {
        totalFiled,
        dismissedCount,
        actionCount,
        credibilityRatio: totalFiled > 0 ? ((totalFiled - dismissedCount) / totalFiled).toFixed(2) : '1.00',
      },
      otherReportsOnTarget,
      targetEntity,
    };
  }

  async reviewEntityReport(
    admin: any,
    reportId: string,
    action: 'dismiss' | 'warn' | 'suspend' | 'ban',
    adminNotes?: string,
  ) {
    this.assertAdmin(admin);
    const report = await this.entityReportRepo.findOne({
      where: { id: reportId },
      relations: ['reporter'],
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'action_taken' || report.status === 'dismissed') {
      throw new BadRequestException('This report has already been reviewed.');
    }

    switch (action) {
      case 'dismiss':
        await this.entityReportRepo.update(reportId, {
          status: 'dismissed',
          adminNotes: adminNotes || null,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        });
        break;

      case 'warn': {
        await this.entityReportRepo.update(reportId, {
          status: 'action_taken',
          adminAction: 'warning',
          adminNotes: adminNotes || null,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        });
        // Create provider warning notification
        if (report.entityType === 'provider') {
          await this.createProviderWarning(report.entityId, reportId, admin.id, report.reason, adminNotes);
        } else if (report.entityType === 'product') {
          const product = await this.providerRepo.manager
            .getRepository('Product')
            .findOne({ where: { id: report.entityId }, relations: ['provider'] });
          if (product?.provider?.id) {
            await this.createProviderWarning(product.provider.id, reportId, admin.id, report.reason, adminNotes);
          }
        }
        break;
      }

      case 'suspend': {
        await this.entityReportRepo.update(reportId, {
          status: 'action_taken',
          adminAction: 'suspend',
          adminNotes: adminNotes || null,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        });
        // Suspend the provider
        if (report.entityType === 'provider') {
          await this.providerRepo.update(report.entityId, { status: 'suspended', suspendedAt: new Date(), suspensionConfirmed: false });
          await this.createProviderWarning(report.entityId, reportId, admin.id, report.reason, adminNotes, true);
        } else if (report.entityType === 'product') {
          const product = await this.providerRepo.manager
            .getRepository('Product')
            .findOne({ where: { id: report.entityId }, relations: ['provider'] });
          if (product?.provider?.id) {
            await this.providerRepo.update(product.provider.id, { status: 'suspended', suspendedAt: new Date(), suspensionConfirmed: false });
            await this.createProviderWarning(product.provider.id, reportId, admin.id, report.reason, adminNotes, true);
          }
        }
        break;
      }

      case 'ban': {
        await this.entityReportRepo.update(reportId, {
          status: 'action_taken',
          adminAction: 'ban',
          adminNotes: adminNotes || null,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        });
        // Suspend provider + suspend the user account
        if (report.entityType === 'provider') {
          const provider = await this.providerRepo.findOneBy({ id: report.entityId });
          if (provider) {
            await this.providerRepo.update(report.entityId, { status: 'suspended', suspendedAt: new Date(), suspensionConfirmed: true });
            await this.userRepo.update(provider.userId, { status: 'suspended' });
            await this.createProviderWarning(report.entityId, reportId, admin.id, report.reason, adminNotes, true);
            // Notify the user about account suspension
            this.notificationDispatch.sendToUser(
              provider.userId, 'system_announcement',
              'Account Suspended',
              'Your account has been suspended due to a policy violation. Contact support for details.',
              { route: '/' }, undefined, undefined, 'customer',
            ).catch(() => {});
          }
        } else if (report.entityType === 'product') {
          const product = await this.providerRepo.manager
            .getRepository('Product')
            .findOne({ where: { id: report.entityId }, relations: ['provider'] });
          if (product?.provider) {
            await this.providerRepo.update(product.provider.id, { status: 'suspended', suspendedAt: new Date(), suspensionConfirmed: true });
            await this.userRepo.update(product.provider.userId, { status: 'suspended' });
            await this.createProviderWarning(product.provider.id, reportId, admin.id, report.reason, adminNotes, true);
            // Notify the user about account suspension
            this.notificationDispatch.sendToUser(
              product.provider.userId, 'system_announcement',
              'Account Suspended',
              'Your account has been suspended due to a policy violation. Contact support for details.',
              { route: '/' }, undefined, undefined, 'customer',
            ).catch(() => {});
          }
        }
        break;
      }
    }

    // Notify reporter that their report was resolved
    if (report.reporterId) {
      this.notificationDispatch.sendTemplated(report.reporterId, 'report_resolved', {
        outcome: action === 'dismiss' ? 'dismissed' : 'action taken',
      }, undefined, 'customer').catch(() => {});
    }

    return this.entityReportRepo.findOne({
      where: { id: reportId },
      relations: ['reporter', 'reviewer'],
    });
  }

  async getReportStats(admin: any) {
    this.assertAdmin(admin);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [pendingCount, reportsThisWeek, topReportedRaw] = await Promise.all([
      this.entityReportRepo.count({ where: { status: 'pending' } }),
      this.entityReportRepo.count({ where: { createdAt: MoreThan(oneWeekAgo) } }),
      this.entityReportRepo
        .createQueryBuilder('r')
        .select('r.entity_id', 'entityId')
        .addSelect('r.entity_type', 'entityType')
        .addSelect('COUNT(*)', 'count')
        .where('r.entity_type = :type', { type: 'provider' })
        .groupBy('r.entity_id')
        .addGroupBy('r.entity_type')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return { pendingCount, reportsThisWeek, topReported: topReportedRaw };
  }

  // ============================================
  // Provider Warnings
  // ============================================

  private async createProviderWarning(
    providerId: string,
    reportId: string,
    issuedBy: string,
    reason: string,
    adminNotes?: string,
    isSuspension = false,
  ) {
    const reasonLabels: Record<string, string> = {
      fake_business: 'Fake Business Listing',
      inappropriate_content: 'Inappropriate Content',
      fraud_scam: 'Fraud or Scam',
      harassment: 'Harassment',
      impersonation: 'Impersonation',
      wrong_category: 'Wrong Category',
      fake_product: 'Fake Product',
      counterfeit: 'Counterfeit Product',
      prohibited_item: 'Prohibited Item',
      wrong_price: 'Misleading Pricing',
      spam: 'Spam',
      fraud: 'Fraud',
      other: 'Policy Violation',
    };

    const reasonLabel = reasonLabels[reason] || 'Policy Violation';
    const title = isSuspension
      ? `Account Suspended: ${reasonLabel}`
      : `Warning: ${reasonLabel}`;
    const message = isSuspension
      ? `Your business listing has been suspended due to a verified report of "${reasonLabel}". ${adminNotes ? `Admin note: ${adminNotes}` : 'Please contact support for more information.'}`
      : `We received a report regarding "${reasonLabel}" on your listing. Please review your content and ensure it complies with our community guidelines. ${adminNotes ? `Note: ${adminNotes}` : ''} Repeated violations may lead to suspension.`;

    const warning = this.warningRepo.create({
      providerId,
      warningType: 'report_warning',
      title,
      message,
      reportId,
      issuedBy,
    });
    await this.warningRepo.save(warning);

    // Notify provider about warning
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (provider) {
      this.notificationDispatch.sendTemplated(provider.userId, 'warning_issued', {
        reason: reasonLabel,
      }, undefined, 'provider').catch(() => {});
    }

    return warning;
  }

  async getProviderWarnings(admin: any, providerId: string) {
    this.assertAdmin(admin);
    return this.warningRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  async confirmSuspension(admin: any, providerId: string) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.status !== 'suspended') {
      throw new BadRequestException('Provider is not currently suspended');
    }
    await this.providerRepo.update(providerId, { suspensionConfirmed: true });
    await this.createAuditLog(admin.id, 'confirm_suspension', 'provider', providerId, null, { confirmed: true });
    return { message: 'Suspension confirmed. Auto-lift is now disabled for this provider.' };
  }

  // ============================================
  // Admin Users Management
  // ============================================

  async getUsers(
    admin: any,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    role?: string,
    city?: string,
    hasProvider?: string,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    // Deleted users are in the archive table
    if (status === 'deleted') {
      const qb = this.userArchiveRepo.createQueryBuilder('a');
      if (role) qb.andWhere('a.role = :role', { role });
      qb.orderBy('a.deletedAt', 'DESC').skip(skip).take(pageSize);
      const [items, total] = await qb.getManyAndCount();
      return {
        items: items.map((a) => ({
          id: a.id,
          name: 'Deleted User',
          role: a.role,
          gender: a.gender,
          status: 'deleted' as const,
          archiveReason: a.archiveReason,
          deletedBy: a.deletedBy,
          createdAt: a.originalCreatedAt,
          deletedAt: a.deletedAt,
        })),
        meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
      };
    }

    const qb = this.userRepo.createQueryBuilder('u');

    if (search) {
      qb.andWhere(
        '(u.name ILIKE :search OR u.mobile_number ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    const VALID_USER_STATUSES = ['active', 'suspended', 'paused'];
    const VALID_USER_ROLES = ['customer', 'admin'];
    if (status && VALID_USER_STATUSES.includes(status)) qb.andWhere('u.status = :status', { status });
    if (role && VALID_USER_ROLES.includes(role)) qb.andWhere('u.role = :role', { role });
    if (city) qb.andWhere('u.city ILIKE :city', { city: `%${city}%` });

    // Filter by whether user has a provider profile
    if (hasProvider === 'false') {
      qb.andWhere(
        'NOT EXISTS (SELECT 1 FROM providers p WHERE p.user_id = u.id AND p.deleted_at IS NULL)',
      );
    } else if (hasProvider === 'true') {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM providers p WHERE p.user_id = u.id AND p.deleted_at IS NULL)',
      );
    }

    qb.orderBy('u.createdAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserById(admin: any, userId: string) {
    this.assertAdmin(admin);
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['provider', 'verification'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Count stats
    const [reviewCount, reportCount] = await Promise.all([
      this.reviewRepo.count({ where: { reviewerId: userId } }),
      this.entityReportRepo.count({ where: { reporterId: userId } }),
    ]);

    return { ...user, _stats: { reviewCount, reportCount } };
  }

  async updateUserAdmin(admin: any, userId: string, body: Partial<User>) {
    this.assertAdmin(admin);
    const allowed: (keyof User)[] = ['status', 'role', 'name', 'city', 'area'];
    const update: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.userRepo.update(userId, update);
    return this.userRepo.findOneBy({ id: userId });
  }

  // ============================================
  // Admin Providers Management (expanded)
  // ============================================

  async getProvidersList(
    admin: any,
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
    city?: string,
    isFeatured?: string,
    isWomenLed?: string,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const VALID_STATUSES = ['pending', 'in_review', 'active', 'suspended', 'unverified', 'disabled'];
    const safeStatus = status && VALID_STATUSES.includes(status) ? status : undefined;

    const qb = this.providerRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.providerCategories', 'pc')
      .leftJoinAndSelect('pc.category', 'cat');

    if (search) {
      qb.andWhere(
        '(p.brand_name ILIKE :search OR user.name ILIKE :search OR user.mobile_number ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (safeStatus) qb.andWhere('p.status = :status', { status: safeStatus });
    if (city) qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
    if (isFeatured === 'true') qb.andWhere('p.is_featured = true');
    if (isWomenLed === 'true') qb.andWhere('p.is_women_led = true');
    if (isWomenLed === 'pending') qb.andWhere("p.women_led_status = 'pending'");
    if (isWomenLed === 'approved') qb.andWhere("p.women_led_status = 'approved'");

    qb.orderBy('p.createdAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getProviderDetail(admin: any, providerId: string) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      relations: ['user', 'providerCategories', 'providerCategories.category', 'photos', 'products', 'reviews'],
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const warningCount = await this.warningRepo.count({ where: { providerId } });
    const reportCount = await this.entityReportRepo.count({
      where: { entityType: 'provider', entityId: providerId },
    });

    return { ...provider, _stats: { warningCount, reportCount } };
  }

  async updateProviderAdmin(admin: any, providerId: string, body: Partial<Provider>) {
    this.assertAdmin(admin);
    const allowed: string[] = ['status', 'isFeatured', 'communityVerified', 'brandName', 'description', 'isAvailable', 'websiteUrl', 'instagramHandle', 'facebookHandle', 'youtubeHandle', 'whatsappNumber'];
    const update: any = {};
    for (const key of allowed) {
      if ((body as any)[key] !== undefined) update[key] = (body as any)[key];
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.providerRepo.update(providerId, update);
    return this.providerRepo.findOne({
      where: { id: providerId },
      relations: ['user', 'providerCategories', 'providerCategories.category'],
    });
  }

  // ============================================
  // Admin Products Management
  // ============================================

  async getProducts(
    admin: any,
    page?: number,
    limit?: number,
    search?: string,
    providerId?: string,
    isActive?: string,
    productType?: string,
    priceMin?: string,
    priceMax?: string,
    hasImages?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (currentPage - 1) * pageSize;

    try {
      const qb = this.productRepo.createQueryBuilder('prod')
        .leftJoinAndSelect('prod.provider', 'provider');

      if (search) {
        qb.andWhere('(prod.name ILIKE :search OR prod.description ILIKE :search)', { search: `%${search}%` });
      }
      if (providerId) qb.andWhere('prod.provider_id = :providerId', { providerId });
      if (isActive === 'true') qb.andWhere('prod.is_active = true');
      if (isActive === 'false') qb.andWhere('prod.is_active = false');
      if (productType) qb.andWhere('prod.product_type = :productType', { productType });
      if (priceMin) qb.andWhere('prod.price >= :priceMin', { priceMin: Number(priceMin) });
      if (priceMax) qb.andWhere('prod.price <= :priceMax', { priceMax: Number(priceMax) });
      if (hasImages === 'true') qb.andWhere("prod.photo_urls != '{}'");
      if (hasImages === 'false') qb.andWhere("prod.photo_urls = '{}'");

      const validSortFields: Record<string, string> = { name: 'prod.name', price: 'prod.price', createdAt: 'prod.createdAt', displayOrder: 'prod.display_order' };
      const sortField = (sortBy && validSortFields[sortBy]) || 'prod.display_order';
      const order = sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      qb.orderBy(sortField, order).skip(skip).take(pageSize);

      const [items, total] = await qb.getManyAndCount();
      return {
        items,
        meta: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      // Fallback: try simpler find approach if QueryBuilder fails
      const where: any = {};
      if (providerId) where.providerId = providerId;
      if (isActive === 'true') where.isActive = true;
      if (isActive === 'false') where.isActive = false;

      const [items, total] = await this.productRepo.findAndCount({
        where,
        relations: ['provider'],
        order: { displayOrder: 'ASC' },
        skip,
        take: pageSize,
      });
      return {
        items,
        meta: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }
  }

  async getProductStats(admin: any) {
    this.assertAdmin(admin);
    const [total, active, withImages, withPrice, products, services] = await Promise.all([
      this.productRepo.count(),
      this.productRepo.count({ where: { isActive: true } }),
      this.productRepo.createQueryBuilder('p').where('p."photoUrls"::text != \'[]\'').andWhere('p."photoUrls" IS NOT NULL').getCount(),
      this.productRepo.count({ where: { price: Not(IsNull()) } }),
      this.productRepo.count({ where: { productType: 'product' as any } }),
      this.productRepo.count({ where: { productType: 'service' as any } }),
    ]);

    const topProviders = await this.productRepo
      .createQueryBuilder('p')
      .select('p."providerId"', 'providerId')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('pr."brandName"', 'brandName')
      .innerJoin('providers', 'pr', 'pr.id = p."providerId"')
      .where('p."isActive" = true')
      .groupBy('p."providerId"')
      .addGroupBy('pr."brandName"')
      .orderBy('"count"', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      withImages,
      withoutImages: total - withImages,
      withPrice,
      withoutPrice: total - withPrice,
      avgPrice: 0,
      typeBreakdown: [
        { type: 'product', count: products },
        { type: 'service', count: services },
      ],
      topProviders: topProviders.map((tp: any) => ({
        brandName: tp.brandName,
        providerId: tp.providerId,
        count: Number(tp.count),
      })),
    };
  }

  async getProductById(admin: any, productId: string) {
    this.assertAdmin(admin);
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['provider'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async uploadProductImages(admin: any, productId: string, files: Express.Multer.File[]) {
    this.assertAdmin(admin);
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    if (!files.length) throw new BadRequestException('No images provided');

    const compressed = await compressImages(files, 'full');
    const uploaded: string[] = [];
    for (const file of compressed) {
      const result = await this.storageService.upload('products', file);
      uploaded.push(result.url);
    }

    const newUrls = [...(product.photoUrls ?? []), ...uploaded];
    await this.productRepo.update(productId, {
      photoUrls: newUrls,
      photoUrl: newUrls[0] ?? null,
    });
    return this.productRepo.findOne({ where: { id: productId }, relations: ['provider'] });
  }

  async updateProductAdmin(admin: any, productId: string, body: Partial<Product>) {
    this.assertAdmin(admin);
    const allowed: string[] = ['isActive', 'displayOrder', 'name', 'description', 'price', 'productType', 'categoryId', 'subcategoryId'];
    const update: any = {};
    for (const key of allowed) {
      if ((body as any)[key] !== undefined) update[key] = (body as any)[key];
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.productRepo.update(productId, update);
    return this.productRepo.findOne({ where: { id: productId }, relations: ['provider'] });
  }

  async deleteProductAdmin(admin: any, productId: string) {
    this.assertAdmin(admin);
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepo.update(productId, { isActive: false });
    return { success: true };
  }

  // ============================================
  // Admin Reviews Management
  // ============================================

  async getReviews(
    admin: any,
    page?: number,
    limit?: number,
    status?: string,
    providerId?: string,
    minRating?: number,
    maxRating?: number,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (currentPage - 1) * pageSize;

    try {
      // Avoid leftJoinAndSelect on OneToMany (photos) with skip/take — causes
      // TypeORM subquery pagination bugs.  Load photos separately if needed.
      const qb = this.reviewRepo.createQueryBuilder('rev')
        .leftJoinAndSelect('rev.reviewer', 'reviewer')
        .leftJoinAndSelect('rev.provider', 'provider');

      if (status) qb.andWhere('rev.status = :status', { status });
      if (providerId) qb.andWhere('rev.provider_id = :providerId', { providerId });
      if (minRating) qb.andWhere('rev.star_rating >= :minRating', { minRating: Number(minRating) });
      if (maxRating) qb.andWhere('rev.star_rating <= :maxRating', { maxRating: Number(maxRating) });

      qb.orderBy('rev.posted_at', 'DESC').skip(skip).take(pageSize);

      const [items, total] = await qb.getManyAndCount();
      return {
        items,
        meta: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      // Fallback: simpler find approach
      const where: any = {};
      if (status) where.status = status;
      if (providerId) where.providerId = providerId;

      const [items, total] = await this.reviewRepo.findAndCount({
        where,
        relations: ['reviewer', 'provider'],
        order: { postedAt: 'DESC' },
        skip,
        take: pageSize,
      });
      return {
        items,
        meta: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }
  }

  async getReviewById(admin: any, reviewId: string) {
    this.assertAdmin(admin);
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['reviewer', 'provider', 'photos', 'reports', 'moderator'],
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async updateReviewStatus(admin: any, reviewId: string, status: 'active' | 'removed') {
    this.assertAdmin(admin);
    const update: any = { status };
    if (status === 'removed') {
      update.moderatedAt = new Date();
      update.moderatedBy = admin.id;
    }
    await this.reviewRepo.update(reviewId, update);
    return this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['reviewer', 'provider'],
    });
  }

  // ============================================
  // Global Warnings Management
  // ============================================

  async getWarnings(
    admin: any,
    page?: number,
    limit?: number,
    providerId?: string,
    warningType?: string,
    search?: string,
    isRead?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.warningRepo.createQueryBuilder('w')
      .leftJoinAndSelect('w.provider', 'provider')
      .leftJoinAndSelect('w.issuer', 'issuer');

    if (providerId) qb.andWhere('w.provider_id = :providerId', { providerId });
    if (warningType) qb.andWhere('w.warning_type = :warningType', { warningType });
    if (search) qb.andWhere('(w.title ILIKE :search OR w.message ILIKE :search)', { search: `%${search}%` });
    if (isRead === 'true') qb.andWhere('w.is_read = true');
    if (isRead === 'false') qb.andWhere('w.is_read = false');
    if (dateFrom) qb.andWhere('w.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('w.createdAt <= :dateTo', { dateTo });

    qb.orderBy('w.createdAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getWarningById(admin: any, warningId: string) {
    this.assertAdmin(admin);
    const warning = await this.warningRepo.findOne({
      where: { id: warningId },
      relations: ['provider', 'issuer'],
    });
    if (!warning) throw new NotFoundException('Warning not found');
    return warning;
  }

  async createWarning(
    admin: any,
    body: { providerId: string; warningType: string; title: string; message: string },
  ) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: body.providerId });
    if (!provider) throw new NotFoundException('Provider not found');

    const warning = this.warningRepo.create({
      providerId: body.providerId,
      warningType: body.warningType as any,
      title: body.title,
      message: body.message,
      issuedBy: admin.id,
    });
    return this.warningRepo.save(warning);
  }

  async updateWarning(admin: any, warningId: string, body: { title?: string; message?: string; isRead?: boolean }) {
    this.assertAdmin(admin);
    const warning = await this.warningRepo.findOneBy({ id: warningId });
    if (!warning) throw new NotFoundException('Warning not found');

    const update: any = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.message !== undefined) update.message = body.message;
    if (body.isRead !== undefined) update.isRead = body.isRead;

    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.warningRepo.update(warningId, update);
    return this.warningRepo.findOne({ where: { id: warningId }, relations: ['provider', 'issuer'] });
  }

  // ============================================
  // Chat Moderation
  // ============================================

  async getChatConversations(
    admin: any,
    page?: number,
    limit?: number,
    status?: string,
    search?: string,
    type?: string,
    dateFrom?: string,
    dateTo?: string,
    hasRedacted?: string,
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.conversationRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.participants', 'p')
      .leftJoinAndSelect('p.user', 'u');

    if (status) qb.andWhere('c.status = :status', { status });
    if (search) {
      qb.andWhere('(u.name ILIKE :search OR u.mobile_number ILIKE :search)', { search: `%${search}%` });
    }
    if (type) qb.andWhere('c.type = :type', { type });
    if (dateFrom) qb.andWhere('c.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('c.createdAt <= :dateTo', { dateTo });
    if (hasRedacted === 'true') qb.andWhere('c.hasRedactedMessages = true');

    qb.orderBy('c.lastMessageAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getChatMessages(admin: any, conversationId: string, page?: number, limit?: number) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 50));
    const skip = (currentPage - 1) * pageSize;

    const conversation = await this.conversationRepo.findOneBy({ id: conversationId });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const [items, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      items,
      meta: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async redactMessage(admin: any, messageId: string) {
    this.assertAdmin(admin);
    const message = await this.messageRepo.findOneBy({ id: messageId });
    if (!message) throw new NotFoundException('Message not found');
    await this.messageRepo.update(messageId, {
      content: '[Message removed by admin]',
      deletedAt: new Date(),
    });
    return { success: true };
  }

  async closeConversation(admin: any, conversationId: string) {
    this.assertAdmin(admin);
    const conversation = await this.conversationRepo.findOneBy({ id: conversationId });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.conversationRepo.update(conversationId, { status: 'closed' as any });
    return { success: true };
  }

  async getChatStats(admin: any) {
    this.assertAdmin(admin);
    const [totalConversations, activeConversations, closedConversations, totalMessages] = await Promise.all([
      this.conversationRepo.count(),
      this.conversationRepo.count({ where: { status: 'active' as any } }),
      this.conversationRepo.count({ where: { status: 'closed' as any } }),
      this.messageRepo.count(),
    ]);
    return { totalConversations, activeConversations, closedConversations, totalMessages };
  }

  // ============================================
  // Promo Banners Management
  // ============================================

  async getBanners(admin: any, page?: number, limit?: number, isActive?: string) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 20));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.bannerRepo.createQueryBuilder('b');
    if (isActive === 'true') qb.andWhere('b.is_active = true');
    if (isActive === 'false') qb.andWhere('b.is_active = false');

    qb.orderBy('b.displayOrder', 'ASC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getBannerById(admin: any, bannerId: string) {
    this.assertAdmin(admin);
    const banner = await this.bannerRepo.findOneBy({ id: bannerId });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async createBanner(admin: any, body: Partial<PromoBanner>, file?: Express.Multer.File) {
    this.assertAdmin(admin);
    const maxOrder = await this.bannerRepo
      .createQueryBuilder('b')
      .select('MAX(b.display_order)', 'max')
      .getRawOne();

    if (file) {
      const compressed = await compressImage(file, 'banner');
      const result = await this.storageService.upload('banners', compressed);
      body.imageUrl = result.url;
    }

    const banner = this.bannerRepo.create({
      ...body,
      displayOrder: (maxOrder?.max ?? -1) + 1,
    });
    return this.bannerRepo.save(banner);
  }

  async updateBanner(admin: any, bannerId: string, body: Partial<PromoBanner>, file?: Express.Multer.File) {
    this.assertAdmin(admin);
    const banner = await this.bannerRepo.findOneBy({ id: bannerId });
    if (!banner) throw new NotFoundException('Banner not found');

    // If a new image is uploaded, delete the old one from storage
    if (file) {
      if (banner.imageUrl) {
        const oldKey = this.storageService.extractKeyFromUrl(banner.imageUrl);
        if (oldKey) await this.storageService.delete(oldKey).catch(() => {});
      }
      const compressed = await compressImage(file, 'banner');
      const result = await this.storageService.upload('banners', compressed);
      body.imageUrl = result.url;
    }

    // If explicitly removing image (imageUrl set to null and no file)
    if (!file && body.imageUrl === null && banner.imageUrl) {
      const oldKey = this.storageService.extractKeyFromUrl(banner.imageUrl);
      if (oldKey) await this.storageService.delete(oldKey).catch(() => {});
    }

    const allowed = ['title', 'subtitle', 'imageUrl', 'gradient', 'emoji', 'cta', 'tag', 'linkUrl', 'isActive', 'displayOrder', 'startsAt', 'endsAt'];
    const update: any = {};
    for (const key of allowed) {
      if ((body as any)[key] !== undefined) update[key] = (body as any)[key];
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.bannerRepo.update(bannerId, update);
    return this.bannerRepo.findOneBy({ id: bannerId });
  }

  async deleteBanner(admin: any, bannerId: string) {
    this.assertAdmin(admin);
    const banner = await this.bannerRepo.findOneBy({ id: bannerId });
    if (!banner) throw new NotFoundException('Banner not found');
    // Clean up uploaded image from storage
    if (banner.imageUrl) {
      const key = this.storageService.extractKeyFromUrl(banner.imageUrl);
      if (key) await this.storageService.delete(key).catch(() => {});
    }
    await this.bannerRepo.remove(banner);
    return { success: true };
  }

  async reorderBanners(admin: any, items: { id: string; displayOrder: number }[]) {
    this.assertAdmin(admin);
    for (const item of items) {
      await this.bannerRepo.update(item.id, { displayOrder: item.displayOrder });
    }
    return { success: true };
  }

  // ============================================
  // Sponsored Listings Management
  // ============================================

  async getSponsoredListings(admin: any, page?: number, limit?: number, isActive?: string, type?: string) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.sponsoredRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.provider', 'provider')
      .leftJoinAndSelect('provider.user', 'user');

    if (isActive === 'true') qb.andWhere('s.is_active = true');
    if (isActive === 'false') qb.andWhere('s.is_active = false');
    if (type) qb.andWhere('s.type = :type', { type });

    qb.orderBy('s.createdAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // Note: approvalStatus filter is available via getPendingSponsorships()

  async getSponsoredById(admin: any, id: string) {
    this.assertAdmin(admin);
    const listing = await this.sponsoredRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user'],
    });
    if (!listing) throw new NotFoundException('Sponsored listing not found');
    return listing;
  }

  async updateSponsored(admin: any, id: string, body: Partial<SponsoredListing>) {
    this.assertAdmin(admin);
    const listing = await this.sponsoredRepo.findOneBy({ id });
    if (!listing) throw new NotFoundException('Sponsored listing not found');

    const allowed = ['isActive', 'budgetAmount', 'costPerClick', 'startsAt', 'endsAt', 'targetCategoryIds', 'targetCities'];
    const update: any = {};
    for (const key of allowed) {
      if ((body as any)[key] !== undefined) update[key] = (body as any)[key];
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.sponsoredRepo.update(id, update);
    return this.sponsoredRepo.findOne({ where: { id }, relations: ['provider'] });
  }

  async getSponsoredStats(admin: any) {
    this.assertAdmin(admin);
    const [total, active, totalSpent, totalBudget, totalImpressions, totalClicks] = await Promise.all([
      this.sponsoredRepo.count(),
      this.sponsoredRepo.count({ where: { isActive: true } }),
      this.sponsoredRepo.createQueryBuilder('s').select('COALESCE(SUM(s.spent_amount), 0)', 'val').getRawOne(),
      this.sponsoredRepo.createQueryBuilder('s').select('COALESCE(SUM(s.budget_amount), 0)', 'val').getRawOne(),
      this.sponsoredRepo.createQueryBuilder('s').select('COALESCE(SUM(s.impressions), 0)', 'val').getRawOne(),
      this.sponsoredRepo.createQueryBuilder('s').select('COALESCE(SUM(s.clicks), 0)', 'val').getRawOne(),
    ]);
    return {
      total,
      active,
      totalSpent: Number(totalSpent?.val || 0),
      totalBudget: Number(totalBudget?.val || 0),
      totalImpressions: Number(totalImpressions?.val || 0),
      totalClicks: Number(totalClicks?.val || 0),
    };
  }

  async getSponsorshipAnalytics(admin: any, id: string, period: string) {
    this.assertAdmin(admin);
    const listing = await this.sponsoredRepo.findOne({ where: { id }, relations: ['provider'] });
    if (!listing) throw new NotFoundException('Sponsored listing not found');

    const days = period === '30d' ? 30 : period === '14d' ? 14 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.adEventRepo
      .createQueryBuilder('e')
      .select("DATE(e.created_at)", 'date')
      .addSelect("e.event_type", 'eventType')
      .addSelect("COUNT(*)", 'count')
      .where('e.sponsored_listing_id = :id', { id })
      .andWhere('e.created_at >= :since', { since })
      .groupBy("DATE(e.created_at)")
      .addGroupBy("e.event_type")
      .orderBy("date", 'ASC')
      .getRawMany();

    return { listing, period, events };
  }

  // ============================================
  // Provider Offers Management
  // ============================================

  async getOffers(admin: any, page?: number, limit?: number, isActive?: string, providerId?: string) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.offerRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.provider', 'provider');

    if (isActive === 'true') qb.andWhere('o.is_active = true');
    if (isActive === 'false') qb.andWhere('o.is_active = false');
    if (providerId) qb.andWhere('o.provider_id = :providerId', { providerId });

    qb.orderBy('o.createdAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // Note: approvalStatus filter is available via getPendingOffers()

  async getOfferById(admin: any, id: string) {
    this.assertAdmin(admin);
    const offer = await this.offerRepo.findOne({
      where: { id },
      relations: ['provider'],
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async updateOffer(admin: any, id: string, body: Partial<ProviderOffer>) {
    this.assertAdmin(admin);
    const offer = await this.offerRepo.findOneBy({ id });
    if (!offer) throw new NotFoundException('Offer not found');

    const allowed = ['isActive', 'title', 'description', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscount', 'startsAt', 'endsAt', 'usageLimit'];
    const update: any = {};
    for (const key of allowed) {
      if ((body as any)[key] !== undefined) update[key] = (body as any)[key];
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.offerRepo.update(id, update);
    return this.offerRepo.findOne({ where: { id }, relations: ['provider'] });
  }

  async deleteOffer(admin: any, id: string) {
    this.assertAdmin(admin);
    const offer = await this.offerRepo.findOneBy({ id });
    if (!offer) throw new NotFoundException('Offer not found');
    await this.offerRepo.update(id, { isActive: false });
    return { success: true };
  }

  async getOfferStats(admin: any) {
    this.assertAdmin(admin);
    const [total, active, totalUsage] = await Promise.all([
      this.offerRepo.count(),
      this.offerRepo.count({ where: { isActive: true } }),
      this.offerRepo.createQueryBuilder('o').select('COALESCE(SUM(o.usage_count), 0)', 'val').getRawOne(),
    ]);
    return { total, active, totalUsage: Number(totalUsage?.val || 0) };
  }

  // ============================================
  // Provider Badges Management
  // ============================================

  async getBadges(admin: any, page?: number, limit?: number, type?: string, isActive?: string) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.badgeRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.provider', 'provider');

    if (type) qb.andWhere('b.type = :type', { type });
    if (isActive === 'true') qb.andWhere('b.is_active = true');
    if (isActive === 'false') qb.andWhere('b.is_active = false');

    qb.orderBy('b.createdAt', 'DESC').skip(skip).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getBadgeById(admin: any, id: string) {
    this.assertAdmin(admin);
    const badge = await this.badgeRepo.findOne({
      where: { id },
      relations: ['provider'],
    });
    if (!badge) throw new NotFoundException('Badge not found');
    return badge;
  }

  async createBadge(admin: any, body: { providerId: string; type: string; source?: string; expiresAt?: string }) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: body.providerId });
    if (!provider) throw new NotFoundException('Provider not found');

    const badge = this.badgeRepo.create({
      providerId: body.providerId,
      type: body.type as any,
      source: (body.source as any) || 'earned',
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    return this.badgeRepo.save(badge);
  }

  async updateBadge(admin: any, id: string, body: { isActive?: boolean; expiresAt?: string | null }) {
    this.assertAdmin(admin);
    const badge = await this.badgeRepo.findOneBy({ id });
    if (!badge) throw new NotFoundException('Badge not found');

    const update: any = {};
    if (body.isActive !== undefined) update.isActive = body.isActive;
    if (body.expiresAt !== undefined) update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (Object.keys(update).length === 0) throw new BadRequestException('No valid fields to update');
    await this.badgeRepo.update(id, update);
    return this.badgeRepo.findOne({ where: { id }, relations: ['provider'] });
  }

  async deleteBadge(admin: any, id: string) {
    this.assertAdmin(admin);
    const badge = await this.badgeRepo.findOneBy({ id });
    if (!badge) throw new NotFoundException('Badge not found');
    await this.badgeRepo.remove(badge);
    return { success: true };
  }

  // ============================================
  // Dashboard Time Series
  // ============================================

  async getDashboardTimeSeries(admin: any, days = 30) {
    this.assertAdmin(admin);
    const d = Math.min(90, Math.max(7, days));
    const startDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    const userGrowth = await this.userRepo
      .createQueryBuilder('u')
      .select("DATE_TRUNC('day', u.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', u.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const providerGrowth = await this.providerRepo
      .createQueryBuilder('p')
      .select("DATE_TRUNC('day', p.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('p.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', p.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const searchVolume = await this.searchLogRepo
      .createQueryBuilder('s')
      .select("DATE_TRUNC('day', s.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('s.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', s.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const reportVolume = await this.entityReportRepo
      .createQueryBuilder('r')
      .select("DATE_TRUNC('day', r.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('r.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', r.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const leadVolume = await this.leadRepo
      .createQueryBuilder('l')
      .select("DATE_TRUNC('day', l.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('l.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', l.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const conversationVolume = await this.conversationRepo
      .createQueryBuilder('c')
      .select("DATE_TRUNC('day', c.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('c.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', c.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const fmt = (rows: any[]) => rows.map(r => ({ date: r.date, count: Number(r.count) }));

    return {
      userGrowth: fmt(userGrowth),
      providerGrowth: fmt(providerGrowth),
      searchVolume: fmt(searchVolume),
      reportVolume: fmt(reportVolume),
      leadVolume: fmt(leadVolume),
      conversationVolume: fmt(conversationVolume),
    };
  }

  // ============================================
  // Analytics Overview
  // ============================================

  async getAnalyticsOverview(admin: any) {
    this.assertAdmin(admin);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEvents, eventsThisWeek,
      totalLeads, hotLeads, warmLeads,
      totalSearches, searchesThisWeek,
      adImpressions, adClicks,
      totalInvites,
    ] = await Promise.all([
      this.analyticsEventRepo.count(),
      this.analyticsEventRepo.count({ where: { createdAt: MoreThan(oneWeekAgo) } }),
      this.leadRepo.count(),
      this.leadRepo.count({ where: { tier: 'hot' as any } }),
      this.leadRepo.count({ where: { tier: 'warm' as any } }),
      this.searchLogRepo.count(),
      this.searchLogRepo.count({ where: { createdAt: MoreThan(oneWeekAgo) } }),
      this.adEventRepo.count({ where: { eventType: 'impression' } }),
      this.adEventRepo.count({ where: { eventType: 'click' } }),
      this.inviteRepo.count(),
    ]);

    // Event type breakdown
    const eventBreakdown = await this.analyticsEventRepo
      .createQueryBuilder('e')
      .select('e.event_type', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.event_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Source breakdown
    const sourceBreakdown = await this.analyticsEventRepo
      .createQueryBuilder('e')
      .select('e.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('e.source IS NOT NULL')
      .groupBy('e.source')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Lead tier distribution
    const leadTierDistribution = await this.leadRepo
      .createQueryBuilder('l')
      .select('l.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.tier')
      .getRawMany();

    return {
      totalEvents, eventsThisWeek,
      totalLeads, hotLeads, warmLeads,
      totalSearches, searchesThisWeek,
      adImpressions, adClicks,
      adCtr: adImpressions > 0 ? Number(((adClicks / adImpressions) * 100).toFixed(2)) : 0,
      totalInvites,
      eventBreakdown: eventBreakdown.map(r => ({ eventType: r.eventType, count: Number(r.count) })),
      sourceBreakdown: sourceBreakdown.map(r => ({ source: r.source, count: Number(r.count) })),
      leadTierDistribution: leadTierDistribution.map(r => ({ tier: r.tier, count: Number(r.count) })),
    };
  }

  // ============================================
  // Search Trends
  // ============================================

  async getSearchTrends(admin: any, days = 30, limit = 50) {
    this.assertAdmin(admin);
    const d = Math.min(90, Math.max(7, days));
    const l = Math.min(100, Math.max(10, limit));
    const startDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    const topQueries = await this.searchLogRepo
      .createQueryBuilder('s')
      .select('LOWER(TRIM(s.query))', 'query')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(s.result_count)', 'avgResults')
      .where('s.created_at >= :startDate', { startDate })
      .groupBy('LOWER(TRIM(s.query))')
      .orderBy('count', 'DESC')
      .limit(l)
      .getRawMany();

    const zeroResultQueries = await this.searchLogRepo
      .createQueryBuilder('s')
      .select('LOWER(TRIM(s.query))', 'query')
      .addSelect('COUNT(*)', 'count')
      .where('s.result_count = 0')
      .andWhere('s.created_at >= :startDate', { startDate })
      .groupBy('LOWER(TRIM(s.query))')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    const searchVolumeByDay = await this.searchLogRepo
      .createQueryBuilder('s')
      .select("DATE_TRUNC('day', s.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('s.created_at >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('day', s.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const topCities = await this.searchLogRepo
      .createQueryBuilder('s')
      .select('s.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('s.city IS NOT NULL')
      .andWhere('s.created_at >= :startDate', { startDate })
      .groupBy('s.city')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      topQueries: topQueries.map(r => ({ query: r.query, count: Number(r.count), avgResults: Number(Number(r.avgResults).toFixed(1)) })),
      zeroResultQueries: zeroResultQueries.map(r => ({ query: r.query, count: Number(r.count) })),
      searchVolumeByDay: searchVolumeByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      topCities: topCities.map(r => ({ city: r.city, count: Number(r.count) })),
    };
  }

  // ============================================
  // Bug Reports Management
  // ============================================

  async getBugReports(admin: any, page = 1, limit = 20, status?: string, category?: string) {
    this.assertAdmin(admin);
    const where: Record<string, any> = {};
    if (status) where['status'] = status;
    if (category) where['category'] = category;
    const [items, total] = await this.bugReportRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getBugReportById(admin: any, id: string) {
    this.assertAdmin(admin);
    const report = await this.bugReportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Bug report not found');
    return report;
  }

  async updateBugReport(admin: any, id: string, status: string, adminNotes?: string) {
    this.assertAdmin(admin);
    const report = await this.bugReportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Bug report not found');
    if (status) (report as any).status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    return this.bugReportRepo.save(report);
  }

  // ============================================
  // Geographic Distribution
  // ============================================

  async getGeographicStats(admin: any) {
    this.assertAdmin(admin);

    const usersByCity = await this.userRepo
      .createQueryBuilder('u')
      .select('u.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('u.city IS NOT NULL')
      .groupBy('u.city')
      .orderBy('count', 'DESC')
      .limit(30)
      .getRawMany();

    const providersByCity = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('p.city IS NOT NULL')
      .groupBy('p.city')
      .orderBy('count', 'DESC')
      .limit(30)
      .getRawMany();

    const searchesByCity = await this.searchLogRepo
      .createQueryBuilder('s')
      .select('s.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('s.city IS NOT NULL')
      .groupBy('s.city')
      .orderBy('count', 'DESC')
      .limit(30)
      .getRawMany();

    const fmt = (rows: any[]) => rows.map(r => ({ city: r.city, count: Number(r.count) }));

    return {
      usersByCity: fmt(usersByCity),
      providersByCity: fmt(providersByCity),
      searchesByCity: fmt(searchesByCity),
    };
  }

  // ── Admin User Management ──────────────────────────────

  async getAdminUsers(admin: any, page = 1, rows = 20, search?: string) {
    this.assertAdmin(admin);
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: 'admin' });

    if (search) {
      qb.andWhere('(u.name ILIKE :s OR u.mobileNumber ILIKE :s OR u.email ILIKE :s)', { s: `%${search}%` });
    }

    qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * rows)
      .take(rows);

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { total, page: +page, limit: +rows, totalPages: Math.ceil(total / rows) } };
  }

  async createAdminUser(admin: any, body: { mobileNumber: string; name: string; email?: string; gender?: string }) {
    this.assertAdmin(admin);
    const existing = await this.userRepo.findOne({ where: { mobileNumber: body.mobileNumber } });
    if (existing) {
      if (existing.role === 'admin') throw new BadRequestException('User is already an admin');
      existing.role = 'admin';
      const updated = await this.userRepo.save(existing);
      await this.createAuditLog(admin.id, 'promote_to_admin', 'user', existing.id, { role: 'customer' }, { role: 'admin' });
      return updated;
    }
    const user = this.userRepo.create({
      mobileNumber: body.mobileNumber,
      name: body.name,
      email: body.email || null,
      gender: body.gender || 'other',
      role: 'admin',
      status: 'active',
    });
    const saved = await this.userRepo.save(user);
    await this.createAuditLog(admin.id, 'create_admin', 'user', saved.id, null, { name: saved.name, role: 'admin' });
    return saved;
  }

  async updateAdminUser(admin: any, id: string, body: { name?: string; status?: string }) {
    this.assertAdmin(admin);
    const user = await this.userRepo.findOneBy({ id, role: 'admin' });
    if (!user) throw new NotFoundException('Admin user not found');
    if (id === admin.id) throw new BadRequestException('Cannot modify own account');
    const prev = { name: user.name, status: user.status };
    if (body.name) user.name = body.name;
    if (body.status) user.status = body.status;
    const updated = await this.userRepo.save(user);
    await this.createAuditLog(admin.id, 'update_admin', 'user', id, prev, { name: updated.name, status: updated.status });
    return updated;
  }

  async removeAdminUser(admin: any, id: string) {
    this.assertAdmin(admin);
    if (id === admin.id) throw new BadRequestException('Cannot remove own admin access');
    const user = await this.userRepo.findOneBy({ id, role: 'admin' });
    if (!user) throw new NotFoundException('Admin user not found');
    user.role = 'customer';
    await this.userRepo.save(user);
    await this.createAuditLog(admin.id, 'demote_admin', 'user', id, { role: 'admin' }, { role: 'customer' });
    return { message: 'Admin access removed' };
  }

  // ── Audit Logging ─────────────────────────────────────

  async createAuditLog(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    previousState: Record<string, any> | null,
    newState: Record<string, any> | null,
    description?: string,
  ) {
    const log = this.auditLogRepo.create({ adminId, action, entityType, entityId, previousState, newState, description });
    return this.auditLogRepo.save(log);
  }

  async getAuditLogs(admin: any, page = 1, rows = 25, filters?: { adminId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string; search?: string }) {
    this.assertAdmin(admin);
    const qb = this.auditLogRepo
      .createQueryBuilder('al')
      .leftJoinAndSelect('al.admin', 'admin')
      .orderBy('al.createdAt', 'DESC');

    if (filters?.adminId) qb.andWhere('al.adminId = :aid', { aid: filters.adminId });
    if (filters?.action) qb.andWhere('al.action = :act', { act: filters.action });
    if (filters?.entityType) qb.andWhere('al.entityType = :et', { et: filters.entityType });
    if (filters?.startDate) qb.andWhere('al.createdAt >= :sd', { sd: filters.startDate });
    if (filters?.endDate) qb.andWhere('al.createdAt <= :ed', { ed: filters.endDate });
    if (filters?.search) qb.andWhere('(al.action ILIKE :search OR al.entityType ILIKE :search OR al.details::text ILIKE :search)', { search: `%${filters.search}%` });

    qb.skip((page - 1) * rows).take(rows);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map(i => ({
        ...i,
        admin: i.admin ? { id: i.admin.id, name: i.admin.name } : null,
      })),
      meta: { total, page: +page, limit: +rows, totalPages: Math.ceil(total / rows) },
    };
  }

  async getAuditLogStats(admin: any) {
    this.assertAdmin(admin);
    const total = await this.auditLogRepo.count();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = await this.auditLogRepo.count({ where: { createdAt: MoreThan(oneWeekAgo) } });
    const actionBreakdown = await this.auditLogRepo
      .createQueryBuilder('al')
      .select('al.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('al.action')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    return { total, thisWeek, actionBreakdown: actionBreakdown.map(r => ({ action: r.action, count: Number(r.count) })) };
  }

  // ── System Settings ───────────────────────────────────

  async getSettings(admin: any) {
    this.assertAdmin(admin);
    return this.settingRepo.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  async updateSettings(admin: any, settings: { key: string; value: string }[]) {
    this.assertAdmin(admin);
    const results: SystemSetting[] = [];
    for (const s of settings) {
      let setting = await this.settingRepo.findOneBy({ key: s.key });
      if (setting) {
        const prev = setting.value;
        setting.value = s.value;
        const updated = await this.settingRepo.save(setting);
        await this.createAuditLog(admin.id, 'update_setting', 'system_setting', setting.id, { value: prev }, { value: s.value }, `Setting: ${s.key}`);
        results.push(updated);
      } else {
        setting = this.settingRepo.create({ key: s.key, value: s.value, type: 'string' });
        const saved = await this.settingRepo.save(setting);
        await this.createAuditLog(admin.id, 'create_setting', 'system_setting', saved.id, null, { key: s.key, value: s.value });
        results.push(saved);
      }
    }
    return results;
  }

  async createSetting(admin: any, body: { key: string; value: string; type?: string; group?: string; description?: string }) {
    this.assertAdmin(admin);
    const existing = await this.settingRepo.findOneBy({ key: body.key });
    if (existing) throw new BadRequestException(`Setting "${body.key}" already exists`);
    const setting = this.settingRepo.create(body);
    const saved = await this.settingRepo.save(setting);
    await this.createAuditLog(admin.id, 'create_setting', 'system_setting', saved.id, null, body);
    return saved;
  }

  async deleteSetting(admin: any, id: string) {
    this.assertAdmin(admin);
    const setting = await this.settingRepo.findOneBy({ id });
    if (!setting) throw new NotFoundException('Setting not found');
    await this.createAuditLog(admin.id, 'delete_setting', 'system_setting', id, { key: setting.key, value: setting.value }, null);
    await this.settingRepo.remove(setting);
    return { message: 'Setting deleted' };
  }

  // ============================================
  // Admin Create User
  // ============================================

  async adminCreateUser(admin: any, dto: AdminCreateUserDto) {
    this.assertAdmin(admin);

    // Content moderation
    if (dto.name) {
      const check = this.contentSanitizer.check(dto.name);
      if (check.flagged) {
        throw new BadRequestException('Name contains inappropriate language.');
      }
    }

    // Check for duplicate mobile number
    const existingByMobile = await this.userRepo.findOne({ where: { mobileNumber: dto.mobileNumber } });
    if (existingByMobile) {
      throw new ConflictException(`User with mobile number ${dto.mobileNumber} already exists`);
    }

    // Check for duplicate email if provided
    if (dto.email) {
      const existingByEmail = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existingByEmail) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    const user = this.userRepo.create({
      mobileNumber: dto.mobileNumber,
      name: dto.name,
      gender: dto.gender,
      email: dto.email || null,
      city: dto.city || null,
      area: dto.area || null,
      pincode: dto.pincode || null,
      latitude: dto.latitude ? parseFloat(dto.latitude) : null,
      longitude: dto.longitude ? parseFloat(dto.longitude) : null,
      role: 'customer',
      status: 'active',
    });

    const saved = await this.userRepo.save(user);
    await this.createAuditLog(admin.id, 'admin_create_user', 'user', saved.id, null, {
      name: saved.name,
      mobileNumber: saved.mobileNumber,
      gender: saved.gender,
    });

    return saved;
  }

  // ============================================
  // Admin Create Provider with User (End-to-End)
  // ============================================

  async adminCreateProviderWithUser(admin: any, dto: AdminCreateProviderWithUserDto) {
    this.assertAdmin(admin);

    // Content moderation on text fields
    const fieldsToCheck = [
      { label: 'user name', value: dto.userName },
      { label: 'brand name', value: dto.brandName },
      { label: 'description', value: dto.description },
    ];
    for (const field of fieldsToCheck) {
      if (field.value && typeof field.value === 'string') {
        const check = this.contentSanitizer.check(field.value);
        if (check.flagged) {
          throw new BadRequestException(`The ${field.label} contains inappropriate language. Please revise.`);
        }
      }
    }
    if (dto.products?.length) {
      for (const p of dto.products) {
        if (p.name) {
          const nameCheck = this.contentSanitizer.check(p.name);
          if (nameCheck.flagged) {
            throw new BadRequestException(`Product name "${p.name}" contains inappropriate language.`);
          }
        }
        if (p.description) {
          const descCheck = this.contentSanitizer.check(p.description);
          if (descCheck.flagged) {
            throw new BadRequestException(`Product description for "${p.name}" contains inappropriate language.`);
          }
        }
      }
    }

    // ── Pre-flight validations ────────────────────────────
    // 1. Check duplicate user mobile
    const existingUser = await this.userRepo.findOne({ where: { mobileNumber: dto.userMobileNumber } });
    if (existingUser) {
      // Check if user already has a provider
      const existingProvider = await this.providerRepo.findOne({ where: { userId: existingUser.id } });
      if (existingProvider) {
        throw new ConflictException(`User with mobile ${dto.userMobileNumber} already has a provider profile`);
      }
    }

    // 2. Check duplicate email
    if (dto.userEmail) {
      const existingByEmail = await this.userRepo.findOne({ where: { email: dto.userEmail } });
      if (existingByEmail && (!existingUser || existingByEmail.id !== existingUser.id)) {
        throw new ConflictException(`User with email ${dto.userEmail} already exists`);
      }
    }

    // 3. Validate category IDs exist
    if (dto.categoryIds?.length) {
      const categoriesToCheck = await this.categoryRepo.findBy({ id: In(dto.categoryIds) });
      if (categoriesToCheck.length !== dto.categoryIds.length) {
        const foundIds = categoriesToCheck.map(c => c.id);
        const missing = dto.categoryIds.filter(id => !foundIds.includes(id));
        throw new BadRequestException(`Invalid category IDs: ${missing.join(', ')}`);
      }
    }

    // 4. Validate products
    if (dto.products?.length) {
      for (const p of dto.products) {
        if (!p.name || p.name.trim().length === 0) {
          throw new BadRequestException('Product name cannot be empty');
        }
        if (p.price != null && p.price < 0) {
          throw new BadRequestException(`Product "${p.name}" has an invalid price`);
        }
      }
    }

    // ── Execute in a transaction ──────────────────────────
    return this.dataSource.transaction(async (manager) => {
      // Step 1: Create or reuse user
      let user: User;
      if (existingUser) {
        user = existingUser;
        // Update user fields if needed
        user.name = dto.userName;
        user.gender = dto.userGender;
        if (dto.userEmail) user.email = dto.userEmail;
        if (dto.syncLocation !== false) {
          user.city = dto.city || user.city;
          user.area = dto.area || user.area;
          user.pincode = dto.pincode || user.pincode;
          user.latitude = dto.latitude ? parseFloat(dto.latitude) : user.latitude;
          user.longitude = dto.longitude ? parseFloat(dto.longitude) : user.longitude;
        }
        user.preferredMode = 'provider';
        user = await manager.save(User, user);
      } else {
        user = manager.create(User, {
          mobileNumber: dto.userMobileNumber,
          name: dto.userName,
          gender: dto.userGender,
          email: dto.userEmail || null,
          city: dto.syncLocation !== false ? (dto.city || null) : null,
          area: dto.syncLocation !== false ? (dto.area || null) : null,
          pincode: dto.syncLocation !== false ? (dto.pincode || null) : null,
          latitude: dto.syncLocation !== false && dto.latitude ? parseFloat(dto.latitude) : null,
          longitude: dto.syncLocation !== false && dto.longitude ? parseFloat(dto.longitude) : null,
          role: 'customer',
          status: 'active',
          preferredMode: 'provider',
        });
        user = await manager.save(User, user);
      }

      // Step 2: Create provider
      const provider = manager.create(Provider, {
        userId: user.id,
        brandName: dto.brandName,
        description: dto.description || null,
        address: dto.address || null,
        city: dto.city,
        area: dto.area || null,
        pincode: dto.pincode || null,
        latitude: dto.latitude ? parseFloat(dto.latitude) : null,
        longitude: dto.longitude ? parseFloat(dto.longitude) : null,
        contactNumber: dto.contactNumber,
        openTime: dto.openTime || null,
        closeTime: dto.closeTime || null,
        isWomenLed: dto.isWomenLed ?? (dto.userGender === 'female'),
        womenLedStatus: (dto.isWomenLed ?? (dto.userGender === 'female')) ? 'approved' : 'none',
        status: (dto.providerStatus as any) || 'active',
      });
      const savedProvider = await manager.save(Provider, provider);

      // Step 3: Create category associations
      if (dto.categoryIds?.length) {
        const cats = dto.categoryIds.map((catId) =>
          manager.create(ProviderCategory, { providerId: savedProvider.id, categoryId: catId }),
        );
        await manager.save(ProviderCategory, cats);
      }

      // Step 4: Create products
      const savedProducts: Product[] = [];
      if (dto.products?.length) {
        for (let i = 0; i < dto.products.length; i++) {
          const p = dto.products[i];
          const product = manager.create(Product, {
            providerId: savedProvider.id,
            name: p.name.trim(),
            description: p.description || null,
            price: p.price != null ? p.price : null,
            currency: p.currency || 'INR',
            productType: (p as any).productType || 'product',
            categoryId: (p as any).categoryId || null,
            subcategoryId: (p as any).subcategoryId || null,
            isActive: true,
            displayOrder: i,
          });
          savedProducts.push(await manager.save(Product, product));
        }
      }

      // Step 5: Audit log
      await this.createAuditLog(admin.id, 'admin_create_provider_with_user', 'provider', savedProvider.id, null, {
        userId: user.id,
        userName: user.name,
        userMobile: user.mobileNumber,
        brandName: savedProvider.brandName,
        city: savedProvider.city,
        contactNumber: savedProvider.contactNumber,
        providerStatus: savedProvider.status,
        categoryCount: dto.categoryIds?.length || 0,
        productCount: savedProducts.length,
      });

      // Return full result
      return {
        user,
        provider: savedProvider,
        products: savedProducts,
        categories: dto.categoryIds || [],
      };
    });
  }

  // ============================================
  // Admin OTP Management (for verification in flow)
  // ============================================

  async adminSendOtp(admin: any, mobileNumber: string, purpose = 'user_verification') {
    this.assertAdmin(admin);
    const phone = mobileNumber.trim();
    if (!/^\d{10}$/.test(phone)) {
      throw new BadRequestException('Mobile number must be exactly 10 digits');
    }

    const result = await this.otpService.sendOtpWithKey(`admin_action_${phone}_${purpose}`, phone);
    return { message: 'OTP sent successfully', data: { mobileNumber: phone, expiresIn: result.expiresIn, ...(result.otp ? { otp: result.otp } : {}) } };
  }

  async adminVerifyOtp(admin: any, mobileNumber: string, otp: string, purpose = 'user_verification') {
    this.assertAdmin(admin);
    const phone = mobileNumber.trim();
    const code = otp.trim();

    if (!/^\d{10}$/.test(phone)) throw new BadRequestException('Mobile number must be exactly 10 digits');
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('OTP must be exactly 6 digits');

    await this.otpService.verifyOtpWithKey(`admin_action_${phone}_${purpose}`, phone, code);

    return { message: 'OTP verified successfully', verified: true, mobileNumber: phone, purpose };
  }

  // ============================================
  // Admin Check User Exists
  // ============================================

  async adminCheckUser(admin: any, mobileNumber: string) {
    this.assertAdmin(admin);
    const phone = mobileNumber.trim();
    if (!/^\d{10}$/.test(phone)) throw new BadRequestException('Mobile number must be exactly 10 digits');

    const user = await this.userRepo.findOne({
      where: { mobileNumber: phone },
      relations: ['provider'],
    });

    if (!user) {
      return { exists: false, hasProvider: false, user: null };
    }

    return {
      exists: true,
      hasProvider: !!user.provider,
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
        gender: user.gender,
        city: user.city,
        status: user.status,
      },
      provider: user.provider ? {
        id: user.provider.id,
        brandName: user.provider.brandName,
        status: user.provider.status,
      } : null,
    };
  }

  // ============================================
  // Provider Lifecycle (Disable / Enable / Delete)
  // ============================================

  async disableProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.deletedAt) throw new BadRequestException('Provider is already deleted');

    const prevStatus = provider.status;
    await this.providerRepo.update(providerId, { status: 'disabled' });
    await this.createAuditLog(admin.id, 'disable_provider', 'provider', providerId, { status: prevStatus }, { status: 'disabled' });

    this.notificationDispatch.sendTemplated(
      provider.userId, 'provider_disabled', {},
    ).catch(() => {});

    return { ...provider, status: 'disabled' };
  }

  async enableProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.status !== 'disabled') throw new BadRequestException('Provider is not disabled');

    await this.providerRepo.update(providerId, { status: 'active' });
    await this.createAuditLog(admin.id, 'enable_provider', 'provider', providerId, { status: 'disabled' }, { status: 'active' });

    this.notificationDispatch.sendTemplated(
      provider.userId, 'provider_enabled', {},
    ).catch(() => {});

    return { ...provider, status: 'active' };
  }

  async softDeleteProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.deletedAt) throw new BadRequestException('Provider is already deleted');

    const prevStatus = provider.status;
    await this.providerRepo.update(providerId, { deletedAt: new Date(), status: 'disabled' });
    await this.createAuditLog(admin.id, 'delete_provider', 'provider', providerId, { status: prevStatus, deletedAt: null }, { status: 'disabled', deletedAt: new Date().toISOString() });

    this.notificationDispatch.sendToUser(
      provider.userId, 'provider_status', 'Provider Profile Removed',
      'Your provider profile has been removed. Contact support if you believe this is an error.',
      { route: '/' },
      undefined,
      undefined,
      'provider',
    ).catch(() => {});

    return { message: 'Provider soft-deleted', id: providerId };
  }

  async toggleFeaturedProvider(admin: any, providerId: string, isFeatured: boolean) {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.providerRepo.update(providerId, { isFeatured });
    await this.createAuditLog(admin.id, 'toggle_featured', 'provider', providerId, { isFeatured: provider.isFeatured }, { isFeatured });

    return { ...provider, isFeatured };
  }

  // ============================================
  // Women-Led Business Approval
  // ============================================

  async getWomenLedPending(admin: any, page?: number, limit?: number) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(50, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.providerRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .where("p.women_led_status = 'pending'")
      .orderBy('p.createdAt', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((p) => ({
        id: p.id,
        brandName: p.brandName,
        city: p.city,
        area: p.area,
        status: p.status,
        womenLedStatus: p.womenLedStatus,
        createdAt: p.createdAt,
        user: p.user ? { id: p.user.id, name: (p.user as any).name, gender: (p.user as any).gender } : null,
      })),
      meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async reviewWomenLedStatus(admin: any, providerId: string, decision: 'approved' | 'rejected') {
    this.assertAdmin(admin);
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');

    const oldStatus = provider.womenLedStatus;

    await this.providerRepo.update(providerId, {
      womenLedStatus: decision,
      isWomenLed: decision === 'approved',
      womenLedReviewedAt: new Date(),
      womenLedReviewedBy: admin.id,
    });

    await this.createAuditLog(
      admin.id,
      `women_led_${decision}`,
      'provider',
      providerId,
      { womenLedStatus: oldStatus },
      { womenLedStatus: decision },
    );

    return { id: providerId, womenLedStatus: decision, isWomenLed: decision === 'approved' };
  }

  async getWomenLedAnalytics(admin: any) {
    this.assertAdmin(admin);

    const [totalApproved, totalPending, totalRejected] = await Promise.all([
      this.providerRepo.count({ where: { womenLedStatus: 'approved' as any } }),
      this.providerRepo.count({ where: { womenLedStatus: 'pending' as any } }),
      this.providerRepo.count({ where: { womenLedStatus: 'rejected' as any } }),
    ]);

    const totalProviders = await this.providerRepo.count();

    // Category distribution of approved women-led providers
    const categoryDistribution = await this.providerRepo.query(`
      SELECT c.name, COUNT(DISTINCT p.id)::int AS count
      FROM providers p
      JOIN provider_categories pc ON pc.provider_id = p.id
      JOIN categories c ON c.id = pc.category_id
      WHERE p.women_led_status = 'approved'
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Avg rating comparison
    const ratingComparison = await this.providerRepo.query(`
      SELECT
        COALESCE(AVG(CASE WHEN p.women_led_status = 'approved' THEN rs.avg_rating END)::numeric(2,1), 0) AS "womenLedAvgRating",
        COALESCE(AVG(CASE WHEN p.women_led_status != 'approved' THEN rs.avg_rating END)::numeric(2,1), 0) AS "platformAvgRating"
      FROM providers p
      LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
      WHERE p.status IN ('active', 'unverified')
    `);

    // Growth this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newThisMonth = await this.providerRepo.createQueryBuilder('p')
      .where("p.women_led_status = 'approved'")
      .andWhere('p.women_led_reviewed_at >= :startOfMonth', { startOfMonth })
      .getCount();

    return {
      totalApproved,
      totalPending,
      totalRejected,
      totalProviders,
      percentageOfPlatform: totalProviders > 0 ? parseFloat(((totalApproved / totalProviders) * 100).toFixed(1)) : 0,
      newApprovedThisMonth: newThisMonth,
      categoryDistribution,
      ratingComparison: ratingComparison[0] || { womenLedAvgRating: 0, platformAvgRating: 0 },
    };
  }

  // ============================================
  // User Lifecycle (Unsuspend / Delete)
  // ============================================

  async unpauseUser(admin: any, userId: string) {
    this.assertAdmin(admin);
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['provider'] });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'paused') throw new BadRequestException('User is not paused');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Restore status to active
      await queryRunner.manager.update(User, userId, {
        status: 'active',
        pausedAt: null,
      });

      // 2. Unban Supabase user
      if (user.supabaseId) {
        await this.supabaseAuthService.unbanUser(user.supabaseId);
      }

      // 3. Restore provider visibility if exists
      if (user.provider) {
        await queryRunner.manager.update(Provider, user.provider.id, {
          isAvailable: true,
        });
      }

      // 4. Reactivate chat participations
      await queryRunner.manager.update(
        ConversationParticipant,
        { userId },
        { isActive: true },
      );

      await queryRunner.commitTransaction();
      await this.createAuditLog(admin.id, 'unpause_user', 'user', userId, { status: 'paused' }, { status: 'active' }, 'Admin unpaused user');
      return { ...user, status: 'active', pausedAt: null };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async softDeleteUser(admin: any, userId: string) {
    this.assertAdmin(admin);
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['provider'] });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') throw new BadRequestException('Cannot delete admin users through this endpoint');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create audit log BEFORE deleting the user (references admin, not user)
      await this.createAuditLog(admin.id, 'delete_user', 'user', userId, { status: user.status }, { archived: true });

      // 2. Archive non-PII audit data
      await queryRunner.manager.save(UserArchive, {
        id: user.id,
        role: user.role,
        gender: user.gender,
        archiveReason: 'admin_action',
        deletedBy: admin.id,
        originalCreatedAt: user.createdAt,
      });

      // 3. Soft-delete provider if exists
      if (user.provider && !user.provider.deletedAt) {
        await queryRunner.manager.update(Provider, user.provider.id, { status: 'disabled', deletedAt: new Date() });
      }

      // 4. Deactivate chat participations
      await queryRunner.manager.update(
        ConversationParticipant,
        { userId },
        { isActive: false },
      );

      // 5. Hard-delete user row
      await queryRunner.manager.delete(User, userId);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return { message: 'User deleted and archived', id: userId };
  }

  // ============================================
  // Photo Moderation
  // ============================================

  async getPhotosForModeration(admin: any, page?: number, limit?: number, type?: string) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 20));
    const skip = (currentPage - 1) * pageSize;

    const results: any[] = [];
    let total = 0;

    if (!type || type === 'provider') {
      const [photos, count] = await this.photoRepo.findAndCount({
        relations: ['provider'],
        order: { uploadedAt: 'DESC' },
        skip: type === 'provider' ? skip : 0,
        take: type === 'provider' ? pageSize : undefined,
      });
      results.push(...photos.map(p => ({ ...p, photoType: 'provider', brandName: p.provider?.brandName })));
      total += count;
    }

    if (!type || type === 'review') {
      const [photos, count] = await this.reviewPhotoRepo.findAndCount({
        relations: ['review'],
        skip: type === 'review' ? skip : 0,
        take: type === 'review' ? pageSize : undefined,
      });
      results.push(...photos.map(p => ({ ...p, photoType: 'review' })));
      total += count;
    }

    if (!type || type === 'product') {
      const qb = this.productRepo.createQueryBuilder('p')
        .select(['p.id', 'p.name', 'p.photoUrl', 'p.photoUrls', 'p.providerId'])
        .where('(p.photoUrl IS NOT NULL OR array_length(p.photo_urls, 1) > 0)');
      const productCount = await qb.getCount();
      total += productCount;

      if (type === 'product') {
        qb.skip(skip).take(pageSize);
      }
      const products = await qb.getMany();
      for (const prod of products) {
        const urls = [prod.photoUrl, ...(prod.photoUrls || [])].filter(Boolean);
        for (const url of urls) {
          results.push({ id: prod.id, imageUrl: url, photoType: 'product', productName: prod.name, providerId: prod.providerId });
        }
      }
    }

    // Sort by newest and paginate if mixed type
    if (!type) {
      const paged = results.slice(skip, skip + pageSize);
      return { items: paged, meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) } };
    }

    return { items: results, meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async removePhoto(admin: any, id: string, type: string) {
    this.assertAdmin(admin);

    if (type === 'provider') {
      const photo = await this.photoRepo.findOneBy({ id });
      if (!photo) throw new NotFoundException('Photo not found');
      await this.photoRepo.remove(photo);
      await this.createAuditLog(admin.id, 'remove_photo', 'photo', id, { imageUrl: photo.imageUrl, providerId: photo.providerId }, null, 'Provider gallery photo removed');
      return { message: 'Provider photo removed' };
    }

    if (type === 'review') {
      const photo = await this.reviewPhotoRepo.findOneBy({ id });
      if (!photo) throw new NotFoundException('Review photo not found');
      await this.reviewPhotoRepo.remove(photo);
      await this.createAuditLog(admin.id, 'remove_photo', 'review_photo', id, { imageUrl: photo.imageUrl, reviewId: photo.reviewId }, null, 'Review photo removed');
      return { message: 'Review photo removed' };
    }

    if (type === 'product') {
      const product = await this.productRepo.findOneBy({ id });
      if (!product) throw new NotFoundException('Product not found');
      await this.productRepo.update(id, { photoUrl: null, photoUrls: [] });
      await this.createAuditLog(admin.id, 'remove_photo', 'product', id, { photoUrl: product.photoUrl, photoUrls: product.photoUrls }, { photoUrl: null, photoUrls: [] }, 'Product photos removed');
      return { message: 'Product photos removed' };
    }

    throw new BadRequestException('Invalid photo type. Must be provider, review, or product');
  }

  // ============================================
  // Bulk Actions
  // ============================================

  async bulkProviderAction(admin: any, ids: string[], action: 'approve' | 'suspend' | 'unsuspend' | 'disable') {
    this.assertAdmin(admin);
    if (!ids?.length) throw new BadRequestException('No IDs provided');
    if (ids.length > 50) throw new BadRequestException('Maximum 50 items per bulk action');

    const statusMap = { approve: 'active', suspend: 'suspended', unsuspend: 'active', disable: 'disabled' };
    const newStatus = statusMap[action] as any;

    const result = await this.providerRepo.update(ids.map(id => id), { status: newStatus });
    await this.createAuditLog(admin.id, `bulk_${action}_providers`, 'provider', null, { ids }, { status: newStatus, count: result.affected }, `Bulk ${action} on ${ids.length} providers`);

    // Send notifications for significant actions
    if (action === 'approve' || action === 'suspend') {
      const providers = await this.providerRepo.find({ where: { id: In(ids) } });
      for (const provider of providers) {
        const title = action === 'approve' ? 'Provider Approved!' : 'Provider Suspended';
        const body = action === 'approve'
          ? 'Your provider profile has been approved and is now live.'
          : 'Your provider profile has been suspended. Contact support for details.';
        this.notificationDispatch.sendToUser(provider.userId, 'provider_status', title, body, { route: '/provider-details', params: { id: provider.id } }, undefined, undefined, 'provider').catch(() => {});
      }
    }

    return { message: `Bulk ${action} completed`, affected: result.affected };
  }

  async bulkUserAction(admin: any, ids: string[], action: 'suspend' | 'unsuspend') {
    this.assertAdmin(admin);
    if (!ids?.length) throw new BadRequestException('No IDs provided');
    if (ids.length > 50) throw new BadRequestException('Maximum 50 items per bulk action');

    const newStatus = action === 'suspend' ? 'suspended' : 'active';
    const result = await this.userRepo.update(ids.map(id => id), { status: newStatus });
    await this.createAuditLog(admin.id, `bulk_${action}_users`, 'user', null, { ids }, { status: newStatus, count: result.affected }, `Bulk ${action} on ${ids.length} users`);

    // Notify affected users
    for (const userId of ids) {
      if (action === 'suspend') {
        this.notificationDispatch.sendToUser(
          userId, 'system_announcement',
          'Account Suspended',
          'Your account has been suspended. Please contact support for details.',
          { route: '/' }, undefined, undefined, 'customer',
        ).catch(() => {});
      } else {
        this.notificationDispatch.sendToUser(
          userId, 'system_announcement',
          'Account Restored',
          'Your account has been restored. You can now use all features again.',
          { route: '/' }, undefined, undefined, 'customer',
        ).catch(() => {});
      }
    }

    return { message: `Bulk ${action} completed`, affected: result.affected };
  }

  async bulkProductAction(admin: any, ids: string[], action: 'activate' | 'deactivate' | 'delete') {
    this.assertAdmin(admin);
    if (!ids?.length) throw new BadRequestException('No IDs provided');
    if (ids.length > 50) throw new BadRequestException('Maximum 50 items per bulk action');

    if (action === 'delete') {
      const result = await this.productRepo.update(ids.map(id => id), { isActive: false });
      await this.createAuditLog(admin.id, 'bulk_delete_products', 'product', null, { ids }, { isActive: false, count: result.affected }, `Bulk delete ${ids.length} products`);
      return { message: 'Bulk delete completed', affected: result.affected };
    }

    const isActive = action === 'activate';
    const result = await this.productRepo.update(ids.map(id => id), { isActive });
    await this.createAuditLog(admin.id, `bulk_${action}_products`, 'product', null, { ids }, { isActive, count: result.affected }, `Bulk ${action} on ${ids.length} products`);

    return { message: `Bulk ${action} completed`, affected: result.affected };
  }

  // ============================================
  // Sponsorship Approval Workflow
  // ============================================

  async getPendingSponsorships(admin: any, page?: number, limit?: number) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 20));
    const skip = (currentPage - 1) * pageSize;

    const [items, total] = await this.sponsoredRepo.findAndCount({
      where: { approvalStatus: 'pending_approval' },
      relations: ['provider'],
      order: { createdAt: 'ASC' },
      skip,
      take: pageSize,
    });

    return { items, meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async approveSponsorship(admin: any, id: string) {
    this.assertAdmin(admin);
    const listing = await this.sponsoredRepo.findOne({ where: { id }, relations: ['provider'] });
    if (!listing) throw new NotFoundException('Sponsored listing not found');
    if (listing.approvalStatus !== 'pending_approval') throw new BadRequestException('Listing is not pending approval');

    await this.sponsoredRepo.update(id, { approvalStatus: 'approved', reviewedBy: admin.id, reviewedAt: new Date() });
    await this.createAuditLog(admin.id, 'approve_sponsorship', 'sponsored_listing', id, { approvalStatus: 'pending_approval' }, { approvalStatus: 'approved' });

    if (listing.provider) {
      this.notificationDispatch.sendTemplated(listing.provider.userId, 'sponsorship_approved', {}).catch(() => {});
    }

    return { ...listing, approvalStatus: 'approved' };
  }

  async rejectSponsorship(admin: any, id: string, adminNotes?: string) {
    this.assertAdmin(admin);
    const listing = await this.sponsoredRepo.findOne({ where: { id }, relations: ['provider'] });
    if (!listing) throw new NotFoundException('Sponsored listing not found');

    await this.sponsoredRepo.update(id, { approvalStatus: 'rejected', isActive: false, adminNotes: adminNotes || null, reviewedBy: admin.id, reviewedAt: new Date() });
    await this.createAuditLog(admin.id, 'reject_sponsorship', 'sponsored_listing', id, { approvalStatus: listing.approvalStatus }, { approvalStatus: 'rejected', adminNotes });

    if (listing.provider) {
      this.notificationDispatch.sendToUser(listing.provider.userId, 'provider_status', 'Sponsorship Not Approved', adminNotes || 'Your sponsorship request was not approved. Please review and resubmit.', { route: '/' }, undefined, undefined, 'provider').catch(() => {});
    }

    return { ...listing, approvalStatus: 'rejected', isActive: false };
  }

  // ============================================
  // Offer Approval Workflow
  // ============================================

  async getPendingOffers(admin: any, page?: number, limit?: number) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 20));
    const skip = (currentPage - 1) * pageSize;

    const [items, total] = await this.offerRepo.findAndCount({
      where: { approvalStatus: 'pending_approval' },
      relations: ['provider'],
      order: { createdAt: 'ASC' },
      skip,
      take: pageSize,
    });

    return { items, meta: { total, page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async approveOffer(admin: any, id: string) {
    this.assertAdmin(admin);
    const offer = await this.offerRepo.findOne({ where: { id }, relations: ['provider'] });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.approvalStatus !== 'pending_approval') throw new BadRequestException('Offer is not pending approval');

    await this.offerRepo.update(id, { approvalStatus: 'approved', reviewedBy: admin.id, reviewedAt: new Date() });
    await this.createAuditLog(admin.id, 'approve_offer', 'provider_offer', id, { approvalStatus: 'pending_approval' }, { approvalStatus: 'approved' });

    if (offer.provider) {
      this.notificationDispatch.sendTemplated(offer.provider.userId, 'offer_approved', {}).catch(() => {});
    }

    return { ...offer, approvalStatus: 'approved' };
  }

  async rejectOffer(admin: any, id: string, adminNotes?: string) {
    this.assertAdmin(admin);
    const offer = await this.offerRepo.findOne({ where: { id }, relations: ['provider'] });
    if (!offer) throw new NotFoundException('Offer not found');

    await this.offerRepo.update(id, { approvalStatus: 'rejected', isActive: false, adminNotes: adminNotes || null, reviewedBy: admin.id, reviewedAt: new Date() });
    await this.createAuditLog(admin.id, 'reject_offer', 'provider_offer', id, { approvalStatus: offer.approvalStatus }, { approvalStatus: 'rejected', adminNotes });

    if (offer.provider) {
      this.notificationDispatch.sendToUser(offer.provider.userId, 'provider_status', 'Offer Not Approved', adminNotes || `Your offer "${offer.title}" was not approved.`, { route: '/' }, undefined, undefined, 'provider').catch(() => {});
    }

    return { ...offer, approvalStatus: 'rejected', isActive: false };
  }

  // ============================================
  // Feature Flags
  // ============================================

  async getFeatureFlags(admin: any) {
    this.assertAdmin(admin);
    const flags = await this.settingRepo.find({
      where: [{ group: 'feature_flags' }, { group: 'limits' }],
      order: { group: 'ASC', key: 'ASC' },
    });
    return flags;
  }

  async updateFeatureFlags(admin: any, flags: { key: string; value: string }[]) {
    this.assertAdmin(admin);
    const results: SystemSetting[] = [];
    for (const flag of flags) {
      const setting = await this.settingRepo.findOneBy({ key: flag.key });
      if (!setting) throw new NotFoundException(`Setting "${flag.key}" not found`);
      if (setting.group !== 'feature_flags' && setting.group !== 'limits') {
        throw new BadRequestException(`Setting "${flag.key}" is not a feature flag or limit`);
      }
      const prev = setting.value;
      setting.value = flag.value;
      const saved = await this.settingRepo.save(setting);
      await this.createAuditLog(admin.id, 'update_feature_flag', 'system_setting', setting.id, { value: prev }, { value: flag.value }, `Feature flag: ${flag.key}`);
      results.push(saved);
    }
    return results;
  }

  // ============================================
  // CSV Export
  // ============================================

  async exportData(admin: any, entity: string, filters: { status?: string; city?: string; search?: string }) {
    this.assertAdmin(admin);
    const validEntities = ['users', 'providers', 'products', 'reviews', 'reports'];
    if (!validEntities.includes(entity)) {
      throw new BadRequestException(`Invalid entity: ${entity}. Must be one of: ${validEntities.join(', ')}`);
    }

    let rows: any[] = [];

    if (entity === 'users') {
      const qb = this.userRepo.createQueryBuilder('u')
        .select(['u.id', 'u.name', 'u.mobileNumber', 'u.email', 'u.gender', 'u.role', 'u.city', 'u.area', 'u.status', 'u.createdAt']);
      if (filters.status) qb.andWhere('u.status = :status', { status: filters.status });
      if (filters.city) qb.andWhere('u.city ILIKE :city', { city: `%${filters.city}%` });
      if (filters.search) qb.andWhere('(u.name ILIKE :s OR u.mobileNumber ILIKE :s OR u.email ILIKE :s)', { s: `%${filters.search}%` });
      qb.orderBy('u.createdAt', 'DESC').take(10000);
      rows = await qb.getMany();
    }

    if (entity === 'providers') {
      const qb = this.providerRepo.createQueryBuilder('p')
        .leftJoinAndSelect('p.user', 'user')
        .select(['p.id', 'p.brandName', 'p.contactNumber', 'p.city', 'p.area', 'p.status', 'p.isWomenLed', 'p.isFeatured', 'p.createdAt', 'user.name', 'user.mobileNumber']);
      if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
      if (filters.city) qb.andWhere('p.city ILIKE :city', { city: `%${filters.city}%` });
      if (filters.search) qb.andWhere('(p.brandName ILIKE :s OR user.name ILIKE :s)', { s: `%${filters.search}%` });
      qb.andWhere('p.deletedAt IS NULL').orderBy('p.createdAt', 'DESC').take(10000);
      rows = await qb.getMany();
    }

    if (entity === 'products') {
      const qb = this.productRepo.createQueryBuilder('p')
        .leftJoin('p.provider', 'prov')
        .select(['p.id', 'p.name', 'p.description', 'p.price', 'p.currency', 'p.isActive', 'prov.brandName']);
      if (filters.search) qb.andWhere('(p.name ILIKE :s OR p.description ILIKE :s)', { s: `%${filters.search}%` });
      qb.orderBy('p.displayOrder', 'ASC').take(10000);
      rows = await qb.getMany();
    }

    if (entity === 'reviews') {
      const qb = this.reviewRepo.createQueryBuilder('r')
        .leftJoin('r.user', 'user')
        .leftJoin('r.provider', 'prov')
        .select(['r.id', 'r.rating', 'r.text', 'r.status', 'r.createdAt', 'user.name', 'prov.brandName']);
      if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
      qb.orderBy('r.createdAt', 'DESC').take(10000);
      rows = await qb.getMany();
    }

    if (entity === 'reports') {
      const qb = this.entityReportRepo.createQueryBuilder('r')
        .leftJoin('r.reporter', 'user')
        .select(['r.id', 'r.entityType', 'r.reason', 'r.status', 'r.createdAt', 'user.name']);
      if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
      qb.orderBy('r.createdAt', 'DESC').take(10000);
      rows = await qb.getMany();
    }

    // Convert to CSV
    if (!rows.length) return { csv: '', count: 0 };

    const flattenObj = (obj: any, prefix = ''): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}_${k}` : k;
        if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
          Object.assign(result, flattenObj(v, key));
        } else {
          result[key] = v instanceof Date ? v.toISOString() : v;
        }
      }
      return result;
    };

    const flatRows = rows.map(r => flattenObj(r));
    const headers = [...new Set(flatRows.flatMap(r => Object.keys(r)))];
    const csvLines = [
      headers.join(','),
      ...flatRows.map(r => headers.map(h => {
        const val = r[h] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')),
    ];

    await this.createAuditLog(admin.id, 'export_data', entity, null, null, { count: rows.length, filters }, `Exported ${rows.length} ${entity}`);

    return { csv: csvLines.join('\n'), count: rows.length, headers };
  }

  // ============================================
  // Unified Moderation Queue
  // ============================================

  async getModerationQueue(admin: any) {
    this.assertAdmin(admin);

    const [
      pendingProviders,
      pendingVerifications,
      openReports,
      flaggedReviews,
      pendingSponsorships,
      pendingOffers,
      openBugReports,
    ] = await Promise.all([
      this.providerRepo.count({ where: { status: 'pending' } }),
      this.verificationRepo.count({ where: { aadhaarStatus: 'pending' } }),
      this.entityReportRepo.count({ where: { status: 'pending' } }),
      this.reportRepo.count({ where: { status: 'pending' } }),
      this.sponsoredRepo.count({ where: { approvalStatus: 'pending_approval' } }),
      this.offerRepo.count({ where: { approvalStatus: 'pending_approval' } }),
      this.bugReportRepo.count({ where: { status: 'open' } }),
    ]);

    const totalPending = pendingProviders + pendingVerifications + openReports + flaggedReviews + pendingSponsorships + pendingOffers + openBugReports;

    return {
      totalPending,
      items: [
        { type: 'providers', label: 'Pending Providers', count: pendingProviders, route: '/providers?status=pending' },
        { type: 'verifications', label: 'Pending Verifications', count: pendingVerifications, route: '/registrations?status=pending' },
        { type: 'reports', label: 'Open Reports', count: openReports, route: '/reports?status=pending' },
        { type: 'reviews', label: 'Flagged Reviews', count: flaggedReviews, route: '/reviews?status=flagged' },
        { type: 'sponsorships', label: 'Pending Sponsorships', count: pendingSponsorships, route: '/sponsorships?approvalStatus=pending_approval' },
        { type: 'offers', label: 'Pending Offers', count: pendingOffers, route: '/offers?approvalStatus=pending_approval' },
        { type: 'bugReports', label: 'Open Bug Reports', count: openBugReports, route: '/bug-reports-admin?status=open' },
      ],
    };
  }

  // ============================================
  // Serviceable Cities
  // ============================================

  async getServiceableCities(admin: any) {
    this.assertAdmin(admin);
    const cities = await this.serviceableCitiesService.getAllCities();
    const requestStats = await this.serviceableCitiesService.getRequestStats();
    const statsMap = new Map(requestStats.map((s) => [s.city.toLowerCase(), s]));

    return cities.map((c) => ({
      ...c,
      requestCount: statsMap.get(c.name.toLowerCase())?.count ?? 0,
      lastRequestAt: statsMap.get(c.name.toLowerCase())?.lastRequestAt ?? null,
    }));
  }

  async updateServiceableCity(admin: any, id: string, status: 'active' | 'coming_soon' | 'disabled') {
    this.assertAdmin(admin);
    const cityRepo = this.dataSource.getRepository(ServiceableCity);
    const city = await cityRepo.findOneBy({ id });
    if (!city) throw new NotFoundException('Serviceable city not found');
    const prev = city.status;
    city.status = status;
    if (status === 'active' && !city.launchDate) {
      city.launchDate = new Date();
    }
    const saved = await cityRepo.save(city);
    await this.createAuditLog(admin.id, 'update_serviceable_city', 'serviceable_city', id, { status: prev }, { status }, `City: ${city.name}`);
    return saved;
  }

  async getCityRequestStats(admin: any) {
    this.assertAdmin(admin);
    return this.serviceableCitiesService.getRequestStats();
  }

  async getCityRequestInsights(admin: any) {
    this.assertAdmin(admin);
    return this.serviceableCitiesService.getRequestInsights();
  }
}

