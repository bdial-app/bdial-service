import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User Archive System — Clean Account Deletion
 *
 * 1. Creates `user_archives` table for storing non-PII audit data of deleted users
 * 2. Alters FK constraints so business records (bookings, messages, reviews, reports)
 *    survive user deletion via SET NULL instead of CASCADE
 * 3. Migrates existing soft-deleted users (status='deleted') into `user_archives`
 *    and hard-deletes them from `users`
 * 4. Drops archive-related columns from `users` (deleted_at, archive_reason)
 * 5. Removes 'deleted' from users_status_enum
 *
 * All statements are idempotent where possible.
 */
export class UserArchiveSystem1778800000000 implements MigrationInterface {
  name = 'UserArchiveSystem1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Create user_archives table
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_archives" (
        "id" uuid PRIMARY KEY,
        "role" varchar(20) NOT NULL,
        "gender" varchar(10) NOT NULL,
        "archive_reason" varchar(50) NOT NULL,
        "deleted_by" uuid DEFAULT NULL,
        "original_created_at" timestamptz NOT NULL,
        "deleted_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 2. Alter FK constraints — change CASCADE to SET NULL for business records
    // ════════════════════════════════════════════════════════════════════════

    // -- bookings.user_id: CASCADE → SET NULL (bookings are business records)
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_bookings_user_id";
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_64cd97487c5c42806e7cb1acefd"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "bookings"
          ADD CONSTRAINT "FK_bookings_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- messages.sender_id: CASCADE → SET NULL (other party needs chat history)
    await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_sender_id";
      ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_22133395bd13b970cee5cc03e15"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "messages"
          ADD CONSTRAINT "FK_messages_sender_id"
          FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- conversation_participants.user_id: CASCADE → SET NULL
    await queryRunner.query(`ALTER TABLE "conversation_participants" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "FK_conversation_participants_user_id";
      ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "FK_be84f16f78cf84b8077b4508adb"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "conversation_participants"
          ADD CONSTRAINT "FK_conversation_participants_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- reviews.reviewer_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "reviewer_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_reviewer_id";
      ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_a0ad2ce47b01011f1e614ffd31b"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "reviews"
          ADD CONSTRAINT "FK_reviews_reviewer_id"
          FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- review_reports.reporter_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "review_reports" ALTER COLUMN "reporter_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "review_reports" DROP CONSTRAINT IF EXISTS "FK_review_reports_reporter_id";
      ALTER TABLE "review_reports" DROP CONSTRAINT IF EXISTS "FK_6c3b6a53c2dbb46dc7b1b6c0bfe"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "review_reports"
          ADD CONSTRAINT "FK_review_reports_reporter_id"
          FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- reports.reporter_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "reporter_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "FK_reports_reporter_id";
      ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "FK_31bb535ffa19fd9f48e4bc0fedd"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "reports"
          ADD CONSTRAINT "FK_reports_reporter_id"
          FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- audit_logs.admin_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "admin_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_audit_logs_admin_id";
      ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_fca3a9e13ab56de3bd59c3a17ac"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "audit_logs"
          ADD CONSTRAINT "FK_audit_logs_admin_id"
          FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- notification_batches.sent_by: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "notification_batches" ALTER COLUMN "sent_by" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "notification_batches" DROP CONSTRAINT IF EXISTS "FK_notification_batches_sent_by";
      ALTER TABLE "notification_batches" DROP CONSTRAINT IF EXISTS "FK_7e8b9e2c5a3c4f1d2e6a7b8c9d0"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "notification_batches"
          ADD CONSTRAINT "FK_notification_batches_sent_by"
          FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // -- provider_warnings.issued_by: already nullable, ensure SET NULL
    await queryRunner.query(`
      ALTER TABLE "provider_warnings" DROP CONSTRAINT IF EXISTS "FK_provider_warnings_issued_by";
      ALTER TABLE "provider_warnings" DROP CONSTRAINT IF EXISTS "FK_a2f3b4c5d6e7f8a9b0c1d2e3f4a5"
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "provider_warnings"
          ADD CONSTRAINT "FK_provider_warnings_issued_by"
          FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 3. Drop the unique constraint on reviews(provider_id, reviewer_id)
    //    and recreate it as a partial unique index that excludes nulls
    //    (since reviewer_id is now nullable)
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "UQ_reviews_provider_reviewer";
      ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "UQ_0ec840c67c1c14e2ac1732fea78"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reviews_provider_reviewer"
        ON "reviews" ("provider_id", "reviewer_id")
        WHERE "reviewer_id" IS NOT NULL
    `);

    // Same for review_reports(review_id, reporter_id)
    await queryRunner.query(`
      ALTER TABLE "review_reports" DROP CONSTRAINT IF EXISTS "UQ_review_reports_review_reporter";
      ALTER TABLE "review_reports" DROP CONSTRAINT IF EXISTS "UQ_c975e5b5dfff26fc5aafb92dbf1"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_review_reports_review_reporter"
        ON "review_reports" ("review_id", "reporter_id")
        WHERE "reporter_id" IS NOT NULL
    `);

    // Same for conversation_participants(conversation_id, user_id)
    await queryRunner.query(`
      ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "UQ_conversation_participants_conv_user";
      ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "UQ_0a1b2c3d4e5f6a7b8c9d0e1f2a3"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversation_participants_conv_user"
        ON "conversation_participants" ("conversation_id", "user_id")
        WHERE "user_id" IS NOT NULL
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 4. Migrate existing soft-deleted users to user_archives, then hard-delete
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      INSERT INTO "user_archives" ("id", "role", "gender", "archive_reason", "deleted_by", "original_created_at", "deleted_at")
      SELECT
        "id",
        "role",
        "gender",
        COALESCE("archive_reason", 'legacy_migration'),
        NULL,
        "created_at",
        COALESCE("deleted_at", now())
      FROM "users"
      WHERE "status" = 'deleted'
      ON CONFLICT ("id") DO NOTHING
    `);

    // Hard-delete the migrated users (CASCADE will clean up owned data,
    // SET NULL will preserve business records)
    await queryRunner.query(`
      DELETE FROM "users" WHERE "status" = 'deleted'
    `);

    // ════════════════════════════════════════════════════════════════════════
    // 5. Drop archive columns from users table (no longer needed)
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "archive_reason"`);

    // ════════════════════════════════════════════════════════════════════════
    // 6. Remove 'deleted' from users_status_enum
    //    PostgreSQL requires recreating the enum type
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "status" TYPE varchar(20)
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum_old"`);
    await queryRunner.query(`ALTER TYPE "users_status_enum" RENAME TO "users_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('active', 'suspended', 'paused')`);
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "status" TYPE "users_status_enum"
        USING "status"::"users_status_enum"
    `);
    await queryRunner.query(`DROP TYPE "users_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════════════════════════════════
    // Reverse: Re-add 'deleted' to enum
    // ════════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "status" TYPE varchar(20)
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum_old"`);
    await queryRunner.query(`ALTER TYPE "users_status_enum" RENAME TO "users_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('active', 'suspended', 'deleted', 'paused')`);
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "status" TYPE "users_status_enum"
        USING "status"::"users_status_enum"
    `);
    await queryRunner.query(`DROP TYPE "users_status_enum_old"`);

    // Reverse: Re-add columns
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ DEFAULT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archive_reason" VARCHAR(50) DEFAULT NULL`);

    // Note: migrated data in user_archives is NOT moved back to users
    // (PII was already scrubbed, so there's nothing meaningful to restore)

    // Drop archive table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_archives"`);
  }
}
