import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

export class CategoryIconsToLucide1779350000000 implements MigrationInterface {
  name = 'CategoryIconsToLucide1779350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skip if categories already have Lucide icon names (not emojis)
    const sample = await queryRunner.query(
      `SELECT icon FROM categories WHERE slug = 'tailoring' LIMIT 1`,
    );
    if (sample.length > 0 && sample[0].icon === 'scissors') return;

    const sqlPath = join(process.cwd(), 'sql', 'migration-icons-to-lucide.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    const cleanSql = sql
      .replace(/^BEGIN;\s*$/m, '')
      .replace(/^COMMIT;\s*$/m, '');
    await queryRunner.query(cleanSql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert icon_color column (icons would need full re-seed to restore emojis)
    await queryRunner.query(`ALTER TABLE categories DROP COLUMN IF EXISTS icon_color`);
  }
}
