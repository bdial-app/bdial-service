import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSponsorshipsEnabledFlag1780200000000 implements MigrationInterface {
  name = 'AddSponsorshipsEnabledFlag1780200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "type", "group", "description")
      VALUES (
        'sponsorships_enabled',
        'false',
        'boolean',
        'feature_flags',
        'Enable sponsored listings and boost placement on the home feed. Disabled by default.'
      )
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "system_settings" WHERE "key" = 'sponsorships_enabled'
    `);
  }
}
