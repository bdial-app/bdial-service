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
      'sponsorships_enabled',
      'leads_monetization_enabled',
      'deals_monetization_enabled',
      'subscriptions_visible',
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

  async getMonetizationConfig(): Promise<Record<string, any>> {
    const monetizationKeys = [
      'lead_price_hot',
      'lead_price_warm',
      'lead_price_soft',
      'lead_price_cold',
      'lead_price_hot_discounted',
      'lead_price_warm_discounted',
      'lead_price_soft_discounted',
      'lead_price_cold_discounted',
      'deal_creation_price',
      'deal_creation_price_discounted',
      'free_lead_quota_monthly',
      'free_deal_quota_lifetime',
      'leads_monetization_enabled',
      'deals_monetization_enabled',
      'subscriptions_visible',
    ];
    const settings = await this.settingRepo.find({ where: { key: In(monetizationKeys) } });
    const config: Record<string, any> = {};
    for (const s of settings) {
      if (s.type === 'boolean') {
        config[s.key] = s.value === 'true';
      } else if (s.type === 'number') {
        config[s.key] = parseFloat(s.value);
      } else {
        config[s.key] = s.value;
      }
    }
    return {
      leadPricing: {
        hot: config['lead_price_hot'] ?? 99,
        warm: config['lead_price_warm'] ?? 69,
        soft: config['lead_price_soft'] ?? 49,
        cold: config['lead_price_cold'] ?? 29,
        hotDiscounted: config['lead_price_hot_discounted'] ?? 49,
        warmDiscounted: config['lead_price_warm_discounted'] ?? 35,
        softDiscounted: config['lead_price_soft_discounted'] ?? 25,
        coldDiscounted: config['lead_price_cold_discounted'] ?? 15,
      },
      dealPricing: {
        price: config['deal_creation_price'] ?? 149,
        discountedPrice: config['deal_creation_price_discounted'] ?? 79,
      },
      freeQuotas: {
        leadsPerMonth: config['free_lead_quota_monthly'] ?? 5,
        dealsLifetime: config['free_deal_quota_lifetime'] ?? 3,
      },
      flags: {
        leadsMonetizationEnabled: config['leads_monetization_enabled'] ?? false,
        dealsMonetizationEnabled: config['deals_monetization_enabled'] ?? false,
        subscriptionsVisible: config['subscriptions_visible'] ?? false,
      },
    };
  }
}
