import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
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

  // Cache keys & TTLs
  private static readonly CACHE_PLATFORM_STATS = 'explore:platform-stats';
  private static readonly CACHE_TRENDING_CATS = 'explore:trending-categories';
  private static readonly CACHE_BANNERS = 'explore:banners';
  private static readonly CACHE_COMMUNITY_REVIEWS = 'explore:community-reviews';
  private static readonly TTL_5MIN = 5 * 60 * 1000;
  private static readonly TTL_2MIN = 2 * 60 * 1000;

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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly dataSource: DataSource,
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
      communityReviews,
      womenLedProviders,
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
      this.getCommunityReviews(10),
      this.getWomenLedProviders(lat, lng, city, 8),
    ]);

    // Cross-section deduplication: each provider appears in at most one section
    // Priority: sponsored > offers > popularNearby > topRated > categorySpotlight > newArrivals > womenLed
    const seen = new Set<string>();
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

    const dedupedSponsored = dedup(sponsoredCarousel);
    const dedupedOffers = dedup(activeOffers);
    const dedupedPopular = dedup(popularNearby);
    const dedupedTopRated = dedup(topRated);
    const dedupedSpotlight = categorySpotlight
      ? { ...categorySpotlight, providers: dedup(categorySpotlight.providers) }
      : null;
    const dedupedNewArrivals = dedup(newArrivals);
    const dedupedWomenLed = dedup(womenLedProviders);

    // Collect all provider IDs across sections for badge enrichment
    const allProviderIds = new Set<string>();
    const addIds = (list: any[]) => list.forEach((p) => allProviderIds.add(p.id));
    addIds(dedupedSponsored);
    addIds(dedupedOffers);
    addIds(dedupedPopular);
    addIds(dedupedTopRated);
    if (dedupedSpotlight) addIds(dedupedSpotlight.providers);
    addIds(dedupedNewArrivals);
    addIds(dedupedWomenLed);

    const badgeMap = await this.enrichWithBadges([...allProviderIds]);

    const attachBadges = (list: any[]) =>
      list.map((p) => ({ ...p, badges: badgeMap.get(p.id) || [] }));

    return {
      sponsoredCarousel: attachBadges(dedupedSponsored),
      activeOffers: attachBadges(dedupedOffers),
      quickCategories,
      popularNearby: attachBadges(dedupedPopular),
      bannerAds,
      topRated: attachBadges(dedupedTopRated),
      categorySpotlight: dedupedSpotlight
        ? { ...dedupedSpotlight, providers: attachBadges(dedupedSpotlight.providers) }
        : null,
      newArrivals: attachBadges(dedupedNewArrivals),
      communityReviews,
      womenLedProviders: attachBadges(dedupedWomenLed),
      platformStats,
    };
  }

  // ─── Sponsored Carousel ──────────────────────────────────────

  private async getSponsoredCarousel(lat?: number, lng?: number, city?: string) {
    const now = new Date();
    const limit = 12;

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

    // Enforce city targeting on the listing (not the provider's city text field)
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
        .addOrderBy(haversine, 'ASC')
        .addOrderBy('RANDOM()');
    } else {
      qb.orderBy('sl.cost_per_click', 'DESC')
        .addOrderBy('RANDOM()');
    }

    qb.limit(limit * 2);

    const raw = await qb.getRawMany();

    // Deduplicate by provider (one sponsor slot per business)
    const seenProviders = new Set<string>();
    const deduplicated: typeof raw = [];
    for (const r of raw) {
      if (seenProviders.has(r.id)) continue;
      seenProviders.add(r.id);
      deduplicated.push(r);
    }

    const results = deduplicated.slice(0, limit);

    // Fire-and-forget: increment impressions + deduct cost_per_impression (budget-guarded)
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
        .andWhere('is_active = true')
        .andWhere('spent_amount + cost_per_impression <= budget_amount')
        .andWhere('ends_at > NOW()')
        .execute()
        .catch(() => {}); // non-blocking
    }

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      description: r.description,
      location: [r.area, r.city].filter(Boolean).map((s: string) => s.replace(/[\r\n]+/g, '').trim()).join(', '),
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
        .andWhere('p.longitude IS NOT NULL');
    }

    // Always filter by city when available
    if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
    }

    qb.orderBy(hasLocation ? 'distance' : 'o.discount_value', hasLocation ? 'ASC' : 'DESC');

    qb.limit(8);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
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

    // Minimum rating filter — use the already-JOINed review stats alias
    if (dto.minRating != null && dto.minRating > 0) {
      qb.andWhere('COALESCE(rs.avg_rating, 0) >= :minRating', { minRating: dto.minRating });
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
    this.withCategoryServices(qb);

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
      location: [r.area, r.city].filter(Boolean).map((s: string) => s.replace(/[\r\n]+/g, '').trim()).join(', '),
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
      offerStartsAt: r.offerStartsAt,
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
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
      qb.addSelect("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'status_rank');
      qb.orderBy('status_rank', 'ASC')
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
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
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
    // Reuse cached trending categories instead of running a duplicate heavy query
    const allCategories = await this.getTrendingCategories(20);
    if (allCategories.length === 0) return null;

    // Pick a random category
    const cat = allCategories[Math.floor(Math.random() * allCategories.length)];

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

    qb.limit(4);

    const raw = await qb.getRawMany();

    if (raw.length === 0) return null;

    return {
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        iconColor: cat.iconColor || null,
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
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
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

  /**
   * Trending categories — cached 5 min, ranked by velocity-weighted trending
   * score (this_week bookings * (1 + growth_rate)).
   */
  private async getTrendingCategories(limit = 8) {
    const cached = await this.cacheManager.get<any[]>(ExploreService.CACHE_TRENDING_CATS);
    if (cached) return cached;

    const raw: any[] = await this.dataSource.query(`
      SELECT
        c.id, c.name, c.slug, c.icon, c.icon_color AS "iconColor",
        COALESCE(pc_stats.provider_count, 0)::int                AS "providerCount",
        COALESCE(bk_this.cnt, 0)::int                            AS "weeklyBookings",
        COALESCE(bk_last.cnt, 0)::int                            AS "lastWeekBookings",
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

    const result = raw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      icon: r.icon,
      iconColor: r.iconColor || null,
      providerCount: parseInt(r.providerCount, 10) || 0,
    }));

    await this.cacheManager.set(ExploreService.CACHE_TRENDING_CATS, result, ExploreService.TTL_5MIN);
    return result;
  }

  // ─── Interstitial Banner ─────────────────────────────────────

  /**
   * Interstitial banners — cached 2 min.
   */
  private async getInterstitialBanner() {
    const cached = await this.cacheManager.get<any[]>(ExploreService.CACHE_BANNERS);
    if (cached) return cached;

    const now = new Date();
    const banners = await this.bannerRepo
      .createQueryBuilder('b')
      .where('b.isActive = :active', { active: true })
      .andWhere('(b.startsAt IS NULL OR b.startsAt <= :now)', { now })
      .andWhere('(b.endsAt IS NULL OR b.endsAt >= :now)', { now })
      .orderBy('b.displayOrder', 'ASC')
      .getMany();

    await this.cacheManager.set(ExploreService.CACHE_BANNERS, banners, ExploreService.TTL_2MIN);
    return banners;
  }

  // ─── Platform Stats ──────────────────────────────────────────

  /**
   * Platform stats — cached 5 min.
   */
  private async getPlatformStats() {
    const cached = await this.cacheManager.get<any>(ExploreService.CACHE_PLATFORM_STATS);
    if (cached) return cached;

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

    const result = {
      verifiedProviders: providerCount,
      totalReviews: parseInt(reviewStats?.totalReviews || '0', 10),
      avgRating: parseFloat(reviewStats?.avgRating || '0'),
      totalBookings: bookingCount,
    };

    await this.cacheManager.set(ExploreService.CACHE_PLATFORM_STATS, result, ExploreService.TTL_5MIN);
    return result;
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
      if (providers.length === 0) return;
      const providerIds = providers.map((p) => p.id);
      // Batch-fetch existing badges for all providers at once
      const existing = await this.badgeRepo.find({
        where: { providerId: In(providerIds), type: type as any, isActive: true },
        select: ['providerId'],
      });
      const existingIds = new Set(existing.map((b) => b.providerId));
      // Only create badges for providers that don't already have one
      const newBadges = providerIds
        .filter((id) => !existingIds.has(id))
        .map((id) =>
          this.badgeRepo.create({
            providerId: id,
            type: type as any,
            source: 'earned',
            isActive: true,
          }),
        );
      if (newBadges.length > 0) {
        await this.badgeRepo.save(newBadges);
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

  // ─── Community Reviews ────────────────────────────────────────

  private async getCommunityReviews(limit = 10) {
    const cached = await this.cacheManager.get<any[]>(ExploreService.CACHE_COMMUNITY_REVIEWS);
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

    await this.cacheManager.set(ExploreService.CACHE_COMMUNITY_REVIEWS, result, ExploreService.TTL_2MIN);
    return result;
  }

  // ─── Women-Led Providers ─────────────────────────────────────

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
        'p.is_women_led AS "isWomenLed"',
      ])
      .where("p.status IN ('active', 'unverified')")
      .andWhere("p.women_led_status = 'approved'");

    this.withReviewStats(qb);
    this.withCategoryServices(qb);

    if (hasLocation) {
      this.withGeo(qb, lat!, lng!, 50);
      if (city) {
        qb.andWhere('p.city ILIKE :city', { city: `%${city}%` });
      }
      qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('distance', 'ASC');
    } else if (city) {
      qb.andWhere('p.city ILIKE :city', { city: `%${city}%` })
        .orderBy('COALESCE(rs.avg_rating, 0)', 'DESC');
    } else {
      qb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC');
    }

    qb.limit(limit);

    let raw = await qb.getRawMany();

    // Fallback: if city has no women-led providers, relax to geo-only
    if (raw.length === 0 && city && hasLocation) {
      const fallbackQb = this.providerRepo
        .createQueryBuilder('p')
        .select(['p.id AS id', 'p.brand_name AS name', 'p.profile_photo_url AS image', 'p.banner_image_url AS "bannerImage"', 'p.description AS description', 'p.city AS city', 'p.area AS area', 'p.status AS status', 'p.is_featured AS "isFeatured"', 'p.is_women_led AS "isWomenLed"'])
        .where("p.status IN ('active', 'unverified')")
        .andWhere("p.women_led_status = 'approved'");
      this.withReviewStats(fallbackQb);
      this.withCategoryServices(fallbackQb);
      this.withGeo(fallbackQb, lat!, lng!, 100);
      fallbackQb.orderBy('COALESCE(rs.avg_rating, 0)', 'DESC')
        .addOrderBy('distance', 'ASC')
        .limit(limit);
      raw = await fallbackQb.getRawMany();
    }

    return this.mapProviders(raw).map((p) => ({ ...p, isWomenLed: true }));
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private mapProviders(raw: any[]) {
    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.bannerImage || r.image,
      description: r.description || null,
      location: [r.area, r.city].filter(Boolean).map((s: string) => s.replace(/[\r\n]+/g, '').trim()).join(', '),
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
