import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVerificationDto } from './dto/verification.dto';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class VerificationsService {
  constructor(private prisma: PrismaService) {}

  async submit(userId: string, dto: CreateVerificationDto) {
    const existing = await this.prisma.verification.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.prisma.verification.update({
        where: { userId },
        data: {
          aadhaarDocUrl: dto.aadhaarDocUrl,
          aadhaarStatus: 'pending',
          ijamatNumber: dto.ijamatNumber,
          ijamatExpiry: dto.ijamatExpiry ? new Date(dto.ijamatExpiry) : undefined,
          ijamatDocUrl: dto.ijamatDocUrl,
          ijamatStatus: dto.ijamatDocUrl ? 'pending' : 'not_submitted',
        },
      });
    }
    return this.prisma.verification.create({
      data: {
        userId,
        aadhaarDocUrl: dto.aadhaarDocUrl,
        ijamatNumber: dto.ijamatNumber,
        ijamatExpiry: dto.ijamatExpiry ? new Date(dto.ijamatExpiry) : undefined,
        ijamatDocUrl: dto.ijamatDocUrl,
        ijamatStatus: dto.ijamatDocUrl ? 'pending' : 'not_submitted',
        status: 'pending',
      },
    });
  }

  async getMyVerification(userId: string) {
    const v = await this.prisma.verification.findUnique({ where: { userId } });
    if (!v) throw new NotFoundException('No verification submitted');
    // Strip sensitive doc URLs from response (shown only to admins in admin module)
    const { aadhaarDocUrl, ijamatDocUrl, ...safe } = v;
    return safe;
  }

  async getVerificationStatus(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      return null;
    }

    const verification = await this.prisma.verification.findUnique({
      where: { userId },
    });

    return verification ? verification.status : 'pending';
  }

  async updateAadhaarStatus(userId: string, status: VerificationStatus) {
    const verification = await this.prisma.verification.findUnique({
      where: { userId },
    });

    if (!verification) {
      throw new NotFoundException(`Verification record not found for user ${userId}`);
    }

    return this.prisma.verification.update({
      where: { userId },
      data: {
        aadhaarStatus: status,
      },
    });
  }
}
