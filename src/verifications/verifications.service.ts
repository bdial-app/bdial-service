import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Verification, Provider } from '../entities';
import { CreateVerificationDto } from './dto/verification.dto';

@Injectable()
export class VerificationsService {
  constructor(
    @InjectRepository(Verification) private verRepo: Repository<Verification>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
  ) {}

  async submit(userId: string, dto: CreateVerificationDto) {
    const existing = await this.verRepo.findOneBy({ userId });
    if (existing) {
      existing.aadhaarDocUrl = dto.aadhaarDocUrl;
      existing.aadhaarStatus = 'pending';
      existing.ijamatNumber = dto.ijamatNumber ?? existing.ijamatNumber;
      existing.ijamatExpiry = dto.ijamatExpiry ? new Date(dto.ijamatExpiry) : existing.ijamatExpiry;
      existing.ijamatDocUrl = dto.ijamatDocUrl ?? existing.ijamatDocUrl;
      existing.ijamatStatus = dto.ijamatDocUrl ? 'pending' : 'not_submitted';
      existing.status = 'in_review';
      return this.verRepo.save(existing);
    }

    const verification = this.verRepo.create({
      userId,
      aadhaarDocUrl: dto.aadhaarDocUrl,
      ijamatNumber: dto.ijamatNumber,
      ijamatExpiry: dto.ijamatExpiry ? new Date(dto.ijamatExpiry) : undefined,
      ijamatDocUrl: dto.ijamatDocUrl,
      ijamatStatus: dto.ijamatDocUrl ? 'pending' : 'not_submitted',
      status: 'in_review',
    });
    return this.verRepo.save(verification);
  }

  async getMyVerification(userId: string) {
    const v = await this.verRepo.findOneBy({ userId });
    if (!v) throw new NotFoundException('No verification submitted');
    const { aadhaarDocUrl, ijamatDocUrl, ...safe } = v;
    return safe;
  }

  async getVerificationStatus(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) return null;
    const verification = await this.verRepo.findOneBy({ userId });
    return verification ? verification.status : 'pending';
  }

  async updateAadhaarStatus(userId: string, status: string) {
    const verification = await this.verRepo.findOneBy({ userId });
    if (!verification) throw new NotFoundException(`Verification record not found for user ${userId}`);
    verification.aadhaarStatus = status;
    return this.verRepo.save(verification);
  }
}
