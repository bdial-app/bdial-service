import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Automated WhatsApp messages: which automations exist (all start switched
 * off), the jobs they schedule (also the send log), links that open the app
 * or the right app store, pending reviews from review links, and where each
 * review came from.
 */
export class MessagingAutomations1781800000000 implements MigrationInterface {
  name = 'MessagingAutomations1781800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messaging_automations" (
        "key" varchar(40) PRIMARY KEY,
        "enabled" boolean NOT NULL DEFAULT false,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "monthly_budget_inr" numeric(10,2),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "updated_by" uuid
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "automation_key" varchar(40) NOT NULL,
        "dedupe_key" varchar(200) NOT NULL,
        "user_id" uuid,
        "provider_id" uuid,
        "phone" varchar(20),
        "due_at" timestamptz NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "skip_reason" varchar(80),
        "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "message_id" uuid,
        "cost_inr" numeric(10,4)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_automation_jobs_dedupe" ON "automation_jobs" ("dedupe_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_automation_jobs_due" ON "automation_jobs" ("status", "due_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_automation_jobs_phone" ON "automation_jobs" ("phone", "status", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_automation_jobs_key" ON "automation_jobs" ("automation_key", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "go_links" (
        "code" varchar(16) PRIMARY KEY,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "user_id" uuid,
        "provider_id" uuid,
        "target" varchar(500) NOT NULL,
        "automation_key" varchar(40),
        "open_count" int NOT NULL DEFAULT 0,
        "opened_at" timestamptz,
        "pending_until" timestamptz,
        "consumed_at" timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_go_links_pending" ON "go_links" ("user_id", "pending_until")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "review_intents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "phone" varchar(20) NOT NULL,
        "provider_id" uuid NOT NULL,
        "stars" smallint,
        "consumed_at" timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_review_intents_phone" ON "review_intents" ("phone", "created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "source" varchar(20)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "review_intents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "go_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messaging_automations"`);
  }
}
