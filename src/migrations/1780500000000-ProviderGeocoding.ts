import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Location quality for providers.
 *
 * Bulk-imported businesses often arrive with a city and nothing else, so their
 * coordinates are null: they cannot be ranked by distance and the app hides
 * "Get Directions". These columns record where a pin came from and how precise
 * it is, so an approximate (city-centre) pin can be stored without the app ever
 * quoting a misleading distance.
 *
 * The cache table means a locality is geocoded once, not once per business —
 * 79 shops in the same Pune locality cost a single lookup.
 */
export class ProviderGeocoding1780500000000 implements MigrationInterface {
  name = 'ProviderGeocoding1780500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "provider_geocode_precision_enum" AS ENUM ('rooftop', 'street', 'locality', 'pincode', 'city', 'manual');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "providers"
        ADD COLUMN IF NOT EXISTS "geocode_precision" "provider_geocode_precision_enum",
        ADD COLUMN IF NOT EXISTS "geocode_source" varchar(32),
        ADD COLUMN IF NOT EXISTS "geocoded_at" TIMESTAMP WITH TIME ZONE
    `);

    // Existing pins came from the owner dropping one in the app, or an admin —
    // treat them as precise so the backfill never overwrites real data.
    await queryRunner.query(`
      UPDATE "providers"
      SET "geocode_precision" = 'manual', "geocode_source" = 'owner'
      WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "geocode_precision" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_providers_geocode_precision"
      ON "providers" ("geocode_precision")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geocode_cache" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "query" varchar(300) NOT NULL UNIQUE,
        "latitude" decimal(9,6),
        "longitude" decimal(9,6),
        "precision" "provider_geocode_precision_enum",
        "source" varchar(32) NOT NULL DEFAULT 'google',
        "hits" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "geocode_cache"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_providers_geocode_precision"`,
    );
    await queryRunner.query(`
      ALTER TABLE "providers"
        DROP COLUMN IF EXISTS "geocoded_at",
        DROP COLUMN IF EXISTS "geocode_source",
        DROP COLUMN IF EXISTS "geocode_precision"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "provider_geocode_precision_enum"`,
    );
  }
}
