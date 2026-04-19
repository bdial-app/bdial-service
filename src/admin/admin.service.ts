import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Listing, User, Verification, Review, ReviewReport } from '../entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Listing) private listingRepo: Repository<Listing>,
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
    const [pendingListings, totalListings, totalUsers, pendingVerifications, flaggedReviews] =
      await Promise.all([
        this.listingRepo.count({ where: { status: 'pending', deletedAt: IsNull() } }),
        this.listingRepo.count({ where: { deletedAt: IsNull() } }),
        this.userRepo.count({ where: { status: 'active' } }),
        this.verificationRepo.count({ where: { aadhaarStatus: 'pending' } }),
        this.reportRepo.count({ where: { status: 'pending' } }),
      ]);
    return { pendingListings, totalListings, totalUsers, pendingVerifications, flaggedReviews };
  }

  async getPendingListings(admin: any) {
    this.assertAdmin(admin);
    return this.listingRepo.find({
      where: { status: 'pending', deletedAt: IsNull() },
      relations: ['provider', 'listingCategories', 'listingCategories.category'],
      order: { submittedAt: 'ASC' },
    });
  }

  async approveListing(admin: any, listingId: string) {
    this.assertAdmin(admin);
    await this.listingRepo.update(listingId, { status: 'live', approvedAt: new Date() });
    return this.listingRepo.findOneBy({ id: listingId });
  }

  async rejectListing(admin: any, listingId: string, note: string) {
    this.assertAdmin(admin);
    await this.listingRepo.update(listingId, { status: 'rejected', rejectionNote: note });
    return this.listingRepo.findOneBy({ id: listingId });
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
