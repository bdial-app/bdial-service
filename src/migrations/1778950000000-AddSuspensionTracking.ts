import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuspensionTracking1778950000000 implements MigrationInterface {
  name = 'AddSuspensionTracking1778950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "providers"
      ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "providers"
      ADD COLUMN IF NOT EXISTS "suspension_confirmed" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN IF EXISTS "suspension_confirmed"`);
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN IF EXISTS "suspended_at"`);
  }
}
