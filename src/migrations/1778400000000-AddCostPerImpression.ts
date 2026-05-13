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
        (gen_random_uuid(), 'sponsorship_cost_per_impression', '0.10', 'number', 'sponsorship', 'Cost deducted per impression on a sponsored listing (INR)'),
        (gen_random_uuid(), 'sponsorship_plans', '[{"id":"plan_starter","name":"Starter","type":"inline","price":499,"duration":7,"features":["Appear in explore feed","Basic analytics"],"recommended":false},{"id":"plan_growth","name":"Growth","type":"carousel","price":999,"duration":14,"features":["Homepage carousel spot","Priority in search","Detailed analytics"],"recommended":true},{"id":"plan_premium","name":"Premium","type":"top_result","price":1999,"duration":30,"features":["Top search result","Homepage carousel","Explore feed boost","Advanced analytics","Priority support"],"recommended":false}]', 'json', 'sponsorship', 'Available sponsorship plans shown to providers')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sponsored_listings DROP COLUMN IF EXISTS cost_per_impression`);
    await queryRunner.query(`DELETE FROM system_settings WHERE key IN ('sponsorship_cost_per_click', 'sponsorship_cost_per_impression', 'sponsorship_plans')`);
  }
}
