import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationStatusRefactor1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add 'in_review' to verifications status enum
    await queryRunner.query(`ALTER TYPE "verifications_status_enum" ADD VALUE IF NOT EXISTS 'in_review'`);

    // 2. Migrate existing providers with status 'pending' or 'in_review' to 'unverified'
    await queryRunner.query(`UPDATE providers SET status = 'unverified' WHERE status IN ('pending', 'in_review')`);

    // 3. Drop indexes that reference the status column (partial indexes cause enum type change to fail)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_status_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_isWomenLed_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_communityVerified_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_isFeatured_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_providers_active_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_providers_status"`);
    // Also drop any auto-generated TypeORM indexes on status
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT indexname FROM pg_indexes
          WHERE tablename = 'providers'
          AND indexdef LIKE '%status%'
          AND indexname != 'providers_pkey'
        LOOP
          EXECUTE 'DROP INDEX IF EXISTS "' || r.indexname || '"';
        END LOOP;
      END $$;
    `);

    // 4. Drop leftover type from any previous failed attempt
    await queryRunner.query(`DROP TYPE IF EXISTS "providers_status_enum_new"`);

    // 5. Recreate provider status enum without 'pending' and 'in_review'
    await queryRunner.query(`CREATE TYPE "providers_status_enum_new" AS ENUM ('unverified', 'active', 'suspended', 'disabled')`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" TYPE "providers_status_enum_new" USING "status"::text::"providers_status_enum_new"`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" SET DEFAULT 'unverified'`);
    await queryRunner.query(`DROP TYPE "providers_status_enum"`);
    await queryRunner.query(`ALTER TYPE "providers_status_enum_new" RENAME TO "providers_status_enum"`);

    // 6. Recreate indexes
    await queryRunner.query(`CREATE INDEX "IDX_providers_status_city" ON "providers" ("status", "city")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_isWomenLed_status" ON "providers" ("is_women_led", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_communityVerified_status" ON "providers" ("community_verified", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_isFeatured_status" ON "providers" ("is_featured", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_providers_active_status" ON "providers" ("status") WHERE status IN ('active', 'unverified')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_status_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_isWomenLed_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_communityVerified_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_isFeatured_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_providers_active_status"`);

    // Restore old provider enum
    await queryRunner.query(`DROP TYPE IF EXISTS "providers_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "providers_status_enum_old" AS ENUM ('pending', 'in_review', 'active', 'suspended', 'unverified', 'disabled')`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" TYPE "providers_status_enum_old" USING "status"::text::"providers_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`DROP TYPE "providers_status_enum"`);
    await queryRunner.query(`ALTER TYPE "providers_status_enum_old" RENAME TO "providers_status_enum"`);

    // Recreate indexes
    await queryRunner.query(`CREATE INDEX "IDX_providers_status_city" ON "providers" ("status", "city")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_isWomenLed_status" ON "providers" ("is_women_led", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_communityVerified_status" ON "providers" ("community_verified", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_isFeatured_status" ON "providers" ("is_featured", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_providers_active_status" ON "providers" ("status") WHERE status IN ('active', 'unverified')`);
  }
}
