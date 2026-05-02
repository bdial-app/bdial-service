import { MigrationInterface, QueryRunner } from 'typeorm';

export class MonetizationSystem1777600000000 implements MigrationInterface {
  name = 'MonetizationSystem1777600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Provider free quota columns ─────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS free_leads_used_this_month integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS free_leads_reset_at timestamptz DEFAULT NOW()
    `);
    await queryRunner.query(`
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS free_deals_created integer NOT NULL DEFAULT 0
    `);

    // ─── Add deal_creation to payment type enum ──────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE payment_type_enum ADD VALUE IF NOT EXISTS 'deal_creation';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ─── Monetization pricing settings ───────────────────────────────
    await queryRunner.query(`
      INSERT INTO system_settings (id, key, value, type, "group", description) VALUES
        (gen_random_uuid(), 'lead_price_hot', '99', 'number', 'monetization', 'Price to unlock a Hot lead (INR)'),
        (gen_random_uuid(), 'lead_price_warm', '69', 'number', 'monetization', 'Price to unlock a Warm lead (INR)'),
        (gen_random_uuid(), 'lead_price_soft', '49', 'number', 'monetization', 'Price to unlock a Soft lead (INR)'),
        (gen_random_uuid(), 'lead_price_cold', '29', 'number', 'monetization', 'Price to unlock a Cold lead (INR)'),
        (gen_random_uuid(), 'lead_price_hot_discounted', '49', 'number', 'monetization', 'Discounted price for Hot lead (Growth subscribers)'),
        (gen_random_uuid(), 'lead_price_warm_discounted', '35', 'number', 'monetization', 'Discounted price for Warm lead (Growth subscribers)'),
        (gen_random_uuid(), 'lead_price_soft_discounted', '25', 'number', 'monetization', 'Discounted price for Soft lead (Growth subscribers)'),
        (gen_random_uuid(), 'lead_price_cold_discounted', '15', 'number', 'monetization', 'Discounted price for Cold lead (Growth subscribers)'),
        (gen_random_uuid(), 'deal_creation_price', '149', 'number', 'monetization', 'Price per deal creation after free quota (INR)'),
        (gen_random_uuid(), 'deal_creation_price_discounted', '79', 'number', 'monetization', 'Discounted deal creation price (Growth subscribers)'),
        (gen_random_uuid(), 'free_lead_quota_monthly', '5', 'number', 'monetization', 'Free lead unlocks per month (resets monthly)'),
        (gen_random_uuid(), 'free_deal_quota_lifetime', '3', 'number', 'monetization', 'Free deals lifetime (never resets)')
      ON CONFLICT (key) DO NOTHING
    `);

    // ─── Monetization feature flags ──────────────────────────────────
    await queryRunner.query(`
      INSERT INTO system_settings (id, key, value, type, "group", description) VALUES
        (gen_random_uuid(), 'leads_monetization_enabled', 'false', 'boolean', 'feature_flags', 'When false, all lead unlocks are free'),
        (gen_random_uuid(), 'deals_monetization_enabled', 'false', 'boolean', 'feature_flags', 'When false, all deal creation is free'),
        (gen_random_uuid(), 'subscriptions_visible', 'false', 'boolean', 'feature_flags', 'When false, subscription/boost tabs are hidden')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS free_leads_used_this_month`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS free_leads_reset_at`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS free_deals_created`);

    await queryRunner.query(`
      DELETE FROM system_settings WHERE key IN (
        'lead_price_hot', 'lead_price_warm', 'lead_price_soft', 'lead_price_cold',
        'lead_price_hot_discounted', 'lead_price_warm_discounted', 'lead_price_soft_discounted', 'lead_price_cold_discounted',
        'deal_creation_price', 'deal_creation_price_discounted',
        'free_lead_quota_monthly', 'free_deal_quota_lifetime',
        'leads_monetization_enabled', 'deals_monetization_enabled', 'subscriptions_visible'
      )
    `);
  }
}
