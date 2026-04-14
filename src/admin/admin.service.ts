import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  private assertAdmin(user: any) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  private buildPagination(page = 1, limit = 10, total = 0) {
  return {
    currentPage: page,
    pageSize: limit,
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}
  async getDashboard(admin: any) {
    this.assertAdmin(admin);
    const [
      pendingListings,
      totalListings,
      totalUsers,
      pendingVerifications,
      flaggedReviews,
    ] = await Promise.all([
      this.prisma.listing.count({ where: { status: 'pending', deletedAt: null } }),
      this.prisma.listing.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.verification.count({ where: { aadhaarStatus: 'pending' } }),
      this.prisma.reviewReport.count({ where: { status: 'pending' } }),
    ]);
    return { pendingListings, totalListings, totalUsers, pendingVerifications, flaggedReviews };
  }

 async getPendingListings(admin: any, page = 1, limit = 10) {
  this.assertAdmin(admin);

  const skip = (page - 1) * limit;

  const [data, total] = await this.prisma.$transaction([
    this.prisma.listing.findMany({
      where: { status: 'pending', deletedAt: null },
      include: {
        provider: { select: { id: true, name: true, mobileNumber: true } },
        listingCategories: { include: { category: true } },
      },
      orderBy: { submittedAt: 'asc' },
      skip,
      take: limit,
    }),

    this.prisma.listing.count({
      where: { status: 'pending', deletedAt: null },
    }),
  ]);

  return {
    data,
    pagination: this.buildPagination(page, limit, total),
  };
}
  async approveListing(admin: any, listingId: string) {
    this.assertAdmin(admin);
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { status: 'live', approvedAt: new Date() },
    });
  }

  async rejectListing(admin: any, listingId: string, note: string) {
    this.assertAdmin(admin);
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { status: 'rejected', rejectionNote: note },
    });
  }

  async getVerifications(admin: any, page?: number, rows?: number) {
    this.assertAdmin(admin);

    // default values for page and rows
    const currentPage = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, rows || 10)); // Max 100 rows per page

    const skip = (currentPage - 1) * pageSize;

    const totalCount = await this.prisma.verification.count({
      where: { aadhaarStatus: 'pending' },
    });

    // paginated results
    const verifications = await this.prisma.verification.findMany({
      where: { aadhaarStatus: 'pending' },
      include: { user: { select: { id: true, name: true, mobileNumber: true } } },
      orderBy: { reviewedAt: 'asc' },
      skip,
      take: pageSize,
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      data: verifications,
      pagination: {
        currentPage,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async getVerificationById(admin: any, verificationId: string) {
    this.assertAdmin(admin);
    
    const verification = await this.prisma.verification.findUnique({
      where: { id: verificationId },
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            mobileNumber: true,
            city: true,
            area: true
          } 
        },
        reviewer: {
          select: {
            id: true,
            name: true
          }
        }
      },
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

    return this.prisma.verification.update({
      where: { id: verificationId },
      data,
    });
  }

  async removeReview(admin: any, reviewId: string) {
    this.assertAdmin(admin);
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { status: 'removed', moderatedAt: new Date(), moderatedBy: admin.id },
    });
  }

  async getPendingReports(admin: any) {
    this.assertAdmin(admin);
    return this.prisma.reviewReport.findMany({
      where: { status: 'pending' },
      include: { review: true, reporter: { select: { id: true, name: true } } },
    });
  }

  async suspendUser(admin: any, userId: string) {
    this.assertAdmin(admin);
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'suspended' },
    });
  }

  async updateVerificationStatus(
    admin: any,
    verificationId: string,
    aadhaarStatus?: 'pending' | 'approved' | 'rejected',
    ijamatStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted',
    status?: 'pending' | 'approved' | 'rejected'
  ) {
    this.assertAdmin(admin);
    
    const verification = await this.prisma.verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException(`Verification with ID ${verificationId} not found`);
    }

    const data: any = {};
    if (aadhaarStatus) data.aadhaarStatus = aadhaarStatus;
    if (ijamatStatus) data.ijamatStatus = ijamatStatus;
    if (status) data.status = status;

    return this.prisma.verification.update({
      where: { id: verificationId },
      data,
    });
  }
}
