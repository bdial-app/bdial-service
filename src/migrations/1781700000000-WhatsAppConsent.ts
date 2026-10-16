import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WhatsApp consent: who agreed to messages, how, and whether the owner
 * confirmed it themselves in the app (an admin can record consent given in
 * person; the owner is still asked to confirm when they sign in).
 */
export class WhatsAppConsent1781700000000 implements MigrationInterface {
  name = 'WhatsAppConsent1781700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "whatsapp_contacts"
        ADD COLUMN IF NOT EXISTS "consent_method" varchar(30),
        ADD COLUMN IF NOT EXISTS "owner_confirmed_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "consent_prompted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "consent_prompt_count" int NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_consent_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "phone" varchar(20) NOT NULL,
        "contact_id" uuid,
        "user_id" uuid,
        "provider_id" uuid,
        "consent" varchar(20) NOT NULL,
        "source" varchar(40) NOT NULL,
        "method" varchar(30),
        "actor_id" uuid,
        "wording" varchar(60)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wa_consent_events_phone" ON "whatsapp_consent_events" ("phone", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wa_consent_events_provider" ON "whatsapp_consent_events" ("provider_id", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_consent_events"`);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_contacts"
        DROP COLUMN IF EXISTS "consent_method",
        DROP COLUMN IF EXISTS "owner_confirmed_at",
        DROP COLUMN IF EXISTS "consent_prompted_at",
        DROP COLUMN IF EXISTS "consent_prompt_count"
    `);
  }
}
