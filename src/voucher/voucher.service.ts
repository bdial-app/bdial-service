import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher) private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherRedemption) private readonly redemptionRepo: Repository<VoucherRedemption>,
  ) {}

  async create(dto: CreateVoucherDto, adminUserId: string) {
    const code = dto.code.toUpperCase().trim();

    const existing = await this.voucherRepo.findOneBy({ code });
    if (existing) throw new ConflictException(`Voucher code "${code}" already exists`);

    const voucher = this.voucherRepo.create({
      code,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses ?? null,
      maxUsesPerProvider: dto.maxUsesPerProvider ?? null,
      minPurchaseAmount: dto.minPurchaseAmount ?? null,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      applicableTo: dto.applicableTo ?? null,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      createdBy: adminUserId,
    });

    return this.voucherRepo.save(voucher);
  }

  async findAll(filters: { page?: number; limit?: number; isActive?: boolean }) {
    const { page = 1, limit = 20, isActive } = filters;
    const qb = this.voucherRepo.createQueryBuilder('v')
      .orderBy('v.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (isActive !== undefined) {
      qb.andWhere('v.isActive = :isActive', { isActive });
    }

    const [vouchers, total] = await qb.getManyAndCount();
    return { vouchers, total, page, limit };
  }

  async findOne(id: string) {
    const voucher = await this.voucherRepo.findOneBy({ id });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const voucher = await this.findOne(id);

    if (dto.code) {
      dto.code = dto.code.toUpperCase().trim();
      if (dto.code !== voucher.code) {
        const existing = await this.voucherRepo.findOneBy({ code: dto.code });
        if (existing) throw new ConflictException(`Voucher code "${dto.code}" already exists`);
      }
    }

    Object.assign(voucher, {
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : voucher.validFrom,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : voucher.validUntil,
    });

    return this.voucherRepo.save(voucher);
  }

  async getRedemptions(id: string, page = 1, limit = 20) {
    await this.findOne(id); // verify exists

    const [redemptions, total] = await this.redemptionRepo.findAndCount({
      where: { voucherId: id },
      relations: ['provider'],
      order: { redeemedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { redemptions, total, page, limit };
  }

  async getStats() {
    const totalVouchers = await this.voucherRepo.count();
    const activeVouchers = await this.voucherRepo.count({ where: { isActive: true } });
    const totalRedemptions = await this.redemptionRepo.count();

    const totalDiscountGiven = await this.redemptionRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.discountAmount), 0)', 'total')
      .getRawOne();

    return {
      totalVouchers,
      activeVouchers,
      totalRedemptions,
      totalDiscountGiven: Number(totalDiscountGiven?.total ?? 0),
    };
  }
}
