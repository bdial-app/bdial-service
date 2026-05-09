import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationBlockedAt1778300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversation_participants
      ADD COLUMN blocked_at TIMESTAMPTZ DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE conversation_participants DROP COLUMN IF EXISTS blocked_at`);
  }
}
