import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSubscriptionPlans1778500000000 implements MigrationInterface {
  name = 'SeedSubscriptionPlans1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Seed subscription plans (idempotent via ON CONFLICT) ────────
    await queryRunner.query(`
      INSERT INTO "subscription_plans" (
        "name", "slug", "price_monthly", "price_yearly", "features",
        "max_active_deals", "max_total_deals", "monthly_lead_unlocks",
        "sponsorship_types", "is_active", "sort_order"
      ) VALUES
        (
          'Free', 'free', 0, 0,
          '{"maxPhotos": 5, "analytics": "basic", "highlights": ["3 active deals", "5 total deals", "Basic analytics", "5 product photos"]}',
          3, 5, 0, NULL, true, 0
        ),
        (
          'Starter', 'starter', 299, 2990,
          '{"maxPhotos": 15, "analytics": "standard", "prioritySupport": false, "highlights": ["5 active deals", "15 total deals", "5 lead unlocks/mo", "15 product photos", "Inline sponsorships"]}',
          5, 15, 5, '{inline}', true, 1
        ),
        (
          'Growth', 'growth', 799, 7990,
          '{"maxPhotos": 50, "analytics": "advanced", "prioritySupport": true, "highlights": ["10 active deals", "50 total deals", "20 lead unlocks/mo", "50 product photos", "All sponsorship types", "Priority support"]}',
          10, 50, 20, '{carousel,inline,top_result}', true, 2
        ),
        (
          'Pro', 'pro', 1999, 19990,
          '{"maxPhotos": -1, "analytics": "advanced", "prioritySupport": true, "dedicatedSupport": true, "highlights": ["Unlimited deals", "Unlimited lead unlocks", "Unlimited photos", "All sponsorship types", "Dedicated support", "Custom branding"]}',
          -1, -1, -1, '{carousel,inline,top_result}', true, 3
        )
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "price_monthly" = EXCLUDED."price_monthly",
        "price_yearly" = EXCLUDED."price_yearly",
        "features" = EXCLUDED."features",
        "max_active_deals" = EXCLUDED."max_active_deals",
        "max_total_deals" = EXCLUDED."max_total_deals",
        "monthly_lead_unlocks" = EXCLUDED."monthly_lead_unlocks",
        "sponsorship_types" = EXCLUDED."sponsorship_types",
        "is_active" = EXCLUDED."is_active",
        "sort_order" = EXCLUDED."sort_order",
        "updated_at" = now()
    `);

    // ─── Seed pricing settings (idempotent via ON CONFLICT) ──────────
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "type", "group", "description")
      VALUES
        ('lead_unlock_price', '49', 'number', 'pricing', 'Price in INR to unlock a single lead'),
        ('sponsorship_min_budget', '100', 'number', 'pricing', 'Minimum budget in INR for a sponsored listing'),
        ('sponsorship_cpc_rate', '5', 'number', 'pricing', 'Cost per click in INR for CPC sponsorships'),
        ('sponsorship_cpm_rate', '50', 'number', 'pricing', 'Cost per 1000 impressions in INR for CPM sponsorships')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "subscription_plans" WHERE "slug" IN ('free', 'starter', 'growth', 'pro')`);
    await queryRunner.query(`DELETE FROM "system_settings" WHERE "key" IN ('lead_unlock_price', 'sponsorship_min_budget', 'sponsorship_cpc_rate', 'sponsorship_cpm_rate')`);
  }
}
