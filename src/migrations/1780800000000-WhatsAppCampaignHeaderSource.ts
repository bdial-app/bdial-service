import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Where a campaign's image header comes from: one fixed image for everyone
 * ('fixed', header_media_url), or each business's own logo ('provider_logo'),
 * rendered as a JPEG card per recipient. Additive with a default, so code that
 * predates it keeps working.
 */
export class WhatsAppCampaignHeaderSource1780800000000 implements MigrationInterface {
  name = 'WhatsAppCampaignHeaderSource1780800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whatsapp_campaigns" ADD COLUMN IF NOT EXISTS "header_media_source" varchar(16) NOT NULL DEFAULT 'fixed'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whatsapp_campaigns" DROP COLUMN IF EXISTS "header_media_source"`,
    );
  }
}
