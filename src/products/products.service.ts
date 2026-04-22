import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Product, Provider, Review, Photo, ProviderCategory } from '../entities';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(ProviderCategory) private providerCatRepo: Repository<ProviderCategory>,
  ) {}

  /** Verify user owns the provider */
  private async assertOwnership(userId: string, providerId: string) {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();
    return provider;
  }

  async create(userId: string, dto: CreateProductDto) {
    await this.assertOwnership(userId, dto.providerId);
    const product = this.productRepo.create({
      ...dto,
      isActive: true,
    });
    return this.productRepo.save(product);
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    await this.assertOwnership(userId, product.providerId);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(userId: string, productId: string) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    await this.assertOwnership(userId, product.providerId);
    await this.productRepo.remove(product);
    return { success: true };
  }

  async findByProvider(providerId: string) {
    return this.productRepo.find({
      where: { providerId },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user'],
    });
    if (!product) throw new NotFoundException(`Product with ID '${id}' not found`);

    const provider = product.provider;

    // Get provider photos, categories, reviews for context
    const [photos, providerCats, reviews] = await Promise.all([
      this.photoRepo.find({
        where: { providerId: provider.id },
        order: { displayOrder: 'ASC' },
      }),
      this.providerCatRepo.find({
        where: { providerId: provider.id },
        relations: ['category'],
      }),
      this.reviewRepo.find({
        where: { providerId: provider.id, status: 'active' },
        relations: ['reviewer', 'photos'],
        order: { postedAt: 'DESC' },
      }),
    ]);

    // Related products: other active products from the same provider
    const related = await this.productRepo.find({
      where: { providerId: provider.id, isActive: true, id: Not(product.id) },
      order: { displayOrder: 'ASC' },
      take: 8,
    });

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
      provider: {
        id: provider.id,
        brandName: provider.brandName,
        description: provider.description,
        profilePhotoUrl: provider.profilePhotoUrl,
        city: provider.city,
        area: provider.area,
        contactNumber: provider.contactNumber,
        isWomenLed: provider.isWomenLed,
        communityVerified: provider.communityVerified,
        photos: photos.map((p) => ({
          id: p.id,
          imageUrl: p.imageUrl,
          displayOrder: p.displayOrder,
        })),
        categories: providerCats.map((pc) => ({
          id: pc.category?.id,
          name: pc.category?.name,
          slug: pc.category?.slug,
        })),
      },
      related,
      stats: {
        rating: Number(rating.toFixed(2)),
        reviewCount,
        ratingDist,
      },
      reviews: reviews.slice(0, 10),
    };
  }
}
