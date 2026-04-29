import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widen the gradient column on promo_banners from VARCHAR(100) to VARCHAR(500)
 * to support full CSS gradient strings from the visual gradient picker.
 */
export class WidenBannerGradientColumn1714380001000 implements MigrationInterface {
  name = 'WidenBannerGradientColumn1714380001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE promo_banners
        ALTER COLUMN gradient TYPE VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE promo_banners
        ALTER COLUMN gradient TYPE VARCHAR(100)
    `);
  }
}
