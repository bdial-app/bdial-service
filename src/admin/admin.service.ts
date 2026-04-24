import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, MoreThan, ILike, Between } from 'typeorm';
import { Provider, User, Verification, Review, ReviewReport, Report, ProviderWarning, Product, Category, Conversation, ConversationParticipant, Message, PromoBanner, SponsoredListing, ProviderOffer, ProviderBadge, ProviderAnalyticsEvent, ProviderLead, SearchLog, AdEvent, AppInvite, AuditLog, SystemSetting } from '../entities';

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
    ]);

    return {
      pendingProviders, totalProviders, totalUsers, pendingVerifications,
      flaggedReviews, openReports, totalProducts, totalReviews,
      newUsersThisWeek, newUsersThisMonth, newProvidersThisWeek,
      totalSearches, totalLeads, totalConversations, totalInvites,
      activeOffers, activeSponsorships, activeBanners,
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
    return this.providerRepo.findOneBy({ id: providerId });
  }

  async suspendProvider(admin: any, providerId: string) {
    this.assertAdmin(admin);
    await this.providerRepo.update(providerId, { status: 'suspended' });
    return this.providerRepo.findOneBy({ id: providerId });
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
    await this.verificationRepo.update(verificationId, data);
    return this.verificationRepo.findOneBy({ id: verificationId });
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

  async suspendUser(admin: any, userId: string) {
    this.assertAdmin(admin);
    await this.userRepo.update(userId, { status: 'suspended' });
    return this.userRepo.findOneBy({ id: userId });
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

    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      data: reports,
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
      this.entityReportRepo.count({ where: { reporterId: report.reporterId } }),
      this.entityReportRepo.count({ where: { reporterId: report.reporterId, status: 'dismissed' as any } }),
      this.entityReportRepo.count({ where: { reporterId: report.reporterId, status: 'action_taken' as any } }),
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
          await this.providerRepo.update(report.entityId, { status: 'suspended' });
          await this.createProviderWarning(report.entityId, reportId, admin.id, report.reason, adminNotes, true);
        } else if (report.entityType === 'product') {
          const product = await this.providerRepo.manager
            .getRepository('Product')
            .findOne({ where: { id: report.entityId }, relations: ['provider'] });
          if (product?.provider?.id) {
            await this.providerRepo.update(product.provider.id, { status: 'suspended' });
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
            await this.providerRepo.update(report.entityId, { status: 'suspended' });
            await this.userRepo.update(provider.userId, { status: 'suspended' });
            await this.createProviderWarning(report.entityId, reportId, admin.id, report.reason, adminNotes, true);
          }
        } else if (report.entityType === 'product') {
          const product = await this.providerRepo.manager
            .getRepository('Product')
            .findOne({ where: { id: report.entityId }, relations: ['provider'] });
          if (product?.provider) {
            await this.providerRepo.update(product.provider.id, { status: 'suspended' });
            await this.userRepo.update(product.provider.userId, { status: 'suspended' });
            await this.createProviderWarning(product.provider.id, reportId, admin.id, report.reason, adminNotes, true);
          }
        }
        break;
      }
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
    return warning;
  }

  async getProviderWarnings(admin: any, providerId: string) {
    this.assertAdmin(admin);
    return this.warningRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
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
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.userRepo.createQueryBuilder('u');

    if (search) {
      qb.andWhere(
        '(u.name ILIKE :search OR u.mobile_number ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    const VALID_USER_STATUSES = ['active', 'suspended', 'deleted', 'paused'];
    const VALID_USER_ROLES = ['customer', 'admin'];
    if (status && VALID_USER_STATUSES.includes(status)) qb.andWhere('u.status = :status', { status });
    if (role && VALID_USER_ROLES.includes(role)) qb.andWhere('u.role = :role', { role });
    if (city) qb.andWhere('u.city ILIKE :city', { city: `%${city}%` });

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

    const VALID_STATUSES = ['pending', 'in_review', 'active', 'suspended', 'unverified'];
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
    const allowed: string[] = ['status', 'isFeatured', 'communityVerified', 'brandName', 'description', 'isAvailable'];
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
  ) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.productRepo.createQueryBuilder('prod')
      .leftJoinAndSelect('prod.provider', 'provider');

    if (search) {
      qb.andWhere('(prod.name ILIKE :search OR prod.description ILIKE :search)', { search: `%${search}%` });
    }
    if (providerId) qb.andWhere('prod.provider_id = :providerId', { providerId });
    if (isActive === 'true') qb.andWhere('prod.is_active = true');
    if (isActive === 'false') qb.andWhere('prod.is_active = false');

    qb.orderBy('prod.display_order', 'ASC').skip(skip).take(pageSize);

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

  async getProductById(admin: any, productId: string) {
    this.assertAdmin(admin);
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['provider'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProductAdmin(admin: any, productId: string, body: Partial<Product>) {
    this.assertAdmin(admin);
    const allowed: string[] = ['isActive', 'displayOrder', 'name', 'description', 'price'];
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
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    const skip = (currentPage - 1) * pageSize;

    const qb = this.reviewRepo.createQueryBuilder('rev')
      .leftJoinAndSelect('rev.reviewer', 'reviewer')
      .leftJoinAndSelect('rev.provider', 'provider')
      .leftJoinAndSelect('rev.photos', 'photos');

    if (status) qb.andWhere('rev.status = :status', { status });
    if (providerId) qb.andWhere('rev.provider_id = :providerId', { providerId });
    if (minRating) qb.andWhere('rev.star_rating >= :minRating', { minRating });
    if (maxRating) qb.andWhere('rev.star_rating <= :maxRating', { maxRating });

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

  async createBanner(admin: any, body: Partial<PromoBanner>) {
    this.assertAdmin(admin);
    const maxOrder = await this.bannerRepo
      .createQueryBuilder('b')
      .select('MAX(b.display_order)', 'max')
      .getRawOne();
    const banner = this.bannerRepo.create({
      ...body,
      displayOrder: (maxOrder?.max ?? -1) + 1,
    });
    return this.bannerRepo.save(banner);
  }

  async updateBanner(admin: any, bannerId: string, body: Partial<PromoBanner>) {
    this.assertAdmin(admin);
    const banner = await this.bannerRepo.findOneBy({ id: bannerId });
    if (!banner) throw new NotFoundException('Banner not found');

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

    const fmt = (rows: any[]) => rows.map(r => ({ date: r.date, count: Number(r.count) }));

    return {
      userGrowth: fmt(userGrowth),
      providerGrowth: fmt(providerGrowth),
      searchVolume: fmt(searchVolume),
      reportVolume: fmt(reportVolume),
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
      await this.createAuditLog(admin.sub, 'promote_to_admin', 'user', existing.id, { role: 'customer' }, { role: 'admin' });
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
    await this.createAuditLog(admin.sub, 'create_admin', 'user', saved.id, null, { name: saved.name, role: 'admin' });
    return saved;
  }

  async updateAdminUser(admin: any, id: string, body: { name?: string; status?: string }) {
    this.assertAdmin(admin);
    const user = await this.userRepo.findOneBy({ id, role: 'admin' });
    if (!user) throw new NotFoundException('Admin user not found');
    if (id === admin.sub) throw new BadRequestException('Cannot modify own account');
    const prev = { name: user.name, status: user.status };
    if (body.name) user.name = body.name;
    if (body.status) user.status = body.status;
    const updated = await this.userRepo.save(user);
    await this.createAuditLog(admin.sub, 'update_admin', 'user', id, prev, { name: updated.name, status: updated.status });
    return updated;
  }

  async removeAdminUser(admin: any, id: string) {
    this.assertAdmin(admin);
    if (id === admin.sub) throw new BadRequestException('Cannot remove own admin access');
    const user = await this.userRepo.findOneBy({ id, role: 'admin' });
    if (!user) throw new NotFoundException('Admin user not found');
    user.role = 'customer';
    await this.userRepo.save(user);
    await this.createAuditLog(admin.sub, 'demote_admin', 'user', id, { role: 'admin' }, { role: 'customer' });
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

  async getAuditLogs(admin: any, page = 1, rows = 25, filters?: { adminId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }) {
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
        await this.createAuditLog(admin.sub, 'update_setting', 'system_setting', setting.id, { value: prev }, { value: s.value }, `Setting: ${s.key}`);
        results.push(updated);
      } else {
        setting = this.settingRepo.create({ key: s.key, value: s.value, type: 'string' });
        const saved = await this.settingRepo.save(setting);
        await this.createAuditLog(admin.sub, 'create_setting', 'system_setting', saved.id, null, { key: s.key, value: s.value });
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
    await this.createAuditLog(admin.sub, 'create_setting', 'system_setting', saved.id, null, body);
    return saved;
  }

  async deleteSetting(admin: any, id: string) {
    this.assertAdmin(admin);
    const setting = await this.settingRepo.findOneBy({ id });
    if (!setting) throw new NotFoundException('Setting not found');
    await this.createAuditLog(admin.sub, 'delete_setting', 'system_setting', id, { key: setting.key, value: setting.value }, null);
    await this.settingRepo.remove(setting);
    return { message: 'Setting deleted' };
  }
}

