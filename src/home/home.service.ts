import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, MoreThan, LessThan, DataSource } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Provider,
  Category,
  Review,
  PromoBanner,
  Booking,
  Photo,
  ProviderOffer,
  SponsoredListing,
} from '../entities';
import { CategoryPersonalizationService } from '../users/category-personalization.service';
import { HomeFeedDto } from './dto/home-feed.dto';

@Injectable()
export class HomeService {
  // Cache keys & TTLs
  private static readonly CACHE_PLATFORM_STATS = 'home:platform-stats';
  private static readonly CACHE_TRENDING_CATS = 'home:trending-categories';
  private static readonly CACHE_COMMUNITY_REVIEWS = 'home:community-reviews';
  private static readonly CACHE_PROMO_BANNERS = 'home:promo-banners';
  private static readonly TTL_5MIN = 5 * 60 * 1000;
  private static readonly TTL_2MIN = 2 * 60 * 1000;

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(PromoBanner) private bannerRepo: Repository<PromoBanner>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(ProviderOffer) private offerRepo: Repository<ProviderOffer>,
    @InjectRepository(SponsoredListing) private sponsoredRepo: Repository<SponsoredListing>,
    private readonly categoryPersonalization: CategoryPersonalizationService,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

  /** Shared mapper — converts raw query rows into the standard provider card shape. */
  private mapProviders(rows: any[]): any[] {
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image || r.listingPhoto,
      description: r.description,
      city: r.city,
      area: r.area,
      location: [r.area, r.city].filter(Boolean).map((s: string) => s.replace(/[\r\n]+/g, '').trim()).join(', '),
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
   * Single aggregated home feed endpoint.
   * Combines: nearby providers, featured category (random), top rated,
   * promo banners, trending categories, community reviews, platform stats,
   * and dynamic search prompts.
   */
  async getFeed(dto: HomeFeedDto, userId?: string) {
    const { lat, lng, city } = dto;

    // Phase 1: Fetch sponsored first (they get priority placement)
    const [sponsoredProviders, promoBanners, trendingCategories, communityReviews, platformStats] =
      await Promise.all([
        this.getSponsoredProviders(lat, lng, city, 6),
        this.getActivePromoBanners(),
        this.getTrendingCategories(6),
        this.getCommunityReviews(10),
        this.getPlatformStats(),
      ]);

    // Collect sponsored provider IDs so we never repeat them in other sections
    const sponsoredIds = new Set(sponsoredProviders.map((s) => s.id));

    // Phase 2: Fetch remaining sections, passing exclusion set
    // Over-fetch (3x) so cross-section dedup still leaves enough per section
    const [
      nearbyProviders,
      featuredCategory,
      topRatedProviders,
      cityProviders,
      newArrivals,
      dealsAroundYou,
      womenLedProviders,
    ] = await Promise.all([
      this.getNearbyProviders(lat, lng, city, 10),
      this.getRandomFeaturedCategory(lat, lng, city, 12),
      this.getTopRatedProviders(lat, lng, city, 18),
      this.getCityProviders(city, lat, lng, 18),
      this.getNewArrivals(lat, lng, city, 18),
      this.getDealsAroundYou(lat, lng, city, 8, sponsoredIds),
      this.getWomenLedProviders(lat, lng, city, 24),
    ]);

    // Phase 3: Personalization (if user is logged in)
    let personalizedCategories: any[] | null = null;
    let forYouProviders: any[] | null = null;

    if (userId) {
      const [catWeights, forYou] = await Promise.all([
        this.categoryPersonalization.getPersonalizedCategories(userId, 10),
        this.getForYouProviders(userId, lat, lng, city, 6),
      ]);
      if (catWeights.length > 0) {
        personalizedCategories = catWeights.map((cw) => ({
          id: cw.categoryId,
          name: cw.categoryName,
          slug: cw.slug,
          icon: cw.icon,
          weight: cw.weight,
          source: cw.source,
        }));
      }
      if (forYou.length > 0) {
        forYouProviders = forYou;
      }
    }

    // Cross-section deduplication: each provider appears in at most one section
    // Priority order: sponsored > nearby > topRated > deals > featured > newArrivals > womenLed > city > forYou
    const seen = new Set<string>(sponsoredIds);

    const dedup = <T extends { id: string }>(list: T[]): T[] => {
      const result: T[] = [];
      for (const p of list) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
      }
      return result;
    };

    const dedupedNearby = dedup(nearbyProviders);
    const dedupedTopRated = dedup(topRatedProviders).slice(0, 6);
    const dedupedDeals = dealsAroundYou; // already excludes sponsored via param
    // Mark deals provider IDs as seen too
    for (const d of dedupedDeals) { if (d.id) seen.add(d.id); }
    const dedupedFeatured = featuredCategory
      ? { ...featuredCategory, providers: dedup(featuredCategory.providers).slice(0, 6) }
      : null;
    const dedupedNewArrivals = dedup(newArrivals).slice(0, 6);
    const dedupedWomenLed = dedup(womenLedProviders).slice(0, 8);
    const dedupedCity = cityProviders
      ? { ...cityProviders, providers: dedup(cityProviders.providers).slice(0, 6) }
      : null;
    const dedupedForYou = forYouProviders ? dedup(forYouProviders).slice(0, 6) : null;

    // Build dynamic search prompts from trending categories
    const searchPrompts = trendingCategories
      .filter((c) => c.providerCount > 0)
      .slice(0, 6)
      .map((c) => c.name);

    return {
      nearbyProviders: dedupedNearby,
      featuredCategory: dedupedFeatured,
      promoBanners,
      trendingCategories,
      personalizedCategories,
      forYouProviders: dedupedForYou,
      communityReviews,
      platformStats,
      topRatedProviders: dedupedTopRated,
      cityProviders: dedupedCity,
      newArrivals: dedupedNewArrivals,
      dealsAroundYou: dedupedDeals,
      sponsoredProviders,
      womenLedProviders: dedupedWomenLed,
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
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('p.is_available = true');

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
      qb.addSelect("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'status_rank');
      qb.orderBy('status_rank', 'ASC')
        .addOrderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .addSelect("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'status_rank')
        .orderBy('status_rank', 'ASC')
        .addOrderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    let raw = await qb.getRawMany();

    // Fallback: if city has no providers, relax city filter to show geo-nearby
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'p.is_featured AS "isFeatured"', 'p.is_available AS "isAvailable"', 'p.latitude AS latitude', 'p.longitude AS longitude'])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere('p.is_available = true');
      this.withReviewStats(fallbackQb);
      this.withCategoryServices(fallbackQb);
      this.withGeo(fallbackQb, lat!, lng!, 100);
      fallbackQb.addSelect("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'status_rank');
      fallbackQb.orderBy('status_rank', 'ASC')
        .addOrderBy('distance', 'ASC')
        .limit(limit);
      raw = await fallbackQb.getRawMany();
    }

    return this.mapProviders(raw);
  }

  /**
   * "For You" section — providers from user's top categories, nearby.
   * Returns personalized results based on implicit/explicit category preferences.
   */
  private async getForYouProviders(
    userId: string,
    lat?: number,
    lng?: number,
    city?: string,
    limit = 6,
  ) {
    const topCategoryIds = await this.categoryPersonalization.getTopCategoryIds(userId, 3);
    if (topCategoryIds.length === 0) return [];

    const hasLocation = lat != null && lng != null;
    let distExpr = 'NULL::float';
    const params: any[] = [topCategoryIds];
    let pi = 2;

    if (hasLocation) {
      distExpr = `6371 * acos(LEAST(1.0, cos(radians($${pi})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${pi + 1})) + sin(radians($${pi})) * sin(radians(p.latitude))))`;
      params.push(lat, lng);
      pi += 2;
    }

    const conditions: string[] = [
      `p.status IN ('active', 'unverified')`,
      `p.is_available = true`,
      `p.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id = ANY($1))`,
    ];

    if (hasLocation) {
      conditions.push(`p.latitude IS NOT NULL`, `p.longitude IS NOT NULL`);
      conditions.push(`${distExpr} <= 25`); // 25km radius
    }

    if (city) {
      conditions.push(`p.city ILIKE $${pi}`);
      params.push(`%${city}%`);
      pi++;
    }

    params.push(limit);

    const sql = `
      SELECT
        p.id, p.brand_name AS name, p.profile_photo_url AS image,
        p.banner_image_url AS "bannerImage", p.description, p.city, p.area,
        p.status, p.is_featured AS "isFeatured", p.is_available AS "isAvailable",
        ${distExpr} AS distance,
        COALESCE(rs.avg_rating, 0) AS rating,
        COALESCE(rs.review_count, 0) AS "reviewCount",
        (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS services,
        (SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1) AS "listingPhoto"
      FROM providers p
      LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE WHEN p.status = 'active' THEN 0 ELSE 1 END ASC,
        COALESCE(rs.avg_rating, 0) DESC,
        ${hasLocation ? 'distance ASC NULLS LAST,' : ''}
        p.created_at DESC
      LIMIT $${pi}
    `;

    const rows: any[] = await this.dataSource.query(sql, params);

    return this.mapProviders(rows);
  }

  /**
   * Pick a random top-level category that has at least 1 active provider.
   * Reuses cached trending categories to avoid a duplicate heavy query.
   */
  private async getRandomFeaturedCategory(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 4,
  ) {
    // Reuse trending categories (already cached) — they are top-level with provider count > 0
    const categoriesWithProviders = await this.getTrendingCategories(20);

    if (categoriesWithProviders.length === 0) return null;

    // Shuffle and try up to 5 categories to find one with providers in this city
    const shuffled = [...categoriesWithProviders].sort(() => Math.random() - 0.5);
    const maxAttempts = Math.min(5, shuffled.length);

    for (let i = 0; i < maxAttempts; i++) {
      const chosen = shuffled[i];
      const providers = await this.getProvidersByCategory(chosen.name, lat, lng, city, limit);
      if (providers.length > 0) {
        return {
          name: chosen.name,
          slug: chosen.slug,
          icon: chosen.icon,
          providerCount: chosen.providerCount,
          providers,
        };
      }
    }

    // Fallback: no category has providers in this city
    return null;
  }

  /**
   * Get top-rated providers across all categories.
   * Falls back to newest providers if no reviews exist yet.
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
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('p.is_available = true');

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
    }

    // Prefer providers with reviews first, then fall back to featured/newest
    qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
      .addOrderBy('COALESCE(rs.review_count, 0)', 'DESC')
      .addOrderBy('p.is_featured', 'DESC')
      .addOrderBy('p.created_at', 'DESC')
      .limit(limit);

    let raw = await qb.getRawMany();

    // Fallback: if city has no providers, relax to geo-only with wider radius
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'p.is_featured AS "isFeatured"', 'p.is_available AS "isAvailable"'])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere('p.is_available = true');
      this.withReviewStats(fallbackQb);
      this.withCategoryServices(fallbackQb);
      this.withGeo(fallbackQb, lat!, lng!, 100);
      fallbackQb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('COALESCE(rs.review_count, 0)', 'DESC')
        .addOrderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC')
        .limit(limit);
      raw = await fallbackQb.getRawMany();
    }

    // Final fallback: no location/city constraints — show any top providers
    if (raw.length === 0) {
      const globalQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'p.is_featured AS "isFeatured"', 'p.is_available AS "isAvailable"'])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere('p.is_available = true');
      this.withReviewStats(globalQb);
      this.withCategoryServices(globalQb);
      globalQb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('COALESCE(rs.review_count, 0)', 'DESC')
        .addOrderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC')
        .limit(limit);
      raw = await globalQb.getRawMany();
    }

    return this.mapProviders(raw);
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
      .andWhere('p.is_available = true')
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
      providers: this.mapProviders(raw),
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
      .andWhere('p.is_available = true')
      .andWhere('p.created_at >= :since', { since: thirtyDaysAgo });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
      qb.orderBy('p.created_at', 'DESC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    let raw = await qb.getRawMany();

    // Fallback: if city has no new arrivals, relax to geo-only
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'p.created_at AS "createdAt"'])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere('p.is_available = true')
        .andWhere('p.created_at >= :since', { since: thirtyDaysAgo });
      this.withReviewStats(fallbackQb);
      this.withCategoryServices(fallbackQb);
      this.withGeo(fallbackQb, lat!, lng!, 100);
      fallbackQb.orderBy('p.created_at', 'DESC').limit(limit);
      raw = await fallbackQb.getRawMany();
    }

    return this.mapProviders(raw);
  }

  // ─── Deals Around You ────────────────────────────────────────
  // Deduplicates by provider (shows only their best deal),
  // includes total offer count per provider, and randomizes
  // order on each refresh so every deal gets spotlight.

  private async getDealsAroundYou(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 8,
    excludeProviderIds?: Set<string>,
  ) {
    const now = new Date();
    const hasLocation = lat != null && lng != null;

    const haversine = hasLocation
      ? HomeService.HAVERSINE
      : 'NULL';

    // Step 1: Fetch all active offers (limited to a reasonable pool)
    const qb = this.offerRepo
      .createQueryBuilder('o')
      .innerJoin('providers', 'p', 'p.id = o.provider_id')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'o.id AS "offerId"',
        'o.title AS "offerTitle"',
        'o.discount_type AS "discountType"',
        'o.discount_value AS "discountValue"',
        'o.ends_at AS "offerEndsAt"',
      ])
      // Subquery: count total active offers per provider for the badge
      .addSelect(
        `(SELECT COUNT(*)::int FROM provider_offers po2
          WHERE po2.provider_id = p.id
            AND po2.is_active = true
            AND po2.starts_at <= NOW()
            AND po2.ends_at >= NOW()
            AND po2.approval_status = 'approved')`,
        'totalOffers',
      )
      .where('o.is_active = :active', { active: true })
      .andWhere('o.starts_at <= :now', { now })
      .andWhere('o.ends_at >= :now', { now })
      .andWhere('(o.usage_limit IS NULL OR o.usage_count < o.usage_limit)')
      .andWhere("o.approval_status = 'approved'")
      .andWhere("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);

    if (hasLocation) {
      qb.setParameter('lat', lat).setParameter('lng', lng);
      qb.addSelect(haversine, 'distance');
      qb.andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL');
    }

    // Always filter by city when available (not just as fallback)
    if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
    }

    // Order by highest discount first (within each provider we want the best deal)
    qb.orderBy('o.discount_value', 'DESC');
    // Fetch more than needed so we have a pool to deduplicate and randomize from
    qb.limit(limit * 5);

    let raw = await qb.getRawMany();

    // Fallback: if city has no deals, relax city filter to show nearby deals
    if (raw.length === 0 && city && hasLocation) {
      qb.setParameters({ ...qb.getParameters() });
      // Re-run without city filter — TypeORM doesn't support removing conditions,
      // so just fetch geo-only with a distance cap
      const fallbackRaw = await this.offerRepo
        .createQueryBuilder('o')
        .innerJoin('providers', 'p', 'p.id = o.provider_id')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'o.id AS "offerId"', 'o.title AS "offerTitle"', 'o.discount_type AS "discountType"', 'o.discount_value AS "discountValue"', 'o.ends_at AS "offerEndsAt"'])
        .addSelect(`(SELECT COUNT(*)::int FROM provider_offers po2 WHERE po2.provider_id = p.id AND po2.is_active = true AND po2.starts_at <= NOW() AND po2.ends_at >= NOW() AND po2.approval_status = 'approved')`, 'totalOffers')
        .where('o.is_active = :active', { active: true })
        .andWhere('o.starts_at <= :now', { now })
        .andWhere('o.ends_at >= :now', { now })
        .andWhere('(o.usage_limit IS NULL OR o.usage_count < o.usage_limit)')
        .andWhere("o.approval_status = 'approved'")
        .andWhere("p.status IN ('active', 'unverified')")
        .andWhere('p.latitude IS NOT NULL').andWhere('p.longitude IS NOT NULL')
        .setParameter('lat', lat).setParameter('lng', lng)
        .addSelect(HomeService.HAVERSINE, 'distance')
        .orderBy('o.discount_value', 'DESC')
        .limit(limit * 5)
        .getRawMany();
      raw = fallbackRaw;
    }

    // Step 2: Deduplicate — keep only the best deal (highest discount) per provider
    // Also exclude providers already shown in the sponsored section
    const seenProviders = new Set<string>(excludeProviderIds ?? []);
    const deduplicated: typeof raw = [];
    for (const r of raw) {
      if (seenProviders.has(r.id)) continue;
      seenProviders.add(r.id);
      deduplicated.push(r);
    }

    // Step 3: Randomize order (Fisher-Yates shuffle) so each refresh shows different deals
    for (let i = deduplicated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deduplicated[i], deduplicated[j]] = [deduplicated[j], deduplicated[i]];
    }

    // Step 4: Take the limit
    const results = deduplicated.slice(0, limit);

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      location: [r.area, r.city].filter(Boolean).map((s: string) => s.replace(/[\r\n]+/g, '').trim()).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      verified: r.status === 'active',
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
      offerId: r.offerId,
      offerTitle: r.offerTitle,
      discountType: r.discountType,
      discountValue: parseFloat(r.discountValue),
      offerEndsAt: r.offerEndsAt,
      hasActiveOffer: true,
      totalOffers: parseInt(r.totalOffers, 10) || 1,
    }));
  }

  /**
   * Women-Led businesses section.
   * Shows providers with approved women-led status, sorted by rating then newest.
   * Only shows if there are approved women-led providers available.
   */
  private async getWomenLedProviders(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 8,
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
      .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('p.is_available = true')
      .andWhere("p.women_led_status = 'approved'");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
      qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('distance', 'ASC')
        .addOrderBy('p.created_at', 'DESC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    let raw = await qb.getRawMany();

    // Fallback: if city has no women-led providers, relax to geo-only
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'p.is_featured AS "isFeatured"', 'p.is_available AS "isAvailable"', 'p.latitude AS latitude', 'p.longitude AS longitude'])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .where('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere('p.is_available = true')
        .andWhere("p.women_led_status = 'approved'");
      this.withReviewStats(fallbackQb);
      this.withCategoryServices(fallbackQb);
      this.withGeo(fallbackQb, lat!, lng!, 100);
      fallbackQb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('distance', 'ASC')
        .addOrderBy('p.created_at', 'DESC')
        .limit(limit);
      raw = await fallbackQb.getRawMany();
    }

    return this.mapProviders(raw).map((p) => ({ ...p, isWomenLed: true }));
  }

  /**
   * Sponsored/featured businesses carousel.
   * Shows premium providers who purchased sponsorship placement.
   * Rotates on each request for fairness. Increments impressions for analytics.
   */
  private async getSponsoredProviders(
    lat?: number,
    lng?: number,
    city?: string,
    limit = 6,
  ) {
    const now = new Date();
    const hasLocation = lat != null && lng != null;

    const qb = this.sponsoredRepo
      .createQueryBuilder('s')
      .innerJoin('providers', 'p', 'p.id = s.provider_id')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        's.id AS "sponsoredListingId"',
        's.type AS "sponsorType"',
        's.starts_at AS "startsAt"',
        's.ends_at AS "endsAt"',
      ])
      .addSelect(
        `(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`,
        'listingPhoto',
      )
      // Subquery: provider's primary category
      .addSelect(
        `(SELECT cats.name FROM provider_categories pcs
          INNER JOIN categories cats ON cats.id = pcs.category_id
          WHERE pcs.provider_id = p.id LIMIT 1)`,
        'primaryCategory',
      )
      // Subquery: does this provider also have an active deal?
      .addSelect(
        `EXISTS (SELECT 1 FROM provider_offers po
          WHERE po.provider_id = p.id
            AND po.is_active = true
            AND po.starts_at <= NOW()
            AND po.ends_at >= NOW()
            AND po.approval_status = 'approved')`,
        'hasActiveOffer',
      )
      .where('s.is_active = :active', { active: true })
      .andWhere('s.starts_at <= :now', { now })
      .andWhere('s.ends_at >= :now', { now })
      .andWhere('s.spent_amount < s.budget_amount')
      .andWhere("s.approval_status = 'approved'")
      .andWhere("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      qb.setParameter('lat', lat).setParameter('lng', lng);
      qb.addSelect(HomeService.HAVERSINE, 'distance');
      qb.andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL');
      // Enforce target_radius when set on the listing
      qb.andWhere(
        `(s.target_radius IS NULL OR ${HomeService.HAVERSINE} <= s.target_radius)`,
      );
    }

    // Always enforce city targeting when city is provided
    if (city) {
      qb.andWhere(
        `(s.target_cities IS NULL OR :city = ANY(s.target_cities))`,
        { city },
      );
      // Also ensure the provider is actually in the user's city
      qb.andWhere('p.city ILIKE :provCity', { provCity: `%${city}%` });
    }

    // Prioritize by bid (cost_per_click) then randomize for fairness
    qb.orderBy('s.cost_per_click', 'DESC')
      .addOrderBy('RANDOM()')
      .limit(limit * 3);

    let raw = await qb.getRawMany();

    // Fallback: if no city-local sponsors, relax city filter on provider
    // (still respect target_cities on the listing itself)
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = qb.clone();
      // Remove the provider city constraint by re-running without it
      // Simpler approach: just remove p.city filter from the clone
      raw = await this.sponsoredRepo
        .createQueryBuilder('s')
        .innerJoin('providers', 'p', 'p.id = s.provider_id')
        .select([
          'p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image',
          'p.banner_image_url AS "bannerImage"', 'p.description AS description',
          'p.city AS city', 'p.area AS area', 'p.status AS status',
          's.id AS "sponsoredListingId"', 's.type AS "sponsorType"',
          's.starts_at AS "startsAt"', 's.ends_at AS "endsAt"',
        ])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .addSelect(`(SELECT cats.name FROM provider_categories pcs INNER JOIN categories cats ON cats.id = pcs.category_id WHERE pcs.provider_id = p.id LIMIT 1)`, 'primaryCategory')
        .addSelect(`EXISTS (SELECT 1 FROM provider_offers po WHERE po.provider_id = p.id AND po.is_active = true AND po.starts_at <= NOW() AND po.ends_at >= NOW() AND po.approval_status = 'approved')`, 'hasActiveOffer')
        .where('s.is_active = :active', { active: true })
        .andWhere('s.starts_at <= :now', { now })
        .andWhere('s.ends_at >= :now', { now })
        .andWhere('s.spent_amount < s.budget_amount')
        .andWhere("s.approval_status = 'approved'")
        .andWhere("p.status IN ('active', 'unverified')")
        .andWhere('p.latitude IS NOT NULL').andWhere('p.longitude IS NOT NULL')
        .setParameter('lat', lat).setParameter('lng', lng)
        .addSelect(HomeService.HAVERSINE, 'distance')
        .andWhere(`(s.target_radius IS NULL OR ${HomeService.HAVERSINE} <= s.target_radius)`)
        .orderBy('s.cost_per_click', 'DESC').addOrderBy('RANDOM()')
        .limit(limit * 3)
        .getRawMany();
    }

    // Deduplicate by provider (one sponsor slot per business)
    const seenProviders = new Set<string>();
    const deduplicated: typeof raw = [];
    for (const r of raw) {
      if (seenProviders.has(r.id)) continue;
      seenProviders.add(r.id);
      deduplicated.push(r);
    }

    // Shuffle for fair rotation
    for (let i = deduplicated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deduplicated[i], deduplicated[j]] = [deduplicated[j], deduplicated[i]];
    }

    const results = deduplicated.slice(0, limit);

    // Fire-and-forget: increment impressions + deduct cost_per_impression for each shown listing
    if (results.length > 0) {
      const listingIds = results.map((r) => r.sponsoredListingId);
      this.sponsoredRepo
        .createQueryBuilder()
        .update()
        .set({
          impressions: () => 'impressions + 1',
          spentAmount: () => 'spent_amount + cost_per_impression',
        })
        .where('id IN (:...ids)', { ids: listingIds })
        .execute()
        .catch(() => {}); // non-blocking
    }

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image || r.listingPhoto,
      description: r.description ? r.description.slice(0, 80) : null,
      location: [r.area, r.city].filter(Boolean).map((s: string) => s.replace(/[\r\n]+/g, '').trim()).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      primaryCategory: r.primaryCategory || null,
      verified: r.status === 'active',
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
      sponsorType: r.sponsorType,
      hasActiveOffer: r.hasActiveOffer === true || r.hasActiveOffer === 't',
      sponsoredListingId: r.sponsoredListingId,
      endsAt: r.endsAt,
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
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
      qb.orderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    let raw = await qb.getRawMany();

    // Fallback: if city has no providers in this category, relax to geo-only
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status'])
        .addSelect(`(SELECT ph.image_url FROM photos ph WHERE ph.provider_id = p.id ORDER BY ph.display_order ASC LIMIT 1)`, 'listingPhoto')
        .where('EXISTS (SELECT 1 FROM provider_categories pc_f WHERE pc_f.provider_id = p.id AND pc_f.category_id IN (:...categoryIds))', { categoryIds })
        .andWhere('p.status IN (:...statuses)', { statuses: ['active', 'unverified'] });
      this.withReviewStats(fallbackQb);
      this.withCategoryServices(fallbackQb);
      this.withGeo(fallbackQb, lat!, lng!, 100);
      fallbackQb.orderBy('distance', 'ASC').limit(limit);
      raw = await fallbackQb.getRawMany();
    }

    return this.mapProviders(raw);
  }

  /**
   * Active promo banners within their date range. Cached 2 min.
   */
  private async getActivePromoBanners() {
    const cached = await this.cacheManager.get<any[]>(HomeService.CACHE_PROMO_BANNERS);
    if (cached) return cached;

    const now = new Date();
    const qb = this.bannerRepo
      .createQueryBuilder('b')
      .where('b.isActive = :active', { active: true })
      .andWhere('(b.startsAt IS NULL OR b.startsAt <= :now)', { now })
      .andWhere('(b.endsAt IS NULL OR b.endsAt >= :now)', { now })
      .orderBy('b.displayOrder', 'ASC')
      .limit(10);

    const result = await qb.getMany();
    await this.cacheManager.set(HomeService.CACHE_PROMO_BANNERS, result, HomeService.TTL_2MIN);
    return result;
  }

  /**
   * Trending categories: top-level categories ranked by a velocity-weighted
   * trending score.  Score = this_week * (1 + growth_rate) so categories that
   * are both popular AND accelerating rank highest.
   * Cached 5 min. Uses LATERAL JOINs for provider count, this-week bookings,
   * and last-week bookings to compute growth.
   */
  private async getTrendingCategories(limit = 6) {
    const cached = await this.cacheManager.get<any[]>(HomeService.CACHE_TRENDING_CATS);
    if (cached) return cached;

    const raw: any[] = await this.dataSource.query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.icon,
        COALESCE(pc_stats.provider_count, 0)::int                AS "providerCount",
        COALESCE(bk_this.cnt, 0)::int                            AS "weeklyBookings",
        COALESCE(bk_last.cnt, 0)::int                            AS "lastWeekBookings",
        COALESCE(bk_this.cnt, 0) + COALESCE(bk_last.cnt, 0)     AS "recentBookings",
        CASE
          WHEN COALESCE(bk_last.cnt, 0) = 0 AND COALESCE(bk_this.cnt, 0) > 0 THEN 1.0
          WHEN COALESCE(bk_last.cnt, 0) = 0 THEN 0.0
          ELSE ROUND(((COALESCE(bk_this.cnt, 0) - bk_last.cnt)::numeric / bk_last.cnt), 2)
        END                                                       AS "growthRate",
        -- trending_score = this_week * (1 + growth_rate), minimum 0
        GREATEST(
          COALESCE(bk_this.cnt, 0) * (1.0 +
            CASE
              WHEN COALESCE(bk_last.cnt, 0) = 0 AND COALESCE(bk_this.cnt, 0) > 0 THEN 1.0
              WHEN COALESCE(bk_last.cnt, 0) = 0 THEN 0.0
              ELSE (COALESCE(bk_this.cnt, 0) - bk_last.cnt)::numeric / bk_last.cnt
            END
          ), 0
        )                                                         AS "trendingScore"
      FROM categories c
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT pc.provider_id) AS provider_count
        FROM provider_categories pc
        JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
        WHERE pc.category_id = c.id
           OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
      ) pc_stats ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(b.id) AS cnt
        FROM bookings b
        JOIN provider_categories pc2 ON pc2.provider_id = b.provider_id
        WHERE (pc2.category_id = c.id OR pc2.category_id IN (SELECT cc2.id FROM categories cc2 WHERE cc2.parent_id = c.id))
          AND b.status IN ('completed', 'confirmed', 'in_progress')
          AND b.created_at >= NOW() - INTERVAL '7 days'
      ) bk_this ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(b.id) AS cnt
        FROM bookings b
        JOIN provider_categories pc3 ON pc3.provider_id = b.provider_id
        WHERE (pc3.category_id = c.id OR pc3.category_id IN (SELECT cc3.id FROM categories cc3 WHERE cc3.parent_id = c.id))
          AND b.status IN ('completed', 'confirmed', 'in_progress')
          AND b.created_at >= NOW() - INTERVAL '14 days'
          AND b.created_at <  NOW() - INTERVAL '7 days'
      ) bk_last ON true
      WHERE c.parent_id IS NULL
        AND c.is_active = true
        AND COALESCE(pc_stats.provider_count, 0) > 0
      ORDER BY "trendingScore" DESC, pc_stats.provider_count DESC, c.display_order ASC
      LIMIT $1
    `, [limit]);

    const result = raw.map((r) => {
      const growthRate = parseFloat(r.growthRate) || 0;
      const weeklyBookings = parseInt(r.weeklyBookings, 10) || 0;
      const lastWeekBookings = parseInt(r.lastWeekBookings, 10) || 0;

      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      if (weeklyBookings > 0 && lastWeekBookings === 0) trendDirection = 'up';
      else if (growthRate > 0.05) trendDirection = 'up';
      else if (growthRate < -0.05) trendDirection = 'down';

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon,
        providerCount: parseInt(r.providerCount, 10) || 0,
        recentBookings: parseInt(r.recentBookings, 10) || 0,
        weeklyBookings,
        growthRate,
        trendDirection,
      };
    });

    await this.cacheManager.set(HomeService.CACHE_TRENDING_CATS, result, HomeService.TTL_5MIN);
    return result;
  }

  /**
   * Recent community reviews with reviewer info and provider context. Cached 2 min.
   */
  private async getCommunityReviews(limit = 10) {
    const cached = await this.cacheManager.get<any[]>(HomeService.CACHE_COMMUNITY_REVIEWS);
    if (cached) return cached;

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

    const result = reviews.map((r) => ({
      id: r.id,
      name: r.name,
      providerName: r.providerName,
      text: r.text,
      rating: r.rating,
      timeAgo: r.timeAgo,
    }));

    await this.cacheManager.set(HomeService.CACHE_COMMUNITY_REVIEWS, result, HomeService.TTL_2MIN);
    return result;
  }

  /**
   * Platform-wide stats for the trust banner. Cached 5 min.
   */
  private async getPlatformStats() {
    const cached = await this.cacheManager.get<any>(HomeService.CACHE_PLATFORM_STATS);
    if (cached) return cached;

    const [providerCount, reviewStats, categoryCount] = await Promise.all([
      this.providerRepo.count({
        where: { status: In(['active']) },
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

    const result = {
      verifiedProviders: providerCount,
      totalReviews: parseInt(reviewStats?.totalReviews || '0', 10),
      avgRating: parseFloat(reviewStats?.avgRating || '0'),
      totalCategories: categoryCount,
    };

    await this.cacheManager.set(HomeService.CACHE_PLATFORM_STATS, result, HomeService.TTL_5MIN);
    return result;
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
    const cacheKey = `home:live-activity:${city || 'all'}:${lat ? lat.toFixed(2) : ''}:${lng ? lng.toFixed(2) : ''}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const hasGeo = lat != null && lng != null;

    // Build city condition for raw SQL
    const cityCondition = city ? `AND p.city ILIKE '%' || $1 || '%'` : '';
    const cityParam = city ? [city] : [];
    const paramOffset = cityParam.length;

    const fallback = [{ cnt: 0 }];

    // Run all queries in parallel — each wrapped so one failure doesn't kill all
    const [
      providersInArea,
      completedThisWeek,
      activeDeals,
      reviewsThisWeek,
      avgRatingInArea,
      categoriesServed,
    ] = await Promise.all([
      // 1. Providers in the user's city/area
      this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt
        FROM providers p
        WHERE p.status IN ('active', 'unverified')
          ${cityCondition}
      `, cityParam).catch(() => fallback),

      // 2. Bookings completed this week in user's area
      this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt
        FROM bookings b
        JOIN providers p ON p.id = b.provider_id
        WHERE b.status = 'completed'
          AND b.created_at >= $${paramOffset + 1}
          ${cityCondition}
      `, [...cityParam, weekAgo]).catch(() => fallback),

      // 3. Active deals/offers right now in the area
      this.dataSource.query(`
        SELECT COUNT(DISTINCT po.provider_id)::int AS cnt
        FROM provider_offers po
        JOIN providers p ON p.id = po.provider_id
        WHERE po.is_active = true
          AND po.starts_at <= NOW()
          AND po.ends_at >= NOW()
          AND p.status IN ('active', 'unverified')
          ${cityCondition}
      `, cityParam).catch(() => fallback),

      // 4. Reviews left this week in the area
      this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt
        FROM reviews r
        JOIN providers p ON p.id = r.provider_id
        WHERE r.status = 'active'
          AND r.posted_at >= $${paramOffset + 1}
          ${cityCondition}
      `, [...cityParam, weekAgo]).catch(() => fallback),

      // 5. Average rating of providers in area
      this.dataSource.query(`
        SELECT COALESCE(AVG(rs.avg_rating)::numeric(2,1), 0) AS avg
        FROM provider_rating_stats rs
        JOIN providers p ON p.id = rs.provider_id
        WHERE p.status IN ('active', 'unverified')
          ${cityCondition}
      `, cityParam).catch(() => [{ avg: 0 }]),

      // 6. Unique categories with providers in area
      this.dataSource.query(`
        SELECT COUNT(DISTINCT pc.category_id)::int AS cnt
        FROM provider_categories pc
        JOIN providers p ON p.id = pc.provider_id
        WHERE p.status IN ('active', 'unverified')
          ${cityCondition}
      `, cityParam).catch(() => fallback),
    ]);

    const cityLabel = city ? `in ${city}` : 'near you';

    const result = [
      {
        count: providersInArea[0]?.cnt || 0,
        text: `providers available ${cityLabel}`,
      },
      {
        count: completedThisWeek[0]?.cnt || 0,
        text: `services completed ${cityLabel} this week`,
      },
      {
        count: activeDeals[0]?.cnt || 0,
        text: `businesses with active deals ${cityLabel}`,
      },
      {
        count: reviewsThisWeek[0]?.cnt || 0,
        text: `new reviews ${cityLabel} this week`,
      },
      {
        count: parseFloat(avgRatingInArea[0]?.avg) || 0,
        text: `average rating ${cityLabel}`,
        format: 'rating',
      },
      {
        count: categoriesServed[0]?.cnt || 0,
        text: `service categories available ${cityLabel}`,
      },
    ];

    // Cache for 2 minutes
    await this.cacheManager.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }
}
