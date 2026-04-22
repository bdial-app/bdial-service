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

  /**
   * Single aggregated home feed endpoint.
   * Combines: nearby providers, featured providers (by category),
   * promo banners, trending categories, community reviews, and platform stats.
   */
  async getFeed(dto: HomeFeedDto, userId?: string) {
    const { lat, lng, city } = dto;
    const hasLocation = lat != null && lng != null;

    const [
      nearbyProviders,
      beautyProviders,
      promoBanners,
      trendingCategories,
      communityReviews,
      platformStats,
      lastBooking,
    ] = await Promise.all([
      this.getNearbyProviders(lat, lng, city, 10),
      this.getProvidersByCategory('Beauty & Wellness', lat, lng, city, 4),
      this.getActivePromoBanners(),
      this.getTrendingCategories(6),
      this.getCommunityReviews(10),
      this.getPlatformStats(),
      userId ? this.getLastBooking(userId) : Promise.resolve(null),
    ]);

    return {
      nearbyProviders,
      beautyProviders,
      promoBanners,
      trendingCategories,
      communityReviews,
      platformStats,
      lastBooking,
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

    const haversine = hasLocation
      ? `6371 * acos(LEAST(1.0, cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(p.latitude))))`
      : 'NULL';

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
        `COALESCE((SELECT AVG(r.star_rating)::numeric(2,1) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'rating',
      )
      .addSelect(
        `COALESCE((SELECT COUNT(r.id)::int FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'reviewCount',
      )
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .addSelect(
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id LIMIT 1)`,
        'services',
      )
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] });

    if (hasLocation) {
      qb.addSelect(haversine, 'distance')
        .andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .orderBy("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'ASC')
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
   * Get providers filtered by a specific parent category name.
   * Used for "Beauty & Wellness", "Popular in Tailoring", etc.
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
    const haversine = hasLocation
      ? `6371 * acos(LEAST(1.0, cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(p.latitude))))`
      : 'NULL';

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
        `COALESCE((SELECT AVG(r.star_rating)::numeric(2,1) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'rating',
      )
      .addSelect(
        `COALESCE((SELECT COUNT(r.id)::int FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'reviewCount',
      )
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      .addSelect(
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id LIMIT 1)`,
        'services',
      )
      .innerJoin('provider_categories', 'pc', 'pc.provider_id = p.id AND pc.category_id IN (:...categoryIds)', { categoryIds })
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .groupBy('p.id');

    if (hasLocation) {
      qb.addSelect(haversine, 'distance')
        .andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .orderBy('distance', 'ASC');
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
    const [providerCount, reviewStats, bookingCount] = await Promise.all([
      this.providerRepo.count({
        where: { status: In(['active', 'unverified']) },
      }),
      this.reviewRepo
        .createQueryBuilder('r')
        .select('COUNT(r.id)', 'totalReviews')
        .addSelect('COALESCE(AVG(r.star_rating)::numeric(2,1), 0)', 'avgRating')
        .where('r.status = :status', { status: 'active' })
        .getRawOne(),
      this.bookingRepo.count({
        where: { status: In(['completed', 'confirmed', 'in_progress']) },
      }),
    ]);

    return {
      verifiedProviders: providerCount,
      totalReviews: parseInt(reviewStats?.totalReviews || '0', 10),
      avgRating: parseFloat(reviewStats?.avgRating || '0'),
      totalBookings: bookingCount,
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
      { count: completedToday || 0, text: 'bookings completed near you today' },
      { count: onlineProviders || 0, text: 'providers online in your area' },
      { count: recentBookings || 0, text: 'services booked in the last hour' },
    ];
  }
}
