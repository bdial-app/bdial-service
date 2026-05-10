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

    // Raw SQL avoids TypeORM wrapping the correlated subquery for pagination,
    // which would break the `c` alias and cause a 500.
    const rows: any[] = await this.categoryRepo.query(
      `SELECT
         c.id,
         c.name,
         c.slug,
         c.description,
         c.icon,
         c.image_url       AS "imageUrl",
         c.is_active       AS "isActive",
         c.display_order   AS "displayOrder",
         c.parent_id       AS "parentId",
         c.created_at      AS "createdAt",
         c.updated_at      AS "updatedAt",
         COALESCE((
           SELECT COUNT(DISTINCT pc.provider_id)::int
           FROM provider_categories pc
           JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
           WHERE pc.category_id = c.id
              OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
         ), 0) AS "providerCount",
         COUNT(*) OVER()::int AS "totalCount"
       FROM categories c
       WHERE c.is_active = true
         AND COALESCE((
           SELECT COUNT(DISTINCT pc2.provider_id)::int
           FROM provider_categories pc2
           JOIN providers p2 ON p2.id = pc2.provider_id AND p2.status IN ('active', 'unverified')
           WHERE pc2.category_id = c.id
              OR pc2.category_id IN (SELECT cc2.id FROM categories cc2 WHERE cc2.parent_id = c.id)
         ), 0) > 0
       ORDER BY "providerCount" DESC, c.display_order ASC
       LIMIT $1 OFFSET $2`,
      [limit, skip],
    );

    const total: number = rows[0]?.totalCount ?? 0;
    const categoryIds = rows.map((r) => r.id);

    // Load children for the fetched page in a single query
    let childrenMap: Map<string, any[]> = new Map();
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map((_, i) => `$${i + 1}`).join(',');
      const children: any[] = await this.categoryRepo.query(
        `SELECT id, name, slug, description, icon, image_url AS "imageUrl",
                is_active AS "isActive", display_order AS "displayOrder", parent_id AS "parentId",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM categories
         WHERE parent_id IN (${placeholders}) AND is_active = true
         ORDER BY display_order ASC, name ASC`,
        categoryIds,
      );
      for (const child of children) {
        if (!childrenMap.has(child.parentId)) childrenMap.set(child.parentId, []);
        childrenMap.get(child.parentId)!.push(child);
      }
    }

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      icon: r.icon,
      imageUrl: r.imageUrl,
      isActive: r.isActive,
      displayOrder: r.displayOrder,
      parentId: r.parentId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      providerCount: parseInt(r.providerCount, 10) || 0,
      children: childrenMap.get(r.id) ?? [],
    }));

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
        AND COALESCE(cnt.provider_count, 0) > 0
      ORDER BY cnt.provider_count DESC, c.display_order ASC
    `);

    const result = raw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      icon: r.icon,
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
        imageUrl: cat.imageUrl,
        isActive: cat.isActive,
        displayOrder: cat.displayOrder,
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
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.categoryRepo.findAndCount({
      where: { parentId, isActive: true },
      skip,
      take: limit,
      order: { displayOrder: 'ASC' },
    });

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
