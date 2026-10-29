import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lead tracking for the admin: when and how a lead was unlocked (and by which
 * payment), and when the business opened it.
 */
export class LeadTracking1782600000000 implements MigrationInterface {
  name = 'LeadTracking1782600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_leads"
        ADD COLUMN IF NOT EXISTS "unlocked_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "unlock_method" varchar(10),
        ADD COLUMN IF NOT EXISTS "unlock_payment_id" uuid,
        ADD COLUMN IF NOT EXISTS "first_viewed_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "last_viewed_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "view_count" int NOT NULL DEFAULT 0
    `);

    // Paid unlocks are known from their payment (one lead or a bulk set).
    await queryRunner.query(`
      UPDATE "provider_leads" l
         SET "unlock_method" = 'paid', "unlock_payment_id" = p.id, "unlocked_at" = p.updated_at
        FROM "payments" p
       WHERE p.type = 'lead_unlock' AND p.status = 'succeeded' AND p.provider_id = l.provider_id
         AND l.is_unlocked AND l.unlock_method IS NULL
         AND (p.metadata->>'leadId' = l.id::text OR coalesce(p.metadata->'leadIds', '[]'::jsonb) ? l.id::text)
    `);
    // Anonymous visitors were always unlocked for free.
    await queryRunner.query(`
      UPDATE "provider_leads" SET "unlock_method" = 'anonymous'
       WHERE is_unlocked AND unlock_method IS NULL AND user_id IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_provider_leads_last_seen" ON "provider_leads" ("last_seen_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_provider_leads_last_seen"`,
    );
    await queryRunner.query(`
      ALTER TABLE "provider_leads"
        DROP COLUMN IF EXISTS "view_count",
        DROP COLUMN IF EXISTS "last_viewed_at",
        DROP COLUMN IF EXISTS "first_viewed_at",
        DROP COLUMN IF EXISTS "unlock_payment_id",
        DROP COLUMN IF EXISTS "unlock_method",
        DROP COLUMN IF EXISTS "unlocked_at"
    `);
  }
}
