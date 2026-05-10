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
 * Uses dynamic constraint lookup to handle TypeORM's auto-generated constraint names.
 */
export class UserArchiveSystem1778800000000 implements MigrationInterface {
  name = 'UserArchiveSystem1778800000000';

  /**
   * Helper: dynamically find and replace a FK constraint on a column.
   * Looks up the actual constraint name from pg catalog, drops it,
   * and recreates with the desired ON DELETE behavior.
   */
  private async replaceFk(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    refTable: string,
    refColumn: string,
    onDelete: 'SET NULL' | 'CASCADE',
    newConstraintName: string,
  ): Promise<void> {
    // Find all FK constraints on this table+column referencing the target
    const constraints: { constraint_name: string }[] = await queryRunner.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
      WHERE con.contype = 'f'
        AND con.conrelid = $1::regclass
        AND att.attname = $2
        AND con.confrelid = $3::regclass
    `, [tableName, columnName, refTable]);

    // Drop all matching constraints
    for (const c of constraints) {
      await queryRunner.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT "${c.constraint_name}"`);
    }

    // Recreate with desired behavior
    await queryRunner.query(`
      ALTER TABLE "${tableName}"
        ADD CONSTRAINT "${newConstraintName}"
        FOREIGN KEY ("${columnName}") REFERENCES "${refTable}"("${refColumn}") ON DELETE ${onDelete}
    `);
  }

  /**
   * Helper: drop a unique constraint by looking it up dynamically.
   */
  private async dropUniqueConstraint(
    queryRunner: QueryRunner,
    tableName: string,
    columns: string[],
  ): Promise<void> {
    // Drop table-level unique constraints
    const constraints: { conname: string }[] = await queryRunner.query(`
      SELECT con.conname
      FROM pg_constraint con
      WHERE con.contype = 'u'
        AND con.conrelid = $1::regclass
        AND (
          SELECT array_agg(att.attname ORDER BY att.attname)
          FROM pg_attribute att
          WHERE att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
        ) = $2::name[]
    `, [tableName, columns.sort()]);

    for (const c of constraints) {
      await queryRunner.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT "${c.conname}"`);
    }

    // Drop unique indexes (TypeORM sometimes creates these instead of constraints)
    const indexes: { indexname: string }[] = await queryRunner.query(`
      SELECT i.relname AS indexname
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE ix.indrelid = $1::regclass
        AND ix.indisunique = true
        AND NOT ix.indisprimary
        AND (
          SELECT array_agg(att.attname ORDER BY att.attname)
          FROM pg_attribute att
          WHERE att.attnum = ANY(ix.indkey) AND att.attrelid = ix.indrelid
        ) = $2::name[]
    `, [tableName, columns.sort()]);

    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${idx.indexname}"`);
    }
  }

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
    // 2. Make columns nullable + replace FK constraints with SET NULL
    //    Uses dynamic lookup so auto-generated constraint names are handled
    // ════════════════════════════════════════════════════════════════════════

    // -- bookings.user_id: CASCADE → SET NULL
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "user_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'bookings', 'user_id', 'users', 'id', 'SET NULL', 'FK_bookings_user_id');

    // -- messages.sender_id: CASCADE → SET NULL
    await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'messages', 'sender_id', 'users', 'id', 'SET NULL', 'FK_messages_sender_id');

    // -- conversation_participants.user_id: CASCADE → SET NULL
    await queryRunner.query(`ALTER TABLE "conversation_participants" ALTER COLUMN "user_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'conversation_participants', 'user_id', 'users', 'id', 'SET NULL', 'FK_conv_participants_user_id');

    // -- reviews.reviewer_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "reviewer_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'reviews', 'reviewer_id', 'users', 'id', 'SET NULL', 'FK_reviews_reviewer_id');

    // -- reviews.moderated_by: ensure SET NULL (already nullable)
    await this.replaceFk(queryRunner, 'reviews', 'moderated_by', 'users', 'id', 'SET NULL', 'FK_reviews_moderated_by');

    // -- review_reports.reporter_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "review_reports" ALTER COLUMN "reporter_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'review_reports', 'reporter_id', 'users', 'id', 'SET NULL', 'FK_review_reports_reporter_id');

    // -- reports.reporter_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "reporter_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'reports', 'reporter_id', 'users', 'id', 'SET NULL', 'FK_reports_reporter_id');

    // -- reports.reviewed_by: ensure SET NULL (already nullable)
    await this.replaceFk(queryRunner, 'reports', 'reviewed_by', 'users', 'id', 'SET NULL', 'FK_reports_reviewed_by');

    // -- verifications.reviewed_by: ensure SET NULL (already nullable)
    await this.replaceFk(queryRunner, 'verifications', 'reviewed_by', 'users', 'id', 'SET NULL', 'FK_verifications_reviewed_by');

    // -- audit_logs.admin_id: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "admin_id" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'audit_logs', 'admin_id', 'users', 'id', 'SET NULL', 'FK_audit_logs_admin_id');

    // -- notification_batches.sent_by: NO ACTION → SET NULL
    await queryRunner.query(`ALTER TABLE "notification_batches" ALTER COLUMN "sent_by" DROP NOT NULL`);
    await this.replaceFk(queryRunner, 'notification_batches', 'sent_by', 'users', 'id', 'SET NULL', 'FK_notification_batches_sent_by');

    // -- provider_warnings.issued_by: ensure SET NULL (already nullable)
    await this.replaceFk(queryRunner, 'provider_warnings', 'issued_by', 'users', 'id', 'SET NULL', 'FK_provider_warnings_issued_by');

    // ════════════════════════════════════════════════════════════════════════
    // 3. Fix unique constraints that include now-nullable columns
    //    Replace table constraints with partial unique indexes (WHERE col IS NOT NULL)
    // ════════════════════════════════════════════════════════════════════════

    // reviews(provider_id, reviewer_id)
    await this.dropUniqueConstraint(queryRunner, 'reviews', ['provider_id', 'reviewer_id']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reviews_provider_reviewer"
        ON "reviews" ("provider_id", "reviewer_id")
        WHERE "reviewer_id" IS NOT NULL
    `);

    // review_reports(review_id, reporter_id)
    await this.dropUniqueConstraint(queryRunner, 'review_reports', ['review_id', 'reporter_id']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_review_reports_review_reporter"
        ON "review_reports" ("review_id", "reporter_id")
        WHERE "reporter_id" IS NOT NULL
    `);

    // conversation_participants(conversation_id, user_id)
    await this.dropUniqueConstraint(queryRunner, 'conversation_participants', ['conversation_id', 'user_id']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conv_participants_conv_user"
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
