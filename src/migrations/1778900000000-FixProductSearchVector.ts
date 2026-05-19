import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix: Ensure the search_vector column exists on the products table.
 *
 * The BEFORE INSERT/UPDATE trigger fn_products_search_vector() references
 * NEW.search_vector, but the column may be missing if earlier migrations
 * didn't apply fully. This migration idempotently re-adds the column,
 * index, trigger function, and trigger.
 */
export class FixProductSearchVector1778900000000 implements MigrationInterface {
  name = 'FixProductSearchVector1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure column exists
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    // 2. GIN index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_search_vector
        ON products USING gin(search_vector)
    `);

    // 3. Recreate trigger function (enriched: name + description + brand + categories)
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

    // 4. Ensure trigger is wired up
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_products_search_vector ON products`);
    await queryRunner.query(`
      CREATE TRIGGER trg_products_search_vector
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION fn_products_search_vector()
    `);

    // 5. Backfill existing rows that have NULL search_vector
    await queryRunner.query(`
      UPDATE products SET name = name WHERE search_vector IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: do not drop search_vector — it is relied on by search features
  }
}
