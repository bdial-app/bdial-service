import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProvidersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private toTime(value?: string | null): Date | null {
    if (!value) return null;

    const [hours, minutes] = value.split(':').map(Number);

    const date = new Date();
    date.setUTCHours(hours, minutes, 0, 0);

    return date;
  }

  private buildCreateProviderData(
    providerData: CreateProviderDto,
  ): Prisma.ProviderUncheckedCreateInput {
    return {
      ...providerData,
      openTime: this.toTime(providerData.openTime),
      closeTime: this.toTime(providerData.closeTime),
    };
  }

  private buildUpdateProviderData(
    providerData: UpdateProviderDto,
  ): Prisma.ProviderUncheckedUpdateInput {
    return {
      ...providerData,
      ...(providerData.openTime !== undefined && {
        openTime: this.toTime(providerData.openTime),
      }),
      ...(providerData.closeTime !== undefined && {
        closeTime: this.toTime(providerData.closeTime),
      }),
    };
  }

  async create(createProviderDto: CreateProviderDto) {
    const { userId } = createProviderDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const existingProvider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      throw new ConflictException(
        `Provider already exists for user with ID '${userId}'`,
      );
    }

    return this.prisma.provider.create({
      data: this.buildCreateProviderData({
        ...createProviderDto,
        status: createProviderDto.status ?? 'active',
      }),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
      },
    });
  }

  async becomeProvider(
    becomeProviderDto: BecomeProviderDto,
    file?: Express.Multer.File,
  ) {
    const {
      userId,
      ijamatNumber,
      ijamatExpiry,
      ijamatDocUrl,
      ...providerData
    } = becomeProviderDto;

    if (!file) {
      throw new BadRequestException(
        'Aadhaar card document file is required',
      );
    }

    const uploadResult = await this.storage.upload('verifications', file);
    const aadhaarDocUrl = uploadResult.url;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const existingProvider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      throw new ConflictException(
        `Provider already exists for user with ID '${userId}'`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.provider.create({
        data: this.buildCreateProviderData({
          ...providerData,
          status: 'active',
          userId,
        }),
      });

      const verification = await tx.verification.create({
        data: {
          userId,
          aadhaarDocUrl,
          ijamatNumber,
          ijamatExpiry: ijamatExpiry
            ? new Date(ijamatExpiry)
            : null,
          ijamatDocUrl,
          status: 'pending',
        },
      });

      return { provider, verification };
    });
  }

  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
            gender: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID '${id}' not found`);
    }

    return provider;
  }

  async findAll(paginationDto: ProviderPaginationDto) {
    const { page = 1, limit = 10, status, city, search } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { brandName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              mobileNumber: true,
              gender: true,
            },
          },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, updateProviderDto: UpdateProviderDto) {
    const existingProvider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!existingProvider) {
      throw new NotFoundException(
        `Provider with ID '${id}' not found`,
      );
    }

    // If userId is being updated, check if it exists and is unique
    if (
      updateProviderDto.userId &&
      updateProviderDto.userId !== existingProvider.userId
    ) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateProviderDto.userId },
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID '${updateProviderDto.userId}' not found`,
        );
      }

      const existingProviderForUser =
        await this.prisma.provider.findUnique({
          where: { userId: updateProviderDto.userId },
        });

      if (existingProviderForUser) {
        throw new ConflictException(
          `Provider already exists for user with ID '${updateProviderDto.userId}'`,
        );
      }
    }

    return this.prisma.provider.update({
      where: { id },
      data: this.buildUpdateProviderData(updateProviderDto),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
            gender: true,
          },
        },
      },
    });
  }
}
