import { MigrationInterface, QueryRunner } from 'typeorm';

export class CityRequestDeviceTracking1778700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE city_requests
        ADD COLUMN IF NOT EXISTS platform VARCHAR(20),
        ADD COLUMN IF NOT EXISTS device_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS os_version VARCHAR(50),
        ADD COLUMN IF NOT EXISTS app_version VARCHAR(30),
        ADD COLUMN IF NOT EXISTS lat DECIMAL(9,6),
        ADD COLUMN IF NOT EXISTS lng DECIMAL(9,6);
    `);

    // Index for platform analytics
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_city_requests_platform ON city_requests (platform);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_city_requests_platform;
      ALTER TABLE city_requests
        DROP COLUMN IF EXISTS platform,
        DROP COLUMN IF EXISTS device_type,
        DROP COLUMN IF EXISTS os_version,
        DROP COLUMN IF EXISTS app_version,
        DROP COLUMN IF EXISTS lat,
        DROP COLUMN IF EXISTS lng;
    `);
  }
}
