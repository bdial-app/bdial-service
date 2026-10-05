import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A stored mirror of each linked business's Google reviews.
 *
 * Until now reviews were fetched from Google on every page view (cached in
 * memory for six hours), so nothing was kept and every view of a linked
 * business could cost a billed Places call. Reviews now live here, refreshed
 * on a schedule, and pages read them from the database.
 *
 * It is a mirror, not an archive: a sync replaces a business's rows with what
 * Google currently returns, so a review deleted on Google is deleted here too.
 * Google returns at most five reviews per place, keyed by a stable review name.
 *
 * google_api_usage counts billed calls per month, so syncing can stop before
 * the free tier runs out instead of after.
 */
export class GoogleReviewsMirror1780700000000 implements MigrationInterface {
  name = 'GoogleReviewsMirror1780700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "google_reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "google_review_id" varchar(255) NOT NULL,
        "rating" smallint NOT NULL,
        "text" text,
        "language" varchar(16),
        "author_name" varchar(200) NOT NULL,
        "author_uri" varchar(500),
        "author_photo_uri" varchar(500),
        "google_maps_uri" varchar(500),
        "published_at" TIMESTAMP WITH TIME ZONE,
        "first_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_google_reviews_provider_review" UNIQUE ("provider_id", "google_review_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_google_reviews_provider" ON "google_reviews" ("provider_id", "published_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "google_api_usage" (
        "month" date NOT NULL,
        "sku" varchar(48) NOT NULL,
        "calls" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("month", "sku")
      )
    `);

    // How a business was linked (an automatic phone match can be reviewed and
    // undone), when the phone lookup last ran (so a business with no Google
    // listing is not searched again and again), and why the last sync failed.
    await queryRunner.query(`
      ALTER TABLE "providers"
        ADD COLUMN IF NOT EXISTS "google_match_method" varchar(16),
        ADD COLUMN IF NOT EXISTS "google_match_checked_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "google_sync_error" varchar(300)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "providers"
        DROP COLUMN IF EXISTS "google_sync_error",
        DROP COLUMN IF EXISTS "google_match_checked_at",
        DROP COLUMN IF EXISTS "google_match_method"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "google_api_usage"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "google_reviews"`);
  }
}
