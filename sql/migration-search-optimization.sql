-- ============================================================================
-- Migration: Search Engine Optimization
-- Date: 2026-04-29
--
-- 1. Trigram indexes for fuzzy matching on brand_name, product name, category name
-- 2. Partial indexes for active providers/products
-- 3. Materialized view for provider rating stats (eliminates per-query CTE)
-- 4. Enriched product search_vector (includes provider brand + category context)
-- 5. Immutable unaccent wrapper for index-compatible accent folding
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. TRIGRAM INDEXES — powers similarity() without sequential scans      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_providers_brand_name_trgm
  ON providers USING gin(brand_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON categories USING gin(name gin_trgm_ops);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. PARTIAL INDEXES — skip inactive rows during search                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_providers_active_status
  ON providers(status) WHERE status IN ('active', 'unverified');

CREATE INDEX IF NOT EXISTS idx_products_active
  ON products(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_categories_active
  ON categories(is_active) WHERE is_active = true;

-- Composite index for active offers lookup (used in deals section)
-- Note: NOW() cannot be used in index predicates (not IMMUTABLE).
-- Date filtering belongs in queries, not index definitions.
CREATE INDEX IF NOT EXISTS idx_provider_offers_active
  ON provider_offers(provider_id, starts_at, ends_at)
  WHERE is_active = true;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. MATERIALIZED VIEW — provider_rating_stats                           ║
-- ║     Eliminates expensive inline CTE on every search query               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DROP MATERIALIZED VIEW IF EXISTS provider_rating_stats;

CREATE MATERIALIZED VIEW provider_rating_stats AS
SELECT
  provider_id,
  AVG(star_rating)::numeric(3,2) AS avg_rating,
  COUNT(*)::int AS review_count
FROM reviews
WHERE status = 'active'
GROUP BY provider_id;

CREATE UNIQUE INDEX idx_provider_rating_stats_pid
  ON provider_rating_stats(provider_id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. ENRICHED PRODUCT SEARCH VECTOR                                      ║
-- ║     Includes provider brand_name + category context                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION fn_products_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  provider_brand TEXT;
  cat_text TEXT;
BEGIN
  -- Get provider brand name
  SELECT brand_name INTO provider_brand
  FROM providers WHERE id = NEW.provider_id;

  -- Get category names for the provider
  SELECT COALESCE(string_agg(DISTINCT c.name, ' '), '')
  INTO cat_text
  FROM provider_categories pc
  JOIN categories c ON c.id = pc.category_id
  WHERE pc.provider_id = NEW.provider_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(provider_brand, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(cat_text, '')), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing products
UPDATE products SET name = name WHERE search_vector IS NOT NULL;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. IMMUTABLE UNACCENT WRAPPER (needed for index-compatible usage)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. HELPER: Refresh materialized view (call via cron or after reviews)  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION refresh_rating_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_rating_stats;
END;
$$ LANGUAGE plpgsql;

COMMIT;
