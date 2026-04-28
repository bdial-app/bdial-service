import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, MoreThan, LessThan } from 'typeorm';
import {
  Provider,
  Category,
  Review,
  PromoBanner,
  Booking,
  Photo,
} from '../entities';
import { HomeFeedDto } from './dto/home-feed.dto';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(PromoBanner) private bannerRepo: Repository<PromoBanner>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
  ) {}

  // ─── Performance Helpers ─────────────────────────────────────

  private static readonly HAVERSINE =
    `6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(p.latitude))))`;

  private withReviewStats(qb: any): void {
    qb.leftJoin(
      (sub) => sub
        .select('rv.provider_id', 'provider_id')
        .addSelect('COALESCE(AVG(rv.star_rating)::numeric(2,1), 0)', 'avg_rating')
        .addSelect('COALESCE(COUNT(rv.id)::int, 0)', 'review_count')
        .from('reviews', 'rv')
        .where("rv.status = 'active'")
        .groupBy('rv.provider_id'),
      'rs',
      'rs.provider_id = p.id',
    );
    qb.addSelect('COALESCE(rs.avg_rating, 0)', 'rating')
      .addSelect('COALESCE(rs.review_count, 0)', 'reviewCount');
  }

  private withCategoryServices(qb: any): void {
    qb.leftJoin(
      (sub) => sub
        .select('pcs.provider_id', 'provider_id')
        .addSelect("string_agg(DISTINCT cats.name, ', ' ORDER BY cats.name)", 'services')
        .from('provider_categories', 'pcs')
        .innerJoin('categories', 'cats', 'cats.id = pcs.category_id')
        .groupBy('pcs.provider_id'),
      'cs',
      'cs.provider_id = p.id',
    );
    qb.addSelect('cs.services', 'services');
  }

  private withGeo(qb: any, lat: number, lng: number, maxKm?: number): void {
    qb.setParameter('lat', lat)
      .setParameter('lng', lng)
      .addSelect(HomeService.HAVERSINE, 'distance')
      .andWhere('p.latitude IS NOT NULL')
      .andWhere('p.longitude IS NOT NULL');
    if (maxKm != null) {
      const dLat = maxKm / 111.32;
      const dLng = maxKm / (111.32 * Math.cos((lat * Math.PI) / 180));
      qb.andWhere('p.latitude BETWEEN :minLat AND :maxLat', { minLat: lat - dLat, maxLat: lat + dLat })
        .andWhere('p.longitude BETWEEN :minLng AND :maxLng', { minLng: lng - dLng, maxLng: lng + dLng });
    }
  }

  /**
   * Single aggregated home feed endpoint.
   * Combines: nearby providers, featured category (random), top rated,
   * promo banners, trending categories, community reviews, platform stats,
   * and dynamic search prompts.
   */
  async getFeed(dto: HomeFeedDto, userId?: string) {
    const { lat, lng, city } = dto;

    const [
      nearbyProviders,
      featuredCategory,
      promoBanners,
      trendingCategories,
      communityReviews,
      platformStats,
      topRatedProviders,
      cityProviders,
      newArrivals,
    ] = await Promise.all([
      this.getNearbyProviders(lat, lng, city, 10),
      this.getRandomFeaturedCategory(lat, lng, city, 6),
      this.getActivePromoBanners(),
      this.getTrendingCategories(6),
      this.getCommunityReviews(10),
      this.getPlatformStats(),
      this.getTopRatedProviders(lat, lng, city, 6),
      this.getCityProviders(city, lat, lng, 6),
      this.getNewArrivals(lat, lng, city, 6),
    ]);

    // Build dynamic search prompts from trending categories
    const searchPrompts = trendingCategories
      .filter((c) => c.providerCount > 0)
      .slice(0, 6)
      .map((c) => c.name);

    return {
      nearbyProviders,
      featuredCategory,
      promoBanners,
      trendingCategories,
      communityReviews,
      platformStats,
      topRatedProviders,
      cityProviders,
      newArrivals,
      searchPrompts,
    };
  }

  /**
   * Nearby providers with avg rating, review count, and primary photo.
   * Uses Haversine if lat/lng present, otherwise falls back to city filter or all active.
   */
  private async getNearbyProviders(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 10,
  ) {
    const hasLocation = lat != null && lng != null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_featured AS "isFeatured"',
        'p.is_available AS "isAvailable"',
        'p.latitude AS latitude',
        'p.longitude AS longitude',
      ])
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
      qb.orderBy("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image || r.listingPhoto,
      description: r.description,
      city: r.city,
      area: r.area,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      verified: r.status === 'active',
      isFeatured: r.isFeatured,
      isAvailable: r.isAvailable,
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
    }));
  }

  /**
   * Pick a random top-level category that has at least 1 active provider.
   * Returns the category info + its providers.
   */
  private async getRandomFeaturedCategory(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 4,
  ) {
    // Get all top-level categories with at least 1 active provider
    const categoriesWithProviders = await this.categoryRepo
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.name AS name', 'c.slug AS slug', 'c.icon AS icon'])
      .addSelect(
        `(SELECT COUNT(DISTINCT pc.provider_id)::int
         FROM provider_categories pc
         JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
         WHERE pc.category_id = c.id
            OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id))`,
        'providerCount',
      )
      .where('c.parent_id IS NULL')
      .andWhere('c.is_active = :active', { active: true })
      .having(
        `(SELECT COUNT(DISTINCT pc.provider_id)::int
         FROM provider_categories pc
         JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
         WHERE pc.category_id = c.id
            OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)) > 0`,
      )
      .groupBy('c.id')
      .getRawMany();

    if (categoriesWithProviders.length === 0) return null;

    // Pick a random category
    const randomIndex = Math.floor(Math.random() * categoriesWithProviders.length);
    const chosen = categoriesWithProviders[randomIndex];

    const providers = await this.getProvidersByCategory(chosen.name, lat, lng, city, limit);

    return {
      name: chosen.name,
      slug: chosen.slug,
      icon: chosen.icon,
      providerCount: parseInt(chosen.providerCount, 10) || 0,
      providers,
    };
  }

  /**
   * Get top-rated providers across all categories.
   */
  private async getTopRatedProviders(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 6,
  ) {
    const hasLocation = lat != null && lng != null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_featured AS "isFeatured"',
        'p.is_available AS "isAvailable"',
      ])
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    // Only providers that have at least 1 review
    qb.andWhere(
      `EXISTS (SELECT 1 FROM reviews rv WHERE rv.provider_id = p.id AND rv.status = 'active')`,
    );

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
    }

    qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
      .addOrderBy('COALESCE(rs.review_count, 0)', 'DESC')
      .limit(limit);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image || r.listingPhoto,
      description: r.description,
      city: r.city,
      area: r.area,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      verified: r.status === 'active',
      isFeatured: r.isFeatured,
      isAvailable: r.isAvailable,
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
    }));
  }

  /**
   * City-specific providers — providers filtered to the user's city.
   * Returns city name + providers for a "Popular in {City}" section.
   */
  private async getCityProviders(
    city?: string,
    lat?: number,
    lng?: number,
    limit = 6,
  ) {
    // Need city to make this section useful
    if (!city) return null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_featured AS "isFeatured"',
        'p.is_available AS "isAvailable"',
      ])
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('p.city ILIKE :city', { city: `%${city}%` });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (lat != null && lng != null) {
      this.withGeo(qb, lat, lng);
      qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('distance', 'ASC');
    } else {
      qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('p.is_featured', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();
    if (raw.length === 0) return null;

    // Extract actual city name from the first result (properly capitalized)
    const cityName = raw[0].city || city;

    return {
      city: cityName,
      providers: raw.map((r) => ({
        id: r.id,
        name: r.name,
        image: r.bannerImage || r.image || r.listingPhoto,
        description: r.description,
        city: r.city,
        area: r.area,
        location: [r.area, r.city].filter(Boolean).join(', '),
        rating: parseFloat(r.rating) || 0,
        reviewCount: parseInt(r.reviewCount, 10) || 0,
        services: r.services || null,
        verified: r.status === 'active',
        isFeatured: r.isFeatured,
        isAvailable: r.isAvailable,
        distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
      })),
    };
  }

  /**
   * Newly registered providers — joined within the last 30 days.
   */
  private async getNewArrivals(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 6,
  ) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hasLocation = lat != null && lng != null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.created_at AS "createdAt"',
      ])
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('p.created_at >= :since', { since: thirtyDaysAgo });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
      qb.orderBy('p.created_at', 'DESC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image || r.listingPhoto,
      description: r.description,
      city: r.city,
      area: r.area,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      verified: r.status === 'active',
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
    }));
  }

  /**
   * Get providers filtered by a specific parent category name.
   * Used for featured category section, category-providers endpoint, etc.
   */
  async getProvidersByCategory(
    categoryName: string,
    lat?: number,
    lng?: number,
    city?: string,
    limit = 4,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { name: categoryName, parentId: IsNull(), isActive: true },
    });
    if (!category) return [];

    // Get all subcategory IDs including the parent itself
    const subcategories = await this.categoryRepo.find({
      where: { parentId: category.id, isActive: true },
      select: ['id'],
    });
    const categoryIds = [category.id, ...subcategories.map((c) => c.id)];

    const hasLocation = lat != null && lng != null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
      ])
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .where(
        'EXISTS (SELECT 1 FROM provider_categories pc_f WHERE pc_f.provider_id = p.id AND pc_f.category_id IN (:...categoryIds))',
        { categoryIds },
      )
      .andWhere('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
      qb.orderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image || r.listingPhoto,
      description: r.description,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      verified: r.status === 'active',
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
    }));
  }

  /**
   * Active promo banners within their date range, ordered by displayOrder.
   */
  private async getActivePromoBanners() {
    const now = new Date();
    const qb = this.bannerRepo
      .createQueryBuilder('b')
      .where('b.isActive = :active', { active: true })
      .andWhere('(b.startsAt IS NULL OR b.startsAt <= :now)', { now })
      .andWhere('(b.endsAt IS NULL OR b.endsAt >= :now)', { now })
      .orderBy('b.displayOrder', 'ASC')
      .limit(10);

    return qb.getMany();
  }

  /**
   * Trending categories: top-level categories ordered by the number of providers.
   */
  private async getTrendingCategories(limit = 6) {
    const raw = await this.categoryRepo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c.name AS name',
        'c.slug AS slug',
        'c.icon AS icon',
      ])
      .addSelect(
        `COALESCE((
          SELECT COUNT(DISTINCT pc.provider_id)::int
          FROM provider_categories pc
          JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
          WHERE pc.category_id = c.id
             OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
        ), 0)`,
        'providerCount',
      )
      .addSelect(
        `COALESCE((
          SELECT COUNT(b.id)::int
          FROM bookings b
          JOIN provider_categories pc2 ON pc2.provider_id = b.provider_id
          WHERE (pc2.category_id = c.id OR pc2.category_id IN (SELECT cc2.id FROM categories cc2 WHERE cc2.parent_id = c.id))
            AND b.status IN ('completed', 'confirmed', 'in_progress')
            AND b.created_at >= NOW() - INTERVAL '30 days'
        ), 0)`,
        'recentBookings',
      )
      .where('c.parentId IS NULL')
      .andWhere('c.isActive = :active', { active: true })
      .having(
        `COALESCE((
          SELECT COUNT(DISTINCT pc.provider_id)::int
          FROM provider_categories pc
          JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
          WHERE pc.category_id = c.id
             OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
        ), 0) > 0`,
      )
      .groupBy('c.id')
      .orderBy('"recentBookings"', 'DESC')
      .addOrderBy('"providerCount"', 'DESC')
      .addOrderBy('c.displayOrder', 'ASC')
      .limit(limit)
      .getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      icon: r.icon,
      providerCount: parseInt(r.providerCount, 10) || 0,
      recentBookings: parseInt(r.recentBookings, 10) || 0,
    }));
  }

  /**
   * Recent community reviews with reviewer info and provider context.
   */
  private async getCommunityReviews(limit = 10) {
    const reviews = await this.reviewRepo
      .createQueryBuilder('r')
      .select([
        'r.id AS id',
        'r.star_rating AS rating',
        'r.review_text AS text',
        'r.posted_at AS "timeAgo"',
      ])
      .addSelect('u.name', 'name')
      .addSelect('p.brand_name', 'providerName')
      .innerJoin('users', 'u', 'u.id = r.reviewer_id')
      .innerJoin('providers', 'p', 'p.id = r.provider_id')
      .where('r.status = :status', { status: 'active' })
      .andWhere('r.review_text IS NOT NULL')
      .andWhere("r.review_text != ''")
      .orderBy('r.posted_at', 'DESC')
      .limit(limit)
      .getRawMany();

    return reviews.map((r) => ({
      id: r.id,
      name: r.name,
      providerName: r.providerName,
      text: r.text,
      rating: r.rating,
      timeAgo: r.timeAgo,
    }));
  }

  /**
   * Platform-wide stats for the trust banner.
   */
  private async getPlatformStats() {
    const [providerCount, reviewStats, categoryCount] = await Promise.all([
      this.providerRepo.count({
        where: { status: In(['active', 'unverified']) },
      }),
      this.reviewRepo
        .createQueryBuilder('r')
        .select('COUNT(r.id)', 'totalReviews')
        .addSelect('COALESCE(AVG(r.star_rating)::numeric(2,1), 0)', 'avgRating')
        .where('r.status = :status', { status: 'active' })
        .getRawOne(),
      this.categoryRepo.count({
        where: { isActive: true },
      }),
    ]);

    return {
      verifiedProviders: providerCount,
      totalReviews: parseInt(reviewStats?.totalReviews || '0', 10),
      avgRating: parseFloat(reviewStats?.avgRating || '0'),
      totalCategories: categoryCount,
    };
  }

  /**
   * Get the most recent completed booking for a user (for the reorder ribbon).
   */
  private async getLastBooking(userId: string) {
    const booking = await this.bookingRepo
      .createQueryBuilder('b')
      .select([
        'b.id AS id',
        'b.status AS status',
        'b.total_amount AS "totalAmount"',
        'b.completed_at AS "completedAt"',
        'b.created_at AS "createdAt"',
      ])
      .addSelect('p.id', 'providerId')
      .addSelect('p.brand_name', 'providerName')
      .addSelect('p.profile_photo_url', 'providerImage')
      .addSelect('p.area', 'providerArea')
      .addSelect('p.city', 'providerCity')
      .addSelect(
        `(SELECT string_agg(DISTINCT cat.name, ', ' ORDER BY cat.name) FROM categories cat JOIN provider_categories pcat ON pcat.category_id = cat.id WHERE pcat.provider_id = b.provider_id)`,
        'categories',
      )
      .innerJoin('providers', 'p', 'p.id = b.provider_id')
      .where('b.user_id = :userId', { userId })
      .andWhere('b.status IN (:...statuses)', { statuses: ['completed', 'confirmed'] })
      .orderBy('b.completed_at', 'DESC', 'NULLS LAST')
      .addOrderBy('b.created_at', 'DESC')
      .limit(1)
      .getRawOne();

    if (!booking) return null;

    return {
      id: booking.id,
      providerId: booking.providerId,
      providerName: booking.providerName,
      providerImage: booking.providerImage,
      categories: booking.categories,
      location: [booking.providerArea, booking.providerCity].filter(Boolean).join(', '),
      completedAt: booking.completedAt,
    };
  }

  /**
   * Get providers filtered by category name string (public endpoint for category-specific sliders).
   */
  async getProvidersByCategorySlug(
    slug: string,
    lat?: number,
    lng?: number,
    city?: string,
    limit = 6,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { slug, isActive: true },
    });
    if (!category) return [];

    // For subcategory slugs, find the parent
    const parentId = category.parentId || category.id;

    // Get all IDs under this tree
    const subcategories = await this.categoryRepo.find({
      where: { parentId, isActive: true },
      select: ['id'],
    });
    const categoryIds = [parentId, ...subcategories.map((c) => c.id)];

    return this.getProvidersByCategory(category.name, lat, lng, city, limit);
  }

  /**
   * Live activity pulse data — aggregated stats for social proof.
   */
  async getLiveActivity(lat?: number, lng?: number, city?: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [completedToday, onlineProviders, recentBookings] = await Promise.all([
      this.bookingRepo.count({
        where: {
          status: 'completed',
          completedAt: MoreThan(todayStart),
        },
      }),
      this.providerRepo.count({
        where: {
          isAvailable: true,
          status: In(['active', 'unverified']),
        },
      }),
      this.bookingRepo.count({
        where: {
          status: In(['confirmed', 'in_progress']),
          createdAt: MoreThan(todayStart),
        },
      }),
    ]);

    return [
      { count: onlineProviders || 0, text: 'providers available in your area' },
      { count: completedToday || 0, text: 'services completed near you today' },
      { count: recentBookings || 0, text: 'new requests in the last hour' },
    ];
  }
}
