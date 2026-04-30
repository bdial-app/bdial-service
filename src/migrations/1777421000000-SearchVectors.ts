import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Weighted tsvector search with triggers + prefix search support
 *
 * 1. Providers — trigger-based weighted tsvector (cross-table: categories + keywords)
 * 2. Categories — trigger-based tsvector (name + keywords + description)
 * 3. Products — trigger-based tsvector (name + description)
 * 4. provider_categories changes propagate to provider search_vector
 * 5. search_synonyms table for query expansion
 * 6. pg_trgm + unaccent extensions
 * 7. Backfill all existing rows
 */
export class SearchVectors1777421000000 implements MigrationInterface {
  name = 'SearchVectors1777421000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ──────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    // ── 1. Providers — replace GENERATED column with trigger-based tsvector ─
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS search_vector`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS search_vector tsvector`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_providers_search_vector()
      RETURNS TRIGGER AS $$
      DECLARE
        cat_text TEXT;
        kw_text  TEXT;
      BEGIN
        SELECT
          COALESCE(string_agg(DISTINCT c.name, ' '), ''),
          COALESCE(string_agg(DISTINCT array_to_string(c.keywords, ' '), ' '), '')
        INTO cat_text, kw_text
        FROM provider_categories pc
        JOIN categories c ON c.id = pc.category_id
        WHERE pc.provider_id = NEW.id;

        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.brand_name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(cat_text, '') || ' ' || COALESCE(kw_text, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'C') ||
          setweight(to_tsvector('english',
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(NEW.city, '') || ' ' ||
            COALESCE(NEW.area, '')
          ), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_providers_search_vector ON providers`);
    await queryRunner.query(`
      CREATE TRIGGER trg_providers_search_vector
        BEFORE INSERT OR UPDATE ON providers
        FOR EACH ROW
        EXECUTE FUNCTION fn_providers_search_vector()
    `);

    // Propagate provider_categories changes back to provider search_vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_provider_categories_update_vector()
      RETURNS TRIGGER AS $$
      DECLARE
        p_id UUID;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          p_id := OLD.provider_id;
        ELSE
          p_id := NEW.provider_id;
        END IF;
        UPDATE providers SET updated_at = NOW() WHERE id = p_id;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_provider_categories_update_vector ON provider_categories`);
    await queryRunner.query(`
      CREATE TRIGGER trg_provider_categories_update_vector
        AFTER INSERT OR UPDATE OR DELETE ON provider_categories
        FOR EACH ROW
        EXECUTE FUNCTION fn_provider_categories_update_vector()
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_search_vector`);
    await queryRunner.query(`CREATE INDEX idx_providers_search_vector ON providers USING gin(search_vector)`);

    // ── 2. Categories ────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE categories DROP COLUMN IF EXISTS search_vector`);
    await queryRunner.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS search_vector tsvector`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_categories_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_categories_search_vector ON categories`);
    await queryRunner.query(`
      CREATE TRIGGER trg_categories_search_vector
        BEFORE INSERT OR UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION fn_categories_search_vector()
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_search_vector`);
    await queryRunner.query(`CREATE INDEX idx_categories_search_vector ON categories USING gin(search_vector)`);

    // Backfill categories
    await queryRunner.query(`UPDATE categories SET name = name WHERE search_vector IS NULL`);

    // ── 3. Products ──────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS search_vector`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_products_search_vector ON products`);
    await queryRunner.query(`
      CREATE TRIGGER trg_products_search_vector
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION fn_products_search_vector()
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_search_vector`);
    await queryRunner.query(`CREATE INDEX idx_products_search_vector ON products USING gin(search_vector)`);

    // Backfill products
    await queryRunner.query(`UPDATE products SET name = name WHERE search_vector IS NULL`);

    // ── 4. Search Synonyms table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_synonyms (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        term VARCHAR(100) NOT NULL,
        canonical_term VARCHAR(100) NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'en',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_synonyms_term
        ON search_synonyms (lower(term))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_synonyms_term_trgm
        ON search_synonyms USING gin(term gin_trgm_ops)
    `);

    // ── 5. Backfill providers ────────────────────────────────────────────────
    await queryRunner.query(`UPDATE providers SET updated_at = NOW()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Synonyms
    await queryRunner.query(`DROP TABLE IF EXISTS search_synonyms`);

    // Triggers + functions — providers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_provider_categories_update_vector ON provider_categories`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_providers_search_vector ON providers`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_provider_categories_update_vector`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_providers_search_vector`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_search_vector`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS search_vector`);

    // Triggers + functions — categories
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_categories_search_vector ON categories`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_categories_search_vector`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_search_vector`);
    await queryRunner.query(`ALTER TABLE categories DROP COLUMN IF EXISTS search_vector`);

    // Triggers + functions — products
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_products_search_vector ON products`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_products_search_vector`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_search_vector`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS search_vector`);
  }
}
