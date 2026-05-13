import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCostPerImpression1778400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cost_per_impression column to sponsored_listings
    await queryRunner.query(`
      ALTER TABLE sponsored_listings
      ADD COLUMN IF NOT EXISTS cost_per_impression DECIMAL(10, 4) NOT NULL DEFAULT 0.10
    `);

    // Seed default system settings for sponsorship costs (if not already present)
    await queryRunner.query(`
      INSERT INTO system_settings (id, key, value, type, "group", description)
      VALUES
        (gen_random_uuid(), 'sponsorship_cost_per_click', '5.00', 'number', 'sponsorship', 'Cost deducted per click on a sponsored listing (INR)'),
        (gen_random_uuid(), 'sponsorship_cost_per_impression', '0.10', 'number', 'sponsorship', 'Cost deducted per impression on a sponsored listing (INR)')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sponsored_listings DROP COLUMN IF EXISTS cost_per_impression`);
    await queryRunner.query(`DELETE FROM system_settings WHERE key IN ('sponsorship_cost_per_click', 'sponsorship_cost_per_impression')`);
  }
}
