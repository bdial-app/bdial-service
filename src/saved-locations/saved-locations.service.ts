import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedLocation } from '../entities';
import { CreateSavedLocationDto } from './dto/create-saved-location.dto';

@Injectable()
export class SavedLocationsService {
  constructor(
    @InjectRepository(SavedLocation) private repo: Repository<SavedLocation>,
  ) {}

  /** Get all saved locations for a user (Flow 3-a) */
  async findByUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Save a new location for a user */
  async create(userId: string, dto: CreateSavedLocationDto) {
    const loc = this.repo.create({ ...dto, userId });
    return this.repo.save(loc);
  }

  /** Delete a saved location */
  async remove(userId: string, id: string) {
    const loc = await this.repo.findOneBy({ id, userId });
    if (!loc) throw new NotFoundException('Saved location not found');
    await this.repo.remove(loc);
    return { deleted: true };
  }

  /** Delete all saved locations for a user */
  async removeAll(userId: string) {
    await this.repo.delete({ userId });
    return { deleted: true };
  }
}
