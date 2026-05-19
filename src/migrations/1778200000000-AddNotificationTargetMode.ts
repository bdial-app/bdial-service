import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTargetMode1778200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS target_mode VARCHAR(20) DEFAULT NULL
    `);

    // Index for filtering notifications by user + target_mode
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_target_mode
      ON notifications (user_id, target_mode)
      WHERE target_mode IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_user_target_mode`);
    await queryRunner.query(`ALTER TABLE notifications DROP COLUMN IF EXISTS target_mode`);
  }
}
