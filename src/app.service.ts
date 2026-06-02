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
      'vouchers_enabled',
      // Apple consumable product ids — needed so the iOS app can register them
      // with StoreKit at startup (before initialize, or they won't load).
      'lead_apple_product_hot',
      'lead_apple_product_warm',
      'lead_apple_product_soft',
      'lead_apple_product_cold',
      'deal_apple_product',
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

    // Collect all Apple consumable product ids (lead tiers + deal + boost plans)
    // so the iOS client can pre-register them with StoreKit.
    const appleProductIds: string[] = [
      config['lead_apple_product_hot'],
      config['lead_apple_product_warm'],
      config['lead_apple_product_soft'],
      config['lead_apple_product_cold'],
      config['deal_apple_product'],
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    try {
      const plansSetting = await this.settingRepo.findOneBy({ key: 'sponsorship_plans' });
      if (plansSetting) {
        const plans = JSON.parse(plansSetting.value);
        if (Array.isArray(plans)) {
          for (const p of plans) {
            if (p?.appleProductId && typeof p.appleProductId === 'string') {
              appleProductIds.push(p.appleProductId);
            }
          }
        }
      }
    } catch { /* ignore malformed sponsorship_plans */ }
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
        // Vouchers default ON to preserve existing behavior; admin can disable.
        vouchersEnabled: config['vouchers_enabled'] ?? true,
      },
      // Deduped list of Apple consumable product ids for iOS StoreKit pre-registration.
      appleProductIds: Array.from(new Set(appleProductIds)),
    };
  }
}
