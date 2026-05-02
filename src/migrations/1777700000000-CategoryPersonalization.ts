import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryPersonalization1777700000000 implements MigrationInterface {
  name = 'CategoryPersonalization1777700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── User preferred categories column ────────────────────────────
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_category_ids UUID[] DEFAULT NULL
    `);

    // ─── User category interactions table (implicit learning) ────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_category_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        interaction_type VARCHAR(20) NOT NULL,
        weight DECIMAL(6,2) NOT NULL DEFAULT 1.0,
        count INTEGER NOT NULL DEFAULT 1,
        last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_category_type UNIQUE (user_id, category_id, interaction_type)
      )
    `);

    // ─── Indexes for fast lookup ─────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_cat_interactions_user
        ON user_category_interactions (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_cat_interactions_user_weight
        ON user_category_interactions (user_id, weight DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_cat_interactions_category
        ON user_category_interactions (category_id)
    `);

    // ─── Materialized view: aggregated category weights per user ─────
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS user_category_weights AS
      SELECT
        user_id,
        category_id,
        SUM(weight * count * (
          CASE
            WHEN last_interaction_at > NOW() - INTERVAL '7 days' THEN 1.0
            WHEN last_interaction_at > NOW() - INTERVAL '14 days' THEN 0.8
            WHEN last_interaction_at > NOW() - INTERVAL '30 days' THEN 0.6
            WHEN last_interaction_at > NOW() - INTERVAL '60 days' THEN 0.3
            ELSE 0.1
          END
        )) AS total_weight,
        MAX(last_interaction_at) AS latest_interaction
      FROM user_category_interactions
      GROUP BY user_id, category_id
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cat_weights_pk
        ON user_category_weights (user_id, category_id)
    `);

    // ─── Area trending categories (for smart defaults) ───────────────
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS area_trending_categories AS
      SELECT
        u.city,
        u.area,
        uci.category_id,
        COUNT(DISTINCT uci.user_id) AS user_count,
        SUM(uci.count) AS total_interactions
      FROM user_category_interactions uci
      JOIN users u ON u.id = uci.user_id
      WHERE uci.last_interaction_at > NOW() - INTERVAL '30 days'
        AND u.city IS NOT NULL
      GROUP BY u.city, u.area, uci.category_id
      HAVING COUNT(DISTINCT uci.user_id) >= 2
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_area_trending_city
        ON area_trending_categories (city, total_interactions DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_area_trending_city_area
        ON area_trending_categories (city, area, total_interactions DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS area_trending_categories`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS user_category_weights`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_category_interactions`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS preferred_category_ids`);
  }
}
