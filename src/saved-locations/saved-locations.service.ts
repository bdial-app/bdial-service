import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedLocation } from '../entities';
import { CreateSavedLocationDto } from './dto/create-saved-location.dto';
import { ContentSanitizerService } from '../common/content-sanitizer';

const MAX_SAVED_LOCATIONS = 10;

@Injectable()
export class SavedLocationsService {
  constructor(
    @InjectRepository(SavedLocation) private repo: Repository<SavedLocation>,
    private readonly contentSanitizer: ContentSanitizerService,
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
    const count = await this.repo.count({ where: { userId } });
    if (count >= MAX_SAVED_LOCATIONS) {
      throw new BadRequestException(
        `Maximum of ${MAX_SAVED_LOCATIONS} saved addresses reached. Remove one to add more.`,
      );
    }
    if (dto.label) {
      const check = this.contentSanitizer.check(dto.label);
      if (check.flagged) {
        throw new BadRequestException('Location label contains inappropriate language. Please revise.');
      }
    }
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
