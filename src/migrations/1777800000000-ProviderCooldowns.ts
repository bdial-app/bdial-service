import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds provider disable cooldown support:
 * - disabled_at column on providers table to track when a provider was disabled
 * - Two system settings: cooldown duration (hours) and enabled toggle
 */
export class ProviderCooldowns1777800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add disabled_at column to providers
    await queryRunner.query(`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ DEFAULT NULL
    `);

    // 2. Seed cooldown system settings
    await queryRunner.query(`
      INSERT INTO system_settings (id, key, value, type, "group", description)
      VALUES
        (gen_random_uuid(), 'provider_disable_cooldown_hours', '48', 'number', 'limits', 'Hours a provider must stay disabled before re-enabling'),
        (gen_random_uuid(), 'provider_disable_cooldown_enabled', 'true', 'boolean', 'feature_flags', 'Enable cooldown enforcement on provider disable/enable')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS disabled_at`);
    await queryRunner.query(`DELETE FROM system_settings WHERE key IN ('provider_disable_cooldown_hours', 'provider_disable_cooldown_enabled')`);
  }
}
