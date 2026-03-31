import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVerificationDto } from './dto/verification.dto';

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
}
