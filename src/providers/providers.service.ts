import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing, ProviderWarning, SystemSetting, Subscription } from '../entities';
import { StorageService } from '../storage/storage.service';
import { GeocodeService } from '../geocode/geocode.service';
import { OtpService } from '../otp/otp.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { NearbyProvidersDto } from './dto/nearby-providers.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { CreateSponsorshipDto, UpdateSponsorshipDto } from './dto/sponsorship.dto';
import { ContentSanitizerService } from '../common/content-sanitizer';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verRepo: Repository<Verification>,
    @InjectRepository(ProviderCategory) private providerCatRepo: Repository<ProviderCategory>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(ConversationParticipant) private participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(ProviderBadge) private badgeRepo: Repository<ProviderBadge>,
    @InjectRepository(ProviderOffer) private offerRepo: Repository<ProviderOffer>,
    @InjectRepository(SponsoredListing) private sponsorRepo: Repository<SponsoredListing>,
    @InjectRepository(ProviderWarning) private warningRepo: Repository<ProviderWarning>,
    @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
    private storage: StorageService,
    private dataSource: DataSource,
    private geocodeService: GeocodeService,
    private contentSanitizer: ContentSanitizerService,
    private otpService: OtpService,
  ) {}

  async sendProviderOtp(mobileNumber: string) {
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) {
      throw new BadRequestException('Mobile number must be exactly 10 digits');
    }
    const mobile = mobileNumber.trim();

    const result = await this.otpService.sendOtpWithKey(`provider_${mobile}`, mobile);
    return { message: 'OTP sent successfully', data: { mobileNumber: mobile, expiresIn: result.expiresIn, ...(result.otp ? { otp: result.otp } : {}) } };
  }

  async verifyProviderOtp(mobileNumber: string, otp: string) {
    if (!mobileNumber || !otp) {
      throw new BadRequestException('Mobile number and OTP are required');
    }
    const mobile = mobileNumber.trim();
    const code = otp.trim();

    if (!/^\d{10}$/.test(mobile)) throw new BadRequestException('Mobile number must be exactly 10 digits');
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('OTP must be exactly 6 digits');

    await this.otpService.verifyOtpWithKey(`provider_${mobile}`, mobile, code);

    return { message: 'OTP verified successfully', verified: true };
  }

  async create(createProviderDto: CreateProviderDto) {
    const { userId } = createProviderDto;
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);

    const existingProvider = await this.providerRepo.findOneBy({ userId });
    if (existingProvider) throw new ConflictException(`Provider already exists for user with ID '${userId}'`);

    const { latitude, longitude, ...rest } = createProviderDto;
    const provider = this.providerRepo.create({
      ...rest,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    });
    const saved = await this.providerRepo.save(provider);
    return this.providerRepo.findOne({ where: { id: saved.id }, relations: ['user'] });
  }

  async becomeProvider(
    becomeProviderDto: BecomeProviderDto,
    file?: Express.Multer.File,
    bannerImage?: Express.Multer.File,
    profileImage?: Express.Multer.File,
    productImages?: Express.Multer.File[],
  ) {
    const { userId, ijamatNumber, ijamatExpiry, ijamatDocUrl, categoryIds, products: productsJson, ...providerData } = becomeProviderDto;

    // Content moderation: check brand name and description
    this.checkProviderContent(providerData.brandName, providerData.description);

    // Upload files in parallel (outside transaction)
    const [aadhaarUpload, bannerUpload, profileUpload] = await Promise.all([
      file ? this.storage.upload('verifications', file) : Promise.resolve(null),
      bannerImage ? this.storage.upload('providers', bannerImage) : Promise.resolve(null),
      profileImage ? this.storage.upload('providers', profileImage) : Promise.resolve(null),
    ]);

    // Upload product images in parallel
    const productImageUploads = productImages?.length
      ? await Promise.all(productImages.map((img) => this.storage.upload('products', img)))
      : [];

    // Parse products JSON (each product may have imageCount for multi-image)
    let parsedProducts: Array<{ name: string; description?: string; price?: number; currency?: string; imageCount?: number; productType?: 'product' | 'service' }> = [];
    if (productsJson) {
      try {
        parsedProducts = JSON.parse(productsJson);
        if (!Array.isArray(parsedProducts)) parsedProducts = [];
      } catch {
        throw new BadRequestException('Invalid products JSON');
      }
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);

    const existingProvider = await this.providerRepo.findOneBy({ userId });
    if (existingProvider) throw new ConflictException(`Provider already exists for user with ID '${userId}'`);

    return this.dataSource.transaction(async (manager) => {
      const { latitude, longitude, file: _file, bannerImage: _bi, profileImage: _pi, bannerImageUrl: _biu, profilePhotoUrl: _ppu, ...cleanData } = providerData as any;
      const provider = manager.create(Provider, {
        ...cleanData,
        userId,
        status: 'unverified',
        isWomenLed: providerData.isWomenLed != null ? providerData.isWomenLed : user.gender === 'female',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        bannerImageUrl: bannerUpload?.url || (providerData as any).bannerImageUrl || null,
        profilePhotoUrl: profileUpload?.url || (providerData as any).profilePhotoUrl || null,
      });
      const savedProvider = await manager.save(provider);

      // Save category associations
      if (categoryIds?.length) {
        const cats = categoryIds.map((catId: string) =>
          manager.create(ProviderCategory, { providerId: savedProvider.id, categoryId: catId }),
        );
        await manager.save(cats);
      }

      // Save products with multi-image support
      // Images are a flat array; each product's imageCount tells us how many belong to it
      const savedProducts: Product[] = [];
      let imgOffset = 0;
      if (parsedProducts.length > 0) {
        for (let i = 0; i < parsedProducts.length; i++) {
          const p = parsedProducts[i];
          const count = p.imageCount ?? 0;
          const productPhotos = productImageUploads.slice(imgOffset, imgOffset + count);
          imgOffset += count;
          const photoUrl = productPhotos[0]?.url || null;
          const product = manager.create(Product, {
            providerId: savedProvider.id,
            name: p.name,
            description: p.description || null,
            price: p.price != null ? p.price : null,
            currency: p.currency || 'INR',
            photoUrl,
            productType: p.productType || 'product',
            isActive: true,
            displayOrder: i,
          });
          savedProducts.push(await manager.save(product));

          // Save additional product photos as provider gallery photos
          for (let j = 1; j < productPhotos.length; j++) {
            const photo = manager.create(Photo, {
              providerId: savedProvider.id,
              imageUrl: productPhotos[j].url,
              storageKey: productPhotos[j].storageKey,
              displayOrder: j,
            });
            await manager.save(photo);
          }
        }
      }

      let savedVerification: Verification | null = null;
      if (aadhaarUpload) {
        const verification = manager.create(Verification, {
          userId,
          aadhaarDocUrl: aadhaarUpload.url,
          ijamatNumber,
          ijamatExpiry: ijamatExpiry ? new Date(ijamatExpiry) : null,
          ijamatDocUrl,
          status: 'pending',
        });
        savedVerification = await manager.save(verification);
      }

      return { provider: savedProvider, verification: savedVerification, products: savedProducts };
    });
  }

  async submitVerification(userId: string, file: Express.Multer.File, docType?: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found. Please register as a provider first.');

    const existingVerification = await this.verRepo.findOneBy({ userId });
    if (existingVerification && existingVerification.status === 'approved') {
      throw new ConflictException('Verification already approved.');
    }

    const uploadResult = await this.storage.upload('verifications', file);
    const aadhaarDocUrl = uploadResult.url;

    // Update provider status from 'unverified' to 'pending' when docs are submitted
    if (provider.status === 'unverified') {
      provider.status = 'pending';
      await this.providerRepo.save(provider);
    }

    if (existingVerification) {
      existingVerification.aadhaarDocUrl = aadhaarDocUrl;
      existingVerification.status = 'pending';
      return this.verRepo.save(existingVerification);
    }

    const verification = this.verRepo.create({
      userId,
      aadhaarDocUrl,
      status: 'pending',
    });
    return this.verRepo.save(verification);
  }

  async getMyProviderStatus(userId: string) {
    const user = await this.providerRepo.manager.getRepository('User').findOneBy({ id: userId }) as any;
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) {
      return { providerStatus: 'not_applied', verificationStatus: null, provider: null, verification: null, preferredMode: user?.preferredMode ?? 'customer' };
    }

    const verification = await this.verRepo.findOneBy({ userId });
    const verificationStatus = verification?.status ?? null;

    // Map to a provider-application status
    let providerStatus: string;
    if (provider.deletedAt) {
      providerStatus = 'deleted';
    } else if (provider.status === 'suspended') {
      providerStatus = 'suspended';
    } else if (provider.status === 'disabled') {
      providerStatus = 'disabled';
    } else if (provider.status === 'active' || verificationStatus === 'approved') {
      // Fully approved & verified
      providerStatus = 'approved';
    } else if (provider.status === 'unverified') {
      // Provider registered but never submitted verification docs
      // They can still access the dashboard, just not verified
      providerStatus = 'approved';
    } else if (verificationStatus === 'pending') {
      // Verification docs submitted, awaiting review
      providerStatus = 'pending';
    } else if (verificationStatus === 'rejected') {
      providerStatus = 'rejected';
    } else {
      // Fallback: provider exists with pending/in_review status
      providerStatus = 'pending';
    }

    return { providerStatus, verificationStatus, provider, verification, preferredMode: user?.preferredMode ?? 'customer' };
  }

  async findOne(id: string) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!provider) throw new NotFoundException(`Provider with ID '${id}' not found`);
    return provider;
  }

  /**
   * Provider details aggregate for the provider-details page.
   * Returns provider info with categories, photos, products, reviews, and rating aggregates.
   */
  async findDetails(id: string) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['user', 'providerCategories', 'providerCategories.category'],
    });
    if (!provider) throw new NotFoundException(`Provider with ID '${id}' not found`);

    const [photos, products, reviews, badges, activeOffers, activeSponsor] = await Promise.all([
      this.photoRepo.find({
        where: { providerId: id },
        order: { displayOrder: 'ASC' },
      }),
      this.productRepo.find({
        where: { providerId: id, isActive: true },
        order: { displayOrder: 'ASC', name: 'ASC' },
      }),
      this.reviewRepo.find({
        where: { providerId: id, status: 'active' },
        relations: ['reviewer', 'photos'],
        order: { postedAt: 'DESC' },
      }),
      this.badgeRepo.find({
        where: { providerId: id, isActive: true },
        order: { createdAt: 'DESC' },
      }),
      this.offerRepo
        .createQueryBuilder('o')
        .where('o.provider_id = :id', { id })
        .andWhere('o.is_active = true')
        .andWhere('o.starts_at <= NOW()')
        .andWhere('o.ends_at > NOW()')
        .orderBy('o.ends_at', 'ASC')
        .getMany(),
      this.sponsorRepo
        .createQueryBuilder('s')
        .where('s.provider_id = :id', { id })
        .andWhere('s.is_active = true')
        .andWhere('s.starts_at <= NOW()')
        .andWhere('s.ends_at > NOW()')
        .andWhere('s.spent_amount < s.budget_amount')
        .andWhere("s.approval_status = 'approved'")
        .getOne(),
    ]);

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

    const prices = products
      .map((p) => (p.price !== null && p.price !== undefined ? Number(p.price) : null))
      .filter((v): v is number => v !== null && !isNaN(v));
    const priceRange =
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices), currency: products[0]?.currency ?? 'INR' }
        : null;

    const categories = (provider.providerCategories ?? []).map((pc) => ({
      id: pc.category?.id,
      name: pc.category?.name,
      slug: pc.category?.slug,
    }));

    return {
      provider,
      categories,
      photos,
      products,
      reviews,
      badges,
      activeOffers,
      isSponsored: !!activeSponsor,
      sponsorEndsAt: activeSponsor?.endsAt ?? null,
      stats: {
        rating: Number(rating.toFixed(2)),
        reviewCount,
        ratingDist,
        photoCount: photos.length,
        productCount: products.length,
        priceRange,
      },
    };
  }

  async findAll(paginationDto: ProviderPaginationDto) {
    const { page = 1, limit = 10, status, city, search } = paginationDto;
    const skip = (page - 1) * limit;

    const qb = this.providerRepo.createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user');

    if (status) qb.andWhere('provider.status = :status', { status });
    if (city) qb.andWhere('provider.city ILIKE :city', { city: `%${city}%` });
    if (search) {
      qb.andWhere('(provider.brandName ILIKE :search OR provider.description ILIKE :search OR provider.address ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('provider.createdAt', 'DESC').skip(skip).take(limit);

    const [providers, total] = await qb.getManyAndCount();
    return { data: providers, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, updateProviderDto: UpdateProviderDto) {
    const existingProvider = await this.providerRepo.findOneBy({ id });
    if (!existingProvider) throw new NotFoundException(`Provider with ID '${id}' not found`);

    // Content moderation: check brand name and description
    this.checkProviderContent(updateProviderDto.brandName, updateProviderDto.description);

    if (updateProviderDto.userId && updateProviderDto.userId !== existingProvider.userId) {
      const user = await this.userRepo.findOneBy({ id: updateProviderDto.userId });
      if (!user) throw new NotFoundException(`User with ID '${updateProviderDto.userId}' not found`);
      const existing = await this.providerRepo.findOneBy({ userId: updateProviderDto.userId });
      if (existing) throw new ConflictException(`Provider already exists for user with ID '${updateProviderDto.userId}'`);
    }

    const { latitude, longitude, ...rest } = updateProviderDto;
    const updateData: any = { ...rest };
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    await this.providerRepo.update(id, updateData);
    return this.providerRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async updateCategories(providerId: string, userId: string, categoryIds: string[]) {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException(`Provider with ID '${providerId}' not found`);
    if (provider.userId !== userId) throw new ForbiddenException('You can only update your own provider categories');
    if (categoryIds.length > 2) throw new BadRequestException('Maximum 2 categories allowed');

    // Remove existing categories
    await this.providerCatRepo.delete({ providerId });

    // Insert new ones
    if (categoryIds.length > 0) {
      const entities = categoryIds.map((categoryId) =>
        this.providerCatRepo.create({ providerId, categoryId }),
      );
      await this.providerCatRepo.save(entities);
    }

    // Return updated categories
    const updated = await this.providerCatRepo.find({
      where: { providerId },
      relations: ['category'],
    });
    return updated.map((pc) => ({
      id: pc.category?.id,
      name: pc.category?.name,
      slug: pc.category?.slug,
    }));
  }

  /**
   * Find providers near a lat/lng using the Haversine formula.
   * Optionally enriches with Google Distance Matrix (road distance + travel time).
   * Flow 1-c: Location-based provider discovery.
   */
  async findNearby(dto: NearbyProvidersDto) {
    const { lat, lng, radius = 10, page = 1, limit = 10, search, city, sortBy = 'distance', categoryIds, minRating, verifiedOnly, womenLedOnly } = dto;
    const offset = (page - 1) * limit;

    // Haversine formula in SQL (returns distance in km)
    const haversine = `
      6371 * acos(
        LEAST(1.0, cos(radians(:lat)) * cos(radians(provider.latitude))
        * cos(radians(provider.longitude) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(provider.latitude)))
      )
    `;

    // Review stats subqueries used for filtering and sorting
    const avgRatingSub = `(SELECT AVG(r.star_rating) FROM reviews r WHERE r.provider_id = provider.id AND r.status = 'active')`;
    const reviewCountSub = `(SELECT COUNT(r.id)::int FROM reviews r WHERE r.provider_id = provider.id AND r.status = 'active')`;

    const qb = this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .addSelect(haversine, 'distance')
      .addSelect(avgRatingSub, 'avg_rating')
      .addSelect(reviewCountSub, 'review_count')
      .addSelect(
        `(SELECT string_agg(DISTINCT cat.name, ', ' ORDER BY cat.name) FROM categories cat JOIN provider_categories pcat ON pcat.category_id = cat.id WHERE pcat.provider_id = provider.id)`,
        'services',
      )
      .where('provider.latitude IS NOT NULL')
      .andWhere('provider.longitude IS NOT NULL')
      .andWhere('provider.status IN (:...statuses)', { statuses: verifiedOnly ? ['active'] : ['active', 'unverified'] })
      .andWhere(`${haversine} <= :radius`, { lat, lng, radius })
      .setParameters({ lat, lng, radius });

    if (city) qb.andWhere('provider.city ILIKE :city', { city: `%${city}%` });
    if (search) {
      const prefixWords = search.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
      const prefixTsQuery = prefixWords.length > 0 ? prefixWords.map((w) => `${w}:*`).join(' & ') : '';
      qb.andWhere(
        `(provider.brandName ILIKE :search OR provider.description ILIKE :search
          OR (:prefixTsQuery <> '' AND provider.search_vector @@ to_tsquery('english', :prefixTsQuery))
          OR provider.id IN (
            SELECT pc.provider_id FROM provider_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE c.name ILIKE :search OR :searchExact = ANY(c.keywords)
          )
          OR :searchExact = ANY(provider.keywords)
        )`,
        { search: `%${search}%`, searchExact: search.trim().toLowerCase(), prefixTsQuery },
      );
    }
    if (categoryIds?.length) {
      qb.andWhere(
        `provider.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id IN (:...categoryIds))`,
        { categoryIds },
      );
    }
    if (minRating != null && minRating > 0) {
      qb.andWhere(`${avgRatingSub} >= :minRating`, { minRating });
    }
    if (womenLedOnly) {
      qb.andWhere('provider.isWomenLed = true');
    }

    // Sort - verified (active) providers always rank above unverified
    if (sortBy === 'distance') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
    } else if (sortBy === 'newest') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('provider.createdAt', 'DESC');
    } else if (sortBy === 'rating') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('avg_rating', 'DESC', 'NULLS LAST')
        .addOrderBy('distance', 'ASC');
    } else if (sortBy === 'reviews') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('review_count', 'DESC', 'NULLS LAST')
        .addOrderBy('avg_rating', 'DESC', 'NULLS LAST')
        .addOrderBy('distance', 'ASC');
    } else {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
    }

    // Get total before pagination
    const total = await qb.getCount();

    // Get paginated results with distance
    const { raw, entities } = await qb.offset(offset).limit(limit).getRawAndEntities();

    // Merge Haversine distance + review stats into entities
    let data = entities.map((provider, i) => ({
      ...provider,
      distance: parseFloat(parseFloat(raw[i]?.distance ?? '0').toFixed(2)),
      rating: raw[i]?.avg_rating ? parseFloat(parseFloat(raw[i].avg_rating).toFixed(1)) : null,
      reviewCount: parseInt(raw[i]?.review_count ?? '0', 10),
      services: raw[i]?.services || null,
      roadDistance: null as string | null,
      roadDistanceMeters: null as number | null,
      travelTime: null as string | null,
      travelTimeSeconds: null as number | null,
    }));

    // Enrich with Distance Matrix (road distance + travel time)
    try {
      const destinations = data
        .filter((p) => p.latitude && p.longitude)
        .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));

      if (destinations.length > 0) {
        const matrix = await this.geocodeService.getDistanceMatrix(
          { lat, lng },
          destinations,
        );
        let mi = 0;
        data = data.map((p) => {
          if (p.latitude && p.longitude && mi < matrix.length) {
            const m = matrix[mi++];
            return {
              ...p,
              roadDistance: m.distanceText,
              roadDistanceMeters: m.distanceValue,
              travelTime: m.durationText,
              travelTimeSeconds: m.durationValue,
            };
          }
          return p;
        });
      }
    } catch {
      // Distance Matrix unavailable — Haversine distance still present
    }

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), radius },
    };
  }

  /**
   * Get featured providers near a location.
   * Flow 1-b: Returns providers marked as is_featured, ordered by distance.
   * Falls back to nearest active providers if none are featured.
   */
  async findFeatured(lat: number, lng: number, radius: number = 25) {
    const haversine = `
      6371 * acos(
        LEAST(1.0, cos(radians(:lat)) * cos(radians(provider.latitude))
        * cos(radians(provider.longitude) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(provider.latitude)))
      )
    `;

    // First try: featured providers within radius
    let { raw, entities } = await this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .addSelect(haversine, 'distance')
      .where('provider.latitude IS NOT NULL')
      .andWhere('provider.longitude IS NOT NULL')
      .andWhere('provider.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('provider.isFeatured = :featured', { featured: true })
      .andWhere(`${haversine} <= :radius`)
      .setParameters({ lat, lng, radius })
      .orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('distance', 'ASC')
      .limit(10)
      .getRawAndEntities();

    // Fallback: if no featured providers, return nearest ones
    if (entities.length === 0) {
      ({ raw, entities } = await this.providerRepo
        .createQueryBuilder('provider')
        .leftJoinAndSelect('provider.user', 'user')
        .addSelect(haversine, 'distance')
        .where('provider.latitude IS NOT NULL')
        .andWhere('provider.longitude IS NOT NULL')
        .andWhere('provider.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere(`${haversine} <= :radius`)
        .setParameters({ lat, lng, radius })
        .orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC')
        .limit(10)
        .getRawAndEntities());
    }

    return entities.map((provider, i) => ({
      ...provider,
      distance: parseFloat(parseFloat(raw[i]?.distance ?? '0').toFixed(2)),
    }));
  }

  async getAnalytics(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Product count
    const totalProducts = await this.productRepo.count({ where: { providerId: provider.id } });

    // Reviews
    const reviews = await this.reviewRepo.find({
      where: { providerId: provider.id },
      relations: ['reviewer'],
      order: { postedAt: 'DESC' },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? parseFloat((reviews.reduce((sum, r) => sum + r.starRating, 0) / totalReviews).toFixed(1))
        : 0;

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.starRating >= 1 && r.starRating <= 5) {
        ratingBreakdown[r.starRating as 1 | 2 | 3 | 4 | 5]++;
      }
    });

    // Enquiries = conversations where provider participated
    const totalEnquiries = await this.participantRepo
      .createQueryBuilder('cp')
      .where('cp.userId = :userId AND cp.role = :role', { userId, role: 'provider' })
      .getCount();

    return {
      totalProducts,
      totalReviews,
      averageRating,
      totalEnquiries,
      ratingBreakdown,
      recentReviews: reviews.slice(0, 5).map((r) => ({
        id: r.id,
        starRating: r.starRating,
        reviewText: r.reviewText,
        postedAt: r.postedAt,
        reviewer: r.reviewer ? { id: r.reviewer.id, name: r.reviewer.name } : null,
      })),
    };
  }

  // ─── Offer / Deal CRUD ──────────────────────────────────────────────

  async createOffer(userId: string, dto: CreateOfferDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found. Please register as a provider first.');

    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('End date must be after start date');
    }

    // ─── Deal limits (subscription-aware) ────────────────────────────
    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    let maxTotalDeals = 5;
    let maxActiveDeals = 3;

    if (subscription?.plan) {
      maxTotalDeals = subscription.plan.maxTotalDeals;
      maxActiveDeals = subscription.plan.maxActiveDeals;
    }

    // Unlimited (-1) bypasses checks
    if (maxTotalDeals !== -1) {
      const totalOffers = await this.offerRepo.count({ where: { providerId: provider.id } });
      if (totalOffers >= maxTotalDeals) {
        throw new ForbiddenException(
          `You have reached the maximum of ${maxTotalDeals} deals. Please upgrade your plan to create more.`,
        );
      }
    }

    if (maxActiveDeals !== -1) {
      const now = new Date();
      const activeCount = await this.offerRepo
        .createQueryBuilder('o')
        .where('o.providerId = :pid', { pid: provider.id })
        .andWhere('o.isActive = true')
        .andWhere('o.endsAt > :now', { now })
        .andWhere('o.startsAt <= :now', { now })
        .getCount();
      if (activeCount >= maxActiveDeals) {
        throw new BadRequestException(
          `You can have at most ${maxActiveDeals} active deals at a time. Deactivate or wait for one to expire.`,
        );
      }
    }

    // Increment free deals counter if within free quota
    const freeQuotaSetting = await this.settingRepo?.findOneBy({ key: 'free_deal_quota_lifetime' });
    const freeQuota = freeQuotaSetting ? parseInt(freeQuotaSetting.value, 10) : 3;
    if (provider.freeDealsCreated < freeQuota) {
      provider.freeDealsCreated += 1;
      await this.providerRepo.save(provider);
    }

    const offer = this.offerRepo.create({
      providerId: provider.id,
      title: dto.title,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxDiscount: dto.maxDiscount ?? null,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      usageLimit: dto.usageLimit ?? null,
      isActive: true,
      approvalStatus: await this.requiresApproval('offers_require_approval') ? 'pending_approval' : 'approved',
    });

    return this.offerRepo.save(offer);
  }

  async getOfferLimits(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const totalOffers = await this.offerRepo.count({ where: { providerId: provider.id } });

    const now = new Date();
    const activeCount = await this.offerRepo
      .createQueryBuilder('o')
      .where('o.providerId = :pid', { pid: provider.id })
      .andWhere('o.isActive = true')
      .andWhere('o.endsAt > :now', { now })
      .andWhere('o.startsAt <= :now', { now })
      .getCount();

    // Check subscription for higher limits
    let maxTotalDeals = 5;
    let maxActiveDeals = 3;
    let planName: string | null = null;

    const subscription = await this.subscriptionRepo.findOne({
      where: { providerId: provider.id, status: 'active' },
      relations: ['plan'],
    });

    if (subscription?.plan) {
      maxTotalDeals = subscription.plan.maxTotalDeals;
      maxActiveDeals = subscription.plan.maxActiveDeals;
      planName = subscription.plan.name;
    }

    return {
      totalDeals: totalOffers,
      maxTotalDeals,
      activeDeals: activeCount,
      maxActiveDeals,
      requiresPayment: totalOffers >= maxTotalDeals,
      currentPlan: planName,
    };
  }

  async getMyOffers(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    return this.offerRepo.find({
      where: { providerId: provider.id },
      order: { createdAt: 'DESC' },
    });
  }

  async updateOffer(userId: string, offerId: string, dto: UpdateOfferDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const offer = await this.offerRepo.findOneBy({ id: offerId });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.providerId !== provider.id) throw new BadRequestException('You do not own this offer');

    if (dto.startsAt || dto.endsAt) {
      const startsAt = dto.startsAt ? new Date(dto.startsAt) : offer.startsAt;
      const endsAt = dto.endsAt ? new Date(dto.endsAt) : offer.endsAt;
      if (endsAt <= startsAt) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    Object.assign(offer, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.discountType !== undefined && { discountType: dto.discountType }),
      ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
      ...(dto.minOrderAmount !== undefined && { minOrderAmount: dto.minOrderAmount }),
      ...(dto.maxDiscount !== undefined && { maxDiscount: dto.maxDiscount }),
      ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
      ...(dto.endsAt !== undefined && { endsAt: new Date(dto.endsAt) }),
      ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
    });

    return this.offerRepo.save(offer);
  }

  async deleteOffer(userId: string, offerId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const offer = await this.offerRepo.findOneBy({ id: offerId });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.providerId !== provider.id) throw new BadRequestException('You do not own this offer');

    await this.offerRepo.remove(offer);
    return { deleted: true };
  }

  // ─── Sponsorship CRUD ─────────────────────────────────────────────

  async createSponsorship(userId: string, dto: CreateSponsorshipDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('End date must be after start date');
    }

    const listing = this.sponsorRepo.create({
      providerId: provider.id,
      type: dto.type,
      budgetAmount: dto.budgetAmount,
      costPerClick: dto.costPerClick ?? 5,
      targetCategoryIds: dto.targetCategoryIds ?? null,
      targetCities: dto.targetCities ?? null,
      targetRadius: dto.targetRadius ?? null,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isActive: true,
      approvalStatus: 'approved',
    });

    return this.sponsorRepo.save(listing);
  }

  async getMySponsorships(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    return this.sponsorRepo.find({
      where: { providerId: provider.id },
      order: { createdAt: 'DESC' },
    });
  }

  async updateSponsorship(userId: string, id: string, dto: UpdateSponsorshipDto) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');

    const listing = await this.sponsorRepo.findOneBy({ id });
    if (!listing) throw new NotFoundException('Sponsorship not found');
    if (listing.providerId !== provider.id) throw new BadRequestException('You do not own this sponsorship');

    if (dto.budgetAmount !== undefined) listing.budgetAmount = dto.budgetAmount;
    if (dto.isActive !== undefined) listing.isActive = dto.isActive;
    if (dto.endsAt !== undefined) {
      if (new Date(dto.endsAt) <= listing.startsAt) {
        throw new BadRequestException('End date must be after start date');
      }
      listing.endsAt = new Date(dto.endsAt);
    }

    return this.sponsorRepo.save(listing);
  }

  async getSponsorshipPlans() {
    return [
      {
        id: 'basic',
        name: 'Basic Boost',
        type: 'inline' as const,
        price: 499,
        duration: 7,
        features: ['Appear in search results', 'Basic analytics', '~500 impressions'],
        recommended: false,
      },
      {
        id: 'standard',
        name: 'Standard Spotlight',
        type: 'carousel' as const,
        price: 1499,
        duration: 14,
        features: ['Featured in carousel', 'Priority in search', 'Detailed analytics', '~2000 impressions'],
        recommended: true,
      },
      {
        id: 'premium',
        name: 'Premium Top Result',
        type: 'top_result' as const,
        price: 2999,
        duration: 30,
        features: ['Always top of search', 'Carousel + inline placement', 'Full analytics dashboard', '~5000 impressions', 'Priority support'],
        recommended: false,
      },
    ];
  }

  // ─── Provider Warnings ────────────────────────────────────────────

  async getMyWarnings(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.warningRepo.find({
      where: { providerId: provider.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getMyWarningsUnreadCount(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) return { unreadCount: 0 };
    const unreadCount = await this.warningRepo.count({
      where: { providerId: provider.id, isRead: false },
    });
    return { unreadCount };
  }

  async markWarningRead(userId: string, warningId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');
    const warning = await this.warningRepo.findOneBy({ id: warningId });
    if (!warning || warning.providerId !== provider.id) {
      throw new NotFoundException('Warning not found');
    }
    if (!warning.isRead) {
      warning.isRead = true;
      warning.readAt = new Date();
      await this.warningRepo.save(warning);
    }
    return warning;
  }

  // ─── Provider Disable / Enable / Delete ────────────────────────────

  /** Get the configured cooldown hours from system settings */
  private async getDisableCooldownHours(): Promise<number> {
    const setting = await this.settingRepo.findOneBy({ key: 'provider_disable_cooldown_hours' });
    return setting ? parseInt(setting.value, 10) || 48 : 48;
  }

  /** Check if cooldown enforcement is enabled */
  private async isCooldownEnabled(): Promise<boolean> {
    const setting = await this.settingRepo.findOneBy({ key: 'provider_disable_cooldown_enabled' });
    return setting ? setting.value === 'true' : true;
  }

  /** Get cooldown status for the authenticated user's provider */
  async getCooldownStatus(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) return { canReEnable: true, disableRemainingHours: null, disabledAt: null, cooldownHours: 48 };

    const cooldownHours = await this.getDisableCooldownHours();
    const cooldownEnabled = await this.isCooldownEnabled();

    if (!provider.disabledAt || !cooldownEnabled) {
      return { canReEnable: true, disableRemainingHours: null, disabledAt: provider.disabledAt?.toISOString() || null, cooldownHours };
    }

    const elapsed = Date.now() - provider.disabledAt.getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const remaining = cooldownMs - elapsed;

    if (remaining <= 0) {
      return { canReEnable: true, disableRemainingHours: 0, disabledAt: provider.disabledAt.toISOString(), cooldownHours };
    }

    return {
      canReEnable: false,
      disableRemainingHours: Math.ceil(remaining / (60 * 60 * 1000)),
      disabledAt: provider.disabledAt.toISOString(),
      cooldownHours,
    };
  }

  /** Disable the provider — hides from all listings but preserves data */
  async disableMyProvider(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.deletedAt) throw new BadRequestException('Provider has been deleted');

    provider.status = 'disabled';
    provider.disabledAt = new Date();
    await this.providerRepo.save(provider);

    // Switch user back to customer mode
    await this.userRepo.update(userId, { preferredMode: 'customer' } as any);

    const cooldownHours = await this.getDisableCooldownHours();
    return { message: 'Provider disabled successfully', status: 'disabled', cooldownHours };
  }

  /** Re-enable a disabled provider — restores to active/unverified */
  async enableMyProvider(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.deletedAt) throw new BadRequestException('Provider has been deleted');
    if (provider.status !== 'disabled') throw new BadRequestException('Provider is not disabled');

    // Enforce cooldown
    const cooldownEnabled = await this.isCooldownEnabled();
    if (cooldownEnabled && provider.disabledAt) {
      const cooldownHours = await this.getDisableCooldownHours();
      const elapsed = Date.now() - provider.disabledAt.getTime();
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      if (elapsed < cooldownMs) {
        const remainingHours = Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000));
        throw new BadRequestException(
          `Provider cannot be re-enabled yet. Please wait ${remainingHours} more hour${remainingHours === 1 ? '' : 's'}. Cooldown period: ${cooldownHours} hours.`,
        );
      }
    }

    // Check if they had a verified status before — restore accordingly
    const verification = await this.verRepo.findOneBy({ userId });
    provider.status = verification?.status === 'approved' ? 'active' : 'unverified';
    provider.disabledAt = null;
    await this.providerRepo.save(provider);

    return { message: 'Provider enabled successfully', status: provider.status };
  }

  /** Soft-delete the provider — marks as deleted and hides from all listings */
  async deleteMyProvider(userId: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.deletedAt) throw new BadRequestException('Provider has already been deleted');

    provider.status = 'disabled';
    provider.deletedAt = new Date();
    await this.providerRepo.save(provider);

    // Switch user back to customer mode
    await this.userRepo.update(userId, { preferredMode: 'customer' } as any);

    return { message: 'Provider deleted successfully' };
  }

  private checkProviderContent(brandName?: string, description?: string | null) {
    const fieldsToCheck = [
      { label: 'brand name', value: brandName },
      { label: 'description', value: description },
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

  private async requiresApproval(settingKey: string): Promise<boolean> {
    const setting = await this.settingRepo.findOneBy({ key: settingKey });
    return setting?.value === 'true';
  }
}
