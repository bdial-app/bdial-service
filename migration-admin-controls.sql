-- Migration: Admin Controls — Phase 0 Production Readiness
-- Adds approval_status to sponsored_listings and provider_offers
-- Adds missing admin lifecycle fields
-- Run this against your database before deploying

-- ============================================================
-- 1. Sponsored Listings: approval_status enum + column
-- ============================================================
DO $$ BEGIN
  CREATE TYPE sponsored_listing_approval_status AS ENUM ('pending_approval', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE sponsored_listings
  ADD COLUMN IF NOT EXISTS approval_status sponsored_listing_approval_status NOT NULL DEFAULT 'approved';

ALTER TABLE sponsored_listings
  ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

ALTER TABLE sponsored_listings
  ADD COLUMN IF NOT EXISTS reviewed_by UUID DEFAULT NULL;

ALTER TABLE sponsored_listings
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering pending approvals
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_approval_status
  ON sponsored_listings (approval_status) WHERE approval_status = 'pending_approval';

-- ============================================================
-- 2. Provider Offers: approval_status enum + column
-- ============================================================
DO $$ BEGIN
  CREATE TYPE provider_offer_approval_status AS ENUM ('pending_approval', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE provider_offers
  ADD COLUMN IF NOT EXISTS approval_status provider_offer_approval_status NOT NULL DEFAULT 'approved';

ALTER TABLE provider_offers
  ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

ALTER TABLE provider_offers
  ADD COLUMN IF NOT EXISTS reviewed_by UUID DEFAULT NULL;

ALTER TABLE provider_offers
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering pending approvals
CREATE INDEX IF NOT EXISTS idx_provider_offers_approval_status
  ON provider_offers (approval_status) WHERE approval_status = 'pending_approval';

-- ============================================================
-- 3. Seed feature flag system settings
-- ============================================================
INSERT INTO system_settings (id, key, value, type, "group", description)
VALUES
  (gen_random_uuid(), 'maintenance_mode', 'false', 'boolean', 'feature_flags', 'Put the entire app into maintenance mode'),
  (gen_random_uuid(), 'maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon.', 'string', 'feature_flags', 'Message shown during maintenance mode'),
  (gen_random_uuid(), 'registration_enabled', 'true', 'boolean', 'feature_flags', 'Allow new user registrations'),
  (gen_random_uuid(), 'provider_onboarding_enabled', 'true', 'boolean', 'feature_flags', 'Allow new provider registrations'),
  (gen_random_uuid(), 'chat_enabled', 'true', 'boolean', 'feature_flags', 'Enable chat/messaging system'),
  (gen_random_uuid(), 'reviews_enabled', 'true', 'boolean', 'feature_flags', 'Allow users to submit reviews'),
  (gen_random_uuid(), 'search_enabled', 'true', 'boolean', 'feature_flags', 'Enable search functionality'),
  (gen_random_uuid(), 'sponsorship_requires_approval', 'true', 'boolean', 'feature_flags', 'Require admin approval for new sponsorships'),
  (gen_random_uuid(), 'offers_require_approval', 'true', 'boolean', 'feature_flags', 'Require admin approval for new offers'),
  (gen_random_uuid(), 'max_products_per_provider', '50', 'number', 'limits', 'Maximum products a provider can create'),
  (gen_random_uuid(), 'max_photos_per_provider', '10', 'number', 'limits', 'Maximum gallery photos per provider'),
  (gen_random_uuid(), 'max_active_offers_per_provider', '5', 'number', 'limits', 'Maximum active offers per provider'),
  (gen_random_uuid(), 'max_active_sponsorships_per_provider', '3', 'number', 'limits', 'Maximum active sponsorships per provider')
ON CONFLICT (key) DO NOTHING;
