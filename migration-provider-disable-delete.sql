-- Migration: Add 'disabled' status to providers and deleted_at column
-- Run this against your database before deploying

-- Add 'disabled' to the provider status enum
ALTER TYPE providers_status_enum ADD VALUE IF NOT EXISTS 'disabled';

-- Add deleted_at column for soft-delete
ALTER TABLE providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering out deleted providers
CREATE INDEX IF NOT EXISTS idx_providers_deleted_at ON providers (deleted_at) WHERE deleted_at IS NULL;
