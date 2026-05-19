import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

export class SeedCategoriesKeywords1779300000000 implements MigrationInterface {
  name = 'SeedCategoriesKeywords1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqlPath = join(process.cwd(), 'sql', 'seed-categories-keywords.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    // Strip BEGIN/COMMIT — TypeORM handles the transaction
    const cleanSql = sql
      .replace(/^BEGIN;\s*$/m, '')
      .replace(/^COMMIT;\s*$/m, '');
    await queryRunner.query(cleanSql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all subcategories first (FK: children before parents)
    await queryRunner.query(`DELETE FROM provider_categories WHERE category_id IN (SELECT id FROM categories WHERE parent_id IS NOT NULL)`);
    await queryRunner.query(`DELETE FROM categories WHERE parent_id IS NOT NULL`);
    // Remove all top-level categories
    await queryRunner.query(`DELETE FROM provider_categories WHERE category_id IN (SELECT id FROM categories)`);
    await queryRunner.query(`DELETE FROM categories`);
    // Remove added columns
    await queryRunner.query(`ALTER TABLE categories DROP COLUMN IF EXISTS keywords`);
    await queryRunner.query(`ALTER TABLE categories DROP COLUMN IF EXISTS icon_storage_key`);
  }
}
