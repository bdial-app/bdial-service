import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from './dto/pagination.dto';

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

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
}