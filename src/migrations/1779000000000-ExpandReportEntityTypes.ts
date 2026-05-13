import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandReportEntityTypes1779000000000 implements MigrationInterface {
  name = 'ExpandReportEntityTypes1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Expand entity_type enum ─────────────────────────────────────
    await queryRunner.query(`ALTER TYPE "reports_entity_type_enum" ADD VALUE IF NOT EXISTS 'deal'`);
    await queryRunner.query(`ALTER TYPE "reports_entity_type_enum" ADD VALUE IF NOT EXISTS 'review'`);
    await queryRunner.query(`ALTER TYPE "reports_entity_type_enum" ADD VALUE IF NOT EXISTS 'customer'`);

    // ─── Expand reason enum ──────────────────────────────────────────
    // Deal reasons
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'misleading_offer'`);
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'expired_deal'`);
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'fake_discount'`);
    // Review reasons
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'fake_review'`);
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'offensive_language'`);
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'irrelevant_content'`);
    // Customer reasons
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'abusive_behavior'`);
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'fake_account'`);
    await queryRunner.query(`ALTER TYPE "reports_reason_enum" ADD VALUE IF NOT EXISTS 'spam_messages'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from enums.
    // To reverse this migration, you'd need to recreate the enum type.
    // For safety, this is a no-op.
    this.name; // suppress unused warning
  }
}
