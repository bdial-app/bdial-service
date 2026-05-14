import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add is_hero boolean column to products table.
 * Providers can mark up to 3 products as "hero" for featured placement.
 */
export class AddProductIsHero1779200000000 implements MigrationInterface {
  name = 'AddProductIsHero1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS is_hero BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_provider_is_hero"
        ON products (provider_id, is_hero)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_products_provider_is_hero"
    `);
    await queryRunner.query(`
      ALTER TABLE products DROP COLUMN IF EXISTS is_hero
    `);
  }
}
