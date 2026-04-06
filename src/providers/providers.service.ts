import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(createProviderDto: CreateProviderDto) {
    const { userId, contactNumber } = createProviderDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Check if provider already exists for this user
    const existingProvider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      throw new ConflictException(`Provider already exists for user with ID '${userId}'`);
    }

    return this.prisma.provider.create({
      data: createProviderDto,
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

  async becomeProvider(becomeProviderDto: BecomeProviderDto, file?: Express.Multer.File) {
    const { 
      userId, 
      ijamatNumber, 
      ijamatExpiry, 
      ijamatDocUrl,
      ...providerData 
    } = becomeProviderDto;

    // Check if file is provided
    if (!file) {
      throw new BadRequestException('Aadhaar card document file is required');
    }

    // Upload Aadhaar Doc
    const uploadResult = await this.storage.upload('verifications', file);
    const aadhaarDocUrl = uploadResult.url;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Check if provider already exists for this user
    const existingProvider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      throw new ConflictException(`Provider already exists for user with ID '${userId}'`);
    }

    // Use transaction to create both provider and verification
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.provider.create({
        data: {
          ...providerData,
          userId,
        },
      });

      const verification = await tx.verification.create({
        data: {
          userId,
          aadhaarDocUrl, // This will now be a string
          ijamatNumber,
          ijamatExpiry: ijamatExpiry ? new Date(ijamatExpiry) : null,
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
    const { page = 1, limit = 10, status, isAvailable, city, search } = paginationDto;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
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
      throw new NotFoundException(`Provider with ID '${id}' not found`);
    }

    // If userId is being updated, check if it exists and is unique
    if (updateProviderDto.userId && updateProviderDto.userId !== existingProvider.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateProviderDto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID '${updateProviderDto.userId}' not found`);
      }

      const existingProviderForUser = await this.prisma.provider.findUnique({
        where: { userId: updateProviderDto.userId },
      });

      if (existingProviderForUser) {
        throw new ConflictException(`Provider already exists for user with ID '${updateProviderDto.userId}'`);
      }
    }

    return this.prisma.provider.update({
      where: { id },
      data: updateProviderDto,
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
