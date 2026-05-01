import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import {
  Provider,
  Category,
  Review,
  PromoBanner,
  Booking,
  Photo,
  SponsoredListing,
  ProviderBadge,
  ProviderOffer,
  AdEvent,
} from '../entities';
import { ExploreFeedDto } from './dto/explore-feed.dto';
import { TrackAdEventDto } from './dto/track-ad-event.dto';

@Injectable()
export class ExploreService {
  private readonly logger = new Logger(ExploreService.name);

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(PromoBanner) private bannerRepo: Repository<PromoBanner>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Photo) private photoRepo: Repository<Photo>,
    @InjectRepository(SponsoredListing) private sponsoredRepo: Repository<SponsoredListing>,
    @InjectRepository(ProviderBadge) private badgeRepo: Repository<ProviderBadge>,
    @InjectRepository(ProviderOffer) private offerRepo: Repository<ProviderOffer>,
    @InjectRepository(AdEvent) private adEventRepo: Repository<AdEvent>,
  ) {}

  // ─── Performance Helpers ─────────────────────────────────────

  /** Parameterized haversine — use with qb.setParameter('lat', lat).setParameter('lng', lng) */
  private static readonly HAVERSINE =
    `6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(p.latitude))))`;

  /** Pre-aggregated review stats JOIN — eliminates N correlated subqueries per request */
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

  /** Pre-aggregated category names JOIN */
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

  /** Adds distance column + bounding-box pre-filter for geo queries */
  private withGeo(qb: any, lat: number, lng: number, maxKm?: number): void {
    qb.setParameter('lat', lat)
      .setParameter('lng', lng)
      .addSelect(ExploreService.HAVERSINE, 'distance')
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
   * Single aggregated explore feed — returns all sections in one call.
   */
  async getFeed(dto: ExploreFeedDto, userId?: string) {
    const { lat, lng, city } = dto;

    const [
      sponsoredCarousel,
      activeOffers,
      quickCategories,
      popularNearby,
      bannerAds,
      topRated,
      categorySpotlight,
      newArrivals,
      platformStats,
    ] = await Promise.all([
      this.getSponsoredCarousel(lat, lng, city),
      this.getActiveOffers(lat, lng, city),
      this.getTrendingCategories(8),
      this.getPopularNearby(lat, lng, city, 6),
      this.getInterstitialBanner(),
      this.getTopRated(lat, lng, city, 8),
      this.getCategorySpotlight(lat, lng, city),
      this.getNewArrivals(lat, lng, city, 6),
      this.getPlatformStats(),
    ]);

    // Collect all provider IDs across sections for badge enrichment
    const allProviderIds = new Set<string>();
    const addIds = (list: any[]) => list.forEach((p) => allProviderIds.add(p.id));
    addIds(sponsoredCarousel);
    addIds(activeOffers);
    addIds(popularNearby);
    addIds(topRated);
    if (categorySpotlight) addIds(categorySpotlight.providers);
    addIds(newArrivals);

    const badgeMap = await this.enrichWithBadges([...allProviderIds]);

    const attachBadges = (list: any[]) =>
      list.map((p) => ({ ...p, badges: badgeMap.get(p.id) || [] }));

    return {
      sponsoredCarousel: attachBadges(sponsoredCarousel),
      activeOffers: attachBadges(activeOffers),
      quickCategories,
      popularNearby: attachBadges(popularNearby),
      bannerAds,
      topRated: attachBadges(topRated),
      categorySpotlight: categorySpotlight
        ? { ...categorySpotlight, providers: attachBadges(categorySpotlight.providers) }
        : null,
      newArrivals: attachBadges(newArrivals),
      platformStats,
    };
  }

  // ─── Sponsored Carousel ──────────────────────────────────────

  private async getSponsoredCarousel(lat?: number, lng?: number, city?: string) {
    const now = new Date();

    const qb = this.sponsoredRepo
      .createQueryBuilder('sl')
      .innerJoin('providers', 'p', 'p.id = sl.provider_id')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.description AS description',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
        'sl.id AS "sponsoredListingId"',
        'sl.cost_per_click AS "costPerClick"',
      ])
      .where('sl.is_active = :active', { active: true })
      .andWhere('sl.starts_at <= :now', { now })
      .andWhere('sl.ends_at >= :now', { now })
      .andWhere('sl.spent_amount < sl.budget_amount')
      .andWhere("sl.approval_status = 'approved'")
      .andWhere("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    // Location targeting
    if (city) {
      qb.andWhere(
        '(sl.target_cities IS NULL OR :city = ANY(sl.target_cities))',
        { city },
      );
    }

    if (lat != null && lng != null) {
      const haversine = ExploreService.HAVERSINE;
      qb.setParameter('lat', lat).setParameter('lng', lng);
      qb.addSelect(haversine, 'distance');
      qb.andWhere(
        `(sl.target_radius IS NULL OR ${haversine} <= sl.target_radius)`,
      );
      qb.orderBy('sl.cost_per_click', 'DESC')
        .addOrderBy('RANDOM()');
    } else {
      qb.orderBy('sl.cost_per_click', 'DESC')
        .addOrderBy('RANDOM()');
    }

    qb.limit(5);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      description: r.description,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      verified: r.status === 'active',
      isWomenLed: r.isWomenLed || false,
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
      sponsoredListingId: r.sponsoredListingId,
      isSponsored: true,
    }));
  }

  // ─── Active Offers ───────────────────────────────────────────

  private async getActiveOffers(lat?: number, lng?: number, city?: string) {
    const now = new Date();
    const hasLocation = lat != null && lng != null;

    const haversine = hasLocation
      ? ExploreService.HAVERSINE
      : 'NULL';

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
      .where('o.is_active = :active', { active: true })
      .andWhere('o.starts_at <= :now', { now })
      .andWhere('o.ends_at >= :now', { now })
      .andWhere('(o.usage_limit IS NULL OR o.usage_count < o.usage_limit)')
      .andWhere("o.approval_status = 'approved'")
      .andWhere("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);;

    if (hasLocation) {
      qb.setParameter('lat', lat).setParameter('lng', lng);
      qb.addSelect(haversine, 'distance');
      qb.andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .orderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('o.discount_value', 'DESC');
    } else {
      qb.orderBy('o.discount_value', 'DESC');
    }

    qb.limit(8);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      location: [r.area, r.city].filter(Boolean).join(', '),
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
    }));
  }

  // ─── Paginated Deals ────────────────────────────────────────

  async getDeals(dto: {
    lat?: number;
    lng?: number;
    radius?: number;
    city?: string;
    category?: string;
    discountType?: 'percentage' | 'flat';
    minDiscount?: number;
    verified?: boolean;
    minRating?: number;
    endingSoon?: boolean;
    womenLed?: boolean;
    page?: number;
    limit?: number;
    sort?: 'discount' | 'ending_soon' | 'distance' | 'newest';
  }) {
    const now = new Date();
    const hasLocation = dto.lat != null && dto.lng != null;
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 50);
    const offset = (page - 1) * limit;
    const radius = dto.radius ?? 25;
    const showAllAreas = radius === 0 || radius >= 200;

    const haversine = hasLocation
      ? ExploreService.HAVERSINE
      : 'NULL';

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
        'p.is_women_led AS "isWomenLed"',
        'o.id AS "offerId"',
        'o.title AS "offerTitle"',
        'o.discount_type AS "discountType"',
        'o.discount_value AS "discountValue"',
        'o.ends_at AS "offerEndsAt"',
        'o.starts_at AS "offerStartsAt"',
        'o.created_at AS "createdAt"',
      ])
      // Count total active offers per provider (for "X offers" badge)
      .addSelect(
        `(SELECT COUNT(*)::int FROM provider_offers po2
          WHERE po2.provider_id = p.id
            AND po2.is_active = true
            AND po2.starts_at <= NOW()
            AND po2.ends_at >= NOW()
            AND po2.approval_status = 'approved')`,
        'providerDealCount',
      )
      .where('o.is_active = :active', { active: true })
      .andWhere('o.starts_at <= :now', { now })
      .andWhere('o.ends_at >= :now', { now })
      .andWhere('(o.usage_limit IS NULL OR o.usage_count < o.usage_limit)')
      .andWhere("o.approval_status = 'approved'")
      .andWhere("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);

    // Location filtering — only apply radius if NOT "all areas"
    if (hasLocation) {
      qb.setParameter('lat', dto.lat).setParameter('lng', dto.lng);
      qb.addSelect(haversine, 'distance');
      qb.andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL');
      if (!showAllAreas) {
        const dLat = radius / 111.32;
        const dLng = radius / (111.32 * Math.cos((dto.lat! * Math.PI) / 180));
        qb.andWhere('p.latitude BETWEEN :minLat AND :maxLat', { minLat: dto.lat! - dLat, maxLat: dto.lat! + dLat })
          .andWhere('p.longitude BETWEEN :minLng AND :maxLng', { minLng: dto.lng! - dLng, maxLng: dto.lng! + dLng });
      }
    } else if (dto.city && !showAllAreas) {
      qb.andWhere('p.city ILIKE :city', { city: `%${dto.city}%` });
    }

    // Category filter
    if (dto.category) {
      qb.andWhere(
        `p.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id = :catId)`,
        { catId: dto.category },
      );
    }

    // Discount type filter
    if (dto.discountType) {
      qb.andWhere('o.discount_type = :discountType', { discountType: dto.discountType });
    }

    // Minimum discount filter
    if (dto.minDiscount != null && dto.minDiscount > 0) {
      qb.andWhere('o.discount_value >= :minDiscount', { minDiscount: dto.minDiscount });
    }

    // Verified only filter
    if (dto.verified) {
      qb.andWhere("p.status = 'active'");
    }

    // Minimum rating filter
    if (dto.minRating != null && dto.minRating > 0) {
      qb.andWhere(
        `(SELECT COALESCE(AVG(rv.star_rating), 0) FROM reviews rv WHERE rv.provider_id = p.id AND rv.status = 'active') >= :minRating`,
        { minRating: dto.minRating },
      );
    }

    // Ending soon filter (within 7 days)
    if (dto.endingSoon) {
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      qb.andWhere('o.ends_at <= :sevenDays', { sevenDays });
    }

    // Women-led businesses only
    if (dto.womenLed) {
      qb.andWhere('p.is_women_led = true');
    }

    // Add category services for display
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

    // Sorting
    switch (dto.sort) {
      case 'ending_soon':
        qb.orderBy('o.ends_at', 'ASC');
        break;
      case 'distance':
        if (hasLocation) {
          qb.orderBy('distance', 'ASC');
        } else {
          qb.orderBy('o.discount_value', 'DESC');
        }
        break;
      case 'newest':
        qb.orderBy('o.created_at', 'DESC');
        break;
      case 'discount':
      default:
        qb.orderBy('o.discount_value', 'DESC');
        break;
    }

    // Get total count
    const totalQb = qb.clone();
    const total = await totalQb.getCount();

    // Apply pagination
    qb.offset(offset).limit(limit);

    const raw = await qb.getRawMany();

    const data = raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      verified: r.status === 'active',
      isWomenLed: r.isWomenLed || false,
      services: r.services || null,
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
      offerId: r.offerId,
      offerTitle: r.offerTitle,
      discountType: r.discountType,
      discountValue: parseFloat(r.discountValue),
      offerEndsAt: r.offerEndsAt,
      hasActiveOffer: true,
      providerDealCount: parseInt(r.providerDealCount, 10) || 1,
    }));

    return {
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    };
  }

  // ─── Popular Nearby ──────────────────────────────────────────

  private async getPopularNearby(lat?: number, lng?: number, city?: string, limit = 6) {
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
        'p.is_women_led AS "isWomenLed"',
        'p.is_featured AS "isFeatured"',
      ])
      .where("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!, 25);
      qb.orderBy("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.is_featured', 'DESC')
        .addOrderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();
    return this.mapProviders(raw);
  }

  // ─── Top Rated ───────────────────────────────────────────────

  private async getTopRated(lat?: number, lng?: number, city?: string, limit = 8) {
    const hasLocation = lat != null && lng != null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
      ])
      .where("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    // Filter using JOINed review stats instead of correlated subqueries
    qb.andWhere('COALESCE(rs.avg_rating, 0) >= 4.0')
      .andWhere('COALESCE(rs.review_count, 0) >= 1');

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
      qb.orderBy('rating', 'DESC')
        .addOrderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('rating', 'DESC');
    } else {
      qb.orderBy('rating', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();
    return this.mapProviders(raw);
  }

  // ─── Category Spotlight ──────────────────────────────────────

  private async getCategorySpotlight(lat?: number, lng?: number, city?: string) {
    // Pick a random category that has at least 1 active provider
    const categories = await this.categoryRepo
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.name AS name', 'c.slug AS slug', 'c.icon AS icon'])
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
      .orderBy('RANDOM()')
      .limit(1)
      .getRawMany();

    if (categories.length === 0) return null;

    const cat = categories[0];

    const subcategories = await this.categoryRepo.find({
      where: { parentId: cat.id, isActive: true },
      select: ['id'],
    });
    const categoryIds = [cat.id, ...subcategories.map((c) => c.id)];

    const hasLocation = lat != null && lng != null;

    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.brand_name AS name',
        'p.profile_photo_url AS image',
        'p.banner_image_url AS "bannerImage"',
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
      ])
      .where(
        "EXISTS (SELECT 1 FROM provider_categories pc_f WHERE pc_f.provider_id = p.id AND pc_f.category_id IN (:...categoryIds))",
        { categoryIds },
      )
      .andWhere("p.status IN ('active', 'unverified')");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
      qb.orderBy('distance', 'ASC');
    } else {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.limit(4);

    const raw = await qb.getRawMany();

    return {
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
      },
      providers: this.mapProviders(raw),
    };
  }

  // ─── New Arrivals ────────────────────────────────────────────

  private async getNewArrivals(lat?: number, lng?: number, city?: string, limit = 6) {
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
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
        'p.created_at AS "createdAt"',
      ])
      .where("p.status IN ('active', 'unverified')")
      .andWhere('p.created_at >= :since', { since: thirtyDaysAgo });

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!);
      qb.orderBy('p.created_at', 'DESC')
        .addOrderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('p.created_at', 'DESC');
    } else {
      qb.orderBy('p.created_at', 'DESC');
    }

    qb.limit(limit);

    const raw = await qb.getRawMany();
    return this.mapProviders(raw);
  }

  // ─── Trending Categories ─────────────────────────────────────

  private async getTrendingCategories(limit = 8) {
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
      .orderBy('"providerCount"', 'DESC')
      .addOrderBy('c.displayOrder', 'ASC')
      .limit(limit)
      .getRawMany();

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      icon: r.icon,
      providerCount: parseInt(r.providerCount, 10) || 0,
    }));
  }

  // ─── Interstitial Banner ─────────────────────────────────────

  private async getInterstitialBanner() {
    const now = new Date();
    const banners = await this.bannerRepo
      .createQueryBuilder('b')
      .where('b.isActive = :active', { active: true })
      .andWhere('(b.startsAt IS NULL OR b.startsAt <= :now)', { now })
      .andWhere('(b.endsAt IS NULL OR b.endsAt >= :now)', { now })
      .orderBy('b.displayOrder', 'ASC')
      .getMany();

    return banners;
  }

  // ─── Platform Stats ──────────────────────────────────────────

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

  // ─── Badge Enrichment ────────────────────────────────────────

  private async enrichWithBadges(providerIds: string[]): Promise<Map<string, any[]>> {
    const map = new Map<string, any[]>();
    if (providerIds.length === 0) return map;

    const now = new Date();
    const badges = await this.badgeRepo
      .createQueryBuilder('b')
      .select(['b.provider_id AS "providerId"', 'b.type AS type', 'b.source AS source'])
      .where('b.provider_id IN (:...providerIds)', { providerIds })
      .andWhere('b.is_active = :active', { active: true })
      .andWhere('(b.expires_at IS NULL OR b.expires_at > :now)', { now })
      .getRawMany();

    for (const badge of badges) {
      const list = map.get(badge.providerId) || [];
      list.push({ type: badge.type, source: badge.source });
      map.set(badge.providerId, list);
    }

    return map;
  }

  // ─── Active Offer Check (for non-offer sections) ────────────

  async getActiveOfferMap(providerIds: string[]): Promise<Map<string, { title: string; discountType: string; discountValue: number }>> {
    const map = new Map();
    if (providerIds.length === 0) return map;

    const now = new Date();
    const offers = await this.offerRepo
      .createQueryBuilder('o')
      .select([
        'o.provider_id AS "providerId"',
        'o.title AS title',
        'o.discount_type AS "discountType"',
        'o.discount_value AS "discountValue"',
      ])
      .where('o.provider_id IN (:...providerIds)', { providerIds })
      .andWhere('o.is_active = :active', { active: true })
      .andWhere('o.starts_at <= :now', { now })
      .andWhere('o.ends_at >= :now', { now })
      .andWhere('(o.usage_limit IS NULL OR o.usage_count < o.usage_limit)')
      .andWhere("o.approval_status = 'approved'")
      .orderBy('o.discount_value', 'DESC')
      .getRawMany();

    for (const offer of offers) {
      if (!map.has(offer.providerId)) {
        map.set(offer.providerId, {
          title: offer.title,
          discountType: offer.discountType,
          discountValue: parseFloat(offer.discountValue),
        });
      }
    }

    return map;
  }

  // ─── Ad Event Tracking ───────────────────────────────────────

  async trackEvent(dto: TrackAdEventDto, userId?: string) {
    // Insert event
    const event = this.adEventRepo.create({
      eventType: dto.eventType,
      entityType: dto.entityType,
      entityId: dto.entityId,
      userId: userId || null,
      metadata: dto.position ? { position: dto.position } : null,
    });

    await this.adEventRepo.save(event);

    // If click on sponsored listing, increment clicks + spend
    if (dto.eventType === 'click' && dto.entityType === 'sponsored_listing') {
      await this.sponsoredRepo
        .createQueryBuilder()
        .update(SponsoredListing)
        .set({
          clicks: () => 'clicks + 1',
          spentAmount: () => 'spent_amount + cost_per_click',
        })
        .where('id = :id', { id: dto.entityId })
        .execute();
    }

    // If impression on sponsored listing, increment impressions
    if (dto.eventType === 'impression' && dto.entityType === 'sponsored_listing') {
      await this.sponsoredRepo
        .createQueryBuilder()
        .update(SponsoredListing)
        .set({ impressions: () => 'impressions + 1' })
        .where('id = :id', { id: dto.entityId })
        .execute();
    }
  }

  // ─── Badge Auto-Award ────────────────────────────────────────

  async awardEarnedBadges() {
    const now = new Date();

    // Top Rated: avg rating >= 4.5 with >= 10 reviews
    const topRated = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where("p.status IN ('active', 'unverified')")
      .andWhere(
        `(SELECT AVG(r.star_rating) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active') >= 4.5`,
      )
      .andWhere(
        `(SELECT COUNT(r.id) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active') >= 10`,
      )
      .getRawMany();

    // Rising Star: created < 60 days, rating >= 4.0, >= 3 reviews
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const risingStar = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where("p.status IN ('active', 'unverified')")
      .andWhere('p.created_at >= :since', { since: sixtyDaysAgo })
      .andWhere(
        `(SELECT AVG(r.star_rating) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active') >= 4.0`,
      )
      .andWhere(
        `(SELECT COUNT(r.id) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active') >= 3`,
      )
      .getRawMany();

    // Trusted: >= 50 completed bookings
    const trusted = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where("p.status IN ('active', 'unverified')")
      .andWhere(
        `(SELECT COUNT(b.id) FROM bookings b WHERE b.provider_id = p.id AND b.status = 'completed') >= 50`,
      )
      .getRawMany();

    const upsert = async (providers: { id: string }[], type: string) => {
      for (const { id } of providers) {
        const exists = await this.badgeRepo.findOne({
          where: { providerId: id, type: type as any, isActive: true },
        });
        if (!exists) {
          await this.badgeRepo.save(
            this.badgeRepo.create({
              providerId: id,
              type: type as any,
              source: 'earned',
              isActive: true,
            }),
          );
        }
      }
    };

    await upsert(topRated, 'top_rated');
    await upsert(risingStar, 'rising_star');
    await upsert(trusted, 'trusted');

    return {
      awarded: {
        top_rated: topRated.length,
        rising_star: risingStar.length,
        trusted: trusted.length,
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private mapProviders(raw: any[]) {
    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      description: r.description || null,
      location: [r.area, r.city].filter(Boolean).join(', '),
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.reviewCount, 10) || 0,
      services: r.services || null,
      verified: r.status === 'active',
      isWomenLed: r.isWomenLed || false,
      isFeatured: r.isFeatured || false,
      distance: r.distance ? parseFloat(parseFloat(r.distance).toFixed(1)) : null,
    }));
  }
}
