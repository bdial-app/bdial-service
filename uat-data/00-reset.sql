-- ============================================================================
-- Tijarah Connect — UAT Seed: 00 RESET
-- Clean slate + schema guards
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CLEAN SLATE — delete in FK-safe order                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM ad_events;
DELETE FROM provider_analytics_events;
DELETE FROM provider_leads;
DELETE FROM search_logs;
DELETE FROM app_invites;
DELETE FROM notifications;
DELETE FROM notification_preferences;
DELETE FROM notification_batches;
DELETE FROM device_tokens;
DELETE FROM audit_logs;
DELETE FROM provider_warnings;
DELETE FROM reports;
DELETE FROM bug_reports;
DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM review_reports;
DELETE FROM review_photos;
DELETE FROM reviews;
DELETE FROM saved_items;
DELETE FROM saved_locations;
DELETE FROM bookings;
DELETE FROM provider_offers;
DELETE FROM provider_badges;
DELETE FROM sponsored_listings;
DELETE FROM promo_banners;
DELETE FROM products;
DELETE FROM photos;
DELETE FROM provider_categories;
DELETE FROM verifications;
DELETE FROM providers;
DELETE FROM categories;
DELETE FROM search_synonyms;
DELETE FROM system_settings;
DELETE FROM users;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SCHEMA GUARDS — ensure all columns exist                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_women_led      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS community_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS banner_image_url   VARCHAR(500);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_photo_url  VARCHAR(500);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS keywords           TEXT[] DEFAULT NULL;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_mode      VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language   VARCHAR(10) NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id         VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id           VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email        VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_name         VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider        VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at        TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paused_at           TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archive_reason      VARCHAR(50);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id        UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_storage_key VARCHAR(300);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords         TEXT[] DEFAULT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url        VARCHAR(500);

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(10) NOT NULL DEFAULT 'product';
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_urls   TEXT[] DEFAULT '{}';

ALTER TABLE sponsored_listings ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'approved';
ALTER TABLE sponsored_listings ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE sponsored_listings ADD COLUMN IF NOT EXISTS reviewed_by     UUID;
ALTER TABLE sponsored_listings ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ;

ALTER TABLE provider_offers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'approved';
ALTER TABLE provider_offers ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE provider_offers ADD COLUMN IF NOT EXISTS reviewed_by     UUID;
ALTER TABLE provider_offers ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ;

COMMIT;
