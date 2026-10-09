import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * When a product was added, so the admin can filter products by date and
 * time. Products had no timestamp. New products get the exact time; existing
 * ones get their business's creation time — the closest record there is, as
 * most products arrive with their business (onboarding, bulk import). Only
 * backfilled when the column is new, so real values are never overwritten.
 */
export class ProductCreatedAt1781400000000 implements MigrationInterface {
  name = 'ProductCreatedAt1781400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_at'`,
    );
    if (existing.length) return;

    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "created_at" timestamptz`);
    // Providers store UTC wall-clock time without a zone.
    await queryRunner.query(`
      UPDATE "products" pr
         SET "created_at" = p."created_at" AT TIME ZONE 'UTC'
        FROM "providers" p
       WHERE p."id" = pr."provider_id"
    `);
    await queryRunner.query(`UPDATE "products" SET "created_at" = now() WHERE "created_at" IS NULL`);
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_products_created_at" ON "products" ("created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_created_at"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "created_at"`);
  }
}
