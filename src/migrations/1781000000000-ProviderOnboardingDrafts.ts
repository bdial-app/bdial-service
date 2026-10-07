import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "List your business" progress, saved as people go: one draft per user, so a
 * killed app, a lost connection or a new phone never costs them their work.
 * Photos are uploaded as they are picked; the draft holds their URLs, not files.
 */
export class ProviderOnboardingDrafts1781000000000 implements MigrationInterface {
  name = 'ProviderOnboardingDrafts1781000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_onboarding_drafts" (
        "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "step" smallint NOT NULL DEFAULT 1,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "provider_onboarding_drafts"`,
    );
  }
}
