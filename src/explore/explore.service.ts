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
      .addSelect(
        `COALESCE((SELECT AVG(r.star_rating)::numeric(2,1) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'rating',
      )
      .addSelect(
        `COALESCE((SELECT COUNT(r.id)::int FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'reviewCount',
      )
      .addSelect(
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id)`,
        'services',
      )
      .where('sl.is_active = :active', { active: true })
      .andWhere('sl.starts_at <= :now', { now })
      .andWhere('sl.ends_at >= :now', { now })
      .andWhere('sl.spent_amount < sl.budget_amount')
      .andWhere("p.status IN ('active', 'unverified')");

    // Location targeting
    if (city) {
      qb.andWhere(
        '(sl.target_cities IS NULL OR :city = ANY(sl.target_cities))',
        { city },
      );
    }

    if (lat != null && lng != null) {
      const haversine = `6371 * acos(LEAST(1.0, cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(p.latitude))))`;
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
      ? `6371 * acos(LEAST(1.0, cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(p.latitude))))`
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
      .addSelect(
        `COALESCE((SELECT AVG(r.star_rating)::numeric(2,1) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'rating',
      )
      .addSelect(
        `COALESCE((SELECT COUNT(r.id)::int FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0)`,
        'reviewCount',
      )
      .where('o.is_active = :active', { active: true })
      .andWhere('o.starts_at <= :now', { now })
      .andWhere('o.ends_at >= :now', { now })
      .andWhere('(o.usage_limit IS NULL OR o.usage_count < o.usage_limit)')
      .andWhere("p.status IN ('active', 'unverified')");

    if (hasLocation) {
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

  // ─── Popular Nearby ──────────────────────────────────────────

  private async getPopularNearby(lat?: number, lng?: number, city?: string, limit = 6) {
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
        'p.is_women_led AS "isWomenLed"',
        'p.is_featured AS "isFeatured"',
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
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id)`,
        'services',
      )
      .where("p.status IN ('active', 'unverified')");

    if (hasLocation) {
      qb.addSelect(haversine, 'distance')
        .andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .andWhere(`${haversine} <= 25`)
        .orderBy("CASE WHEN p.status = 'active' THEN 0 ELSE 1 END", 'ASC')
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
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
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
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id)`,
        'services',
      )
      .where("p.status IN ('active', 'unverified')")
      .andWhere(
        `(SELECT AVG(r2.star_rating) FROM reviews r2 WHERE r2.provider_id = p.id AND r2.status = 'active') >= 4.0`,
      )
      .andWhere(
        `(SELECT COUNT(r3.id) FROM reviews r3 WHERE r3.provider_id = p.id AND r3.status = 'active') >= 1`,
      );

    if (hasLocation) {
      qb.addSelect(haversine, 'distance')
        .andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .orderBy('rating', 'DESC')
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
    // Pick a random trending category
    const categories = await this.categoryRepo
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.name AS name', 'c.slug AS slug', 'c.icon AS icon'])
      .where('c.parentId IS NULL')
      .andWhere('c.isActive = :active', { active: true })
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
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
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
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id)`,
        'services',
      )
      .innerJoin(
        'provider_categories',
        'pc',
        'pc.provider_id = p.id AND pc.category_id IN (:...categoryIds)',
        { categoryIds },
      )
      .where("p.status IN ('active', 'unverified')")
      .groupBy('p.id');

    if (hasLocation) {
      qb.addSelect(haversine, 'distance')
        .andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .orderBy('distance', 'ASC');
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
        'p.city AS city',
        'p.area AS area',
        'p.status AS status',
        'p.is_women_led AS "isWomenLed"',
        'p.created_at AS "createdAt"',
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
        `(SELECT string_agg(DISTINCT c.name, ', ' ORDER BY c.name) FROM categories c JOIN provider_categories pc ON pc.category_id = c.id WHERE pc.provider_id = p.id)`,
        'services',
      )
      .where("p.status IN ('active', 'unverified')")
      .andWhere('p.created_at >= :since', { since: thirtyDaysAgo });

    if (hasLocation) {
      qb.addSelect(haversine, 'distance')
        .andWhere('p.latitude IS NOT NULL')
        .andWhere('p.longitude IS NOT NULL')
        .orderBy('p.created_at', 'DESC')
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
