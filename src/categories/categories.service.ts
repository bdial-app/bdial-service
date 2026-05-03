import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
  constructor(
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    private storageService: StorageService,
  ) {}

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const providerCountExpr = `COALESCE((
      SELECT COUNT(DISTINCT pc.provider_id)::int
      FROM provider_categories pc
      JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
      WHERE pc.category_id = c.id
         OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
    ), 0)`;

    // Get total count of categories with providers
    const [{ count: total }] = await this.categoryRepo.query(
      `SELECT COUNT(*)::int AS count FROM (
        SELECT c.id FROM categories c
        WHERE c.is_active = true
        AND ${providerCountExpr} > 0
      ) sub`,
    );

    // Get paginated categories with children
    const data = await this.categoryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.children', 'ch')
      .where('c.is_active = true')
      .andWhere(`${providerCountExpr} > 0`)
      .orderBy(`${providerCountExpr}`, 'DESC')
      .addOrderBy('c.display_order', 'ASC')
      .offset(skip)
      .limit(limit)
      .getMany();

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findTopLevel() {
    // Only return categories that have at least 1 active provider, sorted by provider count
    const raw = await this.categoryRepo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c.name AS name',
        'c.slug AS slug',
        'c.description AS description',
        'c.icon AS icon',
        'c.image_url AS "imageUrl"',
        'c.is_active AS "isActive"',
        'c.display_order AS "displayOrder"',
        'c.parent_id AS "parentId"',
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
      .where('c.parent_id IS NULL')
      .andWhere('c.is_active = true')
      .having(
        `COALESCE((
          SELECT COUNT(DISTINCT pc.provider_id)::int
          FROM provider_categories pc
          JOIN providers p ON p.id = pc.provider_id AND p.status IN ('active', 'unverified')
          WHERE pc.category_id = c.id
             OR pc.category_id IN (SELECT cc.id FROM categories cc WHERE cc.parent_id = c.id)
        ), 0) > 0`,
      )
      .groupBy('c.id')
      .orderBy('"providerCount"', 'DESC')
      .addOrderBy('c.display_order', 'ASC')
      .getRawMany();

    return raw.map((r: any) => ({
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

  create(data: any) {
    const entity = this.categoryRepo.create({ ...data, slug: slugify(data.name) });
    return this.categoryRepo.save(entity);
  }

  async update(id: string, data: any) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No update data provided.');
    }
    if (data.name) data.slug = slugify(data.name);
    await this.categoryRepo.update(id, data);
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
