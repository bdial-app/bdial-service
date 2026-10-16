import { MigrationInterface, QueryRunner } from 'typeorm';

/** admin_seen_marks: when each admin last opened each admin section. */
export class AdminSeenMarks1781600000000 implements MigrationInterface {
  name = 'AdminSeenMarks1781600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_seen_marks" (
        "user_id" uuid NOT NULL,
        "section" varchar(32) NOT NULL,
        "seen_at" timestamptz NOT NULL,
        PRIMARY KEY ("user_id", "section")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_seen_marks"`);
  }
}
