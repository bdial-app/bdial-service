import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '../entities';
import { StorageService } from '../storage/storage.service';
import { PaginationDto } from './dto/pagination.dto';

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

    const [data, total] = await this.categoryRepo.findAndCount({
      where: { isActive: true },
      skip,
      take: limit,
      order: { displayOrder: 'ASC' },
      relations: ['children'],
    });

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  findTopLevel() {
    return this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      order: { displayOrder: 'ASC' },
    });
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

    const { url, storageKey } = await this.storageService.upload('categories', file);
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

    const { url } = await this.storageService.upload('categories/images', file);
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
