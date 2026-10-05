import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleReview, Provider, Review } from '../entities';
import {
  GooglePlaceCandidate,
  GoogleReviewResponse,
  CombinedReviewsResponse,
} from './dto';
import { GoogleReviewsSyncService } from './google-reviews-sync.service';

/** "3 days ago", "2 months ago" — worked out now, so it never goes stale in storage. */
function relativeTime(date: Date | null): string {
  if (!date) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 864e5);
  if (days < 1) return 'today';
  if (days < 7) return days === 1 ? 'a day ago' : `${days} days ago`;
  if (days < 30)
    return Math.floor(days / 7) === 1
      ? 'a week ago'
      : `${Math.floor(days / 7)} weeks ago`;
  if (days < 365)
    return Math.floor(days / 30) === 1
      ? 'a month ago'
      : `${Math.floor(days / 30)} months ago`;
  return Math.floor(days / 365) === 1
    ? 'a year ago'
    : `${Math.floor(days / 365)} years ago`;
}

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);
  private readonly apiKey: string | undefined;

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(GoogleReview)
    private googleReviewRepo: Repository<GoogleReview>,
    private config: ConfigService,
    private sync: GoogleReviewsSyncService,
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

  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
    timeoutMs = 10000,
  ): Promise<Response> {
    return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  }

  /**
   * Verify that the actor owns this provider (or skip for admin usage).
   */
  private assertOwnership(
    provider: Provider,
    actorUserId: string | null,
  ): void {
    if (actorUserId && provider.userId !== actorUserId) {
      throw new ForbiddenException(
        'You can only manage your own Google Business link',
      );
    }
  }

  /**
   * Find Google listings that might be this business, so an admin or owner
   * can confirm the right one. Tries the phone number first; when that finds
   * nothing — most home businesses list a personal number — falls back to the
   * business name and area. Manual and occasional, so the richer fields are
   * worth their (free-tier) cost.
   */
  async findPlaceCandidates(
    providerId: string,
    phoneOverride?: string,
    actorUserId?: string,
  ): Promise<GooglePlaceCandidate[]> {
    this.ensureApiKey();

    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (actorUserId) this.assertOwnership(provider, actorUserId);

    const phone = phoneOverride || provider.contactNumber;
    if (phone) {
      const normalizedPhone = this.normalizePhoneForSearch(phone);
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(normalizedPhone)}&inputtype=phonenumber&fields=place_id,name,formatted_address,rating,user_ratings_total,formatted_phone_number&key=${this.apiKey}`;
      const data = (await (await this.fetchWithTimeout(url)).json()) as {
        status?: string;
        candidates?: Array<{
          place_id: string;
          name?: string;
          formatted_address?: string;
          rating?: number;
          user_ratings_total?: number;
          formatted_phone_number?: string;
        }>;
      };
      if (data.status === 'OK' && data.candidates?.length) {
        return data.candidates.slice(0, 5).map((c) => ({
          placeId: c.place_id,
          name: c.name ?? '',
          address: c.formatted_address ?? '',
          rating: c.rating,
          userRatingsTotal: c.user_ratings_total,
          phoneNumber: c.formatted_phone_number,
        }));
      }
    }

    // No phone match: search by name in the business's own area.
    const query = [provider.brandName, provider.area, provider.city]
      .filter(Boolean)
      .join(' ');
    const res = await this.fetchWithTimeout(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey!,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber',
        },
        body: JSON.stringify({
          textQuery: query,
          regionCode: 'IN',
          maxResultCount: 5,
        }),
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        nationalPhoneNumber?: string;
      }>;
    };
    return (data.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      userRatingsTotal: p.userRatingCount,
      phoneNumber: p.nationalPhoneNumber,
    }));
  }

  /**
   * Link a Google listing to a business and pull its reviews straight away.
   */
  async confirmGooglePlace(
    providerId: string,
    placeId: string,
    actorUserId?: string,
  ): Promise<Provider> {
    this.ensureApiKey();

    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (actorUserId) this.assertOwnership(provider, actorUserId);

    if (provider.googlePlaceId && provider.googlePlaceId !== placeId) {
      // A different listing: the old one's reviews must not linger.
      await this.googleReviewRepo.delete({ providerId });
    }
    provider.googlePlaceId = placeId;
    provider.googleMatchMethod = 'manual';
    provider.googleVerifiedAt = new Date();
    provider.googleMatchCheckedAt = new Date();
    provider.googleLastFetchedAt = null;
    provider.googleSyncError = null;
    await this.providerRepo.save(provider);

    const result = await this.sync.syncProvider(providerId);
    if (result.status !== 'synced') {
      this.logger.warn(
        `Linked ${providerId} but first sync was ${result.status}: ${result.error ?? ''}`,
      );
    }
    return (await this.providerRepo.findOneBy({ id: providerId }))!;
  }

  /**
   * Unlink Google Place from a provider, and drop its stored Google reviews.
   */
  async unlinkGooglePlace(
    providerId: string,
    actorUserId?: string,
  ): Promise<Provider> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (actorUserId) this.assertOwnership(provider, actorUserId);

    await this.googleReviewRepo.delete({ providerId });
    provider.googlePlaceId = null;
    provider.googleRating = null;
    provider.googleReviewCount = null;
    provider.googleVerifiedAt = null;
    provider.googleLastFetchedAt = null;
    provider.googleMatchMethod = null;
    provider.googleSyncError = null;
    // An unlinked business stays checked: the automatic phone match must not
    // re-link the listing someone just removed.
    provider.googleMatchCheckedAt = new Date();

    await this.recomputeCombinedRating(provider);
    return this.providerRepo.save(provider);
  }

  /**
   * Google reviews for a business, from the stored mirror. No Google call:
   * viewing a business costs nothing.
   */
  async getGoogleReviews(providerId: string): Promise<GoogleReviewResponse[]> {
    const rows = await this.sync.listStored(providerId);
    return rows.map((r) => ({
      source: 'google' as const,
      authorName: r.authorName,
      authorPhotoUrl: r.authorPhotoUri,
      authorUrl: r.authorUri,
      rating: r.rating,
      text: r.text ?? '',
      relativeTimeDescription: relativeTime(r.publishedAt),
      time: r.publishedAt ? Math.floor(r.publishedAt.getTime() / 1000) : 0,
      googleAttribution: {
        authorUrl: r.authorUri,
        photoUrl: r.authorPhotoUri,
      },
    }));
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
      .getRawOne<{ avg: string | null; count: string }>();

    const appRating = appAvgResult?.avg ? parseFloat(appAvgResult.avg) : null;
    const appReviewCount = parseInt(appAvgResult?.count || '0', 10);

    const googleReviews = provider.googlePlaceId
      ? await this.getGoogleReviews(providerId)
      : [];

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
  recomputeCombinedRating(provider: Provider): Promise<void> {
    return this.sync.recomputeCombinedRating(provider);
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
   * Re-sync a business from Google now (admin "refresh"): rating, count and reviews.
   */
  async forceRefreshAggregates(providerId: string): Promise<Provider> {
    this.ensureApiKey();
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.googlePlaceId)
      throw new BadRequestException('Provider has no Google Place linked');

    const result = await this.sync.syncProvider(providerId);
    if (result.status === 'over_budget' || result.status === 'failed') {
      throw new BadRequestException(result.error ?? 'Google sync failed');
    }
    return (await this.providerRepo.findOneBy({ id: providerId }))!;
  }

  /**
   * Get providers with Google link status (for admin dashboard).
   */
  async getLinkedProviders(
    page = 1,
    limit = 20,
    filters?: { trustLevel?: string; linked?: boolean; search?: string },
  ) {
    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.brandName',
        'p.contactNumber',
        'p.city',
        'p.googlePlaceId',
        'p.googleRating',
        'p.googleReviewCount',
        'p.combinedRating',
        'p.combinedReviewCount',
        'p.trustLevel',
        'p.googleVerifiedAt',
        'p.googleLastFetchedAt',
        'p.googleMatchMethod',
        'p.googleMatchCheckedAt',
        'p.googleSyncError',
      ])
      .orderBy('p.googleVerifiedAt', 'DESC', 'NULLS LAST');

    if (filters?.trustLevel) {
      qb.andWhere('p.trustLevel = :trustLevel', {
        trustLevel: filters.trustLevel,
      });
    }
    if (filters?.linked === true) {
      qb.andWhere('p.googlePlaceId IS NOT NULL');
    } else if (filters?.linked === false) {
      qb.andWhere('p.googlePlaceId IS NULL');
    }
    if (filters?.search) {
      qb.andWhere('p.brandName ILIKE :search', {
        search: `%${filters.search}%`,
      });
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
      .getRawMany<{ level: string; count: string }>();

    const result: Record<string, number> = {
      unverified: 0,
      basic: 0,
      verified: 0,
      trusted: 0,
    };
    for (const row of rows) {
      result[row.level] = parseInt(row.count, 10);
    }
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
