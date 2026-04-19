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
import { GeocodeService } from '../geocode/geocode.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { NearbyProvidersDto } from './dto/nearby-providers.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verRepo: Repository<Verification>,
    private storage: StorageService,
    private dataSource: DataSource,
    private geocodeService: GeocodeService,
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
      qb.andWhere('(provider.brandName ILIKE :search OR provider.description ILIKE :search OR provider.address ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('provider.createdAt', 'DESC').skip(skip).take(limit);

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

  /**
   * Find providers near a lat/lng using the Haversine formula.
   * Optionally enriches with Google Distance Matrix (road distance + travel time).
   * Flow 1-c: Location-based provider discovery.
   */
  async findNearby(dto: NearbyProvidersDto) {
    const { lat, lng, radius = 10, page = 1, limit = 10, search, city, sortBy = 'distance' } = dto;
    const offset = (page - 1) * limit;

    // Haversine formula in SQL (returns distance in km)
    const haversine = `
      6371 * acos(
        LEAST(1.0, cos(radians(:lat)) * cos(radians(provider.latitude))
        * cos(radians(provider.longitude) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(provider.latitude)))
      )
    `;

    const qb = this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .addSelect(haversine, 'distance')
      .where('provider.latitude IS NOT NULL')
      .andWhere('provider.longitude IS NOT NULL')
      .andWhere('provider.status = :status', { status: 'active' })
      .andWhere(`${haversine} <= :radius`, { lat, lng, radius })
      .setParameters({ lat, lng, radius });

    if (city) qb.andWhere('provider.city ILIKE :city', { city: `%${city}%` });
    if (search) {
      qb.andWhere(
        '(provider.brandName ILIKE :search OR provider.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sort
    if (sortBy === 'distance') {
      qb.orderBy('distance', 'ASC');
    } else if (sortBy === 'newest') {
      qb.orderBy('provider.createdAt', 'DESC');
    } else {
      qb.orderBy('distance', 'ASC');
    }

    // Get total before pagination
    const total = await qb.getCount();

    // Get paginated results with distance
    const { raw, entities } = await qb.offset(offset).limit(limit).getRawAndEntities();

    // Merge Haversine distance into entities
    let data = entities.map((provider, i) => ({
      ...provider,
      distance: parseFloat(parseFloat(raw[i]?.distance ?? '0').toFixed(2)),
      roadDistance: null as string | null,
      roadDistanceMeters: null as number | null,
      travelTime: null as string | null,
      travelTimeSeconds: null as number | null,
    }));

    // Enrich with Distance Matrix (road distance + travel time)
    try {
      const destinations = data
        .filter((p) => p.latitude && p.longitude)
        .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));

      if (destinations.length > 0) {
        const matrix = await this.geocodeService.getDistanceMatrix(
          { lat, lng },
          destinations,
        );
        let mi = 0;
        data = data.map((p) => {
          if (p.latitude && p.longitude && mi < matrix.length) {
            const m = matrix[mi++];
            return {
              ...p,
              roadDistance: m.distanceText,
              roadDistanceMeters: m.distanceValue,
              travelTime: m.durationText,
              travelTimeSeconds: m.durationValue,
            };
          }
          return p;
        });
      }
    } catch {
      // Distance Matrix unavailable — Haversine distance still present
    }

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), radius },
    };
  }

  /**
   * Get featured providers near a location.
   * Flow 1-b: Returns providers marked as is_featured, ordered by distance.
   * Falls back to nearest active providers if none are featured.
   */
  async findFeatured(lat: number, lng: number, radius: number = 25) {
    const haversine = `
      6371 * acos(
        LEAST(1.0, cos(radians(:lat)) * cos(radians(provider.latitude))
        * cos(radians(provider.longitude) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(provider.latitude)))
      )
    `;

    // First try: featured providers within radius
    let { raw, entities } = await this.providerRepo
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.user', 'user')
      .addSelect(haversine, 'distance')
      .where('provider.latitude IS NOT NULL')
      .andWhere('provider.longitude IS NOT NULL')
      .andWhere('provider.status = :status', { status: 'active' })
      .andWhere('provider.isFeatured = :featured', { featured: true })
      .andWhere(`${haversine} <= :radius`)
      .setParameters({ lat, lng, radius })
      .orderBy('distance', 'ASC')
      .limit(10)
      .getRawAndEntities();

    // Fallback: if no featured providers, return nearest active ones
    if (entities.length === 0) {
      ({ raw, entities } = await this.providerRepo
        .createQueryBuilder('provider')
        .leftJoinAndSelect('provider.user', 'user')
        .addSelect(haversine, 'distance')
        .where('provider.latitude IS NOT NULL')
        .andWhere('provider.longitude IS NOT NULL')
        .andWhere('provider.status = :status', { status: 'active' })
        .andWhere(`${haversine} <= :radius`)
        .setParameters({ lat, lng, radius })
        .orderBy('distance', 'ASC')
        .limit(10)
        .getRawAndEntities());
    }

    return entities.map((provider, i) => ({
      ...provider,
      distance: parseFloat(parseFloat(raw[i]?.distance ?? '0').toFixed(2)),
    }));
  }
}
