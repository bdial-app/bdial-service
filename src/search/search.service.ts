import { BadgesService } from '../badges/badges.service';
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
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
import { SystemSetting } from '../entities/system-setting.entity';
import { SearchSynonym } from '../entities/search-synonym.entity';
import { CategoryPersonalizationService } from '../users/category-personalization.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestionsQueryDto } from './dto/suggestions-query.dto';
import {
  ParsedQuery,
  Vocabulary,
  correctQuery,
  matchesAll,
  normalizeQuery,
  parseQuery,
  vocabularyWords,
} from './search-query';
import { tierRank } from '../providers/deal-rules';

// ────────────────────────────────────────────────────────────
// Response interfaces
// ────────────────────────────────────────────────────────────

export interface SearchSuggestion {
  text: string;
  type: 'provider' | 'product' | 'category';
  id: string;
  subtitle?: string;
  imageUrl?: string;
  icon?: string;
  iconColor?: string;
  isSponsored?: boolean;
  /** Present on sponsored rows — the client reports taps against it. */
  sponsoredListingId?: string;
  hasActiveOffer?: boolean;
  productType?: 'product' | 'service';
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
  approximateLocation?: boolean;
  avgRating: number | null;
  reviewCount: number;
  categories: string | null;
  relevanceScore: number;
  isSponsored?: boolean;
  sponsoredListingId?: string;
  hasActiveOffer?: boolean;
  offerId?: string;
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
  approximateLocation?: boolean;
  relevanceScore: number;
  isSponsored?: boolean;
  sponsoredListingId?: string;
  /** The business behind it has a live offer. */
  hasActiveOffer?: boolean;
  offerId?: string;
  offerTitle?: string;
  discountType?: string;
  discountValue?: number;
}

export interface CategorySearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  iconColor?: string | null;
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
  /** `correctedQuery` is set when a misspelling was fixed ("margetting" → "marketing"). */
  meta: { query: string; tookMs: number; totalResults: number; didYouMean?: string; correctedQuery?: string };
  fallback?: SearchFallback;
}

// ────────────────────────────────────────────────────────────
// Internal types
// ────────────────────────────────────────────────────────────

interface LexiconCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  iconColor: string | null;
  imageUrl: string | null;
  keywords: string[];
  normName: string;
  normKeywords: string[];
  /** Businesses in this category or its sub-categories. */
  providerCount: number;
}

interface Lexicon {
  categories: LexiconCategory[];
  childrenOf: Map<string, string[]>;
  synonyms: Map<string, string[]>;
  vocab: Vocabulary;
}

/** Rounds away float noise from SQL (0.9 * 0.8 = 0.7200000000000001) so equal matches tie. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

const EMPTY_LEXICON: Lexicon = {
  categories: [],
  childrenOf: new Map(),
  synonyms: new Map(),
  vocab: { known: new Set(), targets: [] },
};

/**
 * A candidate row. `rel` is how well it matches (it decides the order);
 * `quality` (rating, reviews, distance…) only orders equally good matches;
 * `score` = rel + quality, reported as relevanceScore.
 */
interface Ranked {
  row: any;
  rel: number;
  quality: number;
  score: number;
  sponsored: boolean;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(SearchLog) private searchLogRepo: Repository<SearchLog>,
    @InjectRepository(ProviderAnalyticsEvent) private analyticsEventRepo: Repository<ProviderAnalyticsEvent>,
    @InjectRepository(SponsoredListing) private sponsoredRepo: Repository<SponsoredListing>,
    @InjectRepository(SearchSynonym) private synonymRepo: Repository<SearchSynonym>,
    @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly categoryPersonalization: CategoryPersonalizationService,
    private readonly badges: BadgesService,
  ) {}

  // ────────────────────────────────────────────────────────────
  // BOOTSTRAP — ensure search infrastructure exists
  // ────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    await this.ensureSearchInfrastructure();
  }

  private async ensureSearchInfrastructure(): Promise<void> {
    try {
      // 1. Ensure pg_trgm extension
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

      // 2. Ensure provider_rating_stats materialized view exists
      const viewExists = await this.dataSource.query(`
        SELECT 1 FROM pg_matviews WHERE matviewname = 'provider_rating_stats'
      `);

      if (viewExists.length === 0) {
        this.logger.warn('provider_rating_stats materialized view missing — creating now');
        await this.dataSource.query(`
          CREATE MATERIALIZED VIEW provider_rating_stats AS
          SELECT
            provider_id,
            AVG(star_rating)::numeric(3,2) AS avg_rating,
            COUNT(*)::int                  AS review_count
          FROM reviews
          WHERE status = 'active'
          GROUP BY provider_id
        `);
        await this.dataSource.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_rating_stats_pid
            ON provider_rating_stats(provider_id)
        `);
        this.logger.log('Created provider_rating_stats materialized view');
      }

      // 3. Ensure search_vector column + trigger exist on providers
      const svColExists = await this.dataSource.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'providers' AND column_name = 'search_vector'
      `);

      if (svColExists.length === 0) {
        this.logger.warn('search_vector column missing on providers — creating now');
        await this.dataSource.query('ALTER TABLE providers ADD COLUMN IF NOT EXISTS search_vector tsvector');
        await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_providers_search_vector ON providers USING gin(search_vector)');
      }

      // 4. Backfill NULL search_vectors (trigger updates them on INSERT/UPDATE)
      const nullCount = await this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt FROM providers
        WHERE search_vector IS NULL AND status IN ('active', 'unverified')
      `);

      if (nullCount[0]?.cnt > 0) {
        this.logger.warn(`${nullCount[0].cnt} providers have NULL search_vector — backfilling`);
        await this.dataSource.query(`
          UPDATE providers SET updated_at = NOW()
          WHERE search_vector IS NULL AND status IN ('active', 'unverified')
        `);
        this.logger.log('Backfilled provider search_vectors');
      }

      // 5. Same for categories
      const catSvExists = await this.dataSource.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'search_vector'
      `);

      if (catSvExists.length === 0) {
        await this.dataSource.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS search_vector tsvector');
        await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_categories_search_vector ON categories USING gin(search_vector)');
      }

      const catNullCount = await this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt FROM categories
        WHERE search_vector IS NULL AND is_active = true
      `);

      if (catNullCount[0]?.cnt > 0) {
        this.logger.warn(`${catNullCount[0].cnt} categories have NULL search_vector — backfilling`);
        await this.dataSource.query(`
          UPDATE categories SET updated_at = NOW()
          WHERE search_vector IS NULL AND is_active = true
        `);
      }

      this.logger.log('Search infrastructure verified');
    } catch (err) {
      this.logger.error('Failed to verify search infrastructure — search may not work correctly', err);
    }
  }

  // ────────────────────────────────────────────────────────────
  // CONSTANTS
  // ────────────────────────────────────────────────────────────

  private readonly SEARCH_TIMEOUT_MS = 4000; // Hard cap per search request

  // ────────────────────────────────────────────────────────────
  // CACHE HELPERS
  // ────────────────────────────────────────────────────────────

  private buildCacheKey(prefix: string, params: Record<string, any>): string {
    const sorted = Object.keys(params).sort().map(k => `${k}=${params[k] ?? ''}`).join('&');
    return `search:${prefix}:${sorted}`;
  }

  // ────────────────────────────────────────────────────────────
  // TIMEOUT HELPER — prevents runaway queries from blocking response
  // ────────────────────────────────────────────────────────────

  private withTimeout<T>(promise: Promise<T>, fallback: T, label: string, timeoutMs = this.SEARCH_TIMEOUT_MS): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        this.logger.warn(`Search timeout (${timeoutMs}ms) hit for: ${label}`);
        resolve(fallback);
      }, timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  // ────────────────────────────────────────────────────────────
  // GEO HELPERS — bounding-box pre-filter for fast lat/lng elimination
  // ────────────────────────────────────────────────────────────

  private getBoundingBox(lat: number, lng: number, radiusKm: number): { latMin: number; latMax: number; lngMin: number; lngMax: number } {
    const latDelta = radiusKm / 111.32;
    const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    return {
      latMin: lat - latDelta,
      latMax: lat + latDelta,
      lngMin: lng - lngDelta,
      lngMax: lng + lngDelta,
    };
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
  // LEXICON — categories, synonyms and vocabulary, cached in memory
  // ────────────────────────────────────────────────────────────

  private static readonly LEXICON_TTL_MS = 10 * 60_000;
  private lexicon: { value: Lexicon; loadedAt: number } | null = null;
  private lexiconLoad: Promise<Lexicon> | null = null;

  private async getLexicon(): Promise<Lexicon> {
    const fresh = this.lexicon && Date.now() - this.lexicon.loadedAt < SearchService.LEXICON_TTL_MS;
    if (fresh) return this.lexicon!.value;
    if (!this.lexiconLoad) {
      this.lexiconLoad = this.loadLexicon()
        .then((value) => {
          this.lexicon = { value, loadedAt: Date.now() };
          return value;
        })
        .catch((err) => {
          this.logger.error('Failed to load search lexicon', err);
          return this.lexicon?.value ?? EMPTY_LEXICON;
        })
        .finally(() => {
          this.lexiconLoad = null;
        });
    }
    // Serve the stale copy while a refresh is in flight
    return this.lexicon?.value ?? this.lexiconLoad;
  }

  private async loadLexicon(): Promise<Lexicon> {
    const [cats, counts, syns, names] = await Promise.all([
      this.dataSource.query(`
        SELECT id, parent_id, name, slug, description, icon, icon_color, image_url, keywords
        FROM categories WHERE is_active = true
      `),
      // A category's count includes businesses listed under its sub-categories
      this.dataSource.query(`
        SELECT c.id, COUNT(DISTINCT pc.provider_id)::int AS cnt
        FROM categories c
        JOIN categories member ON member.id = c.id OR member.parent_id = c.id
        JOIN provider_categories pc ON pc.category_id = member.id
        JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
        GROUP BY c.id
      `),
      this.dataSource.query(`SELECT lower(term) AS term, lower(canonical_term) AS canonical FROM search_synonyms`),
      this.dataSource.query(`
        SELECT brand_name AS name FROM providers WHERE status IN ('active', 'unverified')
        UNION ALL
        SELECT name FROM products WHERE is_active = true
      `),
    ]);

    const countById = new Map<string, number>(counts.map((r: any) => [r.id, r.cnt]));
    const categories: LexiconCategory[] = cats.map((c: any) => ({
      id: c.id,
      parentId: c.parent_id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      iconColor: c.icon_color,
      imageUrl: c.image_url,
      keywords: c.keywords ?? [],
      normName: normalizeQuery(c.name),
      normKeywords: (c.keywords ?? []).map((k: string) => normalizeQuery(k)),
      providerCount: countById.get(c.id) ?? 0,
    }));

    const childrenOf = new Map<string, string[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) ?? []), c.id]);
    }

    const synonyms = new Map<string, string[]>();
    for (const s of syns) {
      const term = normalizeQuery(s.term);
      const canonical = normalizeQuery(s.canonical);
      if (!term || !canonical || term === canonical) continue;
      const list = synonyms.get(term) ?? [];
      if (!list.includes(canonical)) list.push(canonical);
      synonyms.set(term, list);
    }

    const known = new Set<string>();
    const targets = new Set<string>();
    for (const c of categories) {
      for (const w of [...vocabularyWords(c.name), ...c.keywords.flatMap(vocabularyWords)]) {
        known.add(w);
        if (w.length >= 4) targets.add(w);
      }
      vocabularyWords(c.description).forEach((w) => known.add(w));
    }
    for (const [term, canonicals] of synonyms) {
      for (const w of [...vocabularyWords(term), ...canonicals.flatMap(vocabularyWords)]) {
        known.add(w);
        if (w.length >= 4) targets.add(w);
      }
    }
    for (const n of names) vocabularyWords(n.name).forEach((w) => known.add(w));

    return { categories, childrenOf, synonyms, vocab: { known, targets: [...targets] } };
  }

  // ────────────────────────────────────────────────────────────
  // QUERY UNDERSTANDING
  // ────────────────────────────────────────────────────────────

  /** Spelling-correct the query and build its matcher. */
  private async understand(q: string, asYouType = false) {
    const lex = await this.getLexicon();
    const corrected = correctQuery(normalizeQuery(q), lex.vocab, asYouType);
    const pq = parseQuery(corrected ?? q, lex.synonyms, asYouType);
    const literal = parseQuery(corrected ?? q, new Map(), asYouType);
    return { lex, pq, corrected, intent: this.resolveIntent(pq, literal, lex) };
  }

  /**
   * Which categories the query is about, scored 0–1. "digital marketing" →
   * Digital Marketing & Advertising (name), SEO & Content Marketing
   * (keyword) … When the user's own words name a parent category ("IT
   * services"), its sub-categories count too. A parent reached only through a
   * keyword or synonym ("plumber" → Home Services) does not pass it down —
   * otherwise every pest-control firm under Home Services would match.
   * @param literal the query without synonyms
   */
  private resolveIntent(pq: ParsedQuery, literal: ParsedQuery, lex: Lexicon): Map<string, number> {
    const scores = new Map<string, number>();
    if (pq.words.length === 0) return scores;

    for (const c of lex.categories) {
      let s = 0;
      if (c.normName === pq.norm) s = 1.0;
      else if (matchesAll(c.name, pq)) s = 0.9;
      else if (c.normKeywords.includes(pq.norm)) s = 0.8;
      else if (c.keywords.some((k) => matchesAll(k, pq))) s = 0.7;
      else if (matchesAll(`${c.name} ${c.description ?? ''}`, pq)) s = 0.55;
      if (s > 0) scores.set(c.id, s);
    }

    const byId = new Map(lex.categories.map((c) => [c.id, c]));
    for (const [id, s] of [...scores]) {
      const parent = byId.get(id)!;
      if (parent.normName !== literal.norm && !matchesAll(parent.name, literal)) continue;
      for (const childId of lex.childrenOf.get(id) ?? []) {
        if ((scores.get(childId) ?? 0) < s * 0.9) scores.set(childId, s * 0.9);
      }
    }
    return scores;
  }

  // ────────────────────────────────────────────────────────────
  // CANDIDATE QUERIES — every business / product that matches, with the
  // signals needed to rank it. Ranking happens in rankProviders/rankProducts.
  // ────────────────────────────────────────────────────────────

  private static readonly CANDIDATE_CAP = 500;

  /**
   * Platform-wide sponsorships kill switch, cached for 5 min so the flag check
   * doesn't cost a DB round trip per search.
   */
  private async isSponsorshipsEnabled(): Promise<boolean> {
    const cacheKey = 'setting:sponsorships_enabled';
    let flagValue = await this.cacheManager.get<string>(cacheKey);
    if (flagValue == null) {
      const row = await this.settingRepo.findOneBy({ key: 'sponsorships_enabled' });
      flagValue = row?.value ?? 'false';
      await this.cacheManager.set(cacheKey, flagValue, 5 * 60_000);
    }
    return flagValue === 'true';
  }

  private sqlBuilder(pq: ParsedQuery, intent: Map<string, number>, opts: { lat?: number; lng?: number; city?: string; sponsorshipsOn: boolean }) {
    const params: any[] = [];
    const p = (v: any) => {
      params.push(v);
      return `$${params.length}`;
    };

    const G = p(pq.groups);
    const PS = p(pq.phraseSynonyms);
    const PH = p(pq.phrase);
    const N = p(pq.norm);
    const IID = p([...intent.keys()]);
    const ISC = p([...intent.values()]);
    const hasGeo = opts.lat != null && opts.lng != null;
    const LAT = hasGeo ? p(opts.lat) : null;
    const LNG = hasGeo ? p(opts.lng) : null;
    const CITY = opts.city ? p(opts.city) : null;

    /** True when every query word starts a word in `expr` (or a phrase synonym matches). */
    const allMatch = (expr: string) =>
      `((cardinality(${G}::text[]) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(${G}::text[]) g WHERE NOT (${expr} ~* g)))` +
      ` OR (${PS}::text <> '' AND ${expr} ~* ${PS}::text))`;

    /** Share of the query words found in `expr`, 0–1 — a tie-breaker when the name holds only some. */
    const wordShare = (expr: string) =>
      `(SELECT count(*) FROM unnest(${G}::text[]) g WHERE ${expr} ~* g)::float / GREATEST(cardinality(${G}::text[]), 1)`;

    const normalized = (expr: string) => `btrim(regexp_replace(lower(${expr}), '[^[:alnum:]]+', ' ', 'g'))`;

    /** Name match strength: exact > starts with the phrase > contains it > has all the words. */
    const nameScore = (expr: string, exact: number, starts: number, contains: number, words: number) => `
      CASE WHEN ${normalized(expr)} = ${N}::text THEN ${exact}
           WHEN ${expr} ~* ('^' || ${PH}::text) THEN ${starts}
           WHEN ${expr} ~* ${PH}::text THEN ${contains}
           WHEN ${allMatch(expr)} THEN ${words}
           ELSE 0 END`;

    const dist = (alias: string) =>
      hasGeo
        ? `1.4 * 6371 * acos(LEAST(1.0, cos(radians(${LAT})) * cos(radians(${alias}.latitude)) * cos(radians(${alias}.longitude) - radians(${LNG})) + sin(radians(${LAT})) * sin(radians(${alias}.latitude))))`
        : 'NULL::float';

    const intentCte = `intent AS (SELECT * FROM unnest(${IID}::uuid[], ${ISC}::float8[]) AS t(id, score))`;

    // One live listing per business — the one that wins its own auction.
    const sponsorCte = `sponsor AS (
      SELECT DISTINCT ON (sl.provider_id)
        sl.provider_id, sl.id AS listing_id, sl.priority, sl.cost_per_click,
        sl.target_category_ids, sl.target_cities, sl.target_radius
      FROM sponsored_listings sl
      WHERE ${opts.sponsorshipsOn ? 'true' : 'false'}
        AND sl.is_active = true
        AND sl.starts_at <= NOW()
        AND sl.ends_at >= NOW()
        AND (sl.billing_mode = 'free' OR sl.spent_amount < sl.budget_amount)
        AND sl.approval_status = 'approved'
      ORDER BY sl.provider_id, sl.priority DESC, sl.cost_per_click DESC
    )`;

    const sponsorGeoOk = (alias: string) => `(
      sp.listing_id IS NOT NULL
      AND (sp.target_cities IS NULL OR cardinality(sp.target_cities) = 0 OR ${CITY ? `${CITY}::text ILIKE ANY(sp.target_cities)` : 'true'})
      AND (sp.target_radius IS NULL OR ${hasGeo ? `${dist(alias)} <= sp.target_radius` : 'true'})
    )`;

    // Each business's live, approved offer: a paid one first, then the biggest.
    const offerCte = `offer AS (
      SELECT DISTINCT ON (po.provider_id)
        po.provider_id, po.id AS offer_id, po.title AS offer_title, po.discount_value, po.discount_type,
        po.tier AS offer_tier, po.ends_at AS offer_ends_at, po.min_order_amount AS offer_min_order
      FROM provider_offers po
      WHERE po.is_active = true AND po.starts_at <= NOW() AND po.ends_at >= NOW()
        AND po.approval_status = 'approved'
      ORDER BY po.provider_id, (po.tier = 'free'), po.discount_value DESC
    )`;

    return { params, p, N, allMatch, wordShare, nameScore, dist, intentCte, sponsorCte, offerCte, sponsorGeoOk, hasGeo };
  }

  /** Geo / city scoping shared by provider and product candidates. */
  private geoCondition(
    b: ReturnType<SearchService['sqlBuilder']>,
    alias: string,
    opts: { lat?: number; lng?: number; radius: number; city?: string },
  ): string | null {
    if (b.hasGeo) {
      const bbox = this.getBoundingBox(opts.lat!, opts.lng!, opts.radius);
      const inRadius = `(${alias}.latitude IS NOT NULL AND ${alias}.longitude IS NOT NULL
        AND ${alias}.latitude BETWEEN ${b.p(bbox.latMin)} AND ${b.p(bbox.latMax)}
        AND ${alias}.longitude BETWEEN ${b.p(bbox.lngMin)} AND ${b.p(bbox.lngMax)}
        AND ${b.dist(alias)} <= ${b.p(opts.radius)})`;
      // Include businesses in the same city even when they have no coordinates
      return opts.city ? `(${inRadius} OR ${alias}.city ILIKE ${b.p(`%${opts.city}%`)})` : inRadius;
    }
    if (opts.city) return `${alias}.city ILIKE ${b.p(`%${opts.city}%`)}`;
    return null;
  }

  private async queryProviderCandidates(
    pq: ParsedQuery,
    intent: Map<string, number>,
    opts: {
      lat?: number;
      lng?: number;
      radius: number;
      city?: string;
      scopeToArea: boolean;
      categoryIds?: string[];
      minRating?: number;
      verifiedOnly?: boolean;
      womenLedOnly?: boolean;
      sponsorshipsOn: boolean;
    },
  ): Promise<any[]> {
    const b = this.sqlBuilder(pq, intent, opts);
    const hasCategoryFilter = !!opts.categoryIds?.length;

    const conditions = [`p.status IN ('active', 'unverified')`, `p.is_available = true`];
    if (opts.scopeToArea) {
      const geo = this.geoCondition(b, 'p', opts);
      if (geo) conditions.push(geo);
    }
    if (hasCategoryFilter) {
      const CIDS = b.p(opts.categoryIds);
      conditions.push(`p.id IN (
        SELECT pc.provider_id FROM provider_categories pc
        WHERE pc.category_id = ANY(${CIDS}::uuid[])
           OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = ANY(${CIDS}::uuid[]))
      )`);
    } else {
      conditions.push(`GREATEST(m.name_score, m.cat_score, m.body_score, m.product_score, m.typo_score) > 0`);
    }
    if (opts.minRating) conditions.push(`rs.avg_rating >= ${b.p(opts.minRating)}`);
    if (opts.verifiedOnly) conditions.push(`p.status = 'active'`);
    if (opts.womenLedOnly) conditions.push(`p.women_led_status = 'approved'`);

    const body = `concat_ws(' ', p.brand_name, p.description, array_to_string(p.keywords, ' '), p.area, p.city, cn.categories)`;
    const productBody = `concat_ws(' ', pr.name, array_to_string(pr.keywords, ' '), pr.description)`;
    const { N } = b;

    const sql = `
      WITH ${b.intentCte},
      ${b.sponsorCte},
      ${b.offerCte}
      SELECT
        p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
        p.city, p.area, p.status, p.women_led_status, p.is_featured, p.created_at,
        p.geocode_precision,
        ${b.dist('p')} AS distance,
        rs.avg_rating,
        COALESCE(rs.review_count, 0) AS review_count,
        cn.categories,
        ao.provider_id IS NOT NULL AS has_active_offer,
        ao.offer_id, ao.offer_title, ao.discount_value, ao.discount_type,
        ao.offer_tier, ao.offer_ends_at, ao.offer_min_order,
        sp.listing_id, sp.priority AS sponsor_priority, sp.cost_per_click, sp.target_category_ids,
        ${b.sponsorGeoOk('p')} AS sponsor_geo_ok,
        m.name_score, m.cat_score, m.body_score, m.product_score, m.typo_score,
        ${b.wordShare('p.brand_name')} AS name_share
      FROM providers p
      LEFT JOIN provider_rating_stats rs ON rs.provider_id = p.id
      LEFT JOIN offer ao ON ao.provider_id = p.id
      LEFT JOIN sponsor sp ON sp.provider_id = p.id
      LEFT JOIN LATERAL (
        SELECT string_agg(DISTINCT c.name, ', ') AS categories
        FROM provider_categories pc JOIN categories c ON c.id = pc.category_id
        WHERE pc.provider_id = p.id
      ) cn ON true
      CROSS JOIN LATERAL (
        SELECT
          -- "contains" sits just under a named category (0.72): for "marketing",
          -- agencies outrank "ENN Marketing" the pest-control firm
          ${b.nameScore('p.brand_name', 1.0, 0.85, 0.62, 0.6)} AS name_score,
          COALESCE((
            SELECT MAX(i.score) FROM provider_categories pc2
            JOIN intent i ON i.id = pc2.category_id
            WHERE pc2.provider_id = p.id
          ), 0) * 0.8 AS cat_score,
          CASE WHEN ${b.allMatch(body)} THEN 0.5 ELSE 0 END AS body_score,
          COALESCE((
            SELECT MAX(CASE WHEN ${b.allMatch('pr.name')} THEN 0.6
                            WHEN ${b.allMatch(productBody)} THEN 0.45
                            ELSE 0 END)
            FROM products pr WHERE pr.provider_id = p.id AND pr.is_active = true
          ), 0) AS product_score,
          CASE WHEN char_length(${N}::text) >= 4 AND similarity(p.brand_name, ${N}::text) >= 0.5
               THEN 0.45 ELSE 0 END AS typo_score
      ) m
      WHERE ${conditions.join(' AND ')}
      LIMIT ${SearchService.CANDIDATE_CAP}
    `;

    try {
      return await this.dataSource.query(sql, b.params);
    } catch (err) {
      this.logger.error(`Provider candidates failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  private async queryProductCandidates(
    pq: ParsedQuery,
    intent: Map<string, number>,
    opts: {
      lat?: number;
      lng?: number;
      radius: number;
      city?: string;
      scopeToArea: boolean;
      productType?: string;
      sponsorshipsOn: boolean;
    },
  ): Promise<any[]> {
    // Products are scoped by radius only (as before) — the city fallback is for businesses
    const b = this.sqlBuilder(pq, intent, opts);

    const conditions = [
      `pr.is_active = true`,
      `prov.status IN ('active', 'unverified')`,
      `prov.is_available = true`,
      `GREATEST(m.name_score, m.body_score, m.cat_score) > 0`,
    ];
    if (opts.scopeToArea && b.hasGeo) {
      const geo = this.geoCondition(b, 'prov', { ...opts, city: undefined });
      if (geo) conditions.push(geo);
    }
    if (opts.productType) conditions.push(`pr.product_type = ${b.p(opts.productType)}`);

    const sql = `
      WITH ${b.intentCte},
      ${b.sponsorCte},
      ${b.offerCte}
      SELECT
        pr.id, pr.name, pr.description, pr.price, pr.currency, pr.photo_url, pr.product_type,
        pr.provider_id, pr.category_id, pr.subcategory_id, pr.created_at,
        prov.brand_name AS provider_name, prov.city AS provider_city, prov.area AS provider_area,
        prov.status AS provider_status, prov.geocode_precision,
        ${b.dist('prov')} AS distance,
        rs.avg_rating,
        sp.listing_id, sp.priority AS sponsor_priority, sp.cost_per_click, sp.target_category_ids,
        ${b.sponsorGeoOk('prov')} AS sponsor_geo_ok,
        ao.provider_id IS NOT NULL AS has_active_offer,
        ao.offer_id, ao.offer_title, ao.discount_value, ao.discount_type,
        ao.offer_tier, ao.offer_ends_at, ao.offer_min_order,
        m.name_score, m.body_score, m.cat_score,
        ${b.wordShare('pr.name')} AS name_share
      FROM products pr
      JOIN providers prov ON prov.id = pr.provider_id
      LEFT JOIN provider_rating_stats rs ON rs.provider_id = prov.id
      LEFT JOIN sponsor sp ON sp.provider_id = prov.id
      LEFT JOIN offer ao ON ao.provider_id = prov.id
      CROSS JOIN LATERAL (
        SELECT
          ${b.nameScore('pr.name', 1.0, 0.9, 0.8, 0.75)} AS name_score,
          CASE WHEN ${b.allMatch(`concat_ws(' ', pr.name, array_to_string(pr.keywords, ' '))`)} THEN 0.65
               WHEN ${b.allMatch(`concat_ws(' ', pr.name, array_to_string(pr.keywords, ' '), pr.description)`)} THEN 0.5
               ELSE 0 END AS body_score,
          -- A product is specific: it inherits a category match only from a
          -- specific (leaf) category the query names (> 0.8) — not from a
          -- keyword, nor from a broad parent like "Sweets & Bakery"
          COALESCE((
            SELECT MAX(i.score) FROM intent i
            WHERE i.id IN (pr.category_id, pr.subcategory_id) AND i.score > 0.8
              AND NOT EXISTS (SELECT 1 FROM categories ch WHERE ch.parent_id = i.id AND ch.is_active = true)
          ), 0) * 0.7 AS cat_score
      ) m
      WHERE ${conditions.join(' AND ')}
      LIMIT ${SearchService.CANDIDATE_CAP}
    `;

    try {
      return await this.dataSource.query(sql, b.params);
    } catch (err) {
      this.logger.error(`Product candidates failed: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // RANKING
  //
  // Relevance (how well it matches) decides the order; quality (rating,
  // reviews, verified, distance) only orders results that match equally
  // well — a 4.7★ IT shop must not pass marketing agencies on a
  // "digital marketing" search. Sponsored items are never sorted
  // by money into unrelated results: a sponsor is pinned first only when it
  // matches the query and its targeting allows it.
  // ────────────────────────────────────────────────────────────

  private closeness(distance: any, radius: number): number {
    if (distance == null) return 0;
    return 1 - Math.min(parseFloat(distance) / radius, 1);
  }

  /** Sponsor targeting: untargeted, or targets one of the categories the query is about. */
  private targetingAllows(targets: string[] | null, relevantCategories: Set<string>, strongTextMatch: boolean): boolean {
    if (!targets || targets.length === 0) return true;
    return strongTextMatch || targets.some((t) => relevantCategories.has(t));
  }

  private bySponsorAuction = (a: Ranked, b: Ranked) =>
    (b.row.sponsor_priority ?? 0) - (a.row.sponsor_priority ?? 0) ||
    b.rel - a.rel ||
    b.quality - a.quality ||
    parseFloat(b.row.cost_per_click ?? 0) - parseFloat(a.row.cost_per_click ?? 0);

  /**
   * Match groups. A live deal lifts a result to the top of its own group
   * (paid deals above free ones) but never past a better-matching group, and
   * an exact name match always stays on top.
   */
  private matchBand = (rel: number) => (rel >= 0.95 ? 3 : rel >= 0.75 ? 2 : rel >= 0.55 ? 1 : 0);
  private dealRank = (x: Ranked) => (x.row.has_active_offer ? tierRank(x.row.offer_tier) : 0);

  /** What a deal is worth to the customer, as a percentage; a flat amount against its minimum order. */
  private dealValue(row: any): number {
    const v = parseFloat(row.discount_value ?? 0);
    if (row.discount_type === 'percentage') return v;
    const minOrder = parseFloat(row.offer_min_order ?? 0);
    return minOrder > 0 ? (v / minOrder) * 100 : Math.min(v / 20, 30);
  }

  private sortRanked(list: Ranked[], sortBy: string, ratingOf: (r: any) => number | null) {
    const statusRank = (x: Ranked) => (x.row.status === 'active' || x.row.provider_status === 'active' ? 0 : 1);
    const dist = (x: Ranked) =>
      x.row.distance == null || x.row.geocode_precision === 'city' ? Infinity : parseFloat(x.row.distance);
    const cmp: Record<string, (a: Ranked, b: Ranked) => number> = {
      relevance: (a, b) =>
        this.matchBand(b.rel) - this.matchBand(a.rel) ||
        this.dealRank(b) - this.dealRank(a) ||
        b.rel - a.rel ||
        b.quality - a.quality ||
        dist(a) - dist(b),
      distance: (a, b) => statusRank(a) - statusRank(b) || dist(a) - dist(b) || b.score - a.score,
      rating: (a, b) =>
        statusRank(a) - statusRank(b) || (ratingOf(b.row) ?? -1) - (ratingOf(a.row) ?? -1) || b.score - a.score,
      newest: (a, b) =>
        statusRank(a) - statusRank(b) || new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime(),
    };
    return list.sort(cmp[sortBy] ?? cmp.relevance);
  }

  private rankProviders(
    rows: any[],
    intent: Map<string, number>,
    opts: { radius: number; sortBy: string; categoryIds?: string[] },
  ): { sponsored: Ranked[]; organic: Ranked[] } {
    const relevantCategories = new Set([...intent.keys(), ...(opts.categoryIds ?? [])]);
    const sponsored: Ranked[] = [];
    const organic: Ranked[] = [];

    for (const row of rows) {
      const nameScore = parseFloat(row.name_score);
      const textRel = Math.max(
        nameScore,
        parseFloat(row.cat_score),
        parseFloat(row.body_score),
        parseFloat(row.product_score),
        parseFloat(row.typo_score),
      );
      // Inside a category filter every listed business is relevant
      const rel = round3(textRel > 0 ? textRel : opts.categoryIds?.length ? 0.3 : 0);
      if (rel <= 0) continue;

      const rating = row.avg_rating != null ? parseFloat(row.avg_rating) : 0;
      const reviews = parseInt(row.review_count, 10) || 0;
      const quality =
        (rating / 5) * 0.06 +
        Math.min(Math.log(reviews + 1) / Math.log(50), 1) * 0.03 +
        (row.status === 'active' ? 0.02 : 0) +
        this.closeness(row.distance, opts.radius) * 0.04 +
        (row.has_active_offer ? 0.01 : 0) +
        parseFloat(row.name_share ?? 0) * 0.05;

      const ranked: Ranked = { row, rel, quality, score: rel + quality, sponsored: false };
      if (
        row.listing_id &&
        row.sponsor_geo_ok &&
        this.targetingAllows(row.target_category_ids, relevantCategories, nameScore >= 0.6)
      ) {
        ranked.sponsored = true;
        sponsored.push(ranked);
      } else {
        organic.push(ranked);
      }
    }

    sponsored.sort(this.bySponsorAuction);
    this.sortRanked(organic, opts.sortBy, (r) => (r.avg_rating != null ? parseFloat(r.avg_rating) : null));
    return { sponsored, organic };
  }

  /**
   * Products & services. For each sponsored business, its single best-matching
   * product/service is pinned first; its other matches rank organically.
   */
  private rankProducts(
    rows: any[],
    intent: Map<string, number>,
    opts: { radius: number; sortBy: string },
  ): { pinned: Ranked[]; organic: Ranked[] } {
    const relevantCategories = new Set(intent.keys());
    const bestSponsoredByProvider = new Map<string, Ranked>();
    const all: Ranked[] = [];

    for (const row of rows) {
      const nameScore = parseFloat(row.name_score);
      const rel = round3(Math.max(nameScore, parseFloat(row.body_score), parseFloat(row.cat_score)));
      if (rel <= 0) continue;

      const rating = row.avg_rating != null ? parseFloat(row.avg_rating) : 0;
      const quality =
        (row.photo_url ? 0.02 : 0) +
        (rating / 5) * 0.03 +
        (row.provider_status === 'active' ? 0.01 : 0) +
        this.closeness(row.distance, opts.radius) * 0.03 +
        (row.has_active_offer ? 0.01 : 0) +
        parseFloat(row.name_share ?? 0) * 0.05;
      const ranked: Ranked = { row, rel, quality, score: rel + quality, sponsored: false };
      all.push(ranked);

      const productTargeted =
        !!row.target_category_ids?.length &&
        (row.target_category_ids.includes(row.category_id) || row.target_category_ids.includes(row.subcategory_id));
      if (
        row.listing_id &&
        row.sponsor_geo_ok &&
        (productTargeted || this.targetingAllows(row.target_category_ids, relevantCategories, nameScore >= 0.75))
      ) {
        const best = bestSponsoredByProvider.get(row.provider_id);
        if (!best || ranked.rel > best.rel || (ranked.rel === best.rel && ranked.quality > best.quality)) {
          bestSponsoredByProvider.set(row.provider_id, ranked);
        }
      }
    }

    const pinned = [...bestSponsoredByProvider.values()];
    pinned.forEach((r) => (r.sponsored = true));
    pinned.sort(this.bySponsorAuction);
    const organic = all.filter((r) => !r.sponsored);
    this.sortRanked(organic, opts.sortBy, (r) => (r.avg_rating != null ? parseFloat(r.avg_rating) : null));
    return { pinned, organic };
  }

  /** Categories the query is about that actually have businesses, best first. */
  private rankCategories(intent: Map<string, number>, lex: Lexicon): { cat: LexiconCategory; score: number }[] {
    return lex.categories
      .filter((c) => intent.has(c.id) && c.providerCount > 0)
      .map((cat) => ({ cat, score: intent.get(cat.id)! }))
      .sort((a, b) => b.score - a.score || b.cat.providerCount - a.cat.providerCount);
  }

  // ────────────────────────────────────────────────────────────
  // RESULT MAPPING
  // ────────────────────────────────────────────────────────────

  private toProviderResult(x: Ranked): ProviderSearchResult {
    const r = x.row;
    return {
      id: r.id,
      brandName: r.brand_name,
      description: r.description,
      profilePhotoUrl: r.profile_photo_url,
      bannerImageUrl: r.banner_image_url,
      city: r.city,
      area: r.area,
      status: r.status,
      isWomenLed: r.women_led_status === 'approved',
      isFeatured: r.is_featured,
      distance: r.distance != null && r.geocode_precision !== 'city' ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
      approximateLocation: r.geocode_precision === 'city',
      avgRating: r.avg_rating != null ? parseFloat(parseFloat(r.avg_rating).toFixed(1)) : null,
      reviewCount: parseInt(r.review_count, 10),
      categories: r.categories,
      relevanceScore: parseFloat(x.score.toFixed(3)),
      isSponsored: x.sponsored,
      ...(x.sponsored ? { sponsoredListingId: r.listing_id } : {}),
      hasActiveOffer: !!r.has_active_offer,
      offerTitle: r.offer_title || undefined,
      discountValue: r.discount_value != null ? parseFloat(r.discount_value) : undefined,
      offerId: r.offer_id || undefined,
      discountType: r.discount_type || undefined,
    };
  }

  private toProductResult(x: Ranked): ProductSearchResult {
    const r = x.row;
    return {
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
      distance: r.distance != null && r.geocode_precision !== 'city' ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
      approximateLocation: r.geocode_precision === 'city',
      relevanceScore: parseFloat(x.score.toFixed(3)),
      isSponsored: x.sponsored,
      ...(x.sponsored ? { sponsoredListingId: r.listing_id } : {}),
      hasActiveOffer: !!r.has_active_offer,
      ...(r.has_active_offer
        ? { offerId: r.offer_id, offerTitle: r.offer_title, discountType: r.discount_type, discountValue: parseFloat(r.discount_value) }
        : {}),
    };
  }

  private toCategoryResult({ cat, score }: { cat: LexiconCategory; score: number }): CategorySearchResult {
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      iconColor: cat.iconColor,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      providerCount: cat.providerCount,
      relevanceScore: score,
    };
  }

  /**
   * Search placements are charged per tap, not per view: count the serve so
   * sponsors see their reach, but never add spend here.
   */
  private countSponsoredServes(listingIds: string[]): void {
    const ids = [...new Set(listingIds.filter(Boolean))];
    if (ids.length === 0) return;
    this.dataSource
      .query(`UPDATE sponsored_listings SET impressions = impressions + 1 WHERE id = ANY($1::uuid[])`, [ids])
      .catch(() => {});
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
    const isFirstPage = page === 1;
    const { lex, pq, corrected, intent } = await this.understand(q);
    const sponsorshipsOn = await this.isSponsorshipsEnabled();

    // A query of only punctuation has nothing to match on
    const searchable = pq.words.length > 0;
    const wantProviders = searchable && (type === 'all' || type === 'providers');
    const wantProducts = searchable && (type === 'all' || type === 'products' || type === 'services');
    const wantCategories = searchable && (type === 'all' || type === 'categories');
    const productType = type === 'products' ? 'product' : type === 'services' ? 'service' : undefined;

    const [providerRows, productRows] = await Promise.all([
      wantProviders
        ? this.withTimeout(
            this.queryProviderCandidates(pq, intent, { lat, lng, radius, city, scopeToArea: true, categoryIds, minRating, verifiedOnly, womenLedOnly, sponsorshipsOn }),
            [],
            'providerCandidates',
          )
        : Promise.resolve([]),
      wantProducts
        ? this.withTimeout(
            this.queryProductCandidates(pq, intent, { lat, lng, radius, city, scopeToArea: true, productType, sponsorshipsOn }),
            [],
            'productCandidates',
          )
        : Promise.resolve([]),
    ]);

    // ── Businesses ──
    const rankedProviders = this.rankProviders(providerRows, intent, { radius, sortBy, categoryIds });
    let sponsoredRanked: Ranked[] = [];
    let dealsRanked: Ranked[] = [];
    let topRatedRanked: Ranked[] = [];
    let providerList: Ranked[];

    if (type === 'all') {
      // Highlight strips are derived from the full match list so the paged
      // organic list stays stable across pages; they're returned on page 1.
      sponsoredRanked = rankedProviders.sponsored;
      // Deals that match well (at least 60% of the best result): match group,
      // paid before free, best value to the customer, ending soonest, nearest.
      const topRel = Math.max(0, ...rankedProviders.organic.map((x) => x.rel));
      const endsAt = (x: Ranked) => new Date(x.row.offer_ends_at ?? 8.64e15).getTime();
      const near = (x: Ranked) => (x.row.distance == null ? Infinity : parseFloat(x.row.distance));
      dealsRanked = rankedProviders.organic
        .filter((x) => x.row.has_active_offer && x.rel >= topRel * 0.6)
        .sort(
          (a, b) =>
            this.matchBand(b.rel) - this.matchBand(a.rel) ||
            this.dealRank(b) - this.dealRank(a) ||
            this.dealValue(b.row) - this.dealValue(a.row) ||
            endsAt(a) - endsAt(b) ||
            near(a) - near(b),
        )
        .slice(0, 5);
      const inDeals = new Set(dealsRanked.map((x) => x.row.id));
      topRatedRanked = rankedProviders.organic
        .filter((x) => !inDeals.has(x.row.id) && parseFloat(x.row.avg_rating ?? 0) >= 4 && parseInt(x.row.review_count, 10) >= 3)
        .sort((a, b) => parseFloat(b.row.avg_rating) - parseFloat(a.row.avg_rating) || parseInt(b.row.review_count, 10) - parseInt(a.row.review_count, 10))
        .slice(0, 5);
      const highlighted = new Set([...inDeals, ...topRatedRanked.map((x) => x.row.id)]);
      providerList = rankedProviders.organic.filter((x) => !highlighted.has(x.row.id));
    } else {
      // Businesses tab: matching sponsors first, then everything else
      providerList = [...rankedProviders.sponsored, ...rankedProviders.organic];
    }

    const providerPage = providerList.slice(offset, offset + limit);
    const [sponsored, deals, topRated, providerData] = await Promise.all(
      [isFirstPage ? sponsoredRanked : [], isFirstPage ? dealsRanked : [], isFirstPage ? topRatedRanked : [], providerPage].map(
        (list) => this.badges.attach(list.map((x) => this.toProviderResult(x))),
      ),
    );
    const providers = { data: providerData, total: providerList.length };

    // ── Products & services ──
    const rankedProducts = this.rankProducts(productRows, intent, { radius, sortBy });
    const productList = [...rankedProducts.pinned, ...rankedProducts.organic];
    const productLimit = type === 'all' ? 5 : limit;
    const productPage = productList.slice(offset, offset + productLimit);
    const products = { data: productPage.map((x) => this.toProductResult(x)), total: productList.length };

    // ── Categories ──
    const categoryList = wantCategories ? this.rankCategories(intent, lex) : [];
    const categoryLimit = type === 'all' ? 5 : limit;
    const categories = {
      data: categoryList.slice(offset, offset + categoryLimit).map((c) => this.toCategoryResult(c)),
      total: categoryList.length,
    };

    const totalResults = providers.total + products.total + categories.total;

    let didYouMean: string | undefined;
    if (!corrected && totalResults < 5) {
      didYouMean = await this.getDidYouMean(q);
    }

    // Fallback strategy when zero results
    let fallback: SearchFallback | undefined;
    if (totalResults === 0 && sponsored.length === 0 && isFirstPage) {
      fallback = await this.buildFallback(q, pq.norm, this.buildPrefixTsQuery(pq.norm), { lat, lng, radius, city, hasGeo: lat != null && lng != null });
    }

    const tookMs = Date.now() - start;

    this.logSearch(q, userId, totalResults, lat, lng, city).catch(() => {});

    if (userId) {
      const queryCategories = categoryIds?.length
        ? categoryIds
        : categoryList.filter((c) => c.score >= 0.7).slice(0, 5).map((c) => c.cat.id);
      this.logSearchCategoryInteraction(userId, q, queryCategories).catch(() => {});
    }

    const shownProviderIds = [...sponsored, ...deals, ...topRated, ...providers.data].map((p) => p.id);
    if (shownProviderIds.length > 0) {
      this.logSearchAppearances(shownProviderIds, userId, q).catch(() => {});
    }

    this.countSponsoredServes([
      ...sponsored.map((s) => s.sponsoredListingId!),
      ...providers.data.filter((p) => p.isSponsored).map((p) => p.sponsoredListingId!),
      ...products.data.filter((p) => p.isSponsored).map((p) => p.sponsoredListingId!),
    ]);

    const response: SearchResponse = {
      sponsored,
      deals,
      topRated,
      providers,
      products,
      categories,
      meta: {
        query: q,
        tookMs,
        totalResults: totalResults + sponsored.length + deals.length + topRated.length,
        ...(corrected ? { correctedQuery: corrected } : {}),
        ...(didYouMean ? { didYouMean } : {}),
      },
      ...(fallback ? { fallback } : {}),
    };

    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, response, 60_000);

    return response;
  }

  // ────────────────────────────────────────────────────────────
  // AUTOCOMPLETE SUGGESTIONS (cached)
  //
  // Same matching and sponsor rules as the full search. Sponsors that match
  // lead their section and carry a Sponsored tag. Nothing is charged here —
  // the dropdown re-queries on every keystroke; taps are charged by the client.
  // ────────────────────────────────────────────────────────────

  async getSuggestions(dto: SuggestionsQueryDto): Promise<SearchSuggestion[]> {
    const { q, lat, lng, limit = 8 } = dto;

    const cacheKey = this.buildCacheKey('suggestions', { q: q.toLowerCase(), lat, lng, limit });
    const cached = await this.cacheManager.get<SearchSuggestion[]>(cacheKey);
    if (cached) return cached;

    const { lex, pq, intent } = await this.understand(q, true);
    if (pq.words.length === 0) return [];
    const sponsorshipsOn = await this.isSponsorshipsEnabled();
    const radius = 25;

    const [providerRows, productRows] = await Promise.all([
      this.withTimeout(
        this.queryProviderCandidates(pq, intent, { lat, lng, radius, scopeToArea: false, sponsorshipsOn }),
        [],
        'providerSuggestions',
        2000,
      ),
      this.withTimeout(
        this.queryProductCandidates(pq, intent, { lat, lng, radius, scopeToArea: false, sponsorshipsOn }),
        [],
        'productSuggestions',
        2000,
      ),
    ]);

    const rankedProviders = this.rankProviders(providerRows, intent, { radius, sortBy: 'relevance' });
    const rankedProducts = this.rankProducts(productRows, intent, { radius, sortBy: 'relevance' });
    const providers = [...rankedProviders.sponsored, ...rankedProviders.organic];
    const products = [...rankedProducts.pinned, ...rankedProducts.organic];
    const categories = this.rankCategories(intent, lex).filter((c) => c.score >= 0.55);

    // Share the slots: up to 2 categories, the rest split between businesses
    // and products/services, with either side taking what the other can't use.
    const catCount = Math.min(categories.length, 2, Math.max(limit - 2, 1));
    const rest = limit - catCount;
    let providerCount = Math.min(providers.length, Math.ceil(rest / 2));
    const productCount = Math.min(products.length, rest - providerCount);
    providerCount = Math.min(providers.length, rest - productCount);

    const categorySuggs: SearchSuggestion[] = categories.slice(0, catCount).map(({ cat }) => ({
      text: cat.name,
      type: 'category' as const,
      id: cat.id,
      subtitle: `${cat.providerCount} ${cat.providerCount === 1 ? 'business' : 'businesses'}`,
      imageUrl: cat.imageUrl || undefined,
      icon: cat.icon || undefined,
      iconColor: cat.iconColor || undefined,
    }));

    const providerSuggs: SearchSuggestion[] = providers.slice(0, providerCount).map((x) => {
      const r = x.row;
      return {
        text: r.brand_name,
        type: 'provider' as const,
        id: r.id,
        subtitle: [
          r.categories,
          r.avg_rating ? `★ ${parseFloat(r.avg_rating).toFixed(1)}` : null,
          r.distance != null && r.geocode_precision !== 'city' ? `${parseFloat(r.distance).toFixed(1)} km` : null,
        ].filter(Boolean).join(' · '),
        imageUrl: r.profile_photo_url || undefined,
        isSponsored: x.sponsored,
        ...(x.sponsored ? { sponsoredListingId: r.listing_id } : {}),
        hasActiveOffer: !!r.has_active_offer,
      };
    });

    const productSuggs: SearchSuggestion[] = products.slice(0, productCount).map((x) => {
      const r = x.row;
      return {
        text: r.name,
        type: 'product' as const,
        id: r.id,
        subtitle: [r.provider_name, r.price != null ? `${r.currency} ${parseFloat(r.price)}` : null].filter(Boolean).join(' · '),
        imageUrl: r.photo_url || undefined,
        productType: r.product_type || 'product',
        isSponsored: x.sponsored,
        ...(x.sponsored ? { sponsoredListingId: r.listing_id } : {}),
      };
    });

    // Section order follows the query: a clear category ("digital marketing")
    // leads with the category; otherwise whichever side matched better leads.
    const strongCategory = categories.length > 0 && categories[0].score >= 0.9;
    const topOrganic = (list: Ranked[]) => list.find((x) => !x.sponsored)?.rel ?? 0;
    const productsFirst = topOrganic(rankedProducts.organic) > topOrganic(rankedProviders.organic);
    const result = [
      ...(strongCategory ? categorySuggs : []),
      ...(productsFirst ? [...productSuggs, ...providerSuggs] : [...providerSuggs, ...productSuggs]),
      ...(strongCategory ? [] : categorySuggs),
    ];

    await this.cacheManager.set(cacheKey, result, 120_000);
    return result;
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
          distExpr = `1.4 * 6371 * acos(LEAST(1.0, cos(radians($3)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($4)) + sin(radians($3)) * sin(radians(p.latitude))))`;
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
          OR EXISTS (
            SELECT 1 FROM provider_categories pc3
            JOIN categories c3 ON c3.id = pc3.category_id
            WHERE pc3.provider_id = p.id
            AND EXISTS (SELECT 1 FROM unnest(c3.keywords) kw WHERE kw ILIKE '%' || $1 || '%' OR similarity(kw, $1) > 0.2)
          )
        )`);

        params.push(6);

        const sql = `
          SELECT
            p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
            p.city, p.area, p.status, p.is_women_led, p.is_featured,
            ${distExpr} AS distance,
          p.geocode_precision AS geocode_precision,
            rs.avg_rating, COALESCE(rs.review_count, 0) AS review_count,
            (SELECT string_agg(DISTINCT c.name, ', ') FROM provider_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.provider_id = p.id) AS categories,
            GREATEST(
              CASE WHEN $2 <> '' THEN COALESCE(ts_rank_cd(p.search_vector, to_tsquery('english', $2), 32), 0) ELSE 0 END,
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
            distance: r.distance != null && r.geocode_precision !== 'city' ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
            approximateLocation: r.geocode_precision === 'city',
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
      const distExpr = `1.4 * 6371 * acos(LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2)) + sin(radians($1)) * sin(radians(p.latitude))))`;
      const sql = `
        SELECT
          p.id, p.brand_name, p.description, p.profile_photo_url, p.banner_image_url,
          p.city, p.area, p.status, p.is_women_led, p.is_featured,
          ${distExpr} AS distance,
          p.geocode_precision AS geocode_precision,
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
        distance: r.distance != null && r.geocode_precision !== 'city' ? parseFloat(parseFloat(r.distance).toFixed(2)) : null,
        approximateLocation: r.geocode_precision === 'city',
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

  // ────────────────────────────────────────────────────────────
  // CATEGORY INTERACTION LOGGING (for personalization engine)
  // ────────────────────────────────────────────────────────────

  private async logSearchCategoryInteraction(
    userId: string,
    query: string,
    explicitCategoryIds?: string[],
  ): Promise<void> {
    try {
      let categoryIds: string[];
      if (explicitCategoryIds?.length) {
        categoryIds = explicitCategoryIds;
      } else {
        categoryIds = await this.categoryPersonalization.resolveCategoriesForQuery(query);
      }
      if (categoryIds.length > 0) {
        await this.categoryPersonalization.recordInteractionBulk(userId, categoryIds, 'search');
      }
    } catch (err) {
      this.logger.warn('Failed to log category interaction', err);
    }
  }
}
