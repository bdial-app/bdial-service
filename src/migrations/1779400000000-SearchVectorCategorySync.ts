import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchVectorCategorySync1779400000000 implements MigrationInterface {
  name = 'SearchVectorCategorySync1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Trigger function: when provider_categories changes, touch the provider to re-fire search_vector trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_provider_categories_update_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE providers SET updated_at = NOW()
        WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger on provider_categories INSERT/DELETE
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_provider_categories_search_vector ON provider_categories;
      CREATE TRIGGER trg_provider_categories_search_vector
      AFTER INSERT OR DELETE ON provider_categories
      FOR EACH ROW EXECUTE FUNCTION fn_provider_categories_update_search_vector();
    `);

    // One-time reindex: recompute all providers' search_vectors with current category keywords
    await queryRunner.query(`
      UPDATE providers SET updated_at = NOW()
      WHERE id IN (SELECT DISTINCT provider_id FROM provider_categories);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_provider_categories_search_vector ON provider_categories`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_provider_categories_update_search_vector()`);
  }
}
