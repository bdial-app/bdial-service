import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductCategoryColumns1779100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS category_id UUID DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS subcategory_id UUID DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category_subcategory
        ON products (category_id, subcategory_id)
        WHERE category_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_category_subcategory`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS subcategory_id`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS category_id`);
  }
}
