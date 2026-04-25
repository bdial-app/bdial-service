import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import sharp = require('sharp');
import { Product, Provider, Review, Photo, ProviderCategory } from '../entities';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { StorageService } from '../storage/storage.service';
import { ContentSanitizerService } from '../common/content-sanitizer';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(ProviderCategory) private providerCatRepo: Repository<ProviderCategory>,
    private readonly storageService: StorageService,
    private readonly contentSanitizer: ContentSanitizerService,
  ) {}

  /** Verify user owns the provider */
  private async assertOwnership(userId: string, providerId: string) {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.userId !== userId) throw new ForbiddenException();
    return provider;
  }

  async uploadImage(userId: string, file: Express.Multer.File) {
    // Compress to max 1200px wide, 80% quality WebP
    const compressed = await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const compressedFile: Express.Multer.File = {
      ...file,
      buffer: compressed,
      mimetype: 'image/webp',
      originalname: file.originalname.replace(/\.[^.]+$/, '.webp'),
      size: compressed.length,
    };

    return this.storageService.upload('products', compressedFile);
  }

  async create(userId: string, dto: CreateProductDto) {
    await this.assertOwnership(userId, dto.providerId);

    // Content moderation: check product name and description
    this.checkProductContent(dto.name, dto.description);

    // Backward compat: if photoUrls not provided, derive from photoUrl
    const photoUrls = dto.photoUrls?.length
      ? dto.photoUrls
      : dto.photoUrl
        ? [dto.photoUrl]
        : [];

    const product = this.productRepo.create({
      ...dto,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      isActive: true,
    });
    return this.productRepo.save(product);
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    await this.assertOwnership(userId, product.providerId);

    // Content moderation: check product name and description
    this.checkProductContent(dto.name, dto.description);

    // Keep photoUrl in sync with photoUrls[0]
    if (dto.photoUrls !== undefined) {
      dto.photoUrl = dto.photoUrls[0] ?? null;
    } else if (dto.photoUrl !== undefined && !dto.photoUrls) {
      dto.photoUrls = dto.photoUrl ? [dto.photoUrl] : [];
    }

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

  async findByProvider(providerId: string, page = 1, limit = 20) {
    const [data, total] = await this.productRepo.findAndCount({
      where: { providerId },
      order: { displayOrder: 'ASC', name: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['provider', 'provider.user'],
    });
    if (!product) throw new NotFoundException(`Product with ID '${id}' not found`);

    const provider = product.provider;

    // Get provider photos, categories, review STATS (aggregated in SQL), and recent reviews
    const [photos, providerCats, reviewStats, reviews] = await Promise.all([
      this.photoRepo.find({
        where: { providerId: provider.id },
        order: { displayOrder: 'ASC' },
      }),
      this.providerCatRepo.find({
        where: { providerId: provider.id },
        relations: ['category'],
      }),
      this.reviewRepo
        .createQueryBuilder('r')
        .select('COALESCE(AVG(r.star_rating)::numeric(2,1), 0)', 'avgRating')
        .addSelect('COALESCE(COUNT(r.id)::int, 0)', 'totalCount')
        .addSelect(`json_agg(json_build_object('star', r.star_rating)) FILTER (WHERE r.star_rating IS NOT NULL)`, 'ratingList')
        .where('r.provider_id = :pid', { pid: provider.id })
        .andWhere("r.status = 'active'")
        .getRawOne(),
      this.reviewRepo.find({
        where: { providerId: provider.id, status: 'active' },
        relations: ['reviewer', 'photos'],
        order: { postedAt: 'DESC' },
        take: 10,
      }),
    ]);

    // Related products: other active products from the same provider
    const related = await this.productRepo.find({
      where: { providerId: provider.id, isActive: true, id: Not(product.id) },
      order: { displayOrder: 'ASC' },
      take: 8,
    });

    const ratingDist = [0, 0, 0, 0, 0];
    const ratingList = reviewStats?.ratingList || [];
    (Array.isArray(ratingList) ? ratingList : []).forEach((r: any) => {
      const idx = Math.max(0, Math.min(4, (r.star ?? 0) - 1));
      ratingDist[idx]++;
    });
    const reviewCount = parseInt(reviewStats?.totalCount || '0', 10);
    const rating = parseFloat(reviewStats?.avgRating || '0');

    return {
      product,
      provider: {
        id: provider.id,
        userId: provider.userId,
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
      reviews,
    };
  }

  private checkProductContent(name?: string, description?: string | null) {
    const fieldsToCheck = [
      { label: 'product name', value: name },
      { label: 'product description', value: description },
    ];
    for (const field of fieldsToCheck) {
      if (field.value && typeof field.value === 'string') {
        const check = this.contentSanitizer.check(field.value);
        if (check.flagged) {
          throw new BadRequestException(
            `Your ${field.label} contains inappropriate language. Please revise and try again.`,
          );
        }
      }
    }
  }
}
