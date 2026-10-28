import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deals get a tier and a length limit: a free deal runs up to 5 days, a paid
 * or plan deal up to 15, and a paid deal can be extended 15 days at a time.
 * Existing deals keep their dates (`days_allowed` stays empty = no limit).
 */
export class DealTiers1782300000000 implements MigrationInterface {
  name = 'DealTiers1782300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_offers"
        ADD COLUMN IF NOT EXISTS "tier" varchar(10) NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS "days_allowed" integer,
        ADD COLUMN IF NOT EXISTS "extensions" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      INSERT INTO "system_settings" ("id", "key", "value", "type", "group", "description") VALUES
        (gen_random_uuid(), 'deal_free_max_days', '5', 'number', 'monetization', 'Longest a free deal can run, in days.'),
        (gen_random_uuid(), 'deal_paid_max_days', '15', 'number', 'monetization', 'Longest a paid or plan deal can run, in days.'),
        (gen_random_uuid(), 'deal_extension_days', '15', 'number', 'monetization', 'Days added each time a paid deal is extended.'),
        (gen_random_uuid(), 'deal_extension_price', '74', 'number', 'monetization', 'Price (₹) to extend a paid deal.'),
        (gen_random_uuid(), 'deal_extension_apple_product', '', 'string', 'monetization', 'Apple product id for a deal extension on iOS. Empty hides Extend on iOS.')
      ON CONFLICT ("key") DO NOTHING
    `);

    // Business decision (Oct 2026): 2 free deals per business, for life.
    await queryRunner.query(`
      UPDATE "system_settings" SET "value" = '2'
       WHERE "key" = 'free_deal_quota_lifetime' AND "value" = '3'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "system_settings" SET "value" = '3'
       WHERE "key" = 'free_deal_quota_lifetime' AND "value" = '2'
    `);
    await queryRunner.query(`
      DELETE FROM "system_settings" WHERE "key" IN
        ('deal_free_max_days', 'deal_paid_max_days', 'deal_extension_days', 'deal_extension_price', 'deal_extension_apple_product')
    `);
    await queryRunner.query(`
      ALTER TABLE "provider_offers"
        DROP COLUMN IF EXISTS "extensions",
        DROP COLUMN IF EXISTS "days_allowed",
        DROP COLUMN IF EXISTS "tier"
    `);
  }
}
