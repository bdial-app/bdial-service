import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Product, Listing } from '../entities';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Listing) private listingRepo: Repository<Listing>,
  ) {}

  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['listing', 'listing.provider'],
    });
    if (!product) throw new NotFoundException(`Product with ID '${id}' not found`);

    const listing = await this.listingRepo.findOne({
      where: { id: product.listingId },
      relations: [
        'provider',
        'listingCategories',
        'listingCategories.category',
        'photos',
        'reviews',
        'reviews.reviewer',
      ],
    });

    // Related products: other active products from the same listing first,
    // then other products from the same provider's listings.
    let related: Product[] = [];
    if (listing) {
      related = await this.productRepo.find({
        where: { listingId: listing.id, isActive: true, id: Not(product.id) },
        order: { displayOrder: 'ASC' },
        take: 8,
      });

      if (related.length < 8) {
        const siblingListings = await this.listingRepo.find({
          where: { providerId: listing.providerId, status: 'live' },
          select: ['id'],
        });
        const siblingIds = siblingListings
          .map((l) => l.id)
          .filter((lid) => lid !== listing.id);
        if (siblingIds.length > 0) {
          const more = await this.productRepo
            .createQueryBuilder('p')
            .where('p.listingId IN (:...ids)', { ids: siblingIds })
            .andWhere('p.isActive = true')
            .andWhere('p.id != :self', { self: product.id })
            .orderBy('p.displayOrder', 'ASC')
            .take(8 - related.length)
            .getMany();
          related = [...related, ...more];
        }
      }
    }

    const reviews = (listing?.reviews ?? []).filter((r) => r.status === 'active');
    const ratingDist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.max(0, Math.min(4, (r.starRating ?? 0) - 1));
      ratingDist[idx]++;
    });
    const reviewCount = reviews.length;
    const rating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + (r.starRating ?? 0), 0) / reviewCount
        : 0;

    return {
      product,
      listing: listing
        ? {
            id: listing.id,
            businessName: listing.businessName,
            description: listing.description,
            city: listing.city,
            area: listing.area,
            isWomenLed: listing.isWomenLed,
            communityVerified: listing.communityVerified,
            photos: (listing.photos ?? [])
              .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
              .map((p) => ({
                id: p.id,
                imageUrl: p.imageUrl,
                displayOrder: p.displayOrder,
              })),
            categories:
              listing.listingCategories?.map((lc) => ({
                id: lc.category?.id,
                name: lc.category?.name,
                slug: lc.category?.slug,
              })) ?? [],
          }
        : null,
      provider: listing?.provider
        ? {
            id: listing.provider.id,
            brandName: listing.provider.brandName,
            profilePhotoUrl: listing.provider.profilePhotoUrl,
            city: listing.provider.city,
            area: listing.provider.area,
            contactNumber: listing.provider.contactNumber,
          }
        : null,
      related,
      stats: {
        rating: Number(rating.toFixed(2)),
        reviewCount,
        ratingDist,
      },
      reviews: reviews
        .sort(
          (a, b) =>
            new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
        )
        .slice(0, 10),
    };
  }
}
