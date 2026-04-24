import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Provider, User, Verification, ProviderCategory, Review, Product, Photo, Message, ConversationParticipant, ProviderBadge, ProviderOffer, SponsoredListing } from '../entities';
import { StorageService } from '../storage/storage.service';
import { GeocodeService } from '../geocode/geocode.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { NearbyProvidersDto } from './dto/nearby-providers.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { CreateSponsorshipDto, UpdateSponsorshipDto } from './dto/sponsorship.dto';

@Injectable()
export class ProvidersService {
  private providerOtpStore = new Map<string, { otp: string; expiresAt: Date; sentAt: Date }>();

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
    private storage: StorageService,
    private dataSource: DataSource,
    private geocodeService: GeocodeService,
  ) {}

  async sendProviderOtp(mobileNumber: string) {
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) {
      throw new BadRequestException('Mobile number must be exactly 10 digits');
    }
    const mobile = mobileNumber.trim();

    const existing = this.providerOtpStore.get(mobile);
    if (existing && new Date() < existing.expiresAt) {
      const timeSinceSent = Date.now() - existing.sentAt.getTime();
      if (timeSinceSent < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - timeSinceSent) / 1000);
        throw new BadRequestException({ message: 'OTP recently sent. Please wait before resending.', retryAfterSeconds: remaining, error_code: 'OTP_RATE_LIMITED' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.providerOtpStore.set(mobile, { otp, expiresAt, sentAt: new Date() });
    console.log(`[Provider OTP] ${mobile}: ${otp} (Expires: ${expiresAt.toISOString()})`);

    return { message: 'OTP sent successfully', data: { mobileNumber: mobile, expiresIn: '5 minutes', otp } };
  }

  async verifyProviderOtp(mobileNumber: string, otp: string) {
    if (!mobileNumber || !otp) {
      throw new BadRequestException('Mobile number and OTP are required');
    }
    const mobile = mobileNumber.trim();
    const code = otp.trim();

    if (!/^\d{10}$/.test(mobile)) throw new BadRequestException('Mobile number must be exactly 10 digits');
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('OTP must be exactly 6 digits');

    const record = this.providerOtpStore.get(mobile);
    if (!record) throw new BadRequestException({ message: 'No OTP found for this number', error_code: 'OTP_NOT_FOUND' });
    if (new Date() > record.expiresAt) {
      this.providerOtpStore.delete(mobile);
      throw new BadRequestException({ message: 'OTP has expired', error_code: 'OTP_EXPIRED' });
    }
    if (record.otp !== code) throw new BadRequestException({ message: 'Invalid OTP', error_code: 'INVALID_OTP' });
    this.providerOtpStore.delete(mobile);

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
    let parsedProducts: Array<{ name: string; description?: string; price?: number; currency?: string; imageCount?: number }> = [];
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
        isWomenLed: user.gender === 'female',
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
    if (provider.status === 'active' || verificationStatus === 'approved') {
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

    const [photos, products, reviews, badges, activeOffers] = await Promise.all([
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

  /**
   * Find providers near a lat/lng using the Haversine formula.
   * Optionally enriches with Google Distance Matrix (road distance + travel time).
   * Flow 1-c: Location-based provider discovery.
   */
  async findNearby(dto: NearbyProvidersDto) {
    const { lat, lng, radius = 10, page = 1, limit = 10, search, city, sortBy = 'distance', categoryIds } = dto;
    const offset = (page - 1) * limit;

    // Haversine formula in SQL (returns distance in km)
    const haversine = `
      6371 * acos(
        LEAST(1.0, cos(radians(:lat)) * cos(radians(provider.latitude))
        * cos(radians(provider.longitude) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(provider.latitude)))
      )
    `;

    const qb = this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .addSelect(haversine, 'distance')
      .where('provider.latitude IS NOT NULL')
      .andWhere('provider.longitude IS NOT NULL')
      .andWhere('provider.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere(`${haversine} <= :radius`, { lat, lng, radius })
      .setParameters({ lat, lng, radius });

    if (city) qb.andWhere('provider.city ILIKE :city', { city: `%${city}%` });
    if (search) {
      qb.andWhere(
        '(provider.brandName ILIKE :search OR provider.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (categoryIds?.length) {
      qb.andWhere(
        `provider.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id IN (:...categoryIds))`,
        { categoryIds },
      );
    }

    // Sort - verified (active) providers always rank above unverified
    if (sortBy === 'distance') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
    } else if (sortBy === 'newest') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('provider.createdAt', 'DESC');
    } else if (sortBy === 'rating') {
      qb.addSelect(
        `(SELECT AVG(r.star_rating) FROM reviews r WHERE r.provider_id = provider.id AND r.status = 'approved')`,
        'avg_rating',
      );
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
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

    // Merge Haversine distance into entities
    let data = entities.map((provider, i) => ({
      ...provider,
      distance: parseFloat(parseFloat(raw[i]?.distance ?? '0').toFixed(2)),
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
    });

    return this.offerRepo.save(offer);
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
}
