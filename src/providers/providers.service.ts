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
  private providerOtpStore = new Map<string, { otp: string; expiresAt: Date; sentAt: Date }>();

  constructor(
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verRepo: Repository<Verification>,
    private storage: StorageService,
    private dataSource: DataSource,
    private geocodeService: GeocodeService,
  ) {}

  async sendProviderOtp(mobileNumber: string) {
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) {
      throw new BadRequestException('Mobile number must be exactly 10 digits');
    }
    const mobile = mobileNumber.trim();

    const existing = this.providerOtpStore.get(mobile);
    if (existing && new Date() < existing.expiresAt) {
      const timeSinceSent = Date.now() - existing.sentAt.getTime();
      if (timeSinceSent < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - timeSinceSent) / 1000);
        throw new BadRequestException({ message: 'OTP recently sent. Please wait before resending.', retryAfterSeconds: remaining, error_code: 'OTP_RATE_LIMITED' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.providerOtpStore.set(mobile, { otp, expiresAt, sentAt: new Date() });
    console.log(`[Provider OTP] ${mobile}: ${otp} (Expires: ${expiresAt.toISOString()})`);

    return { message: 'OTP sent successfully', data: { mobileNumber: mobile, expiresIn: '5 minutes', otp } };
  }

  async verifyProviderOtp(mobileNumber: string, otp: string) {
    if (!mobileNumber || !otp) {
      throw new BadRequestException('Mobile number and OTP are required');
    }
    const mobile = mobileNumber.trim();
    const code = otp.trim();

    if (!/^\d{10}$/.test(mobile)) throw new BadRequestException('Mobile number must be exactly 10 digits');
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('OTP must be exactly 6 digits');

    const record = this.providerOtpStore.get(mobile);
    if (!record) throw new BadRequestException({ message: 'No OTP found for this number', error_code: 'OTP_NOT_FOUND' });
    if (new Date() > record.expiresAt) {
      this.providerOtpStore.delete(mobile);
      throw new BadRequestException({ message: 'OTP has expired', error_code: 'OTP_EXPIRED' });
    }
    if (record.otp !== code) throw new BadRequestException({ message: 'Invalid OTP', error_code: 'INVALID_OTP' });
    this.providerOtpStore.delete(mobile);

    return { message: 'OTP verified successfully', verified: true };
  }

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

    let aadhaarDocUrl: string | null = null;
    if (file) {
      const uploadResult = await this.storage.upload('verifications', file);
      aadhaarDocUrl = uploadResult.url;
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);

    const existingProvider = await this.providerRepo.findOneBy({ userId });
    if (existingProvider) throw new ConflictException(`Provider already exists for user with ID '${userId}'`);

    return this.dataSource.transaction(async (manager) => {
      const { latitude, longitude, file: _file, ...cleanData } = providerData as any;
      const provider = manager.create(Provider, {
        ...cleanData,
        userId,
        status: aadhaarDocUrl ? 'pending' : 'unverified',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });
      const savedProvider = await manager.save(provider);

      let savedVerification: Verification | null = null;
      if (aadhaarDocUrl) {
        const verification = manager.create(Verification, {
          userId,
          aadhaarDocUrl,
          ijamatNumber,
          ijamatExpiry: ijamatExpiry ? new Date(ijamatExpiry) : null,
          ijamatDocUrl,
          status: 'pending',
        });
        savedVerification = await manager.save(verification);
      }

      return { provider: savedProvider, verification: savedVerification };
    });
  }

  async submitVerification(userId: string, file: Express.Multer.File, docType?: string) {
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) throw new NotFoundException('Provider not found. Please register as a provider first.');

    const existingVerification = await this.verRepo.findOneBy({ userId });
    if (existingVerification && existingVerification.status === 'approved') {
      throw new ConflictException('Verification already approved.');
    }

    const uploadResult = await this.storage.upload('verifications', file);
    const aadhaarDocUrl = uploadResult.url;

    // Update provider status from 'unverified' to 'pending' when docs are submitted
    if (provider.status === 'unverified') {
      provider.status = 'pending';
      await this.providerRepo.save(provider);
    }

    if (existingVerification) {
      existingVerification.aadhaarDocUrl = aadhaarDocUrl;
      existingVerification.status = 'pending';
      return this.verRepo.save(existingVerification);
    }

    const verification = this.verRepo.create({
      userId,
      aadhaarDocUrl,
      status: 'pending',
    });
    return this.verRepo.save(verification);
  }

  async getMyProviderStatus(userId: string) {
    const user = await this.providerRepo.manager.getRepository('User').findOneBy({ id: userId }) as any;
    const provider = await this.providerRepo.findOneBy({ userId });
    if (!provider) {
      return { providerStatus: 'not_applied', verificationStatus: null, provider: null, verification: null, preferredMode: user?.preferredMode ?? 'customer' };
    }

    const verification = await this.verRepo.findOneBy({ userId });
    const verificationStatus = verification?.status ?? null;

    // Map to a provider-application status
    let providerStatus: string;
    if (provider.status === 'active' || verificationStatus === 'approved') {
      // Fully approved & verified
      providerStatus = 'approved';
    } else if (provider.status === 'unverified') {
      // Provider registered but never submitted verification docs
      // They can still access the dashboard, just not verified
      providerStatus = 'approved';
    } else if (verificationStatus === 'pending') {
      // Verification docs submitted, awaiting review
      providerStatus = 'pending';
    } else if (verificationStatus === 'rejected') {
      providerStatus = 'rejected';
    } else {
      // Fallback: provider exists with pending/in_review status
      providerStatus = 'pending';
    }

    return { providerStatus, verificationStatus, provider, verification, preferredMode: user?.preferredMode ?? 'customer' };
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
      .andWhere('provider.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere(`${haversine} <= :radius`, { lat, lng, radius })
      .setParameters({ lat, lng, radius });

    if (city) qb.andWhere('provider.city ILIKE :city', { city: `%${city}%` });
    if (search) {
      qb.andWhere(
        '(provider.brandName ILIKE :search OR provider.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sort - verified (active) providers always rank above unverified
    if (sortBy === 'distance') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
    } else if (sortBy === 'newest') {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('provider.createdAt', 'DESC');
    } else {
      qb.orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC');
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
      .andWhere('provider.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
      .andWhere('provider.isFeatured = :featured', { featured: true })
      .andWhere(`${haversine} <= :radius`)
      .setParameters({ lat, lng, radius })
      .orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('distance', 'ASC')
      .limit(10)
      .getRawAndEntities();

    // Fallback: if no featured providers, return nearest ones
    if (entities.length === 0) {
      ({ raw, entities } = await this.providerRepo
        .createQueryBuilder('provider')
        .leftJoinAndSelect('provider.user', 'user')
        .addSelect(haversine, 'distance')
        .where('provider.latitude IS NOT NULL')
        .andWhere('provider.longitude IS NOT NULL')
        .andWhere('provider.status IN (:...statuses)', { statuses: ['active', 'unverified'] })
        .andWhere(`${haversine} <= :radius`)
        .setParameters({ lat, lng, radius })
        .orderBy("CASE WHEN provider.status = 'active' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy('distance', 'ASC')
        .limit(10)
        .getRawAndEntities());
    }

    return entities.map((provider, i) => ({
      ...provider,
      distance: parseFloat(parseFloat(raw[i]?.distance ?? '0').toFixed(2)),
    }));
  }
}
