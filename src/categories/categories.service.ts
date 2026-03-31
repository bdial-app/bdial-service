import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  findTopLevel() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
