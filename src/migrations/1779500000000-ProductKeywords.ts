import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductKeywords1779500000000 implements MigrationInterface {
  name = 'ProductKeywords1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add keywords column to products
    await queryRunner.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS keywords TEXT[];
    `);

    // GIN index on product keywords
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_keywords ON products USING gin(keywords);
    `);

    // Update product search_vector trigger to include keywords (weight B)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Recompute product search_vectors with new trigger
    await queryRunner.query(`
      UPDATE products SET name = name WHERE search_vector IS NOT NULL OR search_vector IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert trigger to original (no keywords)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_keywords`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS keywords`);
  }
}
