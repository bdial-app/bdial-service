import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Provider } from '../entities/provider.entity';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { SearchLog } from '../entities/search-log.entity';
import { ProviderAnalyticsEvent } from '../entities/provider-analytics-event.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { SearchSynonym } from '../entities/search-synonym.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestionsQueryDto } from './dto/suggestions-query.dto';

// ────────────────────────────────────────────────────────────
// Response interfaces
// ────────────────────────────────────────────────────────────

export interface SearchSuggestion {
  text: string;
  type: 'provider' | 'product' | 'category';
  id: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface ProviderSearchResult {
  id: string;
  brandName: string;
  description: string | null;
  profilePhotoUrl: string | null;
  bannerImageUrl: string | null;
  city: string;
  area: string | null;
  status: string;
  isWomenLed: boolean;
  isFeatured: boolean;
  distance: number | null;
  avgRating: number | null;
  reviewCount: number;
  categories: string | null;
  relevanceScore: number;
  isSponsored?: boolean;
  sponsoredListingId?: string;
  hasActiveOffer?: boolean;
  offerTitle?: string;
  discountValue?: number;
  discountType?: string;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  photoUrl: string | null;
  productType: 'product' | 'service';
  providerId: string;
  providerName: string;
  providerCity: string;
  providerArea: string | null;
  distance: number | null;
  relevanceScore: number;
}

export interface CategorySearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
  providerCount: number;
  relevanceScore: number;
}

export interface SearchFallback {
  relaxedProviders?: ProviderSearchResult[];
  relatedCategories?: CategorySearchResult[];
  trending?: { query: string; count: number }[];
  nearbyPopular?: ProviderSearchResult[];
  peopleAlsoSearched?: string[];
}

export interface SearchResponse {
  sponsored: ProviderSearchResult[];
  deals: ProviderSearchResult[];
  topRated: ProviderSearchResult[];
  providers: { data: ProviderSearchResult[]; total: number };
  products: { data: ProductSearchResult[]; total: number };
  categories: { data: CategorySearchResult[]; total: number };
  meta: { query: string; tookMs: number; totalResults: number; didYouMean?: string };
  fallback?: SearchFallback;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(SearchLog) private searchLogRepo: Repository<SearchLog>,
    @InjectRepository(ProviderAnalyticsEvent) private analyticsEventRepo: Repository<ProviderAnalyticsEvent>,
    @InjectRepository(SponsoredListing) private sponsoredRepo: Repository<SponsoredListing>,
    @InjectRepository(SearchSynonym) private synonymRepo: Repository<SearchSynonym>,
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ────────────────────────────────────────────────────────────
  // CACHE HELPERS
  // ────────────────────────────────────────────────────────────

  private buildCacheKey(prefix: string, params: Record<string, any>): string {
    const sorted = Object.keys(params).sort().map(k => `${k}=${params[k] ?? ''}`).join('&');
    return `search:${prefix}:${sorted}`;
  }

  // ────────────────────────────────────────────────────────────
  // MATERIALIZED VIEW REFRESH (every 10 minutes)
  // ────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshRatingStats(): Promise<void> {
    try {
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY provider_rating_stats');
      this.logger.log('Refreshed provider_rating_stats materialized view');
    } catch (err) {
      this.logger.warn('Failed to refresh rating stats matview', err);
    }
  }

  // ────────────────────────────────────────────────────────────
  // UNIFIED SEARCH
  // ────────────────────────────────────────────────────────────

  async search(dto: SearchQueryDto, userId?: string): Promise<SearchResponse> {
    const start = Date.now();
    const {
      q,
      lat,
      lng,
      radius = 25,
      page = 1,
      limit = 10,
      type = 'all',
      categoryIds,
      sortBy = 'relevance',
      minRating,
      city,
      verifiedOnly,
      womenLedOnly,
    } = dto;

    // Check cache for full results
    const cacheKey = this.buildCacheKey('results', { q: q.toLowerCase().trim(), lat, lng, radius, page, limit, type, categoryIds: categoryIds?.join(','), sortBy, minRating, city, verifiedOnly, womenLedOnly });
    const cached = await this.cacheManager.get<SearchResponse>(cacheKey);
    if (cached) {
      // Log search even for cached results (fire and forget)
      this.logSearch(q, userId, cached.meta.totalResults, lat, lng, city).catch(() => {});
      return cached;
    }

    const offset = (page - 1) * limit;
    const hasGeo = lat != null && lng != null;

    // Expand query with fuzzy synonyms before building tsquery
    const expandedQ = await this.expandQuery(q);
    const prefixTsQuery = this.buildPrefixTsQuery(expandedQ);

    // Run searches in parallel based on type
    const searchProducts = type === 'all' || type === 'products' || type === 'services';
    const productTypeFilter = type === 'products' ? 'product' : type === 'services' ? 'service' : undefined;
    const isFirstPage = page === 1;
    const isAllOrProviders = type === 'all' || type === 'providers';

    const [providers, products, categories, sponsored, deals, topRated] = await Promise.all([
      isAllOrProviders
        ? this.searchProviders(expandedQ, prefixTsQuery, { lat, lng, radius, offset, limit, categoryIds, sortBy, minRating, city, hasGeo, verifiedOnly, womenLedOnly })
        : Promise.resolve({ data: [], total: 0 }),
      searchProducts
        ? this.searchProducts(expandedQ, prefixTsQuery, { lat, lng, radius, offset, limit: type === 'all' ? 5 : limit, hasGeo, productType: productTypeFilter })
        : Promise.resolve({ data: [], total: 0 }),
      type === 'all' || type === 'categories'
        ? this.searchCategories(expandedQ, prefixTsQuery, { offset, limit: type === 'all' ? 5 : limit })
        : Promise.resolve({ data: [], total: 0 }),
      // Prioritized sections — only on page 1 of all/providers
      isAllOrProviders && isFirstPage
        ? this.getMatchingSponsoredProviders(expandedQ, prefixTsQuery, lat, lng, city, categoryIds)
        : Promise.resolve([]),
      isAllOrProviders && isFirstPage
        ? this.getDealsProviders(expandedQ, prefixTsQuery, { lat, lng, radius, city, hasGeo, categoryIds })
        : Promise.resolve([]),
      isAllOrProviders && isFirstPage
        ? this.getTopRatedProviders(expandedQ, prefixTsQuery, { lat, lng, radius, city, hasGeo, categoryIds })
        : Promise.resolve([]),
    ]);

    // Remove sponsored/deals/topRated IDs from main provider list to avoid duplicates
    if (isFirstPage && isAllOrProviders) {
      const featuredIds = new Set([
        ...sponsored.map(s => s.id),
        ...deals.map(d => d.id),
        ...topRated.map(t => t.id),
      ]);
      providers.data = providers.data.filter(p => !featuredIds.has(p.id));
    }

    const totalResults = providers.total + products.total + categories.total;

    // "Did you mean?" when results are few
    let didYouMean: string | undefined;
    if (totalResults < 5) {
      didYouMean = await this.getDidYouMean(q);
    }

    // Fallback strategy when zero results
    let fallback: SearchFallback | undefined;
    if (totalResults === 0 && isFirstPage) {
      fallback = await this.buildFallback(q, expandedQ, prefixTsQuery, { lat, lng, radius, city, hasGeo });
    }

    const tookMs = Date.now() - start;

    // Log search (fire and forget)
    this.logSearch(q, userId, totalResults, lat, lng, city).catch(() => {});

    // Track search appearances for analytics (fire and forget)
    const allProviderIds = [...sponsored.map(s => s.id), ...deals.map(d => d.id), ...topRated.map(t => t.id), ...providers.data.map(p => p.id)];
    if (allProviderIds.length > 0) {
      this.logSearchAppearances(allProviderIds, userId, q).catch(() => {});
    }

    const response: SearchResponse = {
      sponsored,
      deals,
      topRated,
      providers,
      products,
      categories,
      meta: { query: q, tookMs, totalResults: totalResults + sponsored.length + deals.length + topRated.length, ...(didYouMean ? { didYouMean } : {}) },
      ...(fallback ? { fallback } : {}),
    };

    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, response, 60_000);

    return response;
  }

  // ────────────────────────────────────────────────────────────
  // PROVIDER SEARCH (optimized with matview + improved ranking)
  // ────────────────────────────────────────────────────────────

  private async searchProviders(
    q: string,
    prefixTsQuery: string,
    opts: {
      lat?: number;
      lng?: number;
      radius: number;
      offset: number;
      limit: number;
      categoryIds?: string[];
      sortBy: string;
      minRating?: number;
      city?: string;
      hasGeo: boolean;
      verifiedOnly?: boolean;
      womenLedOnly?: boolean;
    },
  ): Promise<{ data: ProviderSearchResult[]; total: number }> {
    const allParams: any[] = [q];
    const hasCategoryFilter = opts.categoryIds && opts.categoryIds.length > 0;

    // $2 = prefix tsquery for search_vector matching
    allParams.push(prefixTsQuery);

    // Distance expression
    let distExpr = 'NULL';
    if (opts.hasGeo) {
      distExpr = `6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($4)) + sin(radians($3)) * sin(radians(p.latitude))))`;
      allParams.push(opts.lat, opts.lng);
    }

    let pi = allParams.length + 1;

    // Build WHERE conditions
    const conditions: string[] = [
      `p.status IN ('active', 'unverified')`,
    ];

    if (opts.hasGeo) {
      conditions.push(`p.latitude IS NOT NULL`);
      conditions.push(`p.longitude IS NOT NULL`);
      conditions.push(`${distExpr} <= $${pi}`);
      allParams.push(opts.radius);
      pi++;
    }

    if (opts.city) {
      conditions.push(`p.city ILIKE $${pi}`);
      allParams.push(`%${opts.city}%`);
      pi++;
    }

    if (hasCategoryFilter) {
      const catPlaceholders = opts.categoryIds!.map((_, idx) => `$${pi + idx}`);
      conditions.push(
        `p.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id IN (${catPlaceholders.join(',')}))`,
      );
      allParams.push(...opts.categoryIds!);
      pi += opts.categoryIds!.length;
    }

    if (opts.minRating) {
      conditions.push(`rs.avg_rating >= $${pi}`);
      allParams.push(opts.minRating);
      pi++;
    }

    // NEW: verifiedOnly and womenLedOnly filters
    if (opts.verifiedOnly) {
      conditions.push(`p.status = 'active'`);
    }

    if (opts.womenLedOnly) {
      conditions.push(`p.is_women_led = true`);
    }

    // When filtering by category, don't require text match
    if (!hasCategoryFilter) {
      conditions.push(`(
        ($2 <> '' AND p.search_vector @@ to_tsquery('english', $2))
        OR similarity(p.brand_name, $1) > 0.1
        OR p.brand_name ILIKE $1 || '%'
        OR p.brand_name ILIKE '%' || $1 || '%'
      )`);
    }

    const whereClause = conditions.join(' AND ');

    // Build sort
    let orderClause: string;
    switch (opts.sortBy) {
      case 'distance':
        orderClause = opts.hasGeo
          ? `CASE WHEN p.status = 'active' THEN 0 ELSE 1 END ASC, distance ASC NULLS LAST`
          : `CASE WHEN p.status = 'active' THEN 0 ELSE 1 END ASC, relevance_score DESC`;
        break;
      case 'rating':
        orderClause = `CASE WHEN p.status = 'active' THEN 0 ELSE 1 END ASC, avg_rating DESC NULLS LAST, relevance_score DESC`;
        break;
      case 'newest':
        orderClause = `CASE WHEN p.status = 'active' THEN 0 ELSE 1 END ASC, p.created_at DESC`;
        break;
      default: // relevance
        orderClause = `CASE WHEN p.status = 'active' THEN 0 ELSE 1 END ASC, relevance_score DESC, distance ASC NULLS LAST`;
        break;
    }

    const radiusParam = opts.hasGeo ? opts.radius : 25;

    // OPTIMIZED: Uses materialized view instead of inline CTE for reviews
    // IMPROVED: Better relevance scoring with review_count popularity signal + distance boost
    const sql = `
      WITH cat_names AS (
        SELECT pc.provider_id, string_agg(DISTINCT c.name, ', ') AS categories
        FROM provider_categories pc JOIN categories c ON c.id = pc.category_id
        GROUP BY pc.provider_id
      ),
      active_offers AS (
        SELECT DISTINCT ON (po.provider_id)
          po.provider_id,
          po.title AS offer_title,
          po.discount_value,
          po.discount_type
        FROM provider_offers po
        WHERE po.is_active = true AND po.starts_at <= NOW() AND po.ends_at >= NOW()
        ORDER BY po.provider_id, po.discount_value DESC
      ),
      search_results AS (
        SELECT
          p.id,
          p.brand_name,
          p.description,
          p.profile_photo_url,
          p.banner_image_url,
          p.city,
          p.area,
          p.status,
          p.is_women_led,
          p.is_featured,
          p.created_at,
          ${distExpr} AS distance,
          rs.avg_rating,
          COALESCE(rs.review_count, 0) AS review_count,
          cn.categories,
          ao.provider_id IS NOT NULL AS has_active_offer,
          ao.offer_title,
          ao.discount_value,
          ao.discount_type,
          (
            CASE WHEN $2 <> '' THEN COALESCE(ts_rank_cd(p.search_vector, to_tsquery('english', $2)), 0) * 0.30 ELSE 0 END +
            COALESCE(similarity(p.brand_name, $1), 0) * 0.10 +
            CASE WHEN ao.provider_id IS NOT NULL THEN 0.10 ELSE 0 END +
            COALESCE(rs.avg_rating / 5.0, 0) * 0.20 +
            LEAST(COALESCE(LOG(rs.review_count + 1) / LOG(50), 0), 1.0) * 0.10 +
            CASE WHEN ${distExpr} IS NOT NULL THEN (1.0 - LEAST(${distExpr} / ${radiusParam}::float, 1.0)) * 0.10 ELSE 0 END +
            CASE WHEN p.is_featured THEN 0.05 ELSE 0 END +
            CASE WHEN p.status = 'active' THEN 0.02 ELSE 0 END +
            CASE WHEN p.updated_at > NOW() - INTERVAL '30 days' THEN 0.03 ELSE 0 END
          ) AS relevance_score,
          COUNT(*) OVER() AS total_count
        FROM providers p
        LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
        LEFT JOIN cat_names cn ON cn.provider_id = p.id
        LEFT JOIN active_offers ao ON ao.provider_id = p.id
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT $${pi} OFFSET $${pi + 1}
      )
      SELECT * FROM search_results
    `;

    allParams.push(opts.limit, opts.offset);

    this.logger.debug(`Provider search SQL params: ${JSON.stringify({ q, categoryIds: opts.categoryIds, paramCount: allParams.length, hasCategoryFilter })}`);

    try {
      const rows = await this.dataSource.query(sql, allParams);
      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

      return {
        data: rows.map((r: any) => ({
          id: r.id,
          brandName: r.brand_name,
          description: r.description,
          profilePhotoUrl: r.profile_photo_url,
          bannerImageUrl: r.banner_image_url,
          city: r.city,
          area: r.area,
          status: r.status,
          isWomenLed: r.is_women_led,
          isFeatured: r.is_featured,
          distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
          avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
          reviewCount: parseInt(r.review_count, 10),
          categories: r.categories,
          relevanceScore: parseFloat(parseFloat(r.relevance_score).toFixed(3)),
          hasActiveOffer: r.has_active_offer || false,
          offerTitle: r.offer_title || null,
          discountValue: r.discount_value != null ? parseFloat(r.discount_value) : null,
          discountType: r.discount_type || null,
        })),
        total,
      };
    } catch (err) {
      this.logger.error(`Provider search failed: ${err instanceof Error ? err.message : err}`);
      this.logger.debug(`Failed SQL params: ${JSON.stringify(allParams.map((p, i) => `$${i+1}=${typeof p === 'object' ? JSON.stringify(p) : p}`))}`);
      return { data: [], total: 0 };
    }
  }

  // ────────────────────────────────────────────────────────────
  // DEALS / OFFERS SECTION — providers with active discounts
  // ────────────────────────────────────────────────────────────

  private async getDealsProviders(
    q: string,
    prefixTsQuery: string,
    opts: { lat?: number; lng?: number; radius: number; city?: string; hasGeo: boolean; categoryIds?: string[] },
  ): Promise<ProviderSearchResult[]> {
    try {
      const allParams: any[] = [q, prefixTsQuery];
      let distExpr = 'NULL';

      if (opts.hasGeo) {
        distExpr = `6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($4)) + sin(radians($3)) * sin(radians(p.latitude))))`;
        allParams.push(opts.lat, opts.lng);
      }

      let pi = allParams.length + 1;
      const conditions: string[] = [
        `p.status IN ('active', 'unverified')`,
        `po.is_active = true`,
        `po.starts_at <= NOW()`,
        `po.ends_at >= NOW()`,
      ];

      if (opts.hasGeo) {
        conditions.push(`p.latitude IS NOT NULL`, `p.longitude IS NOT NULL`);
        conditions.push(`${distExpr} <= $${pi}`);
        allParams.push(opts.radius);
        pi++;
      }

      if (opts.city) {
        conditions.push(`p.city ILIKE $${pi}`);
        allParams.push(`%${opts.city}%`);
        pi++;
      }

      const hasCategoryFilter = opts.categoryIds && opts.categoryIds.length > 0;
      if (hasCategoryFilter) {
        const catPlaceholders = opts.categoryIds!.map((_, idx) => `$${pi + idx}`);
        conditions.push(`p.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id IN (${catPlaceholders.join(',')}))`);
        allParams.push(...opts.categoryIds!);
        pi += opts.categoryIds!.length;
      }

      // Text match (skip if category filter)
      if (!hasCategoryFilter) {
        conditions.push(`(
          ($2 <> '' AND p.search_vector @@ to_tsquery('english', $2))
          OR similarity(p.brand_name, $1) > 0.1
          OR p.brand_name ILIKE '%' || $1 || '%'
        )`);
      }

      const sql = `
        SELECT DISTINCT ON (p.id)
          p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
          p.city, p.area, p.status, p.is_women_led, p.is_featured,
          ${distExpr} AS distance,
          rs.avg_rating, COALESCE(rs.review_count, 0) AS review_count,
          (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories,
          po.title AS offer_title, po.discount_value, po.discount_type,
          po.discount_value AS sort_discount
        FROM providers p
        JOIN provider_offers po ON po.provider_id = p.id
        LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.id, po.discount_value DESC
      `;

      // Wrap to re-sort by discount
      const wrapSql = `
        SELECT * FROM (${sql}) sub
        ORDER BY sort_discount DESC NULLS LAST
        LIMIT 5
      `;

      const rows = await this.dataSource.query(wrapSql, allParams);

      return rows.map((r: any) => ({
        id: r.id,
        brandName: r.brand_name,
        description: r.description,
        profilePhotoUrl: r.profile_photo_url,
        bannerImageUrl: r.banner_image_url,
        city: r.city,
        area: r.area,
        status: r.status,
        isWomenLed: r.is_women_led,
        isFeatured: r.is_featured,
        distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
        avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
        reviewCount: parseInt(r.review_count, 10),
        categories: r.categories,
        relevanceScore: 0.9,
        hasActiveOffer: true,
        offerTitle: r.offer_title,
        discountValue: r.discount_value != null ? parseFloat(r.discount_value) : null,
        discountType: r.discount_type,
      }));
    } catch (err) {
      this.logger.error(`Deals search failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // TOP RATED SECTION — 4+ star providers with 3+ reviews
  // ────────────────────────────────────────────────────────────

  private async getTopRatedProviders(
    q: string,
    prefixTsQuery: string,
    opts: { lat?: number; lng?: number; radius: number; city?: string; hasGeo: boolean; categoryIds?: string[] },
  ): Promise<ProviderSearchResult[]> {
    try {
      const allParams: any[] = [q, prefixTsQuery];
      let distExpr = 'NULL';

      if (opts.hasGeo) {
        distExpr = `6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($4)) + sin(radians($3)) * sin(radians(p.latitude))))`;
        allParams.push(opts.lat, opts.lng);
      }

      let pi = allParams.length + 1;
      const conditions: string[] = [
        `p.status IN ('active', 'unverified')`,
        `rs.avg_rating >= 4.0`,
        `rs.review_count >= 3`,
      ];

      if (opts.hasGeo) {
        conditions.push(`p.latitude IS NOT NULL`, `p.longitude IS NOT NULL`);
        conditions.push(`${distExpr} <= $${pi}`);
        allParams.push(opts.radius);
        pi++;
      }

      if (opts.city) {
        conditions.push(`p.city ILIKE $${pi}`);
        allParams.push(`%${opts.city}%`);
        pi++;
      }

      const hasCategoryFilter = opts.categoryIds && opts.categoryIds.length > 0;
      if (hasCategoryFilter) {
        const catPlaceholders = opts.categoryIds!.map((_, idx) => `$${pi + idx}`);
        conditions.push(`p.id IN (SELECT pc.provider_id FROM provider_categories pc WHERE pc.category_id IN (${catPlaceholders.join(',')}))`);
        allParams.push(...opts.categoryIds!);
        pi += opts.categoryIds!.length;
      }

      if (!hasCategoryFilter) {
        conditions.push(`(
          ($2 <> '' AND p.search_vector @@ to_tsquery('english', $2))
          OR similarity(p.brand_name, $1) > 0.1
          OR p.brand_name ILIKE '%' || $1 || '%'
        )`);
      }

      allParams.push(5); // limit

      const sql = `
        SELECT
          p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
          p.city, p.area, p.status, p.is_women_led, p.is_featured,
          ${distExpr} AS distance,
          rs.avg_rating, rs.review_count,
          (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories
        FROM providers p
        JOIN provider_rating_stats rs ON rs.provider_id = p.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY rs.avg_rating DESC, rs.review_count DESC
        LIMIT $${pi}
      `;

      const rows = await this.dataSource.query(sql, allParams);

      return rows.map((r: any) => ({
        id: r.id,
        brandName: r.brand_name,
        description: r.description,
        profilePhotoUrl: r.profile_photo_url,
        bannerImageUrl: r.banner_image_url,
        city: r.city,
        area: r.area,
        status: r.status,
        isWomenLed: r.is_women_led,
        isFeatured: r.is_featured,
        distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
        avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
        reviewCount: parseInt(r.review_count, 10),
        categories: r.categories,
        relevanceScore: 0.95,
      }));
    } catch (err) {
      this.logger.error(`Top rated search failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // SPONSORED PROVIDERS IN SEARCH RESULTS
  // ────────────────────────────────────────────────────────────

  private async getMatchingSponsoredProviders(
    q: string,
    prefixTsQuery: string,
    lat?: number,
    lng?: number,
    city?: string,
    categoryIds?: string[],
  ): Promise<ProviderSearchResult[]> {
    try {
      // 1. Resolve which categories match the query
      let matchedCatIds: string[];

      if (categoryIds && categoryIds.length > 0) {
        matchedCatIds = categoryIds;
      } else {
        const catMatchSql = `
          SELECT id FROM categories
          WHERE is_active = true AND (
            ($2 <> '' AND search_vector @@ to_tsquery('english', $2))
            OR similarity(name, $1) > 0.3
            OR name ILIKE '%' || $1 || '%'
            OR $1 = ANY(keywords)
          )
        `;
        const matchedCats: { id: string }[] = await this.dataSource.query(catMatchSql, [q, prefixTsQuery]);
        if (matchedCats.length === 0) return [];
        matchedCatIds = matchedCats.map((c) => c.id);
      }

      // 2. Fetch active sponsored listings targeting those categories
      const hasGeo = lat != null && lng != null;
      let distExpr = 'NULL';
      const params: any[] = [matchedCatIds];
      let pi = 2;

      if (hasGeo) {
        distExpr = `6371 * acos(LEAST(1.0, cos(radians($${pi})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${pi + 1})) + sin(radians($${pi})) * sin(radians(p.latitude))))`;
        params.push(lat, lng);
        pi += 2;
      }

      const cityCondition = city
        ? `AND (sl.target_cities IS NULL OR $${pi} = ANY(sl.target_cities))`
        : '';
      if (city) {
        params.push(city);
        pi++;
      }

      const radiusCondition = hasGeo
        ? `AND (sl.target_radius IS NULL OR ${distExpr} <= sl.target_radius)`
        : '';

      const sql = `
        SELECT
          p.id,
          p.brand_name,
          p.description,
          p.profile_photo_url,
          p.banner_image_url,
          p.city,
          p.area,
          p.status,
          p.is_women_led,
          p.is_featured,
          ${distExpr} AS distance,
          sl.id AS sponsored_listing_id,
          sl.cost_per_click,
          rs.avg_rating,
          COALESCE(rs.review_count, 0) AS review_count,
          (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories
        FROM sponsored_listings sl
        JOIN providers p ON p.id = sl.provider_id
        LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
        WHERE sl.is_active = true
          AND sl.starts_at <= NOW()
          AND sl.ends_at >= NOW()
          AND sl.spent_amount < sl.budget_amount
          AND p.status IN ('active', 'unverified')
          AND sl.target_category_ids && $1::uuid[]
          ${cityCondition}
          ${radiusCondition}
        ORDER BY sl.cost_per_click DESC, RANDOM()
        LIMIT 3
      `;

      const rows = await this.dataSource.query(sql, params);

      // 3. Track impressions (fire and forget)
      for (const r of rows) {
        this.dataSource.query(
          `UPDATE sponsored_listings SET impressions = impressions + 1 WHERE id = $1`,
          [r.sponsored_listing_id],
        ).catch(() => {});
      }

      return rows.map((r: any) => ({
        id: r.id,
        brandName: r.brand_name,
        description: r.description,
        profilePhotoUrl: r.profile_photo_url,
        bannerImageUrl: r.banner_image_url,
        city: r.city,
        area: r.area,
        status: r.status,
        isWomenLed: r.is_women_led,
        isFeatured: r.is_featured,
        distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
        avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
        reviewCount: parseInt(r.review_count, 10),
        categories: r.categories,
        relevanceScore: 1.0,
        isSponsored: true,
        sponsoredListingId: r.sponsored_listing_id,
      }));
    } catch (err) {
      this.logger.error(`Sponsored search failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // PRODUCT SEARCH
  // ────────────────────────────────────────────────────────────

  private async searchProducts(
    q: string,
    prefixTsQuery: string,
    opts: { lat?: number; lng?: number; radius: number; offset: number; limit: number; hasGeo: boolean; productType?: string },
  ): Promise<{ data: ProductSearchResult[]; total: number }> {
    const allParams: any[] = [q, prefixTsQuery];

    let distExpr = 'NULL';
    if (opts.hasGeo) {
      distExpr = `6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(prov.latitude)) * cos(radians(prov.longitude) - radians($4)) + sin(radians($3)) * sin(radians(prov.latitude))))`;
      allParams.push(opts.lat, opts.lng);
    }

    let pi = allParams.length + 1;
    const conditions: string[] = [
      `prod.is_active = true`,
      `prov.status IN ('active', 'unverified')`,
    ];

    if (opts.hasGeo) {
      conditions.push(`prov.latitude IS NOT NULL`);
      conditions.push(`prov.longitude IS NOT NULL`);
      conditions.push(`${distExpr} <= $${pi}`);
      allParams.push(opts.radius);
      pi++;
    }

    if (opts.productType) {
      conditions.push(`prod.product_type = $${pi}`);
      allParams.push(opts.productType);
      pi++;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        prod.id,
        prod.name,
        prod.description,
        prod.price,
        prod.currency,
        prod.photo_url,
        prod.product_type,
        prod.provider_id,
        prov.brand_name AS provider_name,
        prov.city AS provider_city,
        prov.area AS provider_area,
        ${distExpr} AS distance,
        (
          CASE WHEN $2 <> '' THEN COALESCE(ts_rank_cd(prod.search_vector, to_tsquery('english', $2)), 0) * 0.6 ELSE 0 END +
          COALESCE(similarity(prod.name, $1), 0) * 0.4
        ) AS relevance_score,
        COUNT(*) OVER() AS total_count
      FROM products prod
      JOIN providers prov ON prov.id = prod.provider_id
      WHERE ${whereClause}
        AND (
          ($2 <> '' AND prod.search_vector @@ to_tsquery('english', $2))
          OR similarity(prod.name, $1) > 0.15
          OR prod.name ILIKE '%' || $1 || '%'
        )
      ORDER BY relevance_score DESC, distance ASC NULLS LAST
      LIMIT $${pi} OFFSET $${pi + 1}
    `;

    allParams.push(opts.limit, opts.offset);

    try {
      const rows = await this.dataSource.query(sql, allParams);
      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

      return {
        data: rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          price: r.price != null ? parseFloat(r.price) : null,
          currency: r.currency,
          photoUrl: r.photo_url,
          productType: r.product_type || 'product',
          providerId: r.provider_id,
          providerName: r.provider_name,
          providerCity: r.provider_city,
          providerArea: r.provider_area,
          distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
          relevanceScore: parseFloat(parseFloat(r.relevance_score).toFixed(3)),
        })),
        total,
      };
    } catch (err) {
      this.logger.error('Product search failed', err);
      return { data: [], total: 0 };
    }
  }

  // ────────────────────────────────────────────────────────────
  // CATEGORY SEARCH
  // ────────────────────────────────────────────────────────────

  private async searchCategories(
    q: string,
    prefixTsQuery: string,
    opts: { offset: number; limit: number },
  ): Promise<{ data: CategorySearchResult[]; total: number }> {
    const sql = `
      WITH cat_counts AS (
        SELECT category_id, COUNT(DISTINCT provider_id) AS provider_count
        FROM provider_categories GROUP BY category_id
      )
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.image_url,
        c.parent_id,
        COALESCE(cc.provider_count, 0) AS provider_count,
        (
          CASE WHEN $2 <> '' THEN COALESCE(ts_rank_cd(c.search_vector, to_tsquery('english', $2)), 0) * 0.5 ELSE 0 END +
          COALESCE(similarity(c.name, $1), 0) * 0.5
        ) AS relevance_score,
        COUNT(*) OVER() AS total_count
      FROM categories c
      LEFT JOIN cat_counts cc ON cc.category_id = c.id
      WHERE c.is_active = true
        AND (
          ($2 <> '' AND c.search_vector @@ to_tsquery('english', $2))
          OR similarity(c.name, $1) > 0.15
          OR c.name ILIKE '%' || $1 || '%'
          OR $1 = ANY(c.keywords)
        )
      ORDER BY relevance_score DESC
      LIMIT $3 OFFSET $4
    `;

    try {
      const rows = await this.dataSource.query(sql, [q, prefixTsQuery, opts.limit, opts.offset]);
      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

      return {
        data: rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          icon: r.icon,
          imageUrl: r.image_url,
          parentId: r.parent_id,
          providerCount: parseInt(r.provider_count, 10),
          relevanceScore: parseFloat(parseFloat(r.relevance_score).toFixed(3)),
        })),
        total,
      };
    } catch (err) {
      this.logger.error('Category search failed', err);
      return { data: [], total: 0 };
    }
  }

  // ────────────────────────────────────────────────────────────
  // AUTOCOMPLETE SUGGESTIONS (cached)
  // ────────────────────────────────────────────────────────────

  async getSuggestions(dto: SuggestionsQueryDto): Promise<SearchSuggestion[]> {
    const { q, lat, lng, limit = 8 } = dto;
    const hasGeo = lat != null && lng != null;

    // Check cache
    const cacheKey = this.buildCacheKey('suggestions', { q: q.toLowerCase().trim(), lat, lng, limit });
    const cached = await this.cacheManager.get<SearchSuggestion[]>(cacheKey);
    if (cached) return cached;

    // Expand query with synonyms for better suggestions
    const expandedQ = await this.expandQuery(q);

    const [providerSuggs, productSuggs, categorySuggs] = await Promise.all([
      this.getProviderSuggestions(expandedQ, hasGeo, lat, lng, Math.ceil(limit * 0.5)),
      this.getProductSuggestions(expandedQ, Math.ceil(limit * 0.3)),
      this.getCategorySuggestions(expandedQ, Math.ceil(limit * 0.2)),
    ]);

    const all = [...providerSuggs, ...productSuggs, ...categorySuggs];
    const result = all.slice(0, limit);

    // Cache for 120 seconds
    await this.cacheManager.set(cacheKey, result, 120_000);
    return result;
  }

  private async getProviderSuggestions(
    q: string,
    hasGeo: boolean,
    lat?: number,
    lng?: number,
    limit = 4,
  ): Promise<SearchSuggestion[]> {
    const prefixTsQuery = this.buildPrefixTsQuery(q);
    let distExpr = 'NULL';
    const params: any[] = [q, prefixTsQuery];
    if (hasGeo) {
      distExpr = `6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($4)) + sin(radians($3)) * sin(radians(p.latitude))))`;
      params.push(lat, lng);
    }

    const pi = params.length + 1;

    const sql = `
      SELECT
        p.id,
        p.brand_name,
        p.profile_photo_url,
        cn.categories,
        ${distExpr} AS distance,
        rs.avg_rating,
        GREATEST(
          similarity(p.brand_name, $1),
          CASE WHEN $2 <> '' AND p.search_vector @@ to_tsquery('english', $2)
               THEN 0.5 ELSE 0 END
        ) AS sim
      FROM providers p
      LEFT JOIN LATERAL (
        SELECT string_agg(DISTINCT c.name, ', ') AS categories
        FROM provider_categories pc JOIN categories c ON c.id = pc.category_id
        WHERE pc.provider_id = p.id
      ) cn ON true
      LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
      WHERE p.status IN ('active', 'unverified')
        AND (
          ($2 <> '' AND p.search_vector @@ to_tsquery('english', $2))
          OR similarity(p.brand_name, $1) > 0.06
          OR p.brand_name ILIKE $1 || '%'
          OR p.brand_name ILIKE '%' || $1 || '%'
        )
      ORDER BY
        CASE WHEN lower(p.brand_name) = lower($1) THEN 0
             WHEN lower(p.brand_name) LIKE lower($1) || '%' THEN 1
             ELSE 2 END,
        sim DESC,
        distance ASC NULLS LAST
      LIMIT $${pi}
    `;
    params.push(limit);

    try {
      const rows = await this.dataSource.query(sql, params);
      return rows.map((r: any) => ({
        text: r.brand_name,
        type: 'provider' as const,
        id: r.id,
        subtitle: [
          r.categories,
          r.avg_rating ? `★ ${parseFloat(r.avg_rating).toFixed(1)}` : null,
          r.distance != null ? `${parseFloat(r.distance).toFixed(1)} km` : null,
        ].filter(Boolean).join(' · '),
        imageUrl: r.profile_photo_url,
      }));
    } catch {
      return [];
    }
  }

  private async getProductSuggestions(q: string, limit = 3): Promise<SearchSuggestion[]> {
    const prefixTsQuery = this.buildPrefixTsQuery(q);
    const sql = `
      SELECT
        prod.id,
        prod.name,
        prod.photo_url,
        prod.price,
        prod.currency,
        prov.brand_name AS provider_name,
        GREATEST(
          similarity(prod.name, $1),
          CASE WHEN $2 <> '' AND prod.search_vector @@ to_tsquery('english', $2)
               THEN 0.5 ELSE 0 END
        ) AS sim
      FROM products prod
      JOIN providers prov ON prov.id = prod.provider_id
      WHERE prod.is_active = true
        AND prov.status IN ('active', 'unverified')
        AND (
          ($2 <> '' AND prod.search_vector @@ to_tsquery('english', $2))
          OR similarity(prod.name, $1) > 0.08
          OR prod.name ILIKE $1 || '%'
          OR prod.name ILIKE '%' || $1 || '%'
        )
      ORDER BY
        CASE WHEN lower(prod.name) LIKE lower($1) || '%' THEN 0 ELSE 1 END,
        sim DESC
      LIMIT $3
    `;

    try {
      const rows = await this.dataSource.query(sql, [q, prefixTsQuery, limit]);
      return rows.map((r: any) => ({
        text: r.name,
        type: 'product' as const,
        id: r.id,
        subtitle: [r.provider_name, r.price != null ? `${r.currency} ${r.price}` : null]
          .filter(Boolean)
          .join(' · '),
        imageUrl: r.photo_url,
      }));
    } catch {
      return [];
    }
  }

  private async getCategorySuggestions(q: string, limit = 2): Promise<SearchSuggestion[]> {
    const prefixTsQuery = this.buildPrefixTsQuery(q);
    const sql = `
      SELECT
        c.id,
        c.name,
        c.icon,
        COALESCE(cc.cnt, 0) AS provider_count,
        GREATEST(
          similarity(c.name, $1),
          CASE WHEN $2 <> '' AND c.search_vector @@ to_tsquery('english', $2)
               THEN 0.5 ELSE 0 END
        ) AS sim
      FROM categories c
      LEFT JOIN (
        SELECT category_id, COUNT(DISTINCT provider_id) AS cnt
        FROM provider_categories GROUP BY category_id
      ) cc ON cc.category_id = c.id
      WHERE c.is_active = true
        AND (
          ($2 <> '' AND c.search_vector @@ to_tsquery('english', $2))
          OR similarity(c.name, $1) > 0.08
          OR c.name ILIKE $1 || '%'
          OR c.name ILIKE '%' || $1 || '%'
          OR $1 = ANY(c.keywords)
          OR EXISTS (
            SELECT 1 FROM unnest(c.keywords) kw WHERE kw ILIKE '%' || $1 || '%'
          )
        )
      ORDER BY
        CASE WHEN lower(c.name) LIKE lower($1) || '%' THEN 0 ELSE 1 END,
        sim DESC
      LIMIT $3
    `;

    try {
      const rows = await this.dataSource.query(sql, [q, prefixTsQuery, limit]);
      return rows.map((r: any) => ({
        text: r.name,
        type: 'category' as const,
        id: r.id,
        subtitle: `${r.provider_count} providers`,
        imageUrl: r.icon,
      }));
    } catch {
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // TRENDING SEARCHES (cached)
  // ────────────────────────────────────────────────────────────

  async getTrending(city?: string, limit = 10): Promise<{ query: string; count: number }[]> {
    const cacheKey = this.buildCacheKey('trending', { city: city || '', limit });
    const cached = await this.cacheManager.get<{ query: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    const conditions: string[] = [
      `created_at > NOW() - INTERVAL '7 days'`,
    ];
    const params: any[] = [];

    if (city) {
      params.push(`%${city}%`);
      conditions.push(`city ILIKE $${params.length}`);
    }

    params.push(limit);

    const sql = `
      SELECT lower(query) AS query, COUNT(*) AS count
      FROM search_logs
      WHERE ${conditions.join(' AND ')}
      GROUP BY lower(query)
      HAVING COUNT(*) >= 2
      ORDER BY count DESC
      LIMIT $${params.length}
    `;

    try {
      const rows = await this.dataSource.query(sql, params);
      const result = rows.map((r: any) => ({
        query: r.query,
        count: parseInt(r.count, 10),
      }));

      // Cache for 15 minutes
      await this.cacheManager.set(cacheKey, result, 15 * 60_000);
      return result;
    } catch {
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // RECENT SEARCHES
  // ────────────────────────────────────────────────────────────

  async getRecent(userId: string, limit = 10): Promise<{ query: string; createdAt: Date }[]> {
    const outerSql = `
      SELECT query, created_at FROM (
        SELECT DISTINCT ON (lower(query)) query, created_at
        FROM search_logs
        WHERE user_id = $1
        ORDER BY lower(query), created_at DESC
      ) sub
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const rows = await this.dataSource.query(outerSql, [userId, limit]);
      return rows.map((r: any) => ({
        query: r.query,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  async clearRecent(userId: string): Promise<void> {
    await this.searchLogRepo.delete({ userId });
  }

  // ────────────────────────────────────────────────────────────
  // FALLBACK STRATEGY (zero-result rescue) — ENHANCED
  // ────────────────────────────────────────────────────────────

  private async buildFallback(
    q: string,
    expandedQ: string,
    prefixTsQuery: string,
    opts: { lat?: number; lng?: number; radius: number; city?: string; hasGeo: boolean },
  ): Promise<SearchFallback> {
    const fallback: SearchFallback = {};

    try {
      // Run all fallback strategies in parallel
      const [relaxed, relatedCats, trending, nearbyPopular, peopleAlso] = await Promise.all([
        this.searchProvidersRelaxed(expandedQ, prefixTsQuery, opts),
        this.getRelatedCategories(q),
        this.getTrending(opts.city, 6),
        opts.hasGeo ? this.getNearbyPopular(opts.lat!, opts.lng!, opts.radius) : Promise.resolve([]),
        this.getPeopleAlsoSearched(q),
      ]);

      if (relaxed.length > 0) fallback.relaxedProviders = relaxed;
      if (relatedCats.length > 0) fallback.relatedCategories = relatedCats;
      if (trending.length > 0) fallback.trending = trending;
      if (nearbyPopular.length > 0) fallback.nearbyPopular = nearbyPopular;
      if (peopleAlso.length > 0) fallback.peopleAlsoSearched = peopleAlso;
    } catch (err) {
      this.logger.warn('Fallback generation failed', err);
    }

    return fallback;
  }

  // NEW: "People also searched for" — co-occurring queries from search_logs
  private async getPeopleAlsoSearched(q: string): Promise<string[]> {
    try {
      const sql = `
        SELECT lower(sl2.query) AS query, COUNT(*) AS cnt
        FROM search_logs sl1
        JOIN search_logs sl2 ON sl2.user_id = sl1.user_id
          AND sl2.created_at BETWEEN sl1.created_at - INTERVAL '30 minutes' AND sl1.created_at + INTERVAL '30 minutes'
          AND lower(sl2.query) <> lower(sl1.query)
        WHERE lower(sl1.query) = lower($1)
          AND sl1.created_at > NOW() - INTERVAL '30 days'
          AND sl2.result_count > 0
        GROUP BY lower(sl2.query)
        ORDER BY cnt DESC
        LIMIT 5
      `;
      const rows = await this.dataSource.query(sql, [q]);
      return rows.map((r: any) => r.query);
    } catch {
      return [];
    }
  }

  private async searchProvidersRelaxed(
    q: string,
    prefixTsQuery: string,
    opts: { lat?: number; lng?: number; radius: number; city?: string; hasGeo: boolean },
  ): Promise<ProviderSearchResult[]> {
    for (const attempt of ['wide_radius', 'no_geo'] as const) {
      try {
        const useGeo = attempt === 'wide_radius' && opts.hasGeo;
        const wideRadius = Math.min(opts.radius * 4, 100);
        const params: any[] = [q, prefixTsQuery];
        let distExpr = 'NULL';

        if (useGeo) {
          distExpr = `6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($4)) + sin(radians($3)) * sin(radians(p.latitude))))`;
          params.push(opts.lat, opts.lng);
        }

        let pi = params.length + 1;
        const conditions: string[] = [`p.status IN ('active', 'unverified')`];

        if (useGeo) {
          conditions.push(`p.latitude IS NOT NULL`, `p.longitude IS NOT NULL`);
          conditions.push(`${distExpr} <= $${pi}`);
          params.push(wideRadius);
          pi++;
        }

        if (opts.city) {
          conditions.push(`p.city ILIKE $${pi}`);
          params.push(`%${opts.city}%`);
          pi++;
        }

        // Lower thresholds + trigram fuzzy for relaxed search
        conditions.push(`(
          ($2 <> '' AND p.search_vector @@ to_tsquery('english', $2))
          OR similarity(p.brand_name, $1) > 0.05
          OR p.brand_name ILIKE '%' || $1 || '%'
          OR p.description ILIKE '%' || $1 || '%'
        )`);

        params.push(6);

        const sql = `
          SELECT
            p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
            p.city, p.area, p.status, p.is_women_led, p.is_featured,
            ${distExpr} AS distance,
            rs.avg_rating, COALESCE(rs.review_count, 0) AS review_count,
            (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories,
            GREATEST(
              CASE WHEN $2 <> '' THEN COALESCE(ts_rank_cd(p.search_vector, to_tsquery('english', $2)), 0) ELSE 0 END,
              similarity(p.brand_name, $1)
            ) AS relevance_score
          FROM providers p
          LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
          WHERE ${conditions.join(' AND ')}
          ORDER BY relevance_score DESC, distance ASC NULLS LAST
          LIMIT $${pi}
        `;

        const rows = await this.dataSource.query(sql, params);
        if (rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            brandName: r.brand_name,
            description: r.description,
            profilePhotoUrl: r.profile_photo_url,
            bannerImageUrl: r.banner_image_url,
            city: r.city,
            area: r.area,
            status: r.status,
            isWomenLed: r.is_women_led,
            isFeatured: r.is_featured,
            distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
            avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
            reviewCount: parseInt(r.review_count, 10),
            categories: r.categories,
            relevanceScore: parseFloat(parseFloat(r.relevance_score).toFixed(3)),
          }));
        }
      } catch {
        continue;
      }
    }
    return [];
  }

  private async getRelatedCategories(q: string): Promise<CategorySearchResult[]> {
    try {
      const sql = `
        WITH cat_counts AS (
          SELECT category_id, COUNT(DISTINCT provider_id) AS provider_count
          FROM provider_categories GROUP BY category_id
        )
        SELECT
          c.id, c.name, c.slug, c.description, c.icon, c.image_url, c.parent_id,
          COALESCE(cc.provider_count, 0) AS provider_count,
          GREATEST(
            similarity(c.name, $1),
            (SELECT MAX(similarity(kw, $1)) FROM unnest(c.keywords) kw)
          ) AS relevance_score
        FROM categories c
        LEFT JOIN cat_counts cc ON cc.category_id = c.id
        WHERE c.is_active = true
          AND (
            similarity(c.name, $1) > 0.1
            OR c.name ILIKE '%' || $1 || '%'
            OR EXISTS (SELECT 1 FROM unnest(c.keywords) kw WHERE similarity(kw, $1) > 0.2 OR kw ILIKE '%' || $1 || '%')
          )
        ORDER BY relevance_score DESC NULLS LAST
        LIMIT 4
      `;
      const rows = await this.dataSource.query(sql, [q]);
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        icon: r.icon,
        imageUrl: r.image_url,
        parentId: r.parent_id,
        providerCount: parseInt(r.provider_count, 10),
        relevanceScore: parseFloat(parseFloat(r.relevance_score || '0').toFixed(3)),
      }));
    } catch {
      return [];
    }
  }

  private async getNearbyPopular(lat: number, lng: number, radius: number): Promise<ProviderSearchResult[]> {
    try {
      const distExpr = `6371 * acos(LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2)) + sin(radians($1)) * sin(radians(p.latitude))))`;
      const sql = `
        SELECT
          p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
          p.city, p.area, p.status, p.is_women_led, p.is_featured,
          ${distExpr} AS distance,
          rs.avg_rating, COALESCE(rs.review_count, 0) AS review_count,
          (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories,
          COALESCE(rs.avg_rating, 0) AS relevance_score
        FROM providers p
        LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
        WHERE p.status IN ('active', 'unverified')
          AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          AND ${distExpr} <= $3
        ORDER BY rs.avg_rating DESC NULLS LAST, rs.review_count DESC NULLS LAST
        LIMIT 6
      `;
      const rows = await this.dataSource.query(sql, [lat, lng, radius]);
      return rows.map((r: any) => ({
        id: r.id,
        brandName: r.brand_name,
        description: r.description,
        profilePhotoUrl: r.profile_photo_url,
        bannerImageUrl: r.banner_image_url,
        city: r.city,
        area: r.area,
        status: r.status,
        isWomenLed: r.is_women_led,
        isFeatured: r.is_featured,
        distance: r.distance != null ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
        avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
        reviewCount: parseInt(r.review_count, 10),
        categories: r.categories,
        relevanceScore: parseFloat(parseFloat(r.relevance_score || '0').toFixed(3)),
      }));
    } catch {
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────

  private buildPrefixTsQuery(q: string): string {
    const sanitized = q.replace(/[^\w\s]/g, ' ').trim();
    const words = sanitized.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    return words.map((w) => `${w}:*`).join(' & ');
  }

  // IMPROVED: Fuzzy synonym matching instead of exact-only
  private async expandQuery(q: string): Promise<string> {
    try {
      const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return q;
      const terms = [q.toLowerCase().trim(), ...words];

      // Try exact match first (fast path)
      const exactRows: { canonical_term: string }[] = await this.dataSource.query(
        `SELECT DISTINCT canonical_term FROM search_synonyms WHERE lower(term) = ANY($1)`,
        [terms],
      );

      let expansions: string[] = exactRows.map((r) => r.canonical_term);

      // If no exact match, try fuzzy trigram matching (catches misspellings)
      if (expansions.length === 0) {
        const fuzzyRows: { canonical_term: string }[] = await this.dataSource.query(
          `SELECT DISTINCT ON (canonical_term) canonical_term, MAX(similarity(lower(term), t.token)) AS sim
           FROM search_synonyms, unnest($1::text[]) AS t(token)
           WHERE similarity(lower(term), t.token) > 0.3
           GROUP BY canonical_term
           ORDER BY canonical_term, sim DESC
           LIMIT 5`,
          [terms],
        );
        expansions = fuzzyRows.map((r) => r.canonical_term);
      }

      const filtered = expansions.filter((t) => !q.toLowerCase().includes(t.toLowerCase()));
      if (filtered.length === 0) return q;
      return `${q} ${filtered.join(' ')}`;
    } catch {
      return q;
    }
  }

  private async getDidYouMean(q: string): Promise<string | undefined> {
    try {
      const sql = `
        SELECT name, sim FROM (
          SELECT name, similarity(name, $1) AS sim
          FROM categories
          WHERE is_active = true AND similarity(name, $1) > 0.2
          UNION ALL
          SELECT DISTINCT kw AS name, similarity(kw, $1) AS sim
          FROM categories, unnest(keywords) AS kw
          WHERE is_active = true AND similarity(kw, $1) > 0.3
          UNION ALL
          SELECT brand_name AS name, similarity(brand_name, $1) AS sim
          FROM providers
          WHERE status IN ('active', 'unverified') AND similarity(brand_name, $1) > 0.3
          UNION ALL
          SELECT name, similarity(name, $1) AS sim
          FROM products
          WHERE is_active = true AND similarity(name, $1) > 0.3
        ) sub
        ORDER BY sim DESC
        LIMIT 1
      `;
      const rows = await this.dataSource.query(sql, [q]);
      if (rows.length > 0 && rows[0].name.toLowerCase() !== q.toLowerCase()) {
        return rows[0].name;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async logSearch(
    query: string,
    userId?: string,
    resultCount = 0,
    lat?: number,
    lng?: number,
    city?: string,
  ): Promise<void> {
    try {
      const log = this.searchLogRepo.create({
        query: query.toLowerCase().trim().slice(0, 255),
        userId: userId || null,
        resultCount,
        lat: lat ?? null,
        lng: lng ?? null,
        city: city || null,
      });
      await this.searchLogRepo.save(log);
    } catch (err) {
      this.logger.warn('Failed to log search', err);
    }
  }

  private async logSearchAppearances(
    providerIds: string[],
    userId?: string,
    query?: string,
  ): Promise<void> {
    try {
      if (providerIds.length === 0) return;
      const now = new Date();
      const rows = providerIds.map((pid) => ({
        providerId: pid,
        userId: userId || null,
        sessionId: 'search-server',
        eventType: 'search_appearance' as const,
        entityId: null,
        metadata: query ? ({ query } as any) : null,
        duration: null,
        source: 'search' as const,
        createdAt: now,
      }));
      await this.analyticsEventRepo
        .createQueryBuilder()
        .insert()
        .into(ProviderAnalyticsEvent)
        .values(rows)
        .execute();
    } catch (err) {
      this.logger.warn('Failed to log search appearances', err);
    }
  }
}
