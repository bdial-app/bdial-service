import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Category } from '../entities';
import { StorageService } from '../storage/storage.service';
import { PaginationDto } from './dto/pagination.dto';
import { compressImage } from '../common/image-processor';

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

const ALLOWED_ICON_EXTENSIONS = ['png', 'svg'];
const ALLOWED_ICON_MIME_TYPES = ['image/png', 'image/svg+xml', 'image/svg'];
const MAX_ICON_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = ['image/png'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class CategoriesService {
  private static readonly TOP_LEVEL_CACHE_KEY = 'categories:top-level';
  private static readonly TOP_LEVEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    private storageService: StorageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Raw SQL to get parent categories with provider counts, ordered and paginated
    const countResult = await this.categoryRepo.query(
      `SELECT COUNT(*)::int AS count
       FROM categories c
       WHERE c.is_active = true
         AND c.parent_id IS NULL
         AND COALESCE((
           SELECT COUNT(DISTINCT pc.provider_id)::int
           FROM provider_categories pc
           JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
           WHERE pc.category_id = c.id
              OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
         ), 0) > 0`,
    );
    const total = countResult[0]?.count ?? 0;

    // Get parent category IDs (paginated, ordered by provider count)
    const parentRows: any[] = await this.categoryRepo.query(
      `SELECT
         c.id,
         COALESCE((
           SELECT COUNT(DISTINCT pc.provider_id)::int
           FROM provider_categories pc
           JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
           WHERE pc.category_id = c.id
              OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
         ), 0) AS provider_count
       FROM categories c
       WHERE c.is_active = true
         AND c.parent_id IS NULL
         AND COALESCE((
           SELECT COUNT(DISTINCT pc.provider_id)::int
           FROM provider_categories pc
           JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
           WHERE pc.category_id = c.id
              OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
         ), 0) > 0
       ORDER BY provider_count DESC, c.display_order ASC
       LIMIT $1 OFFSET $2`,
      [limit, skip],
    );

    if (parentRows.length === 0) {
      return { data: [], meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    const parentIds = parentRows.map((r) => r.id);

    // Fetch full entities with children using TypeORM (safe — no correlated subqueries)
    const data = await this.categoryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.children', 'ch')
      .where('c.id IN (:...parentIds)', { parentIds })
      .getMany();

    // Preserve the provider-count sort order from the raw query
    const orderMap = new Map(parentIds.map((id, i) => [id, i]));
    data.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findTopLevel() {
    // Check cache first
    const cached = await this.cacheManager.get<any[]>(CategoriesService.TOP_LEVEL_CACHE_KEY);
    if (cached) return cached;

    // Single raw SQL — avoids the duplicate correlated subquery
    const raw: any[] = await this.categoryRepo.query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.icon_color   AS "iconColor",
        c.image_url   AS "imageUrl",
        c.is_active    AS "isActive",
        c.display_order AS "displayOrder",
        c.parent_id    AS "parentId",
        COALESCE(cnt.provider_count, 0)::int AS "providerCount"
      FROM categories c
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT pc.provider_id) AS provider_count
        FROM provider_categories pc
        JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
        WHERE pc.category_id = c.id
           OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
      ) cnt ON true
      WHERE c.parent_id IS NULL
        AND c.is_active = true
      ORDER BY
        CASE WHEN COALESCE(cnt.provider_count, 0) > 0 THEN 0 ELSE 1 END ASC,
        cnt.provider_count DESC,
        c.display_order ASC
    `);

    const result = raw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      icon: r.icon,
      iconColor: r.iconColor || null,
      imageUrl: r.imageUrl,
      isActive: r.isActive,
      displayOrder: r.displayOrder,
      parentId: r.parentId,
      providerCount: parseInt(r.providerCount, 10) || 0,
    }));

    await this.cacheManager.set(
      CategoriesService.TOP_LEVEL_CACHE_KEY,
      result,
      CategoriesService.TOP_LEVEL_CACHE_TTL,
    );

    return result;
  }

  /**
   * Suggest top-level categories that best match free-text input
   * (business name + description). Uses keyword partial matching + full-text
   * search on the category search_vector, returning up to 6 ranked results.
   */
  async suggestByText(text: string): Promise<any[]> {
    // Sanitize: keep alphanumeric, spaces, basic punctuation
    const clean = text.replace(/[^\w\s\u0600-\u06FF\u0900-\u097F.,'-]/g, ' ').trim();
    if (!clean) return [];

    // Build tsquery from words (prefix matching for partial input)
    const words = clean
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, 15); // cap to avoid giant queries
    if (words.length === 0) return [];

    const tsQuery = words.map((w) => `${w}:*`).join(' | ');
    const ilikeParts = words.map((_, i) => `kw ILIKE '%' || $${i + 2} || '%'`).join(' OR ');

    const raw: any[] = await this.categoryRepo.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.icon,
        c.icon_color AS "iconColor",
        c.image_url AS "imageUrl",
        c.description,
        (
          -- Full-text rank on category search_vector
          COALESCE(ts_rank_cd(c.search_vector, to_tsquery('english', $1)), 0) * 2.0
          +
          -- Keyword partial match score
          (SELECT COUNT(*)::float FROM unnest(c.keywords) kw WHERE ${ilikeParts}) * 1.5
          +
          -- Name direct match bonus
          CASE WHEN c.name ILIKE '%' || $${words.length + 2} || '%' THEN 3.0 ELSE 0.0 END
        ) AS score
      FROM categories c
      WHERE c.parent_id IS NULL
        AND c.is_active = true
        AND (
          c.search_vector @@ to_tsquery('english', $1)
          OR EXISTS (SELECT 1 FROM unnest(c.keywords) kw WHERE ${ilikeParts})
          OR c.name ILIKE '%' || $${words.length + 2} || '%'
        )
      ORDER BY score DESC, c.display_order ASC
      LIMIT 6
      `,
      [tsQuery, ...words, clean],
    );

    return raw
      .filter((r) => parseFloat(r.score) > 0)
      .map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon,
        iconColor: r.iconColor || null,
        imageUrl: r.imageUrl,
        description: r.description,
        score: parseFloat(r.score),
      }));
  }

  /**
   * Search categories across all levels (parents + children) by text.
   * Uses search_vector + keywords + name matching. Cached 2 minutes.
   */
  async searchAllCategories(query: string, limit = 10): Promise<any[]> {
    const cacheKey = `categories:search:${query.toLowerCase().slice(0, 60)}:${limit}`;
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const words = query
      .replace(/[^\w\s\u0600-\u06FF\u0900-\u097F]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, 10);
    if (words.length === 0) return [];

    const tsQuery = words.map((w) => `${w}:*`).join(' | ');
    const ilikeParts = words.map((_, i) => `kw ILIKE '%' || $${i + 2} || '%'`).join(' OR ');

    const raw: any[] = await this.categoryRepo.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.icon_color    AS "iconColor",
        c.image_url     AS "imageUrl",
        c.parent_id     AS "parentId",
        p_cat.name      AS "parentName",
        p_cat.icon      AS "parentIcon",
        COALESCE(cnt.provider_count, 0)::int AS "providerCount",
        (
          COALESCE(ts_rank_cd(c.search_vector, to_tsquery('english', $1)), 0) * 2.0
          + (SELECT COUNT(*)::float FROM unnest(c.keywords) kw WHERE ${ilikeParts}) * 1.5
          + CASE WHEN c.name ILIKE '%' || $${words.length + 2} || '%' THEN 3.0 ELSE 0.0 END
        ) AS score
      FROM categories c
      LEFT JOIN categories p_cat ON p_cat.id = c.parent_id
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT pc.provider_id) AS provider_count
        FROM provider_categories pc
        JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
        WHERE pc.category_id = c.id
           OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
      ) cnt ON true
      WHERE c.is_active = true
        AND (
          c.search_vector @@ to_tsquery('english', $1)
          OR EXISTS (SELECT 1 FROM unnest(c.keywords) kw WHERE ${ilikeParts})
          OR c.name ILIKE '%' || $${words.length + 2} || '%'
        )
      ORDER BY score DESC, cnt.provider_count DESC
      LIMIT $${words.length + 3}
      `,
      [tsQuery, ...words, query, limit],
    );

    const result = raw
      .filter((r) => parseFloat(r.score) > 0)
      .map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        icon: r.icon,
        iconColor: r.iconColor || null,
        imageUrl: r.imageUrl,
        parentId: r.parentId,
        parentName: r.parentName,
        parentIcon: r.parentIcon,
        providerCount: parseInt(r.providerCount, 10) || 0,
      }));

    await this.cacheManager.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }

  async findTree(): Promise<any[]> {
    const all = await this.categoryRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const cat of all) {
      map.set(cat.id, {
        id: cat.id,
        parentId: cat.parentId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        iconColor: cat.iconColor,
        imageUrl: cat.imageUrl,
        isActive: cat.isActive,
        displayOrder: cat.displayOrder,
        keywords: cat.keywords ?? [],
        children: [],
      });
    }

    for (const cat of all) {
      const node = map.get(cat.id);
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async create(data: any) {
    const entity = this.categoryRepo.create({ ...data, slug: slugify(data.name) });
    const saved = await this.categoryRepo.save(entity);
    await this.cacheManager.del(CategoriesService.TOP_LEVEL_CACHE_KEY);
    return saved;
  }

  async update(id: string, data: any) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No update data provided.');
    }
    if (data.name) data.slug = slugify(data.name);
    await this.categoryRepo.update(id, data);
    await this.cacheManager.del(CategoriesService.TOP_LEVEL_CACHE_KEY);
    return this.categoryRepo.findOneBy({ id });
  }

  async findOne(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findSubCategories(parentId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 50 } = paginationDto;
    const offset = (page - 1) * limit;

    const raw: any[] = await this.categoryRepo.query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.icon_color       AS "iconColor",
        c.image_url       AS "imageUrl",
        c.is_active        AS "isActive",
        c.display_order    AS "displayOrder",
        c.parent_id        AS "parentId",
        COALESCE(cnt.provider_count, 0)::int AS "providerCount",
        COALESCE(bk.recent, 0)::int          AS "recentBookings"
      FROM categories c
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT pc.provider_id) AS provider_count
        FROM provider_categories pc
        JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
        WHERE pc.category_id = c.id
      ) cnt ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(b.id) AS recent
        FROM bookings b
        JOIN provider_categories pc2 ON pc2.provider_id = b.provider_id AND pc2.category_id = c.id
        WHERE b.status IN ('completed', 'confirmed', 'in_progress')
          AND b.created_at >= NOW() - INTERVAL '7 days'
      ) bk ON true
      WHERE c.parent_id = $1
        AND c.is_active = true
      ORDER BY
        CASE WHEN COALESCE(cnt.provider_count, 0) > 0 THEN 0 ELSE 1 END ASC,
        cnt.provider_count DESC,
        c.display_order ASC
      LIMIT $2 OFFSET $3
    `, [parentId, limit, offset]);

    const countResult = await this.categoryRepo.query(
      `SELECT COUNT(*)::int AS total FROM categories WHERE parent_id = $1 AND is_active = true`,
      [parentId],
    );
    const total = countResult[0]?.total ?? 0;

    return {
      data: raw.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        icon: r.icon,
        iconColor: r.iconColor || null,
        imageUrl: r.imageUrl,
        isActive: r.isActive,
        displayOrder: r.displayOrder,
        parentId: r.parentId,
        providerCount: parseInt(r.providerCount, 10) || 0,
        recentBookings: parseInt(r.recentBookings, 10) || 0,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async uploadIcon(categoryId: string, file: Express.Multer.File): Promise<any> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_ICON_EXTENSIONS.includes(fileExt)) {
      throw new BadRequestException(`Invalid file type. Only PNG and SVG files are allowed. Received: .${fileExt}`);
    }
    if (!ALLOWED_ICON_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid MIME type. Received: ${file.mimetype}`);
    }
    if (file.size > MAX_ICON_SIZE) {
      throw new BadRequestException(`File size exceeds 5MB limit.`);
    }

    if (category.iconStorageKey) {
      try { await this.storageService.delete(category.iconStorageKey); } catch (e) { console.error('Failed to delete old icon:', e); }
    }

    const compressed = await compressImage(file, 'icon');
    const { url, storageKey } = await this.storageService.upload('categories', compressed);
    category.icon = url;
    category.iconStorageKey = storageKey;
    return this.categoryRepo.save(category);
  }

  async deleteIcon(categoryId: string): Promise<any> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Category not found');

    if (category.iconStorageKey) {
      try { await this.storageService.delete(category.iconStorageKey); } catch (e) { console.error('Failed to delete icon:', e); }
    }

    category.icon = null;
    category.iconStorageKey = null;
    return this.categoryRepo.save(category);
  }

  async uploadImage(categoryId: string, file: Express.Multer.File): Promise<any> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Category not found');

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Only PNG images are allowed. Received: ${file.mimetype}`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(`File size exceeds 10MB limit.`);
    }

    const compressed = await compressImage(file, 'banner');
    const { url } = await this.storageService.upload('categories/images', compressed);
    category.imageUrl = url;
    return this.categoryRepo.save(category);
  }

  async deleteImage(categoryId: string): Promise<any> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException('Category not found');

    category.imageUrl = null;
    return this.categoryRepo.save(category);
  }
}
