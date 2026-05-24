import { MigrationInterface, QueryRunner } from 'typeorm';

export class VerificationStatusRefactor1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add 'in_review' to verifications status enum
    await queryRunner.query(`ALTER TYPE "verifications_status_enum" ADD VALUE IF NOT EXISTS 'in_review'`);

    // 2. Migrate existing providers with status 'pending' or 'in_review' to 'unverified'
    await queryRunner.query(`UPDATE providers SET status = 'unverified' WHERE status IN ('pending', 'in_review')`);

    // 3. Recreate provider status enum without 'pending' and 'in_review'
    // We need to: create new enum, alter column, drop old enum
    await queryRunner.query(`CREATE TYPE "providers_status_enum_new" AS ENUM ('unverified', 'active', 'suspended', 'disabled')`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" SET DEFAULT 'unverified'`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" TYPE "providers_status_enum_new" USING "status"::text::"providers_status_enum_new"`);
    await queryRunner.query(`DROP TYPE "providers_status_enum"`);
    await queryRunner.query(`ALTER TYPE "providers_status_enum_new" RENAME TO "providers_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore old provider enum
    await queryRunner.query(`CREATE TYPE "providers_status_enum_old" AS ENUM ('pending', 'in_review', 'active', 'suspended', 'unverified', 'disabled')`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE "providers" ALTER COLUMN "status" TYPE "providers_status_enum_old" USING "status"::text::"providers_status_enum_old"`);
    await queryRunner.query(`DROP TYPE "providers_status_enum"`);
    await queryRunner.query(`ALTER TYPE "providers_status_enum_old" RENAME TO "providers_status_enum"`);

    // Note: cannot remove 'in_review' from verifications enum in PostgreSQL without recreation
    // Leaving it as-is since it's harmless
  }
}
