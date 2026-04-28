import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SystemSetting } from './entities';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getPublicFeatureFlags(): Promise<Record<string, any>> {
    const publicKeys = [
      'maintenance_mode',
      'maintenance_message',
      'registration_enabled',
      'provider_onboarding_enabled',
      'chat_enabled',
      'reviews_enabled',
      'search_enabled',
      'offers_require_approval',
      'sponsorship_requires_approval',
    ];
    const settings = await this.settingRepo.find({ where: { key: In(publicKeys) } });
    const flags: Record<string, any> = {};
    for (const s of settings) {
      if (s.type === 'boolean') {
        flags[s.key] = s.value === 'true';
      } else {
        flags[s.key] = s.value;
      }
    }
    return flags;
  }
}
