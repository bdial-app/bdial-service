import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * system_logs: server errors and rejected requests, errors reported by the
 * apps, and sign-in problems — shown with all other activity in admin Logs.
 */
export class SystemLogs1781500000000 implements MigrationInterface {
  name = 'SystemLogs1781500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "source" varchar(20) NOT NULL,
        "level" varchar(10) NOT NULL,
        "category" varchar(40) NOT NULL,
        "event" varchar(120) NOT NULL,
        "message" text NOT NULL,
        "stack" text,
        "user_id" uuid,
        "user_role" varchar(20),
        "method" varchar(10),
        "path" varchar(300),
        "status_code" int,
        "request_id" varchar(64),
        "session_id" varchar(64),
        "platform" varchar(20),
        "app_version" varchar(30),
        "ip" varchar(45),
        "user_agent" varchar(300),
        "details" jsonb
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_system_logs_created" ON "system_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_system_logs_level_created" ON "system_logs" ("level", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_system_logs_user_created" ON "system_logs" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_system_logs_category_created" ON "system_logs" ("category", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_system_logs_request" ON "system_logs" ("request_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_logs"`);
  }
}
