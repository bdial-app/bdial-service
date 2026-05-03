import { MigrationInterface, QueryRunner } from 'typeorm';

export class WomenLed1777900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add women_led_status column
    await queryRunner.query(`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS women_led_status VARCHAR(20) DEFAULT 'none'
          CHECK (women_led_status IN ('none', 'pending', 'approved', 'rejected'))
    `);

    // 2. Add audit trail columns
    await queryRunner.query(`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS women_led_reviewed_at TIMESTAMPTZ DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS women_led_reviewed_by UUID DEFAULT NULL
    `);

    // 3. Grandfather existing is_women_led = true providers to approved
    await queryRunner.query(`
      UPDATE providers
      SET women_led_status = 'approved'
      WHERE is_women_led = true AND women_led_status = 'none'
    `);

    // 4. Index for pending/approved queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_providers_women_led_status
        ON providers (women_led_status)
        WHERE women_led_status IN ('pending', 'approved')
    `);

    // 5. System settings for incentives
    await queryRunner.query(`
      INSERT INTO system_settings (id, key, value, type, "group", description)
      VALUES
        (gen_random_uuid(), 'women_led_free_leads_per_month', '8', 'number', 'women_led', 'Monthly free lead unlocks for approved women-led providers (default is 5)'),
        (gen_random_uuid(), 'women_led_free_deals_lifetime', '5', 'number', 'women_led', 'Lifetime free deal creations for approved women-led providers (default is 3)'),
        (gen_random_uuid(), 'women_led_sponsorship_discount_pct', '20', 'number', 'women_led', 'Percentage discount on sponsorship CPC for approved women-led providers'),
        (gen_random_uuid(), 'women_led_search_boost', '0.05', 'number', 'women_led', 'Organic search relevance boost multiplier for approved women-led providers')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_women_led_status`);
    await queryRunner.query(`
      ALTER TABLE providers
        DROP COLUMN IF EXISTS women_led_reviewed_by,
        DROP COLUMN IF EXISTS women_led_reviewed_at,
        DROP COLUMN IF EXISTS women_led_status
    `);
    await queryRunner.query(`
      DELETE FROM system_settings
      WHERE key IN ('women_led_free_leads_per_month', 'women_led_free_deals_lifetime', 'women_led_sponsorship_discount_pct', 'women_led_search_boost')
    `);
  }
}
