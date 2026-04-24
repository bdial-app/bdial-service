import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, ILike, DataSource } from 'typeorm';
import { User, Verification, Provider, ConversationParticipant, SavedItem, SavedLocation, Review, Booking, SearchLog } from '../entities';
import { UpdateUserDto, UserListQueryDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserPaginationDto } from './dto/user-pagination.dto';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verificationRepo: Repository<Verification>,
    @InjectRepository(Provider) private providerRepo: Repository<Provider>,
    @InjectRepository(ConversationParticipant) private participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(SavedItem) private savedItemRepo: Repository<SavedItem>,
    @InjectRepository(SavedLocation) private savedLocationRepo: Repository<SavedLocation>,
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(SearchLog) private searchLogRepo: Repository<SearchLog>,
    private readonly supabaseAuthService: SupabaseAuthService,
    private readonly dataSource: DataSource,
  ) {}

  async list(query: UserListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await this.userRepo.findAndCount({
      where: { deletedAt: IsNull() },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  }

  async findById(id: string) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateById(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    await this.userRepo.update(user.id, dto);
    return this.userRepo.findOneBy({ id: user.id });
  }

  async create(createUserDto: CreateUserDto) {
    const { mobileNumber } = createUserDto;
    const existingUser = await this.userRepo.findOneBy({ mobileNumber });
    if (existingUser) {
      throw new ConflictException(`User with mobile number '${mobileNumber}' already exists`);
    }
    const user = this.userRepo.create(createUserDto);
    return this.userRepo.save(user);
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    await this.userRepo.update(id, dto);
    return this.userRepo.findOneBy({ id });
  }

  async updateUser(id: string, updateUserDto: AdminUpdateUserDto) {
    const existingUser = await this.userRepo.findOneBy({ id });
    if (!existingUser) throw new NotFoundException(`User with ID '${id}' not found`);

    if (updateUserDto.mobileNumber && updateUserDto.mobileNumber !== existingUser.mobileNumber) {
      const mobileConflict = await this.userRepo.findOneBy({ mobileNumber: updateUserDto.mobileNumber });
      if (mobileConflict) throw new ConflictException(`Mobile number '${updateUserDto.mobileNumber}' is already in use`);
    }

    await this.userRepo.update(id, updateUserDto);
    return this.userRepo.findOneBy({ id });
  }

  async getUserDetails(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['listings', 'verification', 'provider'],
    });
    if (!user) throw new NotFoundException(`User with ID '${id}' not found`);
    return user;
  }

  async getUsersList(paginationDto: UserPaginationDto) {
    const { page = 1, limit = 10, role, status, search } = paginationDto;
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('user');

    if (status === 'deleted') {
      qb.where('user.deletedAt IS NOT NULL');
    } else {
      qb.where('user.deletedAt IS NULL');
      if (status) qb.andWhere('user.status = :status', { status });
    }

    if (role) qb.andWhere('user.role = :role', { role });

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.mobileNumber ILIKE :search)', { search: `%${search}%` });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Soft-delete (archive) user account.
   * Scrubs PII, deletes Supabase auth user, suspends provider, deactivates chats.
   */
  async deleteAccount(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['provider'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === 'deleted') throw new BadRequestException('Account is already deleted');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Scrub PII and set status to deleted
      await queryRunner.manager.update(User, userId, {
        status: 'deleted',
        deletedAt: new Date(),
        archiveReason: 'user_request',
        name: 'Deleted User',
        mobileNumber: null,
        email: null,
        googleId: null,
        googleEmail: null,
        googleName: null,
        ssoProvider: null,
        city: null,
        area: null,
        pincode: null,
        latitude: null,
        longitude: null,
      });

      // 2. Delete Supabase auth user (prevents SSO ghost re-login)
      if (user.supabaseId) {
        await this.supabaseAuthService.deleteSupabaseUser(user.supabaseId);
        await queryRunner.manager.update(User, userId, { supabaseId: null });
      }

      // 3. Suspend provider if exists
      if (user.provider) {
        await queryRunner.manager.update(Provider, user.provider.id, {
          status: 'suspended',
          isAvailable: false,
        });
      }

      // 4. Deactivate chat participations
      await queryRunner.manager.update(
        ConversationParticipant,
        { userId },
        { isActive: false },
      );

      await queryRunner.commitTransaction();
      return { message: 'Account has been deleted and archived successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Pause user account.
   * Bans Supabase user, hides provider, deactivates chats. Reversible.
   */
  async pauseAccount(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['provider'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'active') throw new BadRequestException('Only active accounts can be paused');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Set status to paused
      await queryRunner.manager.update(User, userId, {
        status: 'paused',
        pausedAt: new Date(),
      });

      // 2. Ban Supabase user (blocks all SSO re-login)
      if (user.supabaseId) {
        await this.supabaseAuthService.banUser(user.supabaseId);
      }

      // 3. Hide provider if exists
      if (user.provider) {
        await queryRunner.manager.update(Provider, user.provider.id, {
          isAvailable: false,
        });
      }

      // 4. Deactivate chat participations
      await queryRunner.manager.update(
        ConversationParticipant,
        { userId },
        { isActive: false },
      );

      await queryRunner.commitTransaction();
      return { message: 'Account has been paused. You can reactivate anytime.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Resume a paused account.
   * Unbans Supabase user, restores provider visibility, reactivates chats.
   */
  async resumeAccount(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['provider'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'paused') throw new BadRequestException('Only paused accounts can be resumed');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Restore status to active
      await queryRunner.manager.update(User, userId, {
        status: 'active',
        pausedAt: null,
      });

      // 2. Unban Supabase user
      if (user.supabaseId) {
        await this.supabaseAuthService.unbanUser(user.supabaseId);
      }

      // 3. Restore provider visibility if exists
      if (user.provider) {
        await queryRunner.manager.update(Provider, user.provider.id, {
          isAvailable: true,
        });
      }

      // 4. Reactivate chat participations
      await queryRunner.manager.update(
        ConversationParticipant,
        { userId },
        { isActive: true },
      );

      await queryRunner.commitTransaction();
      return this.userRepo.findOneBy({ id: userId });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Export all user data (GDPR-style data portability).
   */
  async exportMyData(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const [savedLocations, savedItems, reviews, bookings, searchLogs] = await Promise.all([
      this.savedLocationRepo.find({ where: { userId } }),
      this.savedItemRepo.find({ where: { userId } }),
      this.reviewRepo.find({ where: { reviewerId: userId } as any }),
      this.bookingRepo.find({ where: { userId } }),
      this.searchLogRepo.find({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
        gender: user.gender,
        city: user.city,
        area: user.area,
        pincode: user.pincode,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
      },
      savedLocations,
      savedItems,
      reviews,
      bookings,
      searchLogs,
    };
  }
}
