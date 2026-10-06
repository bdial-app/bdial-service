import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Photos, videos, voice notes and documents customers send on WhatsApp.
 * Meta only lends them out for a while, so each one is copied into our
 * storage when it arrives (or the first time an admin opens it) and served
 * to the admin inbox from there. Additive and nullable.
 */
export class WhatsAppMessageMedia1780900000000 implements MigrationInterface {
  name = 'WhatsAppMessageMedia1780900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "whatsapp_messages"
        ADD COLUMN IF NOT EXISTS "media_storage_key" varchar(300),
        ADD COLUMN IF NOT EXISTS "media_mime" varchar(120),
        ADD COLUMN IF NOT EXISTS "media_size" integer
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "whatsapp_messages"
        DROP COLUMN IF EXISTS "media_storage_key",
        DROP COLUMN IF EXISTS "media_mime",
        DROP COLUMN IF EXISTS "media_size"
    `);
  }
}
