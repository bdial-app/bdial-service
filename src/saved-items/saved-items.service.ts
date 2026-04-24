import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SavedItem, Provider, Product, Review } from '../entities';

@Injectable()
export class SavedItemsService {
  constructor(
    @InjectRepository(SavedItem) private savedItemRepo: Repository<SavedItem>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
  ) {}

  async toggle(userId: string, itemId: string, itemType: 'provider' | 'product') {
    const existing = await this.savedItemRepo.findOne({
      where: { userId, itemId, itemType },
    });

    if (existing) {
      await this.savedItemRepo.remove(existing);
      return { saved: false };
    }

    const item = this.savedItemRepo.create({ userId, itemId, itemType });
    await this.savedItemRepo.save(item);
    return { saved: true };
  }

  async findByUser(userId: string) {
    const savedItems = await this.savedItemRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Group by type
    const providerIds = savedItems.filter((s) => s.itemType === 'provider').map((s) => s.itemId);
    const productIds = savedItems.filter((s) => s.itemType === 'product').map((s) => s.itemId);

    const [providers, products, reviewStatsRaw] = await Promise.all([
      providerIds.length > 0
        ? this.providerRepo.find({
            where: { id: In(providerIds) },
            relations: ['providerCategories', 'providerCategories.category'],
          })
        : ([] as Provider[]),
      productIds.length > 0
        ? this.productRepo.find({
            where: { id: In(productIds) },
            relations: ['provider'],
          })
        : ([] as Product[]),
      providerIds.length > 0
        ? this.reviewRepo
            .createQueryBuilder('r')
            .select('r.provider_id', 'providerId')
            .addSelect('COALESCE(AVG(r.star_rating)::numeric(2,1), 0)', 'avgRating')
            .addSelect('COALESCE(COUNT(r.id)::int, 0)', 'reviewCount')
            .where('r.provider_id IN (:...providerIds)', { providerIds })
            .andWhere("r.status = 'active'")
            .groupBy('r.provider_id')
            .getRawMany()
        : [],
    ]);

    const reviewStatsMap = new Map<string, { avgRating: number; reviewCount: number }>();
    for (const rs of reviewStatsRaw) {
      reviewStatsMap.set(rs.providerId, {
        avgRating: parseFloat(rs.avgRating) || 0,
        reviewCount: parseInt(rs.reviewCount, 10) || 0,
      });
    }

    // Build enriched response maintaining saved order
    return savedItems.map((si) => {
      if (si.itemType === 'provider') {
        const provider = providers.find((p) => p.id === si.itemId);
        if (!provider) return null;

        const stats = reviewStatsMap.get(provider.id) || { avgRating: 0, reviewCount: 0 };
        const categories = Array.from(
          new Set(
            (provider.providerCategories ?? [])
              .map((pc) => pc.category?.name)
              .filter(Boolean),
          ),
        );

        return {
          id: si.id,
          itemId: si.itemId,
          itemType: si.itemType,
          savedAt: si.createdAt,
          name: provider.brandName,
          image: provider.profilePhotoUrl,
          category: categories.join(', ') || 'Services',
          rating: stats.avgRating,
          reviews: stats.reviewCount,
          location: [provider.area, provider.city].filter(Boolean).join(', '),
          verified: provider.status === 'active',
          isOpen: provider.isAvailable,
          contactNumber: provider.contactNumber,
        };
      } else {
        const product = products.find((p) => p.id === si.itemId);
        if (!product) return null;

        return {
          id: si.id,
          itemId: si.itemId,
          itemType: si.itemType,
          savedAt: si.createdAt,
          name: product.name,
          image: product.photoUrl,
          category: product.provider?.brandName || 'Product',
          price: product.price,
          currency: product.currency,
          isActive: product.isActive,
          providerId: product.provider?.id,
          providerName: product.provider?.brandName,
        };
      }
    }).filter(Boolean);
  }

  async isSaved(userId: string, itemId: string, itemType: 'provider' | 'product') {
    const count = await this.savedItemRepo.count({
      where: { userId, itemId, itemType },
    });
    return { saved: count > 0 };
  }

  async getSavedIds(userId: string, itemType?: 'provider' | 'product') {
    const where: any = { userId };
    if (itemType) where.itemType = itemType;
    const items = await this.savedItemRepo.find({ where, select: ['itemId', 'itemType'] });
    return items.map((i) => ({ itemId: i.itemId, itemType: i.itemType }));
  }
}
