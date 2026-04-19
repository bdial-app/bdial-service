import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PaginationDto } from './dto/pagination.dto';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

// Allowed file extensions and MIME types for icons
const ALLOWED_ICON_EXTENSIONS = ['png', 'svg'];
const ALLOWED_ICON_MIME_TYPES = ['image/png', 'image/svg+xml', 'image/svg'];
const MAX_ICON_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  // ✅ UPDATED: uses PaginationDto
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { displayOrder: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      }),
      this.prisma.category.count({
        where: { isActive: true },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findTopLevel() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // ✅ CREATE (auto slug)
  create(data: any) {
    return this.prisma.category.create({
      data: {
        ...data,
        slug: slugify(data.name),
      },
    });
  }

  // ✅ UPDATE (with slug update)
  update(
    id: string,
    data: {
      name?: string;
      isActive?: boolean;
      displayOrder?: number;
      parentId?: string;
      slug?: string;
      icon?: string;
      iconStorageKey?: string;
    },
  ) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No update data provided.');
    }

    if (data.name) {
      data = { ...data, slug: slugify(data.name) };
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  // ✅ GET ONE (with validation)
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findSubCategories(parentId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { parentId, isActive: true },
        skip,
        take: limit,
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.category.count({
        where: { parentId, isActive: true },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Upload an icon for a category
   * @param categoryId - The category ID
   * @param file - The uploaded file (PNG or SVG)
   * @returns Updated category with icon URL
   */
  async uploadIcon(
    categoryId: string,
    file: Express.Multer.File,
  ): Promise<any> {
    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Validate file extension
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_ICON_EXTENSIONS.includes(fileExt)) {
      throw new BadRequestException(
        `Invalid file type. Only PNG and SVG files are allowed. Received: .${fileExt}`,
      );
    }

    // Validate MIME type
    if (!ALLOWED_ICON_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid MIME type. Only PNG and SVG are allowed. Received: ${file.mimetype}`,
      );
    }

    // Validate file size
    if (file.size > MAX_ICON_SIZE) {
      throw new BadRequestException(
        `File size exceeds 5MB limit. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Delete old icon if it exists
    if (category.iconStorageKey) {
      try {
        await this.storageService.delete(category.iconStorageKey);
      } catch (error) {
        console.error('Failed to delete old icon:', error);
        // Continue with upload even if delete fails
      }
    }

    // Upload new icon
    const { url, storageKey } = await this.storageService.upload(
      'categories',
      file,
    );

    // Update category with new icon
    const updatedCategory = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        icon: url,
        iconStorageKey: storageKey,
      },
    });

    return updatedCategory;
  }

  /**
   * Delete icon from a category
   * @param categoryId - The category ID
   * @returns Updated category
   */
  async deleteIcon(categoryId: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Delete from S3 if storage key exists
    if (category.iconStorageKey) {
      try {
        await this.storageService.delete(category.iconStorageKey);
      } catch (error) {
        console.error('Failed to delete icon from storage:', error);
        // Continue even if delete fails
      }
    }

    // Update category to remove icon
    const updatedCategory = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        icon: null,
        iconStorageKey: null,
      },
    });

    return updatedCategory;
  }
}
