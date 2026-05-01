import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidated migration: Admin Controls + Schema Alignment
 *
 * Covers all remaining SQL migration files that haven't been converted:
 * - migration-add-pause-archive.sql (users: paused status, paused_at, archive_reason)
 * - migration-admin-controls.sql (approval_status on sponsorships/offers + feature flag seeds)
 * - migration-bug-reports.sql (bug_reports table)
 * - migration-product-type.sql (products.product_type + check constraint)
 * - migration-provider-disable-delete.sql (disabled status + deleted_at on providers)
 * - migration-reports.sql (reports + provider_warnings tables)
 * - migration-reviews-and-providers.sql (reviews.flag_reason + flagged status)
 * - migration-search-keywords.sql (keywords columns + GIN indexes)
 *
 * All statements are idempotent (IF NOT EXISTS / DO blocks) so this is safe
 * to run even if some changes were applied manually via raw SQL.
 */
export class AdminControlsAndSchema1777500000000 implements MigrationInterface {
  name = 'AdminControlsAndSchema1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. USERS — pause/archive support
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TYPE "users_status_enum" ADD VALUE IF NOT EXISTS 'paused'
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archive_reason" VARCHAR(50) DEFAULT NULL
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 2. PROVIDERS — disabled status + soft delete + keywords
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TYPE "providers_status_enum" ADD VALUE IF NOT EXISTS 'disabled'
    `);
    await queryRunner.query(`
      ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "keywords" TEXT[] DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_providers_deleted_at
        ON providers (deleted_at) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_providers_keywords
        ON providers USING GIN (keywords)
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 3. CATEGORIES — keywords column + GIN index
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "keywords" TEXT[] DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_keywords
        ON categories USING GIN (keywords)
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 4. PRODUCTS — product_type column + constraint + index
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type" VARCHAR(10) NOT NULL DEFAULT 'product'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "products" ADD CONSTRAINT "chk_product_type"
          CHECK (product_type IN ('product', 'service'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_type ON products (product_type)
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 5. REVIEWS — flag_reason + flagged status
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "flag_reason" TEXT DEFAULT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'flagged'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reviews_status_enum')
        ) THEN
          ALTER TYPE "reviews_status_enum" ADD VALUE 'flagged';
        END IF;
      END $$
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 6. REPORTS — enums + table + indexes
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_entity_type" AS ENUM ('provider', 'product', 'message');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_reason" AS ENUM (
          'fake_business', 'inappropriate_content', 'fraud_scam', 'harassment',
          'impersonation', 'wrong_category', 'fake_product', 'counterfeit',
          'prohibited_item', 'wrong_price', 'spam', 'fraud', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_status" AS ENUM ('pending', 'under_review', 'action_taken', 'dismissed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "report_admin_action" AS ENUM ('warning', 'suspend', 'ban');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reporter_id"  UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "entity_type"  "report_entity_type" NOT NULL,
        "entity_id"    UUID NOT NULL,
        "reason"       "report_reason" NOT NULL,
        "description"  VARCHAR(500),
        "status"       "report_status" NOT NULL DEFAULT 'pending',
        "admin_action" "report_admin_action",
        "admin_notes"  TEXT,
        "reviewed_by"  UUID REFERENCES "users"("id"),
        "reviewed_at"  TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reports_entity ON reports (entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reports_status_date ON reports (status, created_at)`);

    // ════════════════════════════════════════════════════════════════════════
    // 7. PROVIDER WARNINGS — enum + table + indexes
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "provider_warning_type" AS ENUM ('report_warning', 'policy_violation', 'content_warning');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_warnings" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id"  UUID NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "warning_type" "provider_warning_type" NOT NULL DEFAULT 'report_warning',
        "title"        VARCHAR(200) NOT NULL,
        "message"      TEXT NOT NULL,
        "report_id"    UUID REFERENCES "reports"("id"),
        "issued_by"    UUID NOT NULL REFERENCES "users"("id"),
        "is_read"      BOOLEAN NOT NULL DEFAULT false,
        "read_at"      TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_provider_warnings_provider ON provider_warnings (provider_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_provider_warnings_read ON provider_warnings (is_read)`);

    // ════════════════════════════════════════════════════════════════════════
    // 8. BUG REPORTS — table + indexes
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bug_report_category_enum" AS ENUM (
          'crash', 'ui_issue', 'feature_not_working', 'performance', 'login_auth', 'payment', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bug_report_status_enum" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bug_reports" (
        "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reporter_id"        UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "category"           "bug_report_category_enum" NOT NULL DEFAULT 'other',
        "description"        TEXT NOT NULL,
        "steps_to_reproduce" TEXT,
        "device_info"        VARCHAR(200),
        "status"             "bug_report_status_enum" NOT NULL DEFAULT 'open',
        "admin_notes"        TEXT,
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports (status, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter ON bug_reports (reporter_id)`);

    // ════════════════════════════════════════════════════════════════════════
    // 9. SPONSORED LISTINGS — approval_status + admin fields
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sponsored_listing_approval_status" AS ENUM ('pending_approval', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "sponsored_listings"
        ADD COLUMN IF NOT EXISTS "approval_status" "sponsored_listing_approval_status" NOT NULL DEFAULT 'approved'
    `);
    await queryRunner.query(`
      ALTER TABLE "sponsored_listings" ADD COLUMN IF NOT EXISTS "admin_notes" TEXT DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sponsored_listings" ADD COLUMN IF NOT EXISTS "reviewed_by" UUID DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sponsored_listings" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sponsored_listings_approval_status
        ON sponsored_listings (approval_status) WHERE approval_status = 'pending_approval'
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 10. PROVIDER OFFERS — approval_status + admin fields
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "provider_offer_approval_status" AS ENUM ('pending_approval', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "provider_offers"
        ADD COLUMN IF NOT EXISTS "approval_status" "provider_offer_approval_status" NOT NULL DEFAULT 'approved'
    `);
    await queryRunner.query(`
      ALTER TABLE "provider_offers" ADD COLUMN IF NOT EXISTS "admin_notes" TEXT DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "provider_offers" ADD COLUMN IF NOT EXISTS "reviewed_by" UUID DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "provider_offers" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_offers_approval_status
        ON provider_offers (approval_status) WHERE approval_status = 'pending_approval'
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 11. SYSTEM SETTINGS — feature flags + limits seed data
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "type", "group", "description")
      VALUES
        ('maintenance_mode', 'false', 'boolean', 'feature_flags', 'Put the entire app into maintenance mode'),
        ('maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon.', 'string', 'feature_flags', 'Message shown during maintenance mode'),
        ('registration_enabled', 'true', 'boolean', 'feature_flags', 'Allow new user registrations'),
        ('provider_onboarding_enabled', 'true', 'boolean', 'feature_flags', 'Allow new provider registrations'),
        ('chat_enabled', 'true', 'boolean', 'feature_flags', 'Enable chat/messaging system'),
        ('reviews_enabled', 'true', 'boolean', 'feature_flags', 'Allow users to submit reviews'),
        ('search_enabled', 'true', 'boolean', 'feature_flags', 'Enable search functionality'),
        ('sponsorship_requires_approval', 'true', 'boolean', 'feature_flags', 'Require admin approval for new sponsorships'),
        ('offers_require_approval', 'true', 'boolean', 'feature_flags', 'Require admin approval for new offers'),
        ('max_products_per_provider', '50', 'number', 'limits', 'Maximum products a provider can create'),
        ('max_photos_per_provider', '10', 'number', 'limits', 'Maximum gallery photos per provider'),
        ('max_active_offers_per_provider', '5', 'number', 'limits', 'Maximum active offers per provider'),
        ('max_active_sponsorships_per_provider', '3', 'number', 'limits', 'Maximum active sponsorships per provider')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seed data
    await queryRunner.query(`
      DELETE FROM "system_settings" WHERE "key" IN (
        'maintenance_mode', 'maintenance_message', 'registration_enabled',
        'provider_onboarding_enabled', 'chat_enabled', 'reviews_enabled',
        'search_enabled', 'sponsorship_requires_approval', 'offers_require_approval',
        'max_products_per_provider', 'max_photos_per_provider',
        'max_active_offers_per_provider', 'max_active_sponsorships_per_provider'
      )
    `);

    // Provider offers approval columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_provider_offers_approval_status`);
    await queryRunner.query(`ALTER TABLE "provider_offers" DROP COLUMN IF EXISTS "reviewed_at"`);
    await queryRunner.query(`ALTER TABLE "provider_offers" DROP COLUMN IF EXISTS "reviewed_by"`);
    await queryRunner.query(`ALTER TABLE "provider_offers" DROP COLUMN IF EXISTS "admin_notes"`);
    await queryRunner.query(`ALTER TABLE "provider_offers" DROP COLUMN IF EXISTS "approval_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_offer_approval_status"`);

    // Sponsored listings approval columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sponsored_listings_approval_status`);
    await queryRunner.query(`ALTER TABLE "sponsored_listings" DROP COLUMN IF EXISTS "reviewed_at"`);
    await queryRunner.query(`ALTER TABLE "sponsored_listings" DROP COLUMN IF EXISTS "reviewed_by"`);
    await queryRunner.query(`ALTER TABLE "sponsored_listings" DROP COLUMN IF EXISTS "admin_notes"`);
    await queryRunner.query(`ALTER TABLE "sponsored_listings" DROP COLUMN IF EXISTS "approval_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sponsored_listing_approval_status"`);

    // Bug reports
    await queryRunner.query(`DROP TABLE IF EXISTS "bug_reports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bug_report_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bug_report_category_enum"`);

    // Provider warnings
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_warnings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_warning_type"`);

    // Reports
    await queryRunner.query(`DROP TABLE IF EXISTS "reports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_admin_action"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_reason"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_entity_type"`);

    // Reviews flag_reason
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN IF EXISTS "flag_reason"`);

    // Products product_type
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "chk_product_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_type`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "product_type"`);

    // Categories keywords
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_keywords`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "keywords"`);

    // Providers keywords + deleted_at
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_keywords`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_deleted_at`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN IF EXISTS "keywords"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN IF EXISTS "deleted_at"`);

    // Users pause/archive
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "archive_reason"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "paused_at"`);
    // Note: cannot remove enum values in PostgreSQL without recreating the type
  }
}
