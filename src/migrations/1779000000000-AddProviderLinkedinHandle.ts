import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderLinkedinHandle1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS linkedin_handle VARCHAR(128) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS linkedin_handle`);
  }
}
