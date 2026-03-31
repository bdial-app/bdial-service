import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private assertAdmin(user: any) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
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

  async getPendingListings(admin: any) {
    this.assertAdmin(admin);
    return this.prisma.listing.findMany({
      where: { status: 'pending', deletedAt: null },
      include: {
        provider: { select: { id: true, name: true, mobileNumber: true } },
        listingCategories: { include: { category: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
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

  async getVerifications(admin: any) {
    this.assertAdmin(admin);
    return this.prisma.verification.findMany({
      where: { aadhaarStatus: 'pending' },
      include: { user: { select: { id: true, name: true, mobileNumber: true } } },
    });
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
}
