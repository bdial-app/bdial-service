import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One sender at a time. Local, UAT and production backends share this
 * database and each runs the WhatsApp send worker; their bursts added up and
 * tripped Meta's per-number throughput limit (error 130429). A short lease on
 * the settings row lets exactly one of them send.
 */
export class WhatsAppWorkerLease1781300000000 implements MigrationInterface {
  name = 'WhatsAppWorkerLease1781300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whatsapp_settings" ADD COLUMN IF NOT EXISTS "worker_lease_owner" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "whatsapp_settings" ADD COLUMN IF NOT EXISTS "worker_lease_until" timestamptz`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whatsapp_settings" DROP COLUMN IF EXISTS "worker_lease_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "whatsapp_settings" DROP COLUMN IF EXISTS "worker_lease_owner"`,
    );
  }
}
