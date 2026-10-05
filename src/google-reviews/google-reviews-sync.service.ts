import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { GoogleReview, Provider, Review } from '../entities';
import { returnedRows } from '../common/utils/returned-rows';

/**
 * Keeps a stored mirror of each linked business's Google reviews, as cheaply
 * as Google's pricing allows.
 *
 *  - Linking by phone uses the legacy Find Place lookup with only place_id
 *    requested, an ID-only call Google does not charge for. (Places API (New)
 *    text search cannot find a business by phone number.)
 *  - A sync is one Place Details (New) call for rating, review count and up to
 *    five reviews. Those calls are counted in google_api_usage, and syncing
 *    stops at GOOGLE_REVIEWS_MONTHLY_BUDGET — below Google's 1,000 free calls
 *    a month — so the bill stays at zero unless the budget is raised.
 *  - Pages read reviews from the database; viewing a business costs nothing.
 *
 * A sync replaces a business's stored reviews with what Google returns now, so
 * a review deleted on Google is deleted here. Google only ever returns five,
 * so a review that drops out of Google's five is removed too: the mirror
 * shows what Google shows, not every review ever written.
 */

const PLACES_V1 = 'https://places.googleapis.com/v1/places';
const FIND_PLACE =
  'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
const DETAILS_FIELDS = 'id,rating,userRatingCount,businessStatus,reviews';

/** Billed: Place Details with reviews (Enterprise + Atmosphere SKU). */
export const SKU_REVIEWS = 'place_details_reviews';
/** Free: Find Place by phone, place_id only. Counted for visibility. */
export const SKU_PHONE_LOOKUP = 'find_place_phone_id_only';
/** Billed (Enterprise): a listing's name, address and rating, shown to an owner before they verify. */
export const SKU_PREVIEW = 'place_details_preview';

/** Google's free monthly allowance for SKU_REVIEWS. */
export const GOOGLE_FREE_REVIEW_CALLS = 1000;

/** A stored mirror older than this is deleted rather than shown stale. */
const MAX_MIRROR_AGE_DAYS = 30;

interface PlacesReview {
  name: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string; languageCode?: string };
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  googleMapsUri?: string;
  publishTime?: string;
}

interface PlaceDetails {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  reviews?: PlacesReview[];
}

export interface SyncResult {
  providerId: string;
  status: 'synced' | 'not_found' | 'failed' | 'over_budget';
  added: number;
  updated: number;
  removed: number;
  stored: number;
  rating: number | null;
  reviewCount: number | null;
  error?: string;
}

export const tenDigits = (phone: string | null | undefined) => {
  const d = (phone ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
};

@Injectable()
export class GoogleReviewsSyncService {
  private readonly logger = new Logger(GoogleReviewsSyncService.name);
  private readonly apiKey: string | undefined;
  readonly monthlyBudget: number;
  readonly refreshDays: number;

  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(Review) private readonly appReviews: Repository<Review>,
    @InjectRepository(GoogleReview)
    private readonly googleReviews: Repository<GoogleReview>,
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    const key = config.get<string>('GOOGLE_MAPS_API_KEY');
    this.apiKey =
      key && key !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' ? key : undefined;
    this.monthlyBudget =
      Number(config.get('GOOGLE_REVIEWS_MONTHLY_BUDGET')) || 900;
    this.refreshDays = Number(config.get('GOOGLE_REVIEWS_REFRESH_DAYS')) || 14;
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  private ensureApiKey(): string {
    if (!this.apiKey) {
      throw new BadRequestException(
        'Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY.',
      );
    }
    return this.apiKey;
  }

  // ── Usage budget ────────────────────────────────────────────────────────

  private async countCall(sku: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO google_api_usage (month, sku, calls)
       VALUES (date_trunc('month', now())::date, $1, 1)
       ON CONFLICT (month, sku) DO UPDATE SET calls = google_api_usage.calls + 1`,
      [sku],
    );
  }

  async callsThisMonth(sku: string): Promise<number> {
    const rows = await this.dataSource.query<Array<{ calls: number }>>(
      `SELECT calls FROM google_api_usage WHERE month = date_trunc('month', now())::date AND sku = $1`,
      [sku],
    );
    return Number(rows[0]?.calls ?? 0);
  }

  async remainingBudget(): Promise<number> {
    return Math.max(
      0,
      this.monthlyBudget - (await this.callsThisMonth(SKU_REVIEWS)),
    );
  }

  // ── Combined rating (app + Google) ──────────────────────────────────────

  async recomputeCombinedRating(provider: Provider): Promise<void> {
    const appStats = await this.appReviews
      .createQueryBuilder('review')
      .select('AVG(review.starRating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('review.providerId = :providerId', { providerId: provider.id })
      .andWhere('review.status = :status', { status: 'active' })
      .getRawOne<{ avg: string | null; count: string }>();

    const appAvg = appStats?.avg ? parseFloat(appStats.avg) : 0;
    const appCount = parseInt(appStats?.count || '0', 10);
    const googleRating = provider.googleRating
      ? Number(provider.googleRating)
      : 0;
    const googleCount = provider.googleReviewCount || 0;
    const totalCount = appCount + googleCount;

    if (totalCount === 0) {
      provider.combinedRating = null;
      provider.combinedReviewCount = null;
      provider.trustLevel = provider.googlePlaceId ? 'basic' : 'unverified';
      return;
    }

    const combined =
      (googleRating * googleCount + appAvg * appCount) / totalCount;
    provider.combinedRating = Math.round(combined * 10) / 10;
    provider.combinedReviewCount = totalCount;
    provider.trustLevel = !provider.googlePlaceId
      ? 'unverified'
      : googleCount >= 50 && combined >= 4.0
        ? 'trusted'
        : googleCount >= 10
          ? 'verified'
          : 'basic';
  }

  // ── Sync one business ───────────────────────────────────────────────────

  /**
   * Fetch rating, review count and current reviews from Google, and make the
   * stored mirror match. One billed call.
   */
  async syncProvider(providerId: string): Promise<SyncResult> {
    const key = this.ensureApiKey();
    const provider = await this.providers.findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.googlePlaceId)
      throw new BadRequestException('This business is not linked to Google');

    const empty = {
      providerId,
      added: 0,
      updated: 0,
      removed: 0,
      stored: 0,
      rating: null,
      reviewCount: null,
    };
    if ((await this.remainingBudget()) <= 0) {
      return {
        ...empty,
        status: 'over_budget',
        error: `Monthly budget of ${this.monthlyBudget} Google calls is used up`,
      };
    }

    let res: Response;
    try {
      res = await fetch(
        `${PLACES_V1}/${encodeURIComponent(provider.googlePlaceId)}`,
        {
          headers: {
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': DETAILS_FIELDS,
          },
          signal: AbortSignal.timeout(15_000),
        },
      );
    } catch (err) {
      return this.failed(
        provider,
        `Could not reach Google: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (res.status === 404) {
      // The listing is gone from Google: nothing of it should stay here.
      await this.googleReviews.delete({ providerId });
      provider.googleRating = null;
      provider.googleReviewCount = null;
      provider.googleLastFetchedAt = new Date();
      provider.googleSyncError = 'Google no longer has this listing';
      await this.recomputeCombinedRating(provider);
      await this.providers.save(provider);
      return { ...empty, status: 'not_found', error: provider.googleSyncError };
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      return this.failed(
        provider,
        `Google answered ${res.status}: ${body?.error?.message ?? res.statusText}`,
      );
    }

    await this.countCall(SKU_REVIEWS);
    const place = (await res.json()) as PlaceDetails;
    const now = new Date();
    const incoming = (place.reviews ?? []).filter((r) => r.name);

    const counts = await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(GoogleReview);
      const existing = await repo.find({
        where: { providerId },
        select: ['id', 'googleReviewId', 'text', 'rating'],
      });
      const byId = new Map(existing.map((e) => [e.googleReviewId, e]));
      let added = 0;
      let updated = 0;

      for (const r of incoming) {
        const text = r.text?.text ?? r.originalText?.text ?? null;
        const row = {
          providerId,
          googleReviewId: r.name,
          rating: Math.max(1, Math.min(5, Math.round(r.rating ?? 0))),
          text,
          language:
            r.text?.languageCode ?? r.originalText?.languageCode ?? null,
          authorName: (r.authorAttribution?.displayName || 'Google user').slice(
            0,
            200,
          ),
          authorUri: r.authorAttribution?.uri?.slice(0, 500) ?? null,
          authorPhotoUri: r.authorAttribution?.photoUri?.slice(0, 500) ?? null,
          googleMapsUri: r.googleMapsUri?.slice(0, 500) ?? null,
          publishedAt: r.publishTime ? new Date(r.publishTime) : null,
          lastSeenAt: now,
        };
        const prev = byId.get(r.name);
        if (!prev) {
          await repo.insert(row);
          added++;
        } else {
          if (prev.text !== row.text || prev.rating !== row.rating) updated++;
          await repo.update({ id: prev.id }, row);
        }
      }

      // Anything Google no longer returns is gone from the mirror.
      const keep = incoming.map((r) => r.name);
      const del = await repo.delete(
        keep.length
          ? { providerId, googleReviewId: Not(In(keep)) }
          : { providerId },
      );
      return { added, updated, removed: del.affected ?? 0 };
    });

    provider.googleRating = place.rating ?? null;
    provider.googleReviewCount = place.userRatingCount ?? 0;
    provider.googleLastFetchedAt = now;
    provider.googleSyncError =
      place.businessStatus === 'CLOSED_PERMANENTLY'
        ? 'Marked permanently closed on Google'
        : null;
    await this.recomputeCombinedRating(provider);
    await this.providers.save(provider);

    return {
      providerId,
      status: 'synced',
      ...counts,
      stored: incoming.length,
      rating: provider.googleRating,
      reviewCount: provider.googleReviewCount,
    };
  }

  /** Records the failure and asks for a retry tomorrow rather than in two weeks. */
  private async failed(provider: Provider, error: string): Promise<SyncResult> {
    this.logger.warn(`Google sync failed for ${provider.id}: ${error}`);
    provider.googleSyncError = error.slice(0, 300);
    provider.googleLastFetchedAt = new Date(
      Date.now() - (this.refreshDays - 1) * 864e5,
    );
    await this.providers.save(provider);
    return {
      providerId: provider.id,
      status: 'failed',
      added: 0,
      updated: 0,
      removed: 0,
      stored: 0,
      rating: provider.googleRating,
      reviewCount: provider.googleReviewCount,
      error,
    };
  }

  // ── Scheduled refresh ───────────────────────────────────────────────────

  /**
   * Sync linked businesses that are due, oldest first, within the budget.
   * Each one is claimed by stamping it first, so the local and deployed
   * servers — which share a database — never sync the same business twice.
   */
  async syncDue(limit = 200): Promise<{
    attempted: number;
    synced: number;
    failed: number;
    overBudget: boolean;
  }> {
    if (!this.configured)
      return { attempted: 0, synced: 0, failed: 0, overBudget: false };
    const budget = await this.remainingBudget();
    const take = Math.min(limit, budget);
    if (take <= 0)
      return { attempted: 0, synced: 0, failed: 0, overBudget: true };

    const claimed = returnedRows<{ id: string }>(
      await this.dataSource.query(
        `UPDATE providers SET google_last_fetched_at = now()
          WHERE id IN (
            SELECT id FROM providers
             WHERE google_place_id IS NOT NULL
               AND (google_last_fetched_at IS NULL
                    OR google_last_fetched_at < now() - make_interval(days => $1::int))
             ORDER BY google_last_fetched_at NULLS FIRST
             LIMIT $2
             FOR UPDATE SKIP LOCKED)
          RETURNING id`,
        [this.refreshDays, take],
      ),
    );

    let synced = 0;
    let failed = 0;
    for (const { id } of claimed) {
      try {
        const r = await this.syncProvider(id);
        if (r.status === 'synced' || r.status === 'not_found') synced++;
        else failed++;
        if (r.status === 'over_budget') break;
      } catch (err) {
        failed++;
        this.logger.warn(
          `Google sync threw for ${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return {
      attempted: claimed.length,
      synced,
      failed,
      overBudget: budget <= claimed.length,
    };
  }

  /** Stored reviews older than MAX_MIRROR_AGE_DAYS are removed, not shown stale. */
  async purgeStale(): Promise<number> {
    const res = returnedRows<{ id: string }>(
      await this.dataSource.query(
        `DELETE FROM google_reviews g
          USING providers p
          WHERE p.id = g.provider_id
            AND (p.google_place_id IS NULL
                 OR p.google_last_fetched_at < now() - make_interval(days => $1::int))
          RETURNING g.id`,
        [MAX_MIRROR_AGE_DAYS],
      ),
    );
    return res.length;
  }

  /** 03:00 IST daily. */
  @Cron('0 30 21 * * *')
  async nightly(): Promise<void> {
    if (!this.configured) return;
    try {
      const r = await this.syncDue();
      const purged = await this.purgeStale();
      if (r.attempted || purged) {
        this.logger.log(
          `Google reviews: synced ${r.synced}/${r.attempted}, failed ${r.failed}, purged ${purged} stale`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Google reviews nightly sync failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Lookups ──────────────────────────────────────────────────────────────

  /**
   * Google listings that list this 10-digit Indian number. The legacy Find
   * Place lookup with only place_id requested, which Google does not charge
   * for; Places API (New) text search cannot search by phone number. Throws on
   * a network failure, which callers must not mistake for "no listing".
   */
  async placeIdsForPhone(digits: string): Promise<string[]> {
    const key = this.ensureApiKey();
    const url = `${FIND_PLACE}?${new URLSearchParams({
      input: `+91${digits}`,
      inputtype: 'phonenumber',
      fields: 'place_id',
      key,
    }).toString()}`;
    const data = (await (
      await fetch(url, { signal: AbortSignal.timeout(15_000) })
    ).json()) as {
      status?: string;
      candidates?: Array<{ place_id: string }>;
    };
    await this.countCall(SKU_PHONE_LOOKUP);
    return [...new Set((data.candidates ?? []).map((c) => c.place_id))];
  }

  /** A listing's name, address and rating, so an owner can recognise it before verifying. */
  async placePreview(placeId: string): Promise<{
    name: string;
    address: string;
    rating: number | null;
    userRatingCount: number | null;
  } | null> {
    const key = this.ensureApiKey();
    try {
      const res = await fetch(`${PLACES_V1}/${encodeURIComponent(placeId)}`, {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'displayName,formattedAddress,rating,userRatingCount',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return null;
      await this.countCall(SKU_PREVIEW);
      const d = (await res.json()) as {
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
      };
      return {
        name: d.displayName?.text ?? '',
        address: d.formattedAddress ?? '',
        rating: d.rating ?? null,
        userRatingCount: d.userRatingCount ?? null,
      };
    } catch {
      return null;
    }
  }

  // ── Automatic linking by phone ──────────────────────────────────────────

  /**
   * Look up unlinked businesses by phone number, linking those with exactly
   * one Google match. Each business is checked once: one with no listing is
   * not searched again unless an admin links it by hand.
   */
  async autoMatchBatch(limit = 40): Promise<{
    checked: number;
    linked: number;
    noListing: number;
    ambiguous: number;
    remaining: number;
  }> {
    this.ensureApiKey();
    const batch = await this.providers.find({
      where: {
        googlePlaceId: IsNull(),
        googleMatchCheckedAt: IsNull(),
        deletedAt: IsNull(),
      },
      select: ['id', 'contactNumber', 'whatsappNumber'],
      order: { createdAt: 'ASC' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    let linked = 0;
    let noListing = 0;
    let ambiguous = 0;
    for (const p of batch) {
      const digits = tenDigits(p.contactNumber) ?? tenDigits(p.whatsappNumber);
      let placeId: string | null = null;
      if (digits) {
        try {
          const ids = await this.placeIdsForPhone(digits);
          if (ids.length === 1) {
            // Never give two businesses the same Google listing.
            const taken = await this.providers.exists({
              where: { googlePlaceId: ids[0] },
            });
            if (taken) ambiguous++;
            else placeId = ids[0];
          } else if (ids.length > 1) ambiguous++;
          else noListing++;
        } catch (err) {
          // A network failure is not "no listing": leave it unchecked for the next batch.
          this.logger.warn(
            `Phone lookup failed for ${p.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
          continue;
        }
      } else {
        noListing++;
      }

      await this.providers.update(
        { id: p.id },
        placeId
          ? {
              googlePlaceId: placeId,
              googleMatchMethod: 'phone',
              googleVerifiedAt: new Date(),
              googleMatchCheckedAt: new Date(),
              googleLastFetchedAt: null,
              googleSyncError: null,
            }
          : { googleMatchCheckedAt: new Date() },
      );
      if (placeId) linked++;
    }

    const remaining = await this.providers.count({
      where: {
        googlePlaceId: IsNull(),
        googleMatchCheckedAt: IsNull(),
        deletedAt: IsNull(),
      },
    });
    return { checked: batch.length, linked, noListing, ambiguous, remaining };
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  listStored(providerId: string): Promise<GoogleReview[]> {
    return this.googleReviews.find({
      where: { providerId },
      order: { publishedAt: 'DESC' },
    });
  }

  async usage() {
    const [
      reviewCalls,
      phoneLookups,
      linked,
      unlinkedUnchecked,
      unlinkedChecked,
      stored,
      due,
      errors,
    ] = await Promise.all([
      this.callsThisMonth(SKU_REVIEWS),
      this.callsThisMonth(SKU_PHONE_LOOKUP),
      this.providers.count({ where: { googlePlaceId: Not(IsNull()) } }),
      this.providers.count({
        where: {
          googlePlaceId: IsNull(),
          googleMatchCheckedAt: IsNull(),
          deletedAt: IsNull(),
        },
      }),
      this.providers.count({
        where: {
          googlePlaceId: IsNull(),
          googleMatchCheckedAt: Not(IsNull()),
          deletedAt: IsNull(),
        },
      }),
      this.googleReviews.count(),
      this.dataSource
        .query<Array<{ n: string }>>(
          `SELECT COUNT(*)::text AS n FROM providers
              WHERE google_place_id IS NOT NULL
                AND (google_last_fetched_at IS NULL
                     OR google_last_fetched_at < now() - make_interval(days => $1::int))`,
          [this.refreshDays],
        )
        .then((r) => Number(r[0]?.n ?? 0)),
      this.providers.count({
        where: { googlePlaceId: Not(IsNull()), googleSyncError: Not(IsNull()) },
      }),
    ]);
    return {
      configured: this.configured,
      month: new Date().toISOString().slice(0, 7),
      reviewCalls,
      monthlyBudget: this.monthlyBudget,
      googleFreeCalls: GOOGLE_FREE_REVIEW_CALLS,
      phoneLookups,
      refreshDays: this.refreshDays,
      linked,
      notYetSearched: unlinkedUnchecked,
      searchedNoMatch: unlinkedChecked,
      storedReviews: stored,
      dueForSync: due,
      withErrors: errors,
    };
  }
}
