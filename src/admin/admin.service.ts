import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Provider, User, Verification, Review, ReviewReport } from '../entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verificationRepo: Repository<Verification>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(ReviewReport) private reportRepo: Repository<ReviewReport>,
  ) {}

  private assertAdmin(user: any) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  async getDashboard(admin: any) {
    this.assertAdmin(admin);
    const [pendingProviders, totalProviders, totalUsers, pendingVerifications, flaggedReviews] =
      await Promise.all([
        this.providerRepo.count({ where: { status: 'pending' } }),
        this.providerRepo.count(),
        this.userRepo.count({ where: { status: 'active' } }),
        this.verificationRepo.count({ where: { aadhaarStatus: 'pending' } }),
        this.reportRepo.count({ where: { status: 'pending' } }),
      ]);
    return { pendingProviders, totalProviders, totalUsers, pendingVerifications, flaggedReviews };
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

  async getVerifications(admin: any, page?: number, rows?: number) {
    this.assertAdmin(admin);
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, rows || 10));
    const skip = (currentPage - 1) * pageSize;

    const [verifications, totalCount] = await this.verificationRepo.findAndCount({
      where: { aadhaarStatus: 'pending' },
      relations: ['user'],
      order: { reviewedAt: 'ASC' },
      skip,
      take: pageSize,
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      data: verifications,
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
}
