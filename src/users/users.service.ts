import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserListQueryDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.mobileNumber }
    });
    if (existing) {
      throw new BadRequestException('User with this mobile number already exists');
    }

    return this.prisma.user.create({
      data: dto,
    });
  }

  async list(query: UserListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateById(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
    });
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async getMyListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { providerId: userId, deletedAt: null },
      include: { listingCategories: { include: { category: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
