import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';
import { AdminVoucherListQueryDto } from './dto/admin-voucher-list.dto';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { Provider } from '../entities';

/**
 * Operational status, mutually exclusive and checked in this order. Shared by
 * the list filter and the segment counts so "Expired (12)" matches 12 rows.
 */
const VOUCHER_OP_STATUS_SQL = {
  inactive: 'NOT v.is_active',
  expired: 'v.is_active AND v.valid_until < now()',
  scheduled: 'v.is_active AND v.valid_until >= now() AND v.valid_from > now()',
  exhausted:
    'v.is_active AND v.valid_until >= now() AND v.valid_from <= now() AND v.max_uses IS NOT NULL AND v.used_count >= v.max_uses',
  live: 'v.is_active AND v.valid_until >= now() AND v.valid_from <= now() AND (v.max_uses IS NULL OR v.used_count < v.max_uses)',
} as const;

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherRedemption)
    private readonly redemptionRepo: Repository<VoucherRedemption>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVoucherDto, adminUserId: string) {
    const code = dto.code.toUpperCase().trim();

    const existing = await this.voucherRepo.findOneBy({ code });
    if (existing)
      throw new ConflictException(`Voucher code "${code}" already exists`);

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

    const saved = await this.voucherRepo.save(voucher);

    // Notify all active providers about the new voucher
    this.notifyProvidersOfNewVoucher(saved).catch(() => {});

    return saved;
  }

  async findAll(query: AdminVoucherListQueryDto) {
    const {
      isActive,
      search,
      discountType,
      dateFrom,
      dateTo,
      opStatus,
      applicableTo,
      usage,
      expiringWithinDays,
      validFrom,
      validTo,
      createdBy,
      sort,
    } = query;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));

    const qb = this.voucherRepo
      .createQueryBuilder('v')
      .leftJoin('v.creator', 'creator')
      .addSelect(['creator.id', 'creator.name']);

    if (isActive === 'true') qb.andWhere('v.is_active = true');
    else if (isActive === 'false') qb.andWhere('v.is_active = false');
    if (search) {
      qb.andWhere('(v.code ILIKE :search OR v.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (discountType)
      qb.andWhere('v.discount_type = :discountType', { discountType });
    if (opStatus) qb.andWhere(`(${VOUCHER_OP_STATUS_SQL[opStatus]})`);
    if (applicableTo)
      qb.andWhere(':applicableTo = ANY(v.applicable_to)', { applicableTo });
    if (usage === 'never') qb.andWhere('v.used_count = 0');
    else if (usage === 'used') qb.andWhere('v.used_count > 0');
    else if (usage === 'exhausted')
      qb.andWhere('v.max_uses IS NOT NULL AND v.used_count >= v.max_uses');
    if (expiringWithinDays !== undefined) {
      qb.andWhere(
        `v.valid_until >= now() AND v.valid_until <= now() + make_interval(days => :expiringWithinDays)`,
        { expiringWithinDays },
      );
    }
    if (createdBy) qb.andWhere('v.created_by = :createdBy', { createdBy });

    // Dates are calendar days in IST, the way the admin reads them.
    if (dateFrom)
      qb.andWhere(
        `(v.created_at AT TIME ZONE 'Asia/Kolkata')::date >= :dateFrom::date`,
        { dateFrom },
      );
    if (dateTo)
      qb.andWhere(
        `(v.created_at AT TIME ZONE 'Asia/Kolkata')::date <= :dateTo::date`,
        { dateTo },
      );
    if (validFrom)
      qb.andWhere(
        `(v.valid_until AT TIME ZONE 'Asia/Kolkata')::date >= :validFrom::date`,
        { validFrom },
      );
    if (validTo)
      qb.andWhere(
        `(v.valid_until AT TIME ZONE 'Asia/Kolkata')::date <= :validTo::date`,
        { validTo },
      );

    if (sort === 'expiring_soon')
      qb.orderBy('v.validUntil', 'ASC').addOrderBy('v.createdAt', 'DESC');
    else if (sort === 'most_used')
      qb.orderBy('v.usedCount', 'DESC').addOrderBy('v.createdAt', 'DESC');
    else qb.orderBy('v.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [vouchers, total] = await qb.getManyAndCount();
    return {
      vouchers,
      items: vouchers,
      total,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /** Creator dropdown and quick-segment counts for the admin voucher list. */
  async getFilterOptions() {
    const s = VOUCHER_OP_STATUS_SQL;
    const [creators, [counts]] = await Promise.all([
      this.dataSource.query<{ id: string; name: string; count: number }[]>(
        `SELECT u.id, u.name, count(*)::int AS count
         FROM vouchers v JOIN users u ON u.id = v.created_by
         GROUP BY u.id, u.name ORDER BY 3 DESC, 2 ASC LIMIT 100`,
      ),
      this.dataSource.query<Record<string, number>[]>(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE ${s.live})::int AS live,
           count(*) FILTER (WHERE ${s.live} AND v.valid_until <= now() + interval '7 days')::int AS "expiring7d",
           count(*) FILTER (WHERE v.used_count = 0)::int AS "neverUsed",
           count(*) FILTER (WHERE ${s.exhausted})::int AS exhausted,
           count(*) FILTER (WHERE ${s.expired})::int AS expired
         FROM vouchers v`,
      ),
    ]);
    return { creators, counts };
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
        if (existing)
          throw new ConflictException(
            `Voucher code "${dto.code}" already exists`,
          );
      }
    }

    Object.assign(voucher, {
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : voucher.validFrom,
      validUntil: dto.validUntil
        ? new Date(dto.validUntil)
        : voucher.validUntil,
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
    const activeVouchers = await this.voucherRepo.count({
      where: { isActive: true },
    });
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

  private async notifyProvidersOfNewVoucher(voucher: Voucher) {
    const discountLabel =
      voucher.discountType === 'percentage'
        ? `${voucher.discountValue}%`
        : `₹${voucher.discountValue}`;
    const expiryDate = voucher.validUntil.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // Get all active providers
    const providers = await this.providerRepo.find({
      where: { status: 'active' },
      select: ['userId'],
    });

    for (const provider of providers) {
      this.notificationDispatch
        .sendTemplated(
          provider.userId,
          'voucher_available',
          { voucherCode: voucher.code, discount: discountLabel, expiryDate },
          undefined,
          'provider',
        )
        .catch(() => {});
    }
  }
}
