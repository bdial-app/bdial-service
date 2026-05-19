import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductSearchVectorIncludeCategory1779900000000 implements MigrationInterface {
  name = 'ProductSearchVectorIncludeCategory1779900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the product search_vector trigger to include category/subcategory
    // names and keywords in the vector. This makes products findable when
    // searching by their assigned category name.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_search_vector()
      RETURNS TRIGGER AS $$
      DECLARE
        cat_text TEXT := '';
      BEGIN
        -- Gather category + subcategory name and keywords
        SELECT string_agg(text_val, ' ') INTO cat_text FROM (
          SELECT c.name AS text_val FROM categories c WHERE c.id = NEW.category_id
          UNION ALL
          SELECT array_to_string(c.keywords, ' ') FROM categories c WHERE c.id = NEW.category_id AND c.keywords IS NOT NULL
          UNION ALL
          SELECT c.name FROM categories c WHERE c.id = NEW.subcategory_id
          UNION ALL
          SELECT array_to_string(c.keywords, ' ') FROM categories c WHERE c.id = NEW.subcategory_id AND c.keywords IS NOT NULL
        ) sub;

        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(cat_text, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Rebuild all product search vectors with the new trigger
    await queryRunner.query(`
      UPDATE products SET name = name;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the ProductKeywords version (no category enrichment)
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

    await queryRunner.query(`UPDATE products SET name = name;`);
  }
}
