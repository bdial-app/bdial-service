import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, DataSource } from 'typeorm';
import { Listing, ListingCategory, User } from '../entities';
import {
  CreateListingDto,
  UpdateListingDto,
  ListingSearchDto,
} from './dto/listing.dto';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing) private listingRepo: Repository<Listing>,
    @InjectRepository(ListingCategory) private listingCatRepo: Repository<ListingCategory>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateListingDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    const { categoryIds, ...data } = dto;

    const listing = this.listingRepo.create({
      ...data,
      providerId: userId,
      isWomenLed: user?.gender === 'female',
    });
    const saved = await this.listingRepo.save(listing);

    if (categoryIds?.length) {
      const cats = categoryIds.map((id) =>
        this.listingCatRepo.create({ listingId: saved.id, categoryId: id }),
      );
      await this.listingCatRepo.save(cats);
    }

    return this.listingRepo.findOne({
      where: { id: saved.id },
      relations: ['listingCategories', 'listingCategories.category'],
    });
  }

  async search(query: ListingSearchDto) {
    const { keyword, city, categoryId, isWomenLed, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const qb = this.listingRepo.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.listingCategories', 'lc')
      .leftJoinAndSelect('lc.category', 'cat')
      .leftJoinAndSelect('listing.photos', 'photo')
      .leftJoinAndSelect('listing.reviews', 'review', 'review.status = :rs', { rs: 'active' })
      .where('listing.status = :status', { status: 'live' })
      .andWhere('listing.deleted_at IS NULL');

    if (keyword) {
      qb.andWhere('(listing.business_name ILIKE :kw OR listing.description ILIKE :kw)', { kw: `%${keyword}%` });
    }
    if (city) {
      qb.andWhere('listing.city ILIKE :city', { city: `%${city}%` });
    }
    if (isWomenLed !== undefined) {
      const val = isWomenLed === true || isWomenLed === ('true' as any);
      qb.andWhere('listing.is_women_led = :wl', { wl: val });
    }
    if (categoryId) {
      qb.andWhere('lc.category_id = :catId', { catId: categoryId });
    }

    qb.orderBy('listing.approved_at', 'DESC')
      .skip(skip)
      .take(Number(limit));

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(id: string) {
    const listing = await this.listingRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'provider',
        'listingCategories',
        'listingCategories.category',
        'photos',
        'products',
        'reviews',
        'reviews.reviewer',
        'reviews.photos',
      ],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async update(id: string, userId: string, dto: UpdateListingDto) {
    const listing = await this.listingRepo.findOneBy({ id });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();

    const { categoryIds, ...data } = dto;

    if (categoryIds) {
      await this.listingCatRepo.delete({ listingId: id });
      if (categoryIds.length) {
        const cats = categoryIds.map((cid) =>
          this.listingCatRepo.create({ listingId: id, categoryId: cid }),
        );
        await this.listingCatRepo.save(cats);
      }
    }

    await this.listingRepo.update(id, { ...data, status: 'pending' });
    return this.listingRepo.findOne({
      where: { id },
      relations: ['listingCategories', 'listingCategories.category'],
    });
  }

  async deactivate(id: string, userId: string) {
    const listing = await this.listingRepo.findOneBy({ id });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();
    await this.listingRepo.update(id, { status: 'inactive', deletedAt: new Date() });
    return this.listingRepo.findOneBy({ id });
  }
}
