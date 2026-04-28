import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
}

export interface ProductSearchResult {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  photoUrl: string | null;
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

export interface SearchResponse {
  providers: { data: ProviderSearchResult[]; total: number };
  products: { data: ProductSearchResult[]; total: number };
  categories: { data: CategorySearchResult[]; total: number };
  meta: { query: string; tookMs: number; totalResults: number; didYouMean?: string };
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
  ) {}

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
    } = dto;
    const offset = (page - 1) * limit;
    const hasGeo = lat != null && lng != null;

    // Expand query with synonyms before building tsquery
    const expandedQ = await this.expandQuery(q);
    const prefixTsQuery = this.buildPrefixTsQuery(expandedQ);
    const tsQuery = this.buildTsQuery(expandedQ);

    // Run searches in parallel based on type
    const [providers, products, categories] = await Promise.all([
      type === 'all' || type === 'providers'
        ? this.searchProviders(expandedQ, tsQuery, prefixTsQuery, { lat, lng, radius, offset, limit, categoryIds, sortBy, minRating, city, hasGeo })
        : Promise.resolve({ data: [], total: 0 }),
      type === 'all' || type === 'products'
        ? this.searchProducts(expandedQ, tsQuery, prefixTsQuery, { lat, lng, radius, offset, limit: type === 'all' ? 5 : limit, hasGeo })
        : Promise.resolve({ data: [], total: 0 }),
      type === 'all' || type === 'categories'
        ? this.searchCategories(expandedQ, tsQuery, prefixTsQuery, { offset, limit: type === 'all' ? 5 : limit })
        : Promise.resolve({ data: [], total: 0 }),
    ]);

    // Inject sponsored providers into first page of results (now works with category filter too)
    if ((type === 'all' || type === 'providers') && page === 1) {
      const sponsored = await this.getMatchingSponsoredProviders(expandedQ, prefixTsQuery, lat, lng, city, categoryIds);
      if (sponsored.length > 0) {
        // Filter out any organic results that are already in sponsored
        const sponsoredIds = new Set(sponsored.map((s) => s.id));
        const organicData = providers.data.filter((p) => !sponsoredIds.has(p.id));
        providers.data = [...sponsored, ...organicData];
        providers.total = providers.total + sponsored.length;
      }
    }

    const totalResults = providers.total + products.total + categories.total;
    const tookMs = Date.now() - start;

    // "Did you mean?" when results are very few
    let didYouMean: string | undefined;
    if (totalResults < 3) {
      didYouMean = await this.getDidYouMean(q);
    }

    // Log search (fire and forget)
    this.logSearch(q, userId, totalResults, lat, lng, city).catch(() => {});

    // Track search appearances for analytics (fire and forget)
    if (providers.data.length > 0) {
      this.logSearchAppearances(providers.data.map((p) => p.id), userId, q).catch(() => {});
    }

    return {
      providers,
      products,
      categories,
      meta: { query: q, tookMs, totalResults, ...(didYouMean ? { didYouMean } : {}) },
    };
  }

  // ────────────────────────────────────────────────────────────
  // PROVIDER SEARCH
  // ────────────────────────────────────────────────────────────

  private async searchProviders(
    q: string,
    tsQuery: string,
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

    // When filtering by category, don't require text match (show ALL providers in that category)
    // When no category filter, require text match using persisted search_vector
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

    const sql = `
      WITH review_stats AS (
        SELECT provider_id, AVG(star_rating) AS avg_rating, COUNT(*) AS review_count
        FROM reviews WHERE status = 'active' GROUP BY provider_id
      ),
      cat_names AS (
        SELECT pc.provider_id, string_agg(DISTINCT c.name, ', ') AS categories
        FROM provider_categories pc JOIN categories c ON c.id = pc.category_id
        GROUP BY pc.provider_id
      ),
      active_offers AS (
        SELECT DISTINCT provider_id
        FROM provider_offers
        WHERE is_active = true AND starts_at <= NOW() AND ends_at >= NOW()
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
          (
            CASE WHEN $2 <> '' THEN COALESCE(ts_rank_cd(p.search_vector, to_tsquery('english', $2)), 0) * 0.35 ELSE 0 END +
            COALESCE(similarity(p.brand_name, $1), 0) * 0.10 +
            CASE WHEN ao.provider_id IS NOT NULL THEN 0.15 ELSE 0 END +
            COALESCE(rs.avg_rating / 5.0, 0) * 0.15 +
            CASE WHEN ${distExpr} IS NOT NULL THEN (1.0 - LEAST(${distExpr} / ${radiusParam}::float, 1.0)) * 0.05 ELSE 0 END +
            CASE WHEN p.is_featured THEN 0.03 ELSE 0 END +
            CASE WHEN p.status = 'active' THEN 0.02 ELSE 0 END
          ) AS relevance_score,
          COUNT(*) OVER() AS total_count
        FROM providers p
        LEFT JOIN review_stats rs ON rs.provider_id = p.id
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
      // 1. Resolve which categories match the query (use search_vector)
      let matchedCatIds: string[];

      if (categoryIds && categoryIds.length > 0) {
        // If user already filtered by category, use those directly
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
          (SELECT AVG(r.star_rating) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active') AS avg_rating,
          (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active') AS review_count,
          (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories
        FROM sponsored_listings sl
        JOIN providers p ON p.id = sl.provider_id
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
        relevanceScore: 1.0, // sponsored results get max score
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
    tsQuery: string,
    prefixTsQuery: string,
    opts: { lat?: number; lng?: number; radius: number; offset: number; limit: number; hasGeo: boolean },
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

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        prod.id,
        prod.name,
        prod.description,
        prod.price,
        prod.currency,
        prod.photo_url,
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
    tsQuery: string,
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
  // AUTOCOMPLETE SUGGESTIONS
  // ────────────────────────────────────────────────────────────

  async getSuggestions(dto: SuggestionsQueryDto): Promise<SearchSuggestion[]> {
    const { q, lat, lng, limit = 8 } = dto;
    const hasGeo = lat != null && lng != null;

    // Run all three suggestion queries in parallel
    const [providerSuggs, productSuggs, categorySuggs] = await Promise.all([
      this.getProviderSuggestions(q, hasGeo, lat, lng, Math.ceil(limit * 0.5)),
      this.getProductSuggestions(q, Math.ceil(limit * 0.3)),
      this.getCategorySuggestions(q, Math.ceil(limit * 0.2)),
    ]);

    // Merge, dedupe, and limit
    const all = [...providerSuggs, ...productSuggs, ...categorySuggs];
    return all.slice(0, limit);
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
      WHERE p.status IN ('active', 'unverified')
        AND (
          ($2 <> '' AND p.search_vector @@ to_tsquery('english', $2))
          OR similarity(p.brand_name, $1) > 0.1
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
        subtitle: [r.categories, r.distance != null ? `${parseFloat(r.distance).toFixed(1)} km` : null]
          .filter(Boolean)
          .join(' · '),
        imageUrl: r.profile_photo_url,
      }));
    } catch {
      return [];
    }
  }

  private async getProductSuggestions(q: string, limit = 3): Promise<SearchSuggestion[]> {
    const sql = `
      SELECT
        prod.id,
        prod.name,
        prod.photo_url,
        prod.price,
        prod.currency,
        prov.brand_name AS provider_name,
        similarity(prod.name, $1) AS sim
      FROM products prod
      JOIN providers prov ON prov.id = prod.provider_id
      WHERE prod.is_active = true
        AND prov.status IN ('active', 'unverified')
        AND (
          similarity(prod.name, $1) > 0.15
          OR prod.name ILIKE $1 || '%'
          OR prod.name ILIKE '%' || $1 || '%'
        )
      ORDER BY
        CASE WHEN lower(prod.name) LIKE lower($1) || '%' THEN 0 ELSE 1 END,
        sim DESC
      LIMIT $2
    `;

    try {
      const rows = await this.dataSource.query(sql, [q, limit]);
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
          OR similarity(c.name, $1) > 0.15
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
  // TRENDING SEARCHES
  // ────────────────────────────────────────────────────────────

  async getTrending(city?: string, limit = 10): Promise<{ query: string; count: number }[]> {
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
      return rows.map((r: any) => ({
        query: r.query,
        count: parseInt(r.count, 10),
      }));
    } catch {
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // RECENT SEARCHES
  // ────────────────────────────────────────────────────────────

  async getRecent(userId: string, limit = 10): Promise<{ query: string; createdAt: Date }[]> {
    const sql = `
      SELECT DISTINCT ON (lower(query)) query, created_at
      FROM search_logs
      WHERE user_id = $1
      ORDER BY lower(query), created_at DESC
      LIMIT $2
    `;

    // Need a subquery to order by recency after dedup
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
  // HELPERS
  // ────────────────────────────────────────────────────────────

  private buildTsQuery(q: string): string {
    return q.replace(/[^\w\s]/g, ' ').trim();
  }

  private buildPrefixTsQuery(q: string): string {
    const sanitized = q.replace(/[^\w\s]/g, ' ').trim();
    const words = sanitized.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    return words.map((w) => `${w}:*`).join(' & ');
  }

  private async expandQuery(q: string): Promise<string> {
    try {
      const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return q;
      const terms = [q.toLowerCase().trim(), ...words];
      const rows: { canonical_term: string }[] = await this.dataSource.query(
        `SELECT DISTINCT canonical_term FROM search_synonyms WHERE lower(term) = ANY($1)`,
        [terms],
      );
      if (rows.length === 0) return q;
      const expansions = rows.map((r) => r.canonical_term).filter((t) => !q.toLowerCase().includes(t.toLowerCase()));
      if (expansions.length === 0) return q;
      return `${q} ${expansions.join(' ')}`;
    } catch {
      return q;
    }
  }

  private async getDidYouMean(q: string): Promise<string | undefined> {
    try {
      const sql = `
        SELECT name, similarity(name, $1) AS sim
        FROM categories
        WHERE is_active = true AND similarity(name, $1) > 0.25
        UNION ALL
        SELECT DISTINCT kw AS name, similarity(kw, $1) AS sim
        FROM categories, unnest(keywords) AS kw
        WHERE is_active = true AND similarity(kw, $1) > 0.4
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
