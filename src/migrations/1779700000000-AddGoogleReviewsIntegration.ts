import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleReviewsIntegration1779700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add trust_level enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE trust_level_enum AS ENUM ('unverified', 'basic', 'verified', 'trusted');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add Google reviews columns to providers table
    await queryRunner.query(`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
        ADD COLUMN IF NOT EXISTS google_review_count INT,
        ADD COLUMN IF NOT EXISTS google_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS google_last_fetched_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS combined_rating DECIMAL(2,1),
        ADD COLUMN IF NOT EXISTS combined_review_count INT,
        ADD COLUMN IF NOT EXISTS trust_level trust_level_enum NOT NULL DEFAULT 'unverified';
    `);

    // Index for trust level filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_providers_trust_level ON providers (trust_level) WHERE trust_level != 'unverified';
    `);

    // Index for google_place_id lookups
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_google_place_id ON providers (google_place_id) WHERE google_place_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_google_place_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_trust_level;`);
    await queryRunner.query(`
      ALTER TABLE providers
        DROP COLUMN IF EXISTS google_place_id,
        DROP COLUMN IF EXISTS google_rating,
        DROP COLUMN IF EXISTS google_review_count,
        DROP COLUMN IF EXISTS google_verified_at,
        DROP COLUMN IF EXISTS google_last_fetched_at,
        DROP COLUMN IF EXISTS combined_rating,
        DROP COLUMN IF EXISTS combined_review_count,
        DROP COLUMN IF EXISTS trust_level;
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS trust_level_enum;`);
  }
}
