import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastContactNumberChangeAt1779800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS last_contact_number_change_at TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE providers
        DROP COLUMN IF EXISTS last_contact_number_change_at;
    `);
  }
}
