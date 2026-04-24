-- Migration: Add account pause/archive support to users table
-- Date: 2026-04-24
-- Description: Adds 'paused' to user status enum, plus paused_at and archive_reason columns

-- 1. Add 'paused' value to the status enum
ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'paused';

-- 2. Add paused_at column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Add archive_reason column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(50) DEFAULT NULL;
