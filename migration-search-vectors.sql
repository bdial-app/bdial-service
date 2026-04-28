-- ============================================================================
-- Migration: Weighted tsvector with triggers + prefix search support
-- Date: 2026-04-28
-- 
-- Replaces the old GENERATED ALWAYS AS search_vector columns with:
-- 1. Trigger-based search_vector on providers (needs cross-table data)
-- 2. Updated GENERATED columns on categories (includes keywords)
-- 3. Updated GENERATED columns on products (includes name + description)
-- 4. Synonym table for query expansion
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  EXTENSIONS                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. PROVIDERS — Trigger-based weighted tsvector                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Drop the old GENERATED ALWAYS column (can't be altered)
ALTER TABLE providers DROP COLUMN IF EXISTS search_vector;

-- Add a plain tsvector column
ALTER TABLE providers ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger function: builds weighted tsvector from provider + its categories
CREATE OR REPLACE FUNCTION fn_providers_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  cat_text TEXT;
  kw_text TEXT;
BEGIN
  -- Gather category names and keywords for this provider
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
$$ LANGUAGE plpgsql;

-- Fire on INSERT or UPDATE of provider
DROP TRIGGER IF EXISTS trg_providers_search_vector ON providers;
CREATE TRIGGER trg_providers_search_vector
  BEFORE INSERT OR UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION fn_providers_search_vector();

-- When provider_categories changes, update the provider's search_vector
CREATE OR REPLACE FUNCTION fn_provider_categories_update_vector()
RETURNS TRIGGER AS $$
DECLARE
  p_id UUID;
BEGIN
  -- Determine which provider_id to update
  IF TG_OP = 'DELETE' THEN
    p_id := OLD.provider_id;
  ELSE
    p_id := NEW.provider_id;
  END IF;

  -- Touch the provider to re-fire its trigger
  UPDATE providers SET updated_at = NOW() WHERE id = p_id;

  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provider_categories_update_vector ON provider_categories;
CREATE TRIGGER trg_provider_categories_update_vector
  AFTER INSERT OR UPDATE OR DELETE ON provider_categories
  FOR EACH ROW
  EXECUTE FUNCTION fn_provider_categories_update_vector();

-- Recreate GIN index
DROP INDEX IF EXISTS idx_providers_search_vector;
CREATE INDEX idx_providers_search_vector ON providers USING gin(search_vector);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. CATEGORIES — Trigger-based weighted tsvector (replaces GENERATED)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Drop old generated column if it exists
ALTER TABLE categories DROP COLUMN IF EXISTS search_vector;

-- Add plain tsvector column
ALTER TABLE categories ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger function: builds weighted tsvector from category fields
CREATE OR REPLACE FUNCTION fn_categories_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_search_vector ON categories;
CREATE TRIGGER trg_categories_search_vector
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION fn_categories_search_vector();

-- Recreate GIN index
DROP INDEX IF EXISTS idx_categories_search_vector;
CREATE INDEX idx_categories_search_vector ON categories USING gin(search_vector);

-- Backfill existing rows
UPDATE categories SET name = name WHERE search_vector IS NULL;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. PRODUCTS — Trigger-based weighted tsvector (replaces GENERATED)     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Drop old generated column if it exists
ALTER TABLE products DROP COLUMN IF EXISTS search_vector;

-- Add plain tsvector column
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger function: builds weighted tsvector from product fields
CREATE OR REPLACE FUNCTION fn_products_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_vector ON products;
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_products_search_vector();

-- Recreate GIN index
DROP INDEX IF EXISTS idx_products_search_vector;
CREATE INDEX idx_products_search_vector ON products USING gin(search_vector);

-- Backfill existing rows
UPDATE products SET name = name WHERE search_vector IS NULL;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. SEARCH SYNONYMS TABLE                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS search_synonyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term VARCHAR(100) NOT NULL,
  canonical_term VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term
  ON search_synonyms (lower(term));

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term_trgm
  ON search_synonyms USING gin(term gin_trgm_ops);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. BACKFILL — Populate search_vector for existing providers            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Touch all providers to fire the trigger and build their search_vector
UPDATE providers SET updated_at = NOW();

COMMIT;
