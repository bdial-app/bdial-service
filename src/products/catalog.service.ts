import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { CategoryPersonalizationService } from '../users/category-personalization.service';
import {
  CatalogArea,
  CatalogBrowseDto,
  CatalogShelvesDto,
  CatalogSort,
  SimilarProductsDto,
} from './dto/catalog.dto';

type ItemType = 'product' | 'service';

/** One product or service as every catalog surface shows it. */
export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  photoUrl: string | null;
  photoUrls: string[];
  productType: ItemType;
  isHero: boolean;
  categoryId: string | null;
  categoryName: string | null;
  providerId: string;
  providerUserId: string;
  providerName: string;
  providerImage: string | null;
  providerCity: string | null;
  providerArea: string | null;
  verified: boolean;
  isWomenLed: boolean;
  rating: number;
  reviewCount: number;
  views: number;
  distance: number | null;
  approximateLocation: boolean;
}

export interface CatalogShelf {
  key: string;
  title: string;
  subtitle: string | null;
  /** Browse params the "See all" link should open with. */
  seeAll: Partial<
    Record<
      'sort' | 'area' | 'maxPrice' | 'minRating' | 'featured' | 'categoryId',
      string
    >
  > | null;
  items: CatalogItem[];
}

export interface CatalogCategoryChip {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  iconColor: string | null;
  itemCount: number;
}

/** Where an item list is drawn from. */
interface Scope {
  lat?: number;
  lng?: number;
  /** Bounding-box radius in km around lat/lng. */
  radiusKm?: number;
  /** City match, used when there is no location. */
  city?: string;
}

interface ItemQuery {
  type: ItemType;
  scope: Scope;
  /** Distance is computed from here even when the scope is wider. */
  origin?: { lat: number; lng: number };
  categoryIds?: string[];
  sort: CatalogSort | 'trending' | 'top_rated' | 'new_sellers';
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minReviews?: number;
  verified?: boolean;
  womenLed?: boolean;
  priced?: boolean;
  featured?: boolean;
  withPhoto?: boolean;
  viewedOnly?: boolean;
  sellerJoinedWithinDays?: number;
  excludeIds?: string[];
  limit: number;
  offset?: number;
  /** Round-robin sellers so one shop can't fill the page. */
  diversify?: boolean;
  withTotal?: boolean;
}

const BUDGET_LIMIT: Record<ItemType, number> = { product: 499, service: 999 };
const NEARBY_KM = 10;
const CITY_KM = 50;
const TRENDING_WINDOW_DAYS = 14;
const SHELF_SIZE = 10;
const MIN_SHELF = 3;
const MAX_PER_SELLER = 2;

interface SharedShelves {
  scope: Scope;
  scopeLabel: 'nearby' | 'city' | 'all';
  totalItems: number;
  categories: CatalogCategoryChip[];
  shelves: CatalogShelf[];
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private static readonly TTL_2MIN = 2 * 60 * 1000;
  private static readonly TTL_10MIN = 10 * 60 * 1000;

  constructor(
    private readonly dataSource: DataSource,
    private readonly categoryPersonalization: CategoryPersonalizationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ─── Storefront shelves ─────────────────────────────────────────────

  async getShelves(dto: CatalogShelvesDto, userId?: string | null) {
    const type: ItemType = dto.type ?? 'product';
    const origin = this.originOf(dto);

    const cacheKey = `catalog:shelves:${type}:${dto.city?.toLowerCase() || ''}:${dto.lat?.toFixed(2) || ''}:${dto.lng?.toFixed(2) || ''}`;
    let shared = await this.cacheManager.get<SharedShelves>(cacheKey);
    if (!shared) {
      shared = await this.buildSharedShelves(type, dto, origin);
      await this.cacheManager.set(cacheKey, shared, CatalogService.TTL_2MIN);
    }

    // "Picked for you" is per-user, so it sits outside the shared cache.
    let forYou: CatalogShelf | null = null;
    if (userId) {
      try {
        forYou = await this.buildForYouShelf(
          type,
          userId,
          shared.scope,
          origin,
        );
      } catch (err) {
        this.logger.warn(
          `for-you shelf failed for ${userId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    // Each item appears on one shelf only; "for you" claims first.
    const seen = new Set<string>();
    const claim = (shelf: CatalogShelf | null): CatalogShelf | null => {
      if (!shelf) return null;
      const items = shelf.items.filter((i) => !seen.has(i.id));
      if (items.length < MIN_SHELF) return null;
      items.forEach((i) => seen.add(i.id));
      return { ...shelf, items };
    };

    const shelves = [forYou, ...shared.shelves]
      .map(claim)
      .filter((s): s is CatalogShelf => s !== null);

    return {
      type,
      scope: shared.scopeLabel,
      totalItems: shared.totalItems,
      categories: shared.categories,
      shelves,
    };
  }

  private async buildSharedShelves(
    type: ItemType,
    dto: CatalogShelvesDto,
    origin?: { lat: number; lng: number },
  ): Promise<SharedShelves> {
    // Prefer the customer's area, but widen when it has too little to fill a storefront.
    const candidates: { scope: Scope; label: 'nearby' | 'city' | 'all' }[] = [];
    if (origin)
      candidates.push({
        scope: { ...origin, radiusKm: CITY_KM },
        label: 'nearby',
      });
    else if (dto.city)
      candidates.push({ scope: { city: dto.city }, label: 'city' });
    candidates.push({ scope: {}, label: 'all' });

    let chosen = candidates[candidates.length - 1];
    let totalItems = 0;
    for (const c of candidates) {
      totalItems = await this.countItems(type, c.scope);
      chosen = c;
      if (totalItems >= 12) break;
    }
    const scope = chosen.scope;
    const noun = type === 'service' ? 'services' : 'products';
    const budget = BUDGET_LIMIT[type];

    const base = {
      type,
      scope,
      origin,
      withPhoto: true,
      limit: SHELF_SIZE * 3,
    } as const;
    const [
      categories,
      trending,
      nearYou,
      featured,
      budgetPicks,
      topRated,
      newSellers,
    ] = await Promise.all([
      this.getCategoryChips(type, scope),
      this.queryItems({ ...base, sort: 'trending', viewedOnly: true }),
      origin
        ? this.queryItems({
            ...base,
            sort: 'nearest',
            scope: { ...origin, radiusKm: NEARBY_KM },
          })
        : Promise.resolve({ items: [] as CatalogItem[] }),
      this.queryItems({ ...base, sort: 'recommended', featured: true }),
      this.queryItems({ ...base, sort: 'price_low', maxPrice: budget }),
      this.queryItems({
        ...base,
        sort: 'top_rated',
        minRating: 4,
        minReviews: 1,
      }),
      this.queryItems({
        ...base,
        sort: 'new_sellers',
        sellerJoinedWithinDays: 60,
      }),
    ]);

    const shelf = (
      key: string,
      title: string,
      subtitle: string | null,
      items: CatalogItem[],
      seeAll: CatalogShelf['seeAll'],
    ): CatalogShelf => ({
      key,
      title,
      subtitle,
      seeAll,
      items: this.capPerSeller(items, SHELF_SIZE),
    });

    const shelves: CatalogShelf[] = [
      shelf(
        'trending',
        'Trending now',
        `Most viewed ${noun} this fortnight`,
        trending.items,
        { sort: 'popular' },
      ),
      shelf(
        'near_you',
        type === 'service' ? 'Services near you' : 'Near you',
        `Within ${NEARBY_KM} km of you`,
        nearYou.items,
        { sort: 'nearest', area: 'nearby' },
      ),
      shelf(
        'featured',
        type === 'service' ? 'Signature services' : 'Seller favourites',
        'Hand-picked by the businesses themselves',
        featured.items,
        { featured: 'true' },
      ),
      shelf(
        'budget',
        `Under ₹${budget}`,
        type === 'service'
          ? 'Quality help that fits the budget'
          : 'Great finds, small prices',
        budgetPicks.items,
        { maxPrice: String(budget), sort: 'price_low' },
      ),
      shelf(
        'top_rated',
        'From top-rated sellers',
        'Businesses rated 4★ and above',
        topRated.items,
        { minRating: '4' },
      ),
      shelf(
        'new_sellers',
        'New on Tijarah',
        'Fresh from businesses that just joined',
        newSellers.items,
        { sort: 'newest' },
      ),
    ];

    return { scope, scopeLabel: chosen.label, totalItems, categories, shelves };
  }

  private async buildForYouShelf(
    type: ItemType,
    userId: string,
    scope: Scope,
    origin?: { lat: number; lng: number },
  ): Promise<CatalogShelf | null> {
    const topCategoryIds = await this.categoryPersonalization.getTopCategoryIds(
      userId,
      8,
    );
    if (topCategoryIds.length === 0) return null;

    const { items } = await this.queryItems({
      type,
      scope,
      origin,
      categoryIds: topCategoryIds,
      sort: 'recommended',
      withPhoto: true,
      limit: SHELF_SIZE * 3,
    });
    if (items.length === 0) return null;

    const names = await this.categoryNames(topCategoryIds.slice(0, 2));
    return {
      key: 'for_you',
      title: 'Picked for you',
      subtitle: names.length
        ? `Because you like ${names.join(' & ')}`
        : 'Based on what you browse',
      seeAll: null,
      items: this.capPerSeller(items, SHELF_SIZE),
    };
  }

  // ─── Browse grid ────────────────────────────────────────────────────

  async browse(dto: CatalogBrowseDto) {
    const type: ItemType = dto.type ?? 'product';
    const origin = this.originOf(dto);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const sort: CatalogSort =
      dto.sort === 'nearest' && !origin
        ? 'recommended'
        : (dto.sort ?? 'recommended');

    const { items, total } = await this.queryItems({
      type,
      scope: this.scopeFor(dto.area ?? 'all', origin, dto.city),
      origin,
      categoryIds: dto.categoryIds?.length
        ? dto.categoryIds
        : dto.categoryId
          ? [dto.categoryId]
          : undefined,
      sort,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      minRating: dto.minRating,
      verified: dto.verified,
      womenLed: dto.womenLed,
      priced: dto.priced,
      featured: dto.featured,
      limit,
      offset: (page - 1) * limit,
      diversify: sort === 'recommended',
      withTotal: true,
    });

    return {
      data: items,
      total: total ?? items.length,
      page,
      limit,
      hasMore: (page - 1) * limit + items.length < (total ?? 0),
    };
  }

  // ─── One business's whole catalogue (the shared /c/<id> link) ──────

  /**
   * Every live product and service of one business, featured first, with
   * the shop's summary and category counts — what a shared catalogue link
   * opens. Shown for any business that isn't suspended, disabled or deleted,
   * so an owner can share it while verification is still in review.
   */
  async getSellerCatalogue(providerId: string) {
    const [shop]: {
      id: string;
      brand_name: string;
      profile_photo_url: string | null;
      banner_image_url: string | null;
      city: string | null;
      area: string | null;
      status: string;
      is_women_led: boolean;
      is_available: boolean;
      user_id: string;
      rating: string | number;
      review_count: string | number;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.brand_name, p.profile_photo_url, p.banner_image_url, p.city, p.area, p.status,
              p.is_women_led, p.is_available, p.user_id,
              COALESCE(rs.avg_rating, 0) AS rating, COALESCE(rs.review_count, 0) AS review_count
         FROM providers p
         LEFT JOIN (
           SELECT provider_id, AVG(star_rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
             FROM reviews WHERE status = 'active' GROUP BY provider_id
         ) rs ON rs.provider_id = p.id
        WHERE p.id = $1 AND p.deleted_at IS NULL AND p.status NOT IN ('suspended', 'disabled')`,
      [providerId],
    );
    if (!shop) throw new NotFoundException('Business not found');

    const rows: any[] = await this.dataSource.query(
      `SELECT ${CatalogService.ITEM_COLUMNS}, NULL::float AS distance
         ${CatalogService.ITEM_FROM}
        WHERE prod.provider_id = $1 AND prod.is_active = true
        ORDER BY prod.is_hero DESC, prod.display_order ASC, prod.name ASC
        LIMIT 500`,
      [providerId],
    );
    const items = rows.map((r) => this.mapItem(r));

    // Group labels: the item's own (sub)category, else "Other".
    const counts = new Map<string, number>();
    for (const i of items) {
      const name = i.categoryName ?? 'Other';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const categories = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) =>
        a.name === 'Other' ? 1 : b.name === 'Other' ? -1 : b.count - a.count,
      );

    return {
      provider: {
        id: shop.id,
        userId: shop.user_id,
        name: shop.brand_name,
        logoUrl: shop.profile_photo_url,
        bannerUrl: shop.banner_image_url,
        city: shop.city,
        area: shop.area,
        verified: shop.status === 'active',
        isWomenLed: !!shop.is_women_led,
        isOpen: !!shop.is_available,
        rating: Number(shop.rating) || 0,
        reviewCount: Number(shop.review_count) || 0,
      },
      counts: {
        products: items.filter((i) => i.productType === 'product').length,
        services: items.filter((i) => i.productType === 'service').length,
      },
      categories,
      items,
    };
  }

  // ─── Similar items from other sellers ───────────────────────────────

  async getSimilar(productId: string, dto: SimilarProductsDto) {
    const limit = dto.limit ?? 12;
    const origin = this.originOf(dto);

    const [src]: {
      id: string;
      name: string;
      product_type: ItemType;
      provider_id: string;
      category_id: string | null;
      subcategory_id: string | null;
      keywords: string[];
      city: string | null;
    }[] = await this.dataSource.query(
      `SELECT prod.id, prod.name, prod.product_type, prod.provider_id, prod.category_id, prod.subcategory_id,
              COALESCE(prod.keywords, '{}') AS keywords, p.city
         FROM products prod JOIN providers p ON p.id = prod.provider_id WHERE prod.id = $1`,
      [productId],
    );
    if (!src)
      throw new NotFoundException(`Product with ID '${productId}' not found`);

    const params: unknown[] = [
      src.id,
      src.name,
      src.product_type,
      src.provider_id,
      src.category_id,
      src.subcategory_id,
      src.keywords.map((k) => k.toLowerCase()),
    ];
    const distance = this.distanceSql(origin, params);

    // Score = how many ways the item resembles the source. Category signals
    // dominate; name similarity and shared keywords break ties within them.
    const rows: any[] = await this.dataSource.query(
      `
      WITH RECURSIVE cat_root AS (
        SELECT id, id AS root_id FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, cr.root_id FROM categories c JOIN cat_root cr ON c.parent_id = cr.id
      ),
      -- The source's words, so items match without needing categories. Shared
      -- name words are the strong signal; a hit anywhere in the candidate's
      -- text (description, keywords) only nudges, since words like a colour
      -- show up everywhere.
      src_q AS (
        SELECT
          tsvector_to_array(to_tsvector('english', $2)) AS name_lex,
          NULLIF(array_to_string(ARRAY(
            SELECT quote_literal(l) FROM unnest(tsvector_to_array(to_tsvector('english', $2))) l
          ), ' | '), '')::tsquery AS name_q,
          NULLIF(array_to_string(ARRAY(
            SELECT quote_literal(l) FROM unnest(tsvector_to_array(to_tsvector('english', array_to_string($7::text[], ' ')))) l
          ), ' | '), '')::tsquery AS kw_q
      ),
      src_roots AS (
        SELECT root_id FROM cat_root WHERE id IN ($5::uuid, $6::uuid)
        UNION
        SELECT cr.root_id FROM provider_categories pc JOIN cat_root cr ON cr.id = pc.category_id
         WHERE pc.provider_id = $4 AND $5::uuid IS NULL AND $6::uuid IS NULL
      ),
      scored AS (
        SELECT ${CatalogService.ITEM_COLUMNS},
               ${distance} AS distance,
               (
                 CASE WHEN $6::uuid IS NOT NULL AND prod.subcategory_id = $6::uuid THEN 4 ELSE 0 END
               + CASE WHEN $5::uuid IS NOT NULL AND prod.category_id = $5::uuid THEN 3 ELSE 0 END
               + CASE WHEN EXISTS (
                   SELECT 1 FROM cat_root cr
                    WHERE cr.root_id IN (SELECT root_id FROM src_roots)
                      AND (cr.id = prod.category_id OR cr.id = prod.subcategory_id
                           OR (prod.category_id IS NULL AND cr.id IN (SELECT pc.category_id FROM provider_categories pc WHERE pc.provider_id = prod.provider_id)))
                 ) THEN 1.5 ELSE 0 END
               + LEAST(3, (SELECT COUNT(*) FROM unnest(COALESCE(prod.keywords, '{}')) k WHERE lower(k) = ANY($7::text[])))
               + similarity(prod.name, $2) * 4
               + COALESCE((SELECT LEAST(3, COUNT(*)) FROM src_q, unnest(tsvector_to_array(to_tsvector('english', prod.name))) l
                            WHERE l = ANY(src_q.name_lex)), 0)
               + COALESCE((SELECT CASE WHEN prod.search_vector @@ name_q THEN 0.5 ELSE 0 END FROM src_q), 0)
               + COALESCE((SELECT CASE WHEN prod.search_vector @@ kw_q THEN 0.5 ELSE 0 END FROM src_q), 0)
               ) AS score
          ${CatalogService.ITEM_FROM}
         WHERE ${CatalogService.VISIBLE}
           AND prod.product_type = $3
           AND prod.id <> $1
           AND prod.provider_id <> $4
      )
      SELECT * FROM scored
       WHERE score >= 1.5
       ORDER BY score DESC, (photo_url IS NULL), distance ASC NULLS LAST, id
       LIMIT ${limit * 3}
      `,
      params,
    );

    const similar = this.capPerSeller(
      rows.map((r) => this.mapItem(r)),
      limit,
    );
    if (similar.length >= MIN_SHELF + 1)
      return { data: similar, mode: 'similar' as const };

    // Too few close matches: top up with popular items of the same type near
    // the customer (or in the seller's town), and say so via `mode`.
    const { items: popular } = await this.queryItems({
      type: src.product_type === 'service' ? 'service' : 'product',
      scope: origin
        ? { ...origin, radiusKm: CITY_KM }
        : src.city
          ? { city: src.city }
          : {},
      origin,
      sort: 'recommended',
      withPhoto: true,
      excludeIds: [src.id, ...similar.map((i) => i.id)],
      limit: limit * 3,
    });
    const fill = this.capPerSeller(
      popular.filter((i) => i.providerId !== src.provider_id),
      limit - similar.length,
    );
    return {
      data: [...similar, ...fill],
      mode: similar.length ? ('mixed' as const) : ('popular' as const),
    };
  }

  // ─── Query builder ──────────────────────────────────────────────────

  private static readonly ITEM_COLUMNS = `
    prod.id, prod.name, prod.description, prod.price, prod.currency, prod.photo_url, prod.photo_urls,
    prod.product_type, prod.is_hero, prod.category_id, prod.display_order,
    COALESCE(sc.name, c.name) AS category_name,
    p.id AS provider_id, p.user_id AS provider_user_id, p.brand_name, p.profile_photo_url, p.city, p.area, p.status,
    p.is_women_led, p.geocode_precision, p.created_at AS provider_created_at,
    COALESCE(rs.avg_rating, 0) AS rating, COALESCE(rs.review_count, 0) AS review_count,
    COALESCE(pv.views, 0) AS views`;

  private static readonly ITEM_FROM = `
    FROM products prod
    JOIN providers p ON p.id = prod.provider_id
    LEFT JOIN categories c ON c.id = prod.category_id
    LEFT JOIN categories sc ON sc.id = prod.subcategory_id
    LEFT JOIN (
      SELECT provider_id, AVG(star_rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
        FROM reviews WHERE status = 'active' GROUP BY provider_id
    ) rs ON rs.provider_id = p.id
    LEFT JOIN (
      SELECT entity_id, COUNT(*)::int AS views
        FROM provider_analytics_events
       WHERE event_type = 'product_view' AND entity_id IS NOT NULL
         AND created_at >= NOW() - INTERVAL '${TRENDING_WINDOW_DAYS} days'
       GROUP BY entity_id
    ) pv ON pv.entity_id = prod.id`;

  /** What a customer may see: live items from live, undeleted businesses. */
  private static readonly VISIBLE = `
    prod.is_active = true
    AND p.status IN ('active', 'unverified')
    AND p.deleted_at IS NULL`;

  /** Relevance for the default order: featured, seen, well rated, priced, close. */
  private static readonly RECOMMENDED_SCORE = `(
      prod.is_hero::int * 1.5
    + LN(1 + COALESCE(pv.views, 0))
    + COALESCE(rs.avg_rating, 0) / 2.5
    + CASE WHEN prod.price IS NOT NULL THEN 0.5 ELSE 0 END
    + CASE WHEN prod.photo_url IS NOT NULL THEN 1 ELSE 0 END
  )`;

  private async queryItems(
    q: ItemQuery,
  ): Promise<{ items: CatalogItem[]; total?: number }> {
    const params: unknown[] = [q.type];
    const where: string[] = [CatalogService.VISIBLE, `prod.product_type = $1`];
    const p = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    this.applyScope(q.scope, where, p);
    const distance = this.distanceSql(
      q.origin ??
        (q.scope.lat != null
          ? { lat: q.scope.lat, lng: q.scope.lng! }
          : undefined),
      params,
    );

    if (q.categoryIds?.length)
      where.push(
        this.categoryMatchSql(p(await this.expandCategoryIds(q.categoryIds))),
      );
    if (q.minPrice != null) where.push(`prod.price >= ${p(q.minPrice)}`);
    if (q.maxPrice != null) where.push(`prod.price <= ${p(q.maxPrice)}`);
    if (q.priced) where.push(`prod.price IS NOT NULL`);
    if (q.minRating)
      where.push(`COALESCE(rs.avg_rating, 0) >= ${p(q.minRating)}`);
    if (q.minReviews)
      where.push(`COALESCE(rs.review_count, 0) >= ${p(q.minReviews)}`);
    if (q.verified) where.push(`p.status = 'active'`);
    if (q.womenLed) where.push(`p.is_women_led = true`);
    if (q.featured) where.push(`prod.is_hero = true`);
    if (q.withPhoto) where.push(`prod.photo_url IS NOT NULL`);
    if (q.viewedOnly) where.push(`COALESCE(pv.views, 0) > 0`);
    if (q.sellerJoinedWithinDays)
      where.push(
        `p.created_at >= NOW() - make_interval(days => ${p(q.sellerJoinedWithinDays)}::int)`,
      );
    if (q.excludeIds?.length)
      where.push(`NOT (prod.id = ANY(${p(q.excludeIds)}::uuid[]))`);

    const order = this.orderSql(q.sort);
    const total = q.withTotal ? ', COUNT(*) OVER() AS total_count' : '';
    const limit = p(q.limit);
    const offset = p(q.offset ?? 0);

    // Diversified order: each seller's best two items first, then their next two, and so on.
    const sql = q.diversify
      ? `
        SELECT * FROM (
          SELECT ${CatalogService.ITEM_COLUMNS}, ${distance} AS distance,
                 ${CatalogService.RECOMMENDED_SCORE} AS score,
                 ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY ${CatalogService.RECOMMENDED_SCORE} DESC, prod.id) AS seller_rank
                 ${total}
            ${CatalogService.ITEM_FROM}
           WHERE ${where.join(' AND ')}
        ) ranked
        ORDER BY CEIL(seller_rank / ${MAX_PER_SELLER}.0), (photo_url IS NULL), score DESC, id
        LIMIT ${limit} OFFSET ${offset}`
      : `
        SELECT ${CatalogService.ITEM_COLUMNS}, ${distance} AS distance ${total}
          ${CatalogService.ITEM_FROM}
         WHERE ${where.join(' AND ')}
         ORDER BY ${order}
         LIMIT ${limit} OFFSET ${offset}`;

    const rows: any[] = await this.dataSource.query(sql, params);
    return {
      items: rows.map((r) => this.mapItem(r)),
      total: q.withTotal
        ? rows.length
          ? parseInt(rows[0].total_count, 10)
          : 0
        : undefined,
    };
  }

  private orderSql(sort: ItemQuery['sort']): string {
    const tiebreak = 'prod.id';
    switch (sort) {
      case 'trending':
      case 'popular':
        return `COALESCE(pv.views, 0) DESC, COALESCE(rs.avg_rating, 0) DESC, (prod.photo_url IS NULL), ${tiebreak}`;
      case 'nearest':
        // City-centre pins have no real distance, so they go after real ones.
        return `(p.geocode_precision = 'city') NULLS FIRST, distance ASC NULLS LAST, ${tiebreak}`;
      case 'price_low':
        return `prod.price ASC NULLS LAST, (prod.photo_url IS NULL), ${tiebreak}`;
      case 'price_high':
        return `prod.price DESC NULLS LAST, (prod.photo_url IS NULL), ${tiebreak}`;
      case 'top_rated':
        return `COALESCE(rs.avg_rating, 0) DESC, COALESCE(rs.review_count, 0) DESC, ${tiebreak}`;
      case 'newest':
      case 'new_sellers':
        // Products carry no created_at; the seller's join date is the honest proxy.
        return `p.created_at DESC, prod.display_order ASC, ${tiebreak}`;
      case 'recommended':
      default:
        return `${CatalogService.RECOMMENDED_SCORE} DESC, ${tiebreak}`;
    }
  }

  /**
   * An item belongs to a category when its own category or sub-category is in
   * the expanded set; items with no category of their own inherit their
   * seller's categories.
   */
  private categoryMatchSql(idsParam: string): string {
    return `(
      prod.category_id = ANY(${idsParam}::uuid[])
      OR prod.subcategory_id = ANY(${idsParam}::uuid[])
      OR (prod.category_id IS NULL AND prod.subcategory_id IS NULL AND EXISTS (
        SELECT 1 FROM provider_categories pc
         WHERE pc.provider_id = prod.provider_id AND pc.category_id = ANY(${idsParam}::uuid[])
      ))
    )`;
  }

  /** The categories plus every category beneath them. */
  private async expandCategoryIds(ids: string[]): Promise<string[]> {
    const key = `catalog:cat-tree:${[...ids].sort().join(',')}`;
    const cached = await this.cacheManager.get<string[]>(key);
    if (cached) return cached;
    const rows: { id: string }[] = await this.dataSource.query(
      `WITH RECURSIVE tree AS (
         SELECT id FROM categories WHERE id = ANY($1::uuid[])
         UNION
         SELECT ch.id FROM categories ch JOIN tree t ON ch.parent_id = t.id
       )
       SELECT id FROM tree`,
      [ids],
    );
    const expanded = rows.map((r) => r.id);
    await this.cacheManager.set(key, expanded, CatalogService.TTL_10MIN);
    return expanded;
  }

  private applyScope(scope: Scope, where: string[], p: (v: unknown) => string) {
    if (scope.lat != null && scope.lng != null && scope.radiusKm) {
      const dLat = scope.radiusKm / 111.32;
      const dLng =
        scope.radiusKm / (111.32 * Math.cos((scope.lat * Math.PI) / 180));
      where.push(
        `p.latitude BETWEEN ${p(scope.lat - dLat)} AND ${p(scope.lat + dLat)}`,
        `p.longitude BETWEEN ${p(scope.lng - dLng)} AND ${p(scope.lng + dLng)}`,
      );
    } else if (scope.city) {
      where.push(`p.city ILIKE ${p(`%${scope.city.trim()}%`)}`);
    }
  }

  /** Road-distance estimate (haversine × 1.4), or NULL without an origin. */
  private distanceSql(
    origin: { lat: number; lng: number } | undefined,
    params: unknown[],
  ): string {
    if (!origin) return 'NULL::float';
    params.push(origin.lat, origin.lng);
    const lat = `$${params.length - 1}`;
    const lng = `$${params.length}`;
    return `CASE WHEN p.latitude IS NULL OR p.longitude IS NULL THEN NULL ELSE
      1.4 * 6371 * acos(LEAST(1.0, cos(radians(${lat})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lng}))
      + sin(radians(${lat})) * sin(radians(p.latitude)))) END`;
  }

  private scopeFor(
    area: CatalogArea,
    origin: { lat: number; lng: number } | undefined,
    city?: string,
  ): Scope {
    if (area === 'all') return {};
    if (origin)
      return { ...origin, radiusKm: area === 'nearby' ? NEARBY_KM : CITY_KM };
    return city ? { city } : {};
  }

  private originOf(dto: { lat?: number; lng?: number }) {
    return dto.lat != null && dto.lng != null
      ? { lat: dto.lat, lng: dto.lng }
      : undefined;
  }

  private async countItems(type: ItemType, scope: Scope): Promise<number> {
    const params: unknown[] = [type];
    const where = [CatalogService.VISIBLE, `prod.product_type = $1`];
    this.applyScope(scope, where, (v) => {
      params.push(v);
      return `$${params.length}`;
    });
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM products prod JOIN providers p ON p.id = prod.provider_id WHERE ${where.join(' AND ')}`,
      params,
    );
    return row?.n ?? 0;
  }

  /** Top-level categories that have at least one item of this type in scope. */
  private async getCategoryChips(
    type: ItemType,
    scope: Scope,
  ): Promise<CatalogCategoryChip[]> {
    const params: unknown[] = [type];
    const where = [CatalogService.VISIBLE, `prod.product_type = $1`];
    this.applyScope(scope, where, (v) => {
      params.push(v);
      return `$${params.length}`;
    });

    const rows: any[] = await this.dataSource.query(
      `
      WITH RECURSIVE cat_root AS (
        SELECT id, id AS root_id FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, cr.root_id FROM categories c JOIN cat_root cr ON c.parent_id = cr.id
      ),
      items AS (
        SELECT prod.id, prod.provider_id, COALESCE(prod.subcategory_id, prod.category_id) AS own_cat
          FROM products prod JOIN providers p ON p.id = prod.provider_id
         WHERE ${where.join(' AND ')}
      ),
      item_roots AS (
        SELECT i.id, cr.root_id FROM items i JOIN cat_root cr ON cr.id = i.own_cat
        UNION
        SELECT i.id, cr.root_id FROM items i
          JOIN provider_categories pc ON pc.provider_id = i.provider_id
          JOIN cat_root cr ON cr.id = pc.category_id
         WHERE i.own_cat IS NULL
      )
      SELECT cat.id, cat.name, cat.slug, cat.icon, cat.icon_color AS "iconColor", COUNT(DISTINCT ir.id)::int AS "itemCount"
        FROM item_roots ir JOIN categories cat ON cat.id = ir.root_id
       WHERE cat.is_active = true
       GROUP BY cat.id
       ORDER BY "itemCount" DESC, cat.display_order ASC, cat.name ASC
       LIMIT 20
      `,
      params,
    );
    return rows;
  }

  private async categoryNames(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const key = `catalog:catnames:${ids.join(',')}`;
    const cached = await this.cacheManager.get<string[]>(key);
    if (cached) return cached;
    const rows: { id: string; name: string }[] = await this.dataSource.query(
      `SELECT id, name FROM categories WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    const byId = new Map(rows.map((r) => [r.id, r.name]));
    const names = ids.map((id) => byId.get(id)).filter((n): n is string => !!n);
    await this.cacheManager.set(key, names, CatalogService.TTL_10MIN);
    return names;
  }

  /** Keep at most MAX_PER_SELLER items per business, preserving order. */
  private capPerSeller(items: CatalogItem[], limit: number): CatalogItem[] {
    const perSeller = new Map<string, number>();
    const out: CatalogItem[] = [];
    for (const item of items) {
      const n = perSeller.get(item.providerId) ?? 0;
      if (n >= MAX_PER_SELLER) continue;
      perSeller.set(item.providerId, n + 1);
      out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  }

  private mapItem(r: any): CatalogItem {
    const cityPin = r.geocode_precision === 'city';
    const photoUrls: string[] = Array.isArray(r.photo_urls)
      ? r.photo_urls.filter(Boolean)
      : [];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      price: r.price != null ? parseFloat(r.price) : null,
      currency: r.currency || 'INR',
      photoUrl: r.photo_url || photoUrls[0] || null,
      photoUrls,
      productType: r.product_type === 'service' ? 'service' : 'product',
      isHero: !!r.is_hero,
      categoryId: r.category_id,
      categoryName: r.category_name,
      providerId: r.provider_id,
      providerUserId: r.provider_user_id,
      providerName: r.brand_name,
      providerImage: r.profile_photo_url,
      providerCity: r.city,
      providerArea: r.area,
      verified: r.status === 'active',
      isWomenLed: !!r.is_women_led,
      rating: parseFloat(r.rating) || 0,
      reviewCount: parseInt(r.review_count, 10) || 0,
      views: parseInt(r.views, 10) || 0,
      // A city-centre pin is not a real location — show the town, not a bogus distance.
      distance:
        r.distance != null && !cityPin
          ? parseFloat(parseFloat(r.distance).toFixed(1))
          : null,
      approximateLocation: cityPin,
    };
  }
}
