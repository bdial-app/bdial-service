-- Migration: Add keywords columns to categories and providers for enhanced search
-- Date: 2026-04-28

-- 1. Add keywords array column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL;

-- 2. Add keywords array column to providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL;

-- 3. GIN indexes for fast array search
CREATE INDEX IF NOT EXISTS idx_categories_keywords ON categories USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_providers_keywords ON providers USING GIN (keywords);

-- 4. Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('categories', 'providers') AND column_name = 'keywords';
