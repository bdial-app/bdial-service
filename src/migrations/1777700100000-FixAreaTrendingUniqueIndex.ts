import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recreates area_trending_categories with COALESCE(area, '') so the area column
 * is never NULL, then adds a unique index required for CONCURRENTLY refresh.
 */
export class FixAreaTrendingUniqueIndex1777700100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop dependent indexes first, then the view itself
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_trending_city_area`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_trending_city`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS area_trending_categories`);

    // Recreate with COALESCE so area is never NULL — enables a true unique index
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW area_trending_categories AS
      SELECT
        u.city,
        COALESCE(u.area, '')           AS area,
        uci.category_id,
        COUNT(DISTINCT uci.user_id)    AS user_count,
        SUM(uci.count)                 AS total_interactions
      FROM user_category_interactions uci
      JOIN users u ON u.id = uci.user_id
      WHERE uci.last_interaction_at > NOW() - INTERVAL '30 days'
        AND u.city IS NOT NULL
      GROUP BY u.city, COALESCE(u.area, ''), uci.category_id
      HAVING COUNT(DISTINCT uci.user_id) >= 2
    `);

    // Unique index — required for REFRESH MATERIALIZED VIEW CONCURRENTLY
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_area_trending_unique
        ON area_trending_categories (city, area, category_id)
    `);

    // Regular performance indexes
    await queryRunner.query(`
      CREATE INDEX idx_area_trending_city
        ON area_trending_categories (city, total_interactions DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_area_trending_city_area
        ON area_trending_categories (city, area, total_interactions DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_trending_city_area`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_trending_city`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_trending_unique`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS area_trending_categories`);

    // Restore original view (without COALESCE, no unique index)
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW area_trending_categories AS
      SELECT
        u.city,
        u.area,
        uci.category_id,
        COUNT(DISTINCT uci.user_id)    AS user_count,
        SUM(uci.count)                 AS total_interactions
      FROM user_category_interactions uci
      JOIN users u ON u.id = uci.user_id
      WHERE uci.last_interaction_at > NOW() - INTERVAL '30 days'
        AND u.city IS NOT NULL
      GROUP BY u.city, u.area, uci.category_id
      HAVING COUNT(DISTINCT uci.user_id) >= 2
    `);

    await queryRunner.query(`
      CREATE INDEX idx_area_trending_city
        ON area_trending_categories (city, total_interactions DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_area_trending_city_area
        ON area_trending_categories (city, area, total_interactions DESC)
    `);
  }
}
