-- ============================================================================
-- Tijarah Connect — UAT Seed: Master Runner
-- Run this file to seed the entire UAT database in the correct order.
--
-- Usage:
--   psql -U <user> -d <database> -f run-all.sql
--   OR from psql prompt:
--   \i run-all.sql
-- ============================================================================

\echo '=== Tijarah UAT Seed — Starting ==='

\echo '[00] Resetting all tables...'
\i 00-reset.sql

\echo '[01] Seeding users...'
\i 01-users.sql

\echo '[02] Seeding categories...'
\i 02-categories.sql

\echo '[03] Seeding providers...'
\i 03-providers.sql

\echo '[04] Seeding products...'
\i 04-products.sql

\echo '[05] Seeding photos...'
\i 05-photos.sql

\echo '[06] Seeding verifications...'
\i 06-verifications.sql

\echo '[07] Seeding reviews...'
\i 07-reviews.sql

\echo '[08] Seeding bookings...'
\i 08-bookings.sql

\echo '[09] Seeding conversations...'
\i 09-conversations.sql

\echo '[10] Seeding saved items & locations...'
\i 10-saved.sql

\echo '[11] Seeding explore (banners, sponsored, badges, offers)...'
\i 11-explore.sql

\echo '[12] Seeding reports & warnings...'
\i 12-reports-warnings.sql

\echo '[13] Seeding system settings & search synonyms...'
\i 13-system.sql

\echo '[14] Seeding analytics...'
\i 14-analytics.sql

\echo '[15] Seeding notifications...'
\i 15-notifications.sql

\echo '=== Tijarah UAT Seed — Complete! ==='
