import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asking people to rate the app on the App Store / Play Store.
 *
 * One ledger on the user, shared by both channels. The stores cap how often
 * their own review sheet appears (Apple: three times a year, Google: an
 * undisclosed quota) and tell us nothing about what the person did with it,
 * so the only honest record is "we spent an ask on this person, on this date".
 * A WhatsApp or push campaign reads the same column, so the two channels
 * cannot both land on the same person in the same week.
 */
export class AppReviewPrompt1782900000000 implements MigrationInterface {
  name = 'AppReviewPrompt1782900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "app_review_asked_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "app_review_ask_count" int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "app_review_last_channel" varchar(16),
        ADD COLUMN IF NOT EXISTS "app_review_opted_out" boolean NOT NULL DEFAULT false
    `);
    // Campaign audiences filter on "not asked recently", so the date leads.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_app_review_asked_at"
        ON "users" ("app_review_asked_at")
    `);

    // Tunable without an app release — the app reads these from
    // GET /config/feature-flags at startup and falls back to these defaults.
    const settings: [string, string, string, string][] = [
      ['app_review_enabled', 'true', 'boolean', 'Master switch for the in-app store review prompt'],
      ['app_review_min_days', '2', 'number', 'Days since first use before anyone is asked'],
      ['app_review_min_sessions', '3', 'number', 'Separate app opens before anyone is asked'],
      ['app_review_min_value_moments', '2', 'number', 'Good moments (contacted/saved a business, got a lead) before anyone is asked'],
      ['app_review_cooldown_days', '45', 'number', 'Days before a second ask; later asks wait longer'],
      ['app_review_max_asks', '3', 'number', 'Lifetime asks per person across all channels'],
    ];
    for (const [key, value, type, description] of settings) {
      await queryRunner.query(
        `INSERT INTO "system_settings" ("key", "value", "type", "group", "description")
         VALUES ($1, $2, $3, 'app_review', $4) ON CONFLICT ("key") DO NOTHING`,
        [key, value, type, description],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_app_review_asked_at"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "app_review_asked_at",
        DROP COLUMN IF EXISTS "app_review_ask_count",
        DROP COLUMN IF EXISTS "app_review_last_channel",
        DROP COLUMN IF EXISTS "app_review_opted_out"
    `);
    await queryRunner.query(
      `DELETE FROM "system_settings" WHERE "key" LIKE 'app_review_%'`,
    );
  }
}
