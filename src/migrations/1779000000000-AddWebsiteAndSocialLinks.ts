import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebsiteAndSocialLinks1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS website_url VARCHAR(512) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS website_logo_url VARCHAR(512) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(64) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS facebook_handle VARCHAR(128) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS youtube_handle VARCHAR(128) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20) DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE providers
        DROP COLUMN IF EXISTS website_url,
        DROP COLUMN IF EXISTS website_logo_url,
        DROP COLUMN IF EXISTS instagram_handle,
        DROP COLUMN IF EXISTS facebook_handle,
        DROP COLUMN IF EXISTS youtube_handle,
        DROP COLUMN IF EXISTS whatsapp_number;
    `);
  }
}
