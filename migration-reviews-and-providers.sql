-- Migration: Add missing columns for reviews (flag_reason) and providers (deleted_at)
-- Run this once against your database.

-- ── Reviews: add flag_reason column ─────────────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_reason TEXT DEFAULT NULL;

-- ── Reviews: add 'flagged' value to status enum ──────────────────────────────
-- PostgreSQL does not support IF NOT EXISTS for enum values before PG 9.6,
-- but ADD VALUE is idempotent from 14+. Wrap in DO block for safety.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'flagged'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reviews_status_enum')
  ) THEN
    ALTER TYPE reviews_status_enum ADD VALUE 'flagged';
  END IF;
END$$;

-- ── Providers: add deleted_at column ─────────────────────────────────────────
ALTER TABLE providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering out soft-deleted providers efficiently
CREATE INDEX IF NOT EXISTS idx_providers_deleted_at ON providers (deleted_at) WHERE deleted_at IS NULL;

-- ── Providers: add 'disabled' value to status enum ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'disabled'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'providers_status_enum')
  ) THEN
    ALTER TYPE providers_status_enum ADD VALUE 'disabled';
  END IF;
END$$;
