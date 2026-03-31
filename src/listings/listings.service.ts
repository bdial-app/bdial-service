import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateListingDto,
  UpdateListingDto,
  ListingSearchDto,
} from './dto/listing.dto';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateListingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const { categoryIds, ...data } = dto;

    const listing = await this.prisma.listing.create({
      data: {
        ...data,
        providerId: userId,
        isWomenLed: user?.gender === 'female',
        ...(categoryIds?.length
          ? {
              listingCategories: {
                create: categoryIds.map((id) => ({ categoryId: id })),
              },
            }
          : {}),
      },
      include: { listingCategories: { include: { category: true } } },
    });
    return listing;
  }

  async search(query: ListingSearchDto) {
    const { keyword, city, categoryId, isWomenLed, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      status: 'live',
      deletedAt: null,
    };

    if (keyword) {
      where.OR = [
        { businessName: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (isWomenLed !== undefined) where.isWomenLed = isWomenLed === true || isWomenLed === ('true' as any);
    if (categoryId) {
      where.listingCategories = { some: { categoryId } };
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          listingCategories: { include: { category: true } },
          photos: { orderBy: { displayOrder: 'asc' }, take: 1 },
          reviews: { where: { status: 'active' }, select: { starRating: true } },
        },
        orderBy: { approvedAt: 'desc' },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
      include: {
        provider: { select: { id: true, name: true, gender: true } },
        listingCategories: { include: { category: true } },
        photos: { orderBy: { displayOrder: 'asc' } },
        products: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
        reviews: {
          where: { status: 'active' },
          orderBy: { postedAt: 'desc' },
          include: {
            reviewer: { select: { id: true, name: true } },
            photos: true,
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async update(id: string, userId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();

    const { categoryIds, ...data } = dto;

    if (categoryIds) {
      await this.prisma.listingCategory.deleteMany({ where: { listingId: id } });
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...data,
        status: 'pending', // re-approval required
        ...(categoryIds?.length
          ? {
              listingCategories: {
                create: categoryIds.map((cid) => ({ categoryId: cid })),
              },
            }
          : {}),
      },
      include: { listingCategories: { include: { category: true } } },
    });
  }

  async deactivate(id: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== userId) throw new ForbiddenException();

    return this.prisma.listing.update({
      where: { id },
      data: { status: 'inactive', deletedAt: new Date() },
    });
  }
}
