import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Provider, User, Verification } from '../entities';
import { StorageService } from '../storage/storage.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verRepo: Repository<Verification>,
    private storage: StorageService,
    private dataSource: DataSource,
  ) {}

  async create(createProviderDto: CreateProviderDto) {
    const { userId } = createProviderDto;
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);

    const existingProvider = await this.providerRepo.findOneBy({ userId });
    if (existingProvider) throw new ConflictException(`Provider already exists for user with ID '${userId}'`);

    const { latitude, longitude, ...rest } = createProviderDto;
    const provider = this.providerRepo.create({
      ...rest,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    });
    const saved = await this.providerRepo.save(provider);
    return this.providerRepo.findOne({ where: { id: saved.id }, relations: ['user'] });
  }

  async becomeProvider(becomeProviderDto: BecomeProviderDto, file?: Express.Multer.File) {
    const { userId, ijamatNumber, ijamatExpiry, ijamatDocUrl, ...providerData } = becomeProviderDto;

    if (!file) throw new BadRequestException('Aadhaar card document file is required');

    const uploadResult = await this.storage.upload('verifications', file);
    const aadhaarDocUrl = uploadResult.url;

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);

    const existingProvider = await this.providerRepo.findOneBy({ userId });
    if (existingProvider) throw new ConflictException(`Provider already exists for user with ID '${userId}'`);

    return this.dataSource.transaction(async (manager) => {
      const { latitude, longitude, file: _file, ...cleanData } = providerData as any;
      const provider = manager.create(Provider, {
        ...cleanData,
        userId,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });
      const savedProvider = await manager.save(provider);

      const verification = manager.create(Verification, {
        userId,
        aadhaarDocUrl,
        ijamatNumber,
        ijamatExpiry: ijamatExpiry ? new Date(ijamatExpiry) : null,
        ijamatDocUrl,
        status: 'pending',
      });
      const savedVerification = await manager.save(verification);

      return { provider: savedProvider, verification: savedVerification };
    });
  }

  async findOne(id: string) {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!provider) throw new NotFoundException(`Provider with ID '${id}' not found`);
    return provider;
  }

  async findAll(paginationDto: ProviderPaginationDto) {
    const { page = 1, limit = 10, status, city, search } = paginationDto;
    const skip = (page - 1) * limit;

    const qb = this.providerRepo.createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user');

    if (status) qb.andWhere('provider.status = :status', { status });
    if (city) qb.andWhere('provider.city ILIKE :city', { city: `%${city}%` });
    if (search) {
      qb.andWhere('(provider.brand_name ILIKE :search OR provider.description ILIKE :search OR provider.address ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('provider.created_at', 'DESC').skip(skip).take(limit);

    const [providers, total] = await qb.getManyAndCount();
    return { data: providers, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, updateProviderDto: UpdateProviderDto) {
    const existingProvider = await this.providerRepo.findOneBy({ id });
    if (!existingProvider) throw new NotFoundException(`Provider with ID '${id}' not found`);

    if (updateProviderDto.userId && updateProviderDto.userId !== existingProvider.userId) {
      const user = await this.userRepo.findOneBy({ id: updateProviderDto.userId });
      if (!user) throw new NotFoundException(`User with ID '${updateProviderDto.userId}' not found`);
      const existing = await this.providerRepo.findOneBy({ userId: updateProviderDto.userId });
      if (existing) throw new ConflictException(`Provider already exists for user with ID '${updateProviderDto.userId}'`);
    }

    const { latitude, longitude, ...rest } = updateProviderDto;
    const updateData: any = { ...rest };
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    await this.providerRepo.update(id, updateData);
    return this.providerRepo.findOne({ where: { id }, relations: ['user'] });
  }
}
