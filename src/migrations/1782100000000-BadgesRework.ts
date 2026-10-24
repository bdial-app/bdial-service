import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Badges with real rules (src/badges/badge-catalog.ts):
 *
 * - type and source become text: the badge list now lives in code, and
 *   adding a badge no longer needs an enum change on the shared database.
 * - Existing badges move over: Gold Seller (no rule behind it) becomes the
 *   curated Tijarah Pick; Express Service and Trusted (nothing could earn
 *   them) are switched off but kept; "paid" becomes "curated".
 * - reason and awarded_by record why and by whom a curated badge was given.
 * - At most one active row per business and badge.
 *
 * Safe while an older API build is running: it reads type and source as
 * plain strings either way.
 */
export class BadgesRework1782100000000 implements MigrationInterface {
  name = 'BadgesRework1782100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "type" TYPE varchar(40) USING "type"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "source" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "source" TYPE varchar(20) USING "source"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "source" SET DEFAULT 'earned'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_badges_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "provider_badges_source_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_badges" ADD COLUMN IF NOT EXISTS "reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ADD COLUMN IF NOT EXISTS "awarded_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()`,
    );

    // The old badges, in the new terms.
    await queryRunner.query(
      `UPDATE "provider_badges" SET "type" = 'tijarah_pick', "source" = 'curated' WHERE "type" = 'gold_seller'`,
    );
    await queryRunner.query(
      `UPDATE "provider_badges" SET "source" = 'curated' WHERE "source" = 'paid'`,
    );
    await queryRunner.query(
      `UPDATE "provider_badges" SET "is_active" = false, "updated_at" = now()
        WHERE "type" IN ('express_service', 'trusted') AND "is_active"`,
    );

    // One active badge of each kind per business: keep the newest.
    await queryRunner.query(`
      UPDATE "provider_badges" b SET "is_active" = false, "updated_at" = now()
       WHERE b."is_active" AND EXISTS (
         SELECT 1 FROM "provider_badges" o
          WHERE o."provider_id" = b."provider_id" AND o."type" = b."type" AND o."is_active"
            AND (o."created_at" > b."created_at" OR (o."created_at" = b."created_at" AND o."id" > b."id")))
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_provider_badges_active"
        ON "provider_badges" ("provider_id", "type") WHERE "is_active"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_provider_badges_active"`);
    // Back to the old five: what has no old equivalent goes.
    await queryRunner.query(
      `UPDATE "provider_badges" SET "type" = 'gold_seller' WHERE "type" = 'tijarah_pick'`,
    );
    await queryRunner.query(
      `UPDATE "provider_badges" SET "type" = 'express_service' WHERE "type" = 'quick_responder'`,
    );
    await queryRunner.query(
      `DELETE FROM "provider_badges" WHERE "type" NOT IN ('gold_seller', 'top_rated', 'express_service', 'trusted', 'rising_star')`,
    );
    await queryRunner.query(
      `UPDATE "provider_badges" SET "source" = 'paid' WHERE "source" = 'curated'`,
    );
    await queryRunner.query(
      `CREATE TYPE "provider_badges_type_enum" AS ENUM ('gold_seller', 'top_rated', 'express_service', 'trusted', 'rising_star')`,
    );
    await queryRunner.query(
      `CREATE TYPE "provider_badges_source_enum" AS ENUM ('paid', 'earned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "type" TYPE "provider_badges_type_enum" USING "type"::"provider_badges_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "source" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "source" TYPE "provider_badges_source_enum" USING "source"::"provider_badges_source_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" ALTER COLUMN "source" SET DEFAULT 'earned'`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" DROP COLUMN IF EXISTS "awarded_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_badges" DROP COLUMN IF EXISTS "reason"`,
    );
  }
}
