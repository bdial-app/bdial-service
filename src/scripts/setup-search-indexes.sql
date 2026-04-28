-- ============================================================
-- Search Infrastructure: Extensions, Indexes & Triggers
-- Run this against the production PostgreSQL database.
-- NOTE: Run migration-search-vectors.sql AFTER this if upgrading.
-- ============================================================

-- 0. Ensure typeorm_metadata table exists (TypeORM needs this to introspect generated columns)
CREATE TABLE IF NOT EXISTS "typeorm_metadata" (
  "type" varchar NOT NULL,
  "database" varchar,
  "schema" varchar,
  "table" varchar,
  "name" varchar,
  "value" text
);

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create an immutable wrapper for unaccent (required for generated columns)
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $func$
  SELECT unaccent('unaccent', $1)
$func$;

-- ============================================================
-- PROVIDERS: Trigger-based weighted tsvector + trigram indexes
-- ============================================================

-- search_vector is a plain tsvector column maintained by trigger
-- (see migration-search-vectors.sql for the trigger definition)
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_providers_search_vector
  ON providers USING gin(search_vector);

-- GIN trigram index for fuzzy/prefix matching on brand name
CREATE INDEX IF NOT EXISTS idx_providers_brand_name_trgm
  ON providers USING gin(brand_name gin_trgm_ops);

-- GIN trigram index on description
CREATE INDEX IF NOT EXISTS idx_providers_description_trgm
  ON providers USING gin(description gin_trgm_ops);

-- B-tree index for prefix matching (brand name)
CREATE INDEX IF NOT EXISTS idx_providers_brand_name_lower
  ON providers (lower(brand_name) varchar_pattern_ops);

-- ============================================================
-- PRODUCTS: Trigger-based weighted tsvector + trigram indexes
-- ============================================================

-- Plain tsvector column (trigger-maintained, see migration-search-vectors.sql)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING gin(search_vector);

-- GIN trigram index on product name
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin(name gin_trgm_ops);

-- ============================================================
-- CATEGORIES: Trigger-based weighted tsvector + trigram indexes
-- ============================================================

-- Plain tsvector column (trigger-maintained, see migration-search-vectors.sql)
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_categories_search_vector
  ON categories USING gin(search_vector);

-- GIN trigram index on category name
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON categories USING gin(name gin_trgm_ops);

-- ============================================================
-- SEARCH_LOGS: Table for tracking search queries
-- ============================================================

CREATE TABLE IF NOT EXISTS search_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query varchar(255) NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  result_count integer NOT NULL DEFAULT 0,
  lat decimal(9,6),
  lng decimal(9,6),
  city varchar(100),
  created_at timestamp DEFAULT now()
);

-- Indexes for trending and recent queries
CREATE INDEX IF NOT EXISTS idx_search_logs_city_created
  ON search_logs (city, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_user_created
  ON search_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_logs_query_city
  ON search_logs (lower(query), city);

-- ============================================================
-- PERFORMANCE-CRITICAL INDEXES
-- ============================================================

-- Provider status + geo for filtered searches
CREATE INDEX IF NOT EXISTS idx_providers_status
  ON providers (status) WHERE status IN ('active', 'unverified');

CREATE INDEX IF NOT EXISTS idx_providers_geo
  ON providers (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_providers_city_lower
  ON providers (lower(city));

CREATE INDEX IF NOT EXISTS idx_providers_created_at
  ON providers (created_at DESC);

-- Provider categories — fast lookups for category filtering
CREATE INDEX IF NOT EXISTS idx_provider_categories_category_id
  ON provider_categories (category_id);

CREATE INDEX IF NOT EXISTS idx_provider_categories_provider_id
  ON provider_categories (provider_id);

-- Products: active + provider join
CREATE INDEX IF NOT EXISTS idx_products_active_provider
  ON products (provider_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_provider_id
  ON products (provider_id);

-- Reviews: fast aggregation per provider
CREATE INDEX IF NOT EXISTS idx_reviews_provider_active
  ON reviews (provider_id, star_rating) WHERE status = 'active';

-- Categories: active filter + display
CREATE INDEX IF NOT EXISTS idx_categories_active_order
  ON categories (is_active, display_order) WHERE is_active = true;

-- ============================================================
-- Verify setup
-- ============================================================
SELECT 'pg_trgm' AS extension, EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS installed
UNION ALL
SELECT 'unaccent', EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'unaccent');
