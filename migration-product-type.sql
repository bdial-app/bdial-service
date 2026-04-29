-- ============================================================================
-- Migration: Add product_type column to products table
-- Date: 2026-04-28
-- 
-- Adds a 'product_type' column to distinguish between products and services.
-- Default is 'product' for backward compatibility with existing rows.
-- ============================================================================

-- 1. Add the column with default
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(10) NOT NULL DEFAULT 'product';

-- 2. Add a check constraint to ensure only valid values
ALTER TABLE products
  ADD CONSTRAINT chk_product_type CHECK (product_type IN ('product', 'service'));

-- 3. Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_products_type ON products (product_type);

-- 4. Update the search_vector generated column to include product_type
-- (products search vector is a generated column — we need to drop & recreate)
-- Note: The search_vector on products is trigger-based or generated, 
-- so we just update it to also weight the type in searches.
-- No search_vector change needed since product_type filtering is done via WHERE clause.
