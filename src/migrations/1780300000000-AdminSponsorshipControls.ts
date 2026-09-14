import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets admins place sponsorships on behalf of any provider — complimentary
 * (no payment) or against a recorded payment — and stop them at any time.
 */
export class AdminSponsorshipControls1780300000000 implements MigrationInterface {
  name = 'AdminSponsorshipControls1780300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sponsored_listings_source_enum" AS ENUM ('provider_paid', 'admin_granted');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sponsored_listings_billing_mode_enum" AS ENUM ('paid', 'free');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "sponsored_listings"
        ADD COLUMN IF NOT EXISTS "source" "sponsored_listings_source_enum" NOT NULL DEFAULT 'provider_paid',
        ADD COLUMN IF NOT EXISTS "billing_mode" "sponsored_listings_billing_mode_enum" NOT NULL DEFAULT 'paid',
        ADD COLUMN IF NOT EXISTS "created_by_admin_id" uuid,
        ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "internal_note" text,
        ADD COLUMN IF NOT EXISTS "stopped_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "stopped_by" uuid,
        ADD COLUMN IF NOT EXISTS "stopped_reason" text
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sponsored_listings_source_billing"
      ON "sponsored_listings" ("source", "billing_mode")
    `);

    // Serving queries order by priority first — index the hot path.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sponsored_listings_serving"
      ON "sponsored_listings" ("is_active", "approval_status", "priority" DESC)
    `);

    // 'manual' gateway records an admin-entered payment (cash/UPI/bank transfer)
    // for a sponsorship sold outside the app. Column is varchar, so no enum edit.

    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "type", "group", "description")
      VALUES (
        'sponsorship_default_priority',
        '0',
        'number',
        'limits',
        'Default slot priority for admin-granted sponsorships. Higher wins the slot ahead of higher bids.'
      )
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "system_settings" WHERE "key" = 'sponsorship_default_priority'`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sponsored_listings_serving"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sponsored_listings_source_billing"`);
    await queryRunner.query(`
      ALTER TABLE "sponsored_listings"
        DROP COLUMN IF EXISTS "stopped_reason",
        DROP COLUMN IF EXISTS "stopped_by",
        DROP COLUMN IF EXISTS "stopped_at",
        DROP COLUMN IF EXISTS "internal_note",
        DROP COLUMN IF EXISTS "priority",
        DROP COLUMN IF EXISTS "created_by_admin_id",
        DROP COLUMN IF EXISTS "billing_mode",
        DROP COLUMN IF EXISTS "source"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "sponsored_listings_billing_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sponsored_listings_source_enum"`);
  }
}
