import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Search Engine Optimization migration
 *
 * 1. Trigram GIN indexes on brand_name, product name, category name
 *    — powers similarity() calls without sequential scans
 * 2. Partial indexes for active providers / products / categories
 *    — skips inactive rows at the index level
 * 3. Partial index on provider_offers for is_active rows
 * 4. Materialized view provider_rating_stats
 *    — eliminates the expensive per-query review CTE; refreshed every 10 min by cron
 * 5. Enriched fn_products_search_vector trigger
 *    — adds provider brand_name (weight C) and category context (weight D) to product vectors
 * 6. Immutable unaccent() wrapper — needed for index-compatible accent folding
 * 7. refresh_rating_stats() helper function
 */
export class SearchEngineOptimization1777420800000 implements MigrationInterface {
  name = 'SearchEngineOptimization1777420800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Ensure required extensions exist ─────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    // ── 1. Trigram GIN indexes ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_providers_brand_name_trgm
        ON providers USING gin(brand_name gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_name_trgm
        ON products USING gin(name gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
        ON categories USING gin(name gin_trgm_ops)
    `);

    // ── 2. Partial indexes — skip inactive rows ─────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_providers_active_status
        ON providers(status) WHERE status IN ('active', 'unverified')
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_active
        ON products(is_active) WHERE is_active = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_active
        ON categories(is_active) WHERE is_active = true
    `);

    // ── 3. Provider offers index (is_active only — cannot use NOW() in predicate) ──
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_offers_active
        ON provider_offers(provider_id, starts_at, ends_at)
        WHERE is_active = true
    `);

    // ── 4. Materialized view: provider_rating_stats ─────────────────────────
    await queryRunner.query(`
      DROP MATERIALIZED VIEW IF EXISTS provider_rating_stats
    `);

    await queryRunner.query(`
      CREATE MATERIALIZED VIEW provider_rating_stats AS
      SELECT
        provider_id,
        AVG(star_rating)::numeric(3,2) AS avg_rating,
        COUNT(*)::int                  AS review_count
      FROM reviews
      WHERE status = 'active'
      GROUP BY provider_id
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_provider_rating_stats_pid
        ON provider_rating_stats(provider_id)
    `);

    // ── 5. Ensure search_vector column exists on products ──────────────────
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_search_vector
        ON products USING gin(search_vector)
    `);

    // ── 6. Enriched product search_vector trigger ───────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_search_vector()
      RETURNS TRIGGER AS $$
      DECLARE
        provider_brand TEXT;
        cat_text       TEXT;
      BEGIN
        SELECT brand_name
          INTO provider_brand
          FROM providers
         WHERE id = NEW.provider_id;

        SELECT COALESCE(string_agg(DISTINCT c.name, ' '), '')
          INTO cat_text
          FROM provider_categories pc
          JOIN categories c ON c.id = pc.category_id
         WHERE pc.provider_id = NEW.provider_id;

        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name,          '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description,   '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(provider_brand,    '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(cat_text,          '')), 'D');

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Backfill existing products with the enriched vector
    await queryRunner.query(`
      UPDATE products SET name = name
    `);

    // ── 7. Immutable unaccent wrapper ───────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION immutable_unaccent(text)
      RETURNS text AS $$
        SELECT unaccent($1);
      $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE
    `);

    // ── 8. refresh_rating_stats() helper ───────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_rating_stats()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY provider_rating_stats;
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove helper functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_rating_stats()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS immutable_unaccent(text)`);

    // Drop materialized view
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS provider_rating_stats`);

    // Restore original fn_products_search_vector (name + description only)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name,        '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Rebuild product vectors with original trigger
    await queryRunner.query(`UPDATE products SET name = name`);

    // Drop partial indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_provider_offers_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_active_status`);

    // Drop trigram indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_name_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_name_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_brand_name_trgm`);

    // Drop search_vector column (only if it was added by this migration)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_search_vector`);
  }
}
