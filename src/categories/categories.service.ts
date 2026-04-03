import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 10) {
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
      total,
      page,
      limit,
    };
  }

  findTopLevel() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  create(data: any) {
    return this.prisma.category.create({
      data: {
        ...data,
        slug: slugify(data.name), // <--- slug generated automatically
      },
    });
  }

update(
  id: string,
  data: { name?: string; isActive?: boolean; displayOrder?: number; parentId?: string; slug?: string}
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
  findOne(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
  }

  findSubcategories(parentId: string) {
    return this.prisma.category.findMany({
      where: { parentId, isActive: true },
    });
  }
}