import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add photo_urls array column to products table.
 * Supports multi-image products (up to 5 photos per product).
 */
export class AddProductPhotoUrls1778100000000 implements MigrationInterface {
  name = 'AddProductPhotoUrls1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}'
    `);

    // Backfill: copy existing photo_url into photo_urls where photo_urls is empty
    await queryRunner.query(`
      UPDATE products
        SET photo_urls = ARRAY[photo_url]
        WHERE photo_url IS NOT NULL
          AND (photo_urls IS NULL OR photo_urls = '{}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products DROP COLUMN IF EXISTS photo_urls
    `);
  }
}
