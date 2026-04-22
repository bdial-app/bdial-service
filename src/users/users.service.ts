import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, ILike } from 'typeorm';
import { User, Verification } from '../entities';
import { UpdateUserDto, UserListQueryDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserPaginationDto } from './dto/user-pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Verification) private verificationRepo: Repository<Verification>,
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
}
