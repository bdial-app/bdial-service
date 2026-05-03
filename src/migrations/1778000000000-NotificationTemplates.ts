import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationTemplates1778000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend the notifications type enum with new values
    await queryRunner.query(`
      ALTER TYPE notifications_type_enum
        ADD VALUE IF NOT EXISTS 'payment_update'
    `);
    await queryRunner.query(`
      ALTER TYPE notifications_type_enum
        ADD VALUE IF NOT EXISTS 'voucher_update'
    `);
    await queryRunner.query(`
      ALTER TYPE notifications_type_enum
        ADD VALUE IF NOT EXISTS 'subscription_update'
    `);
    await queryRunner.query(`
      ALTER TYPE notifications_type_enum
        ADD VALUE IF NOT EXISTS 'invite_update'
    `);

    // 2. Create notification_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        slug          VARCHAR(100) NOT NULL UNIQUE,
        name          VARCHAR(200) NOT NULL,
        description   TEXT,
        type          VARCHAR(50)  NOT NULL,
        title_template VARCHAR(200) NOT NULL,
        body_template TEXT         NOT NULL,
        variables     JSONB        NOT NULL DEFAULT '[]',
        category      VARCHAR(50)  NOT NULL DEFAULT 'transactional',
        is_active     BOOLEAN      NOT NULL DEFAULT true,
        default_route VARCHAR(300),
        default_image_url VARCHAR(500),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // 3. Indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_slug
        ON notification_templates (slug)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_type
        ON notification_templates (type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_category
        ON notification_templates (category)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_templates`);
    // Note: PostgreSQL does not support removing enum values in-place.
    // The enum extensions (payment_update etc.) are left in place on rollback.
  }
}
