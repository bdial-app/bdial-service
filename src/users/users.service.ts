import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserPaginationDto } from './dto/user-pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const { mobileNumber } = createUserDto;

    // Check if mobile number already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { mobileNumber },
    });

    if (existingUser) {
      throw new ConflictException(`User with mobile number '${mobileNumber}' already exists`);
    }

    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async updateUser(id: string, updateUserDto: AdminUpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // If mobile number is being updated, check for conflicts
    if (updateUserDto.mobileNumber && updateUserDto.mobileNumber !== existingUser.mobileNumber) {
      const mobileConflict = await this.prisma.user.findUnique({
        where: { mobileNumber: updateUserDto.mobileNumber },
      });

      if (mobileConflict) {
        throw new ConflictException(`Mobile number '${updateUserDto.mobileNumber}' is already in use`);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        verification: {
          select: {
            id: true,
            aadhaarStatus: true,
            ijamatStatus: true,
            reviewedAt: true,
            adminNotes: true,
          },
        },
        provider: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  async getUsersList(paginationDto: UserPaginationDto) {
    const { page = 1, limit = 10, role, status, search } = paginationDto;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {
      deletedAt: null, // Exclude deleted users by default
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      if (status === 'deleted') {
        delete where.deletedAt;
        where.deletedAt = { not: null };
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mobileNumber: true,
          name: true,
          gender: true,
          role: true,
          status: true,
          city: true,
          area: true,
          pincode: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

}
