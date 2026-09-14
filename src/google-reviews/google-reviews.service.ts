import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Provider, Review } from '../entities';
import {
  GooglePlaceCandidate,
  GoogleReviewResponse,
  CombinedReviewsResponse,
} from './dto';

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);
  private readonly apiKey: string | undefined;
  private readonly CACHE_TTL_DAYS = 7; // On-demand cache: refresh if older than 7 days

  // Cache TTLs for Google API responses
  private static readonly REVIEWS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  private static readonly AGGREGATES_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    private config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
  }

  private ensureApiKey() {
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      throw new BadRequestException(
        'Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY in .env',
      );
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Verify that the actor owns this provider (or skip for admin usage).
   */
  private assertOwnership(provider: Provider, actorUserId: string | null): void {
    if (actorUserId && provider.userId !== actorUserId) {
      throw new ForbiddenException('You can only manage your own Google Business link');
    }
  }

  /**
   * Find Google Place candidates by phone number for verification.
   * Returns up to 5 matching businesses so admin/provider can confirm the right one.
   */
  async findPlaceCandidates(providerId: string, phoneOverride?: string, actorUserId?: string): Promise<GooglePlaceCandidate[]> {
    this.ensureApiKey();

    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (actorUserId) this.assertOwnership(provider, actorUserId);

    const phone = phoneOverride || provider.contactNumber;
    if (!phone) throw new BadRequestException('No phone number available for this provider');

    // Normalize phone to E.164 for India (add +91 if not present)
    const normalizedPhone = this.normalizePhoneForSearch(phone);

    // Call Google Find Place from Text (using phone number)
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(normalizedPhone)}&inputtype=phonenumber&fields=place_id,name,formatted_address,rating,user_ratings_total,formatted_phone_number&key=${this.apiKey}`;

    const res = await this.fetchWithTimeout(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.candidates?.length) {
      return [];
    }

    return data.candidates.slice(0, 5).map((c: any) => ({
      placeId: c.place_id,
      name: c.name,
      address: c.formatted_address || '',
      rating: c.rating ?? null,
      userRatingsTotal: c.user_ratings_total ?? null,
      phoneNumber: c.formatted_phone_number ?? null,
    }));
  }

  /**
   * Confirm and link a Google Place to a provider.
   * Fetches initial rating/count and computes trust level.
   */
  async confirmGooglePlace(providerId: string, placeId: string, actorUserId?: string): Promise<Provider> {
    this.ensureApiKey();

    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (actorUserId) this.assertOwnership(provider, actorUserId);

    // Fetch Place Details to get rating + review count
    const details = await this.fetchPlaceAggregates(placeId);

    provider.googlePlaceId = placeId;
    provider.googleRating = details.rating;
    provider.googleReviewCount = details.userRatingsTotal;
    provider.googleVerifiedAt = new Date();
    provider.googleLastFetchedAt = new Date();

    // Compute combined rating
    await this.recomputeCombinedRating(provider);

    return this.providerRepo.save(provider);
  }

  /**
   * Unlink Google Place from a provider.
   * Recomputes combined rating from app-only reviews.
   */
  async unlinkGooglePlace(providerId: string, actorUserId?: string): Promise<Provider> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (actorUserId) this.assertOwnership(provider, actorUserId);

    provider.googlePlaceId = null;
    provider.googleRating = null;
    provider.googleReviewCount = null;
    provider.googleVerifiedAt = null;
    provider.googleLastFetchedAt = null;

    // Recompute from app-only reviews (google fields are now null)
    await this.recomputeCombinedRating(provider);

    return this.providerRepo.save(provider);
  }

  /**
   * Fetch Google reviews on-demand for a provider.
   * Refreshes cached aggregates if stale (>7 days).
   * Reviews are cached for 6 hours to reduce API calls.
   */
  async getGoogleReviews(providerId: string): Promise<GoogleReviewResponse[]> {
    this.ensureApiKey();

    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.googlePlaceId) return [];

    // Check in-memory cache for reviews
    const cacheKey = `google-reviews:${provider.googlePlaceId}`;
    const cached = await this.cacheManager.get<GoogleReviewResponse[]>(cacheKey);
    if (cached) return cached;

    // Check if aggregates need refresh (stale cache)
    if (this.isCacheStale(provider.googleLastFetchedAt)) {
      this.refreshAggregatesInBackground(provider).catch((err) =>
        this.logger.warn(`Failed to refresh Google aggregates for ${providerId}: ${err.message}`),
      );
    }

    // Fetch live reviews from Place Details — only request 'reviews' field (cheapest tier)
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${provider.googlePlaceId}&fields=reviews&key=${this.apiKey}`;
    const res = await this.fetchWithTimeout(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.result?.reviews?.length) {
      return [];
    }

    const reviews: GoogleReviewResponse[] = data.result.reviews.map((r: any) => ({
      source: 'google' as const,
      authorName: r.author_name || 'Anonymous',
      authorPhotoUrl: r.profile_photo_url || null,
      authorUrl: r.author_url || null,
      rating: r.rating,
      text: r.text || '',
      relativeTimeDescription: r.relative_time_description || '',
      time: r.time,
      googleAttribution: {
        authorUrl: r.author_url || null,
        photoUrl: r.profile_photo_url || null,
      },
    }));

    // Cache reviews for 6 hours
    await this.cacheManager.set(cacheKey, reviews, GoogleReviewsService.REVIEWS_CACHE_TTL);

    return reviews;
  }

  /**
   * Get combined reviews (app + Google) with aggregates for a provider.
   */
  async getCombinedReviews(
    providerId: string,
    page = 1,
    limit = 20,
  ): Promise<CombinedReviewsResponse> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');

    // Fetch app reviews (paginated)
    const [appData, appTotal] = await this.reviewRepo.findAndCount({
      where: { providerId, status: 'active' },
      order: { postedAt: 'DESC' },
      relations: ['reviewer', 'photos'],
      take: limit,
      skip: (page - 1) * limit,
    });

    // Compute app average rating
    const appAvgResult = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.starRating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('review.providerId = :providerId', { providerId })
      .andWhere('review.status = :status', { status: 'active' })
      .getRawOne();

    const appRating = appAvgResult?.avg ? parseFloat(appAvgResult.avg) : null;
    const appReviewCount = parseInt(appAvgResult?.count || '0', 10);

    // Fetch Google reviews (live, only if linked)
    let googleReviews: GoogleReviewResponse[] = [];
    if (provider.googlePlaceId) {
      try {
        googleReviews = await this.getGoogleReviews(providerId);
      } catch (err) {
        this.logger.warn(`Failed to fetch Google reviews for ${providerId}: ${err}`);
      }
    }

    return {
      appReviews: {
        data: appData,
        total: appTotal,
        page,
        limit,
        totalPages: Math.ceil(appTotal / limit),
      },
      googleReviews,
      aggregates: {
        combinedRating: provider.combinedRating,
        combinedReviewCount: provider.combinedReviewCount,
        appRating: appRating ? Math.round(appRating * 10) / 10 : null,
        appReviewCount,
        googleRating: provider.googleRating,
        googleReviewCount: provider.googleReviewCount,
        trustLevel: provider.trustLevel,
      },
    };
  }

  /**
   * Recompute combined rating for a provider.
   * Called after new app review or Google aggregate refresh.
   */
  async recomputeCombinedRating(provider: Provider): Promise<void> {
    // Get app review stats
    const appStats = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.starRating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('review.providerId = :providerId', { providerId: provider.id })
      .andWhere('review.status = :status', { status: 'active' })
      .getRawOne();

    const appAvg = appStats?.avg ? parseFloat(appStats.avg) : 0;
    const appCount = parseInt(appStats?.count || '0', 10);

    const googleRating = provider.googleRating ? Number(provider.googleRating) : 0;
    const googleCount = provider.googleReviewCount || 0;

    const totalCount = appCount + googleCount;

    if (totalCount === 0) {
      provider.combinedRating = null;
      provider.combinedReviewCount = null;
      provider.trustLevel = 'unverified';
      return;
    }

    // Weighted average formula
    const combinedRating = (googleRating * googleCount + appAvg * appCount) / totalCount;
    provider.combinedRating = Math.round(combinedRating * 10) / 10;
    provider.combinedReviewCount = totalCount;

    // Compute trust level
    provider.trustLevel = this.computeTrustLevel(provider, combinedRating);
  }

  /**
   * Recompute combined rating by provider ID (for use after new review).
   */
  async recomputeByProviderId(providerId: string): Promise<void> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) return;
    await this.recomputeCombinedRating(provider);
    await this.providerRepo.save(provider);
  }

  /**
   * Force refresh Google aggregates for a provider (admin usage).
   */
  async forceRefreshAggregates(providerId: string): Promise<Provider> {
    this.ensureApiKey();
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.googlePlaceId) throw new BadRequestException('Provider has no Google Place linked');

    const details = await this.fetchPlaceAggregates(provider.googlePlaceId);
    provider.googleRating = details.rating;
    provider.googleReviewCount = details.userRatingsTotal;
    provider.googleLastFetchedAt = new Date();

    await this.recomputeCombinedRating(provider);
    return this.providerRepo.save(provider);
  }

  /**
   * Get providers with Google link status (for admin dashboard).
   */
  async getLinkedProviders(
    page = 1,
    limit = 20,
    filters?: { trustLevel?: string; linked?: boolean; search?: string },
  ) {
    const qb = this.providerRepo.createQueryBuilder('p')
      .select([
        'p.id', 'p.brandName', 'p.contactNumber', 'p.city',
        'p.googlePlaceId', 'p.googleRating', 'p.googleReviewCount',
        'p.combinedRating', 'p.combinedReviewCount', 'p.trustLevel',
        'p.googleVerifiedAt', 'p.googleLastFetchedAt',
      ])
      .orderBy('p.googleVerifiedAt', 'DESC', 'NULLS LAST');

    if (filters?.trustLevel) {
      qb.andWhere('p.trustLevel = :trustLevel', { trustLevel: filters.trustLevel });
    }
    if (filters?.linked === true) {
      qb.andWhere('p.googlePlaceId IS NOT NULL');
    } else if (filters?.linked === false) {
      qb.andWhere('p.googlePlaceId IS NULL');
    }
    if (filters?.search) {
      qb.andWhere('p.brandName ILIKE :search', { search: `%${filters.search}%` });
    }

    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Trust level overview for admin dashboard.
   */
  async getTrustOverview(): Promise<Record<string, number>> {
    const rows = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.trustLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = :status', { status: 'active' })
      .groupBy('p.trustLevel')
      .getRawMany();

    const result: Record<string, number> = { unverified: 0, basic: 0, verified: 0, trusted: 0 };
    for (const row of rows) {
      result[row.level] = parseInt(row.count, 10);
    }
    return result;
  }

  // ── Private helpers ──

  private computeTrustLevel(
    provider: Provider,
    combinedRating: number,
  ): 'unverified' | 'basic' | 'verified' | 'trusted' {
    if (!provider.googlePlaceId) return 'unverified';

    const googleCount = provider.googleReviewCount || 0;

    if (googleCount >= 50 && combinedRating >= 4.0) return 'trusted';
    if (googleCount >= 10) return 'verified';
    return 'basic';
  }

  private isCacheStale(lastFetchedAt: Date | null): boolean {
    if (!lastFetchedAt) return true;
    const ageMs = Date.now() - new Date(lastFetchedAt).getTime();
    return ageMs > this.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  private async refreshAggregatesInBackground(provider: Provider): Promise<void> {
    if (!provider.googlePlaceId) return;

    const details = await this.fetchPlaceAggregates(provider.googlePlaceId);
    provider.googleRating = details.rating;
    provider.googleReviewCount = details.userRatingsTotal;
    provider.googleLastFetchedAt = new Date();

    await this.recomputeCombinedRating(provider);
    await this.providerRepo.save(provider);
  }

  private async fetchPlaceAggregates(
    placeId: string,
  ): Promise<{ rating: number | null; userRatingsTotal: number | null }> {
    // Check cache first
    const cacheKey = `google-aggregates:${placeId}`;
    const cached = await this.cacheManager.get<{ rating: number | null; userRatingsTotal: number | null }>(cacheKey);
    if (cached) return cached;

    // Only request rating + user_ratings_total fields (Basic tier — cheapest)
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${this.apiKey}`;
    const res = await this.fetchWithTimeout(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.result) {
      return { rating: null, userRatingsTotal: null };
    }

    const result = {
      rating: data.result.rating ?? null,
      userRatingsTotal: data.result.user_ratings_total ?? null,
    };

    // Cache aggregates for 12 hours
    await this.cacheManager.set(cacheKey, result, GoogleReviewsService.AGGREGATES_CACHE_TTL);

    return result;
  }

  private normalizePhoneForSearch(phone: string): string {
    // Strip spaces, dashes, parens
    let cleaned = phone.replace(/[\s\-()]/g, '');
    // If starts with 0, assume Indian number, replace with +91
    if (cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.slice(1);
    }
    // If doesn't start with +, assume Indian
    if (!cleaned.startsWith('+')) {
      cleaned = '+91' + cleaned;
    }
    return cleaned;
  }
}
