import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add icon_color column to categories table.
 * Stores gradient color key (e.g. 'amber', 'emerald', 'rose') for Lucide icon rendering.
 */
export class AddCategoryIconColor1778800000000 implements MigrationInterface {
  name = 'AddCategoryIconColor1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS icon_color VARCHAR(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories DROP COLUMN IF EXISTS icon_color
    `);
  }
}
