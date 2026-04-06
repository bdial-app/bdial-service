import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { slug, parentId } = createCategoryDto;

    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID '${parentId}' not found`);
      }
    }

    return this.prisma.category.create({
      data: createCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll() {
    // Get all active categories
    const allCategories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        parent: true,
      },
    });

    // Build the tree structure
    return this.buildCategoryTree(allCategories);
  }

  private buildCategoryTree(categories: any[], parentId: string | null = null): any[] {
    return categories
      .filter(category => category.parentId === parentId)
      .map(category => ({
        ...category,
        children: this.buildCategoryTree(categories, category.id),
      }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    // If slug is being updated, check for conflicts
    if (updateCategoryDto.slug && updateCategoryDto.slug !== existingCategory.slug) {
      const slugConflict = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });

      if (slugConflict) {
        throw new ConflictException(`Category with slug '${updateCategoryDto.slug}' already exists`);
      }
    }

    // If parentId is being updated, verify it exists and prevent circular references
    if (updateCategoryDto.parentId !== undefined) {
      if (updateCategoryDto.parentId) {
        if (updateCategoryDto.parentId === id) {
          throw new ConflictException('Category cannot be its own parent');
        }

        const parentCategory = await this.prisma.category.findUnique({
          where: { id: updateCategoryDto.parentId },
        });

        if (!parentCategory) {
          throw new NotFoundException(`Parent category with ID '${updateCategoryDto.parentId}' not found`);
        }

        // Check for circular reference
        const isCircular = await this.checkCircularReference(updateCategoryDto.parentId, id);
        if (isCircular) {
          throw new ConflictException('Cannot set parent: would create circular reference');
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findSubCategories(parentId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Verify parent category exists
    const parentCategory = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentCategory) {
      throw new NotFoundException(`Parent category with ID '${parentId}' not found`);
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { parentId, isActive: true },
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
        where: { parentId, isActive: true },
      }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      parent: parentCategory,
    };
  }

  findTopLevel() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  private async checkCircularReference(parentId: string, categoryId: string): Promise<boolean> {
    let currentId: string | null | undefined = parentId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      
      if (currentId === categoryId) {
        return true;
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId;
    }

    return false;
  }
}
