-- ============================================================================
-- Tijarah Connect — Full Seed Data
-- Generated: 2026-04-22
-- Matches current entity schema (post-listing-removal)
-- All UUIDs are deterministic and cross-referenced
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CLEAN SLATE — delete in FK-safe order                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

TRUNCATE TABLE
  messages,
  conversation_participants,
  conversations,
  review_reports,
  review_photos,
  reviews,
  saved_items,
  saved_locations,
  bookings,
  products,
  photos,
  provider_categories,
  promo_banners,
  verifications,
  listing_categories,
  listings,
  providers,
  categories,
  users
CASCADE;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SCHEMA GUARDS — add columns that may be missing from older DB state   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_women_led      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS community_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS banner_image_url   VARCHAR(500);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_photo_url  VARCHAR(500);

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_mode VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id      VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email   VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_name    VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider   VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at   TIMESTAMPTZ;

-- categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id        UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_storage_key VARCHAR(300);

-- verifications
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  USERS                                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- 10 users: 1 admin, 5 provider-owners, 4 customers

INSERT INTO users (id, name, mobile_number, email, gender, role, city, area, pincode, latitude, longitude, status, preferred_mode) VALUES
-- Admin
('a0000000-0000-0000-0000-000000000001', 'Admin Bohri',        '+919900000001', 'admin@tijarah.com',      'male',   'admin',    'Mumbai',    'Bhendi Bazaar',  '400003', 18.9560, 72.8340, 'active', 'customer'),
-- Provider owners
('a0000000-0000-0000-0000-000000000002', 'Fatima Tailor',      '+919900000002', 'fatima@example.com',     'female', 'customer', 'Mumbai',    'Bhendi Bazaar',  '400003', 18.9565, 72.8335, 'active', 'provider'),
('a0000000-0000-0000-0000-000000000003', 'Husain Caterer',     '+919900000003', 'husain@example.com',     'male',   'customer', 'Mumbai',    'Mohammed Ali Rd', '400003', 18.9550, 72.8328, 'active', 'provider'),
('a0000000-0000-0000-0000-000000000004', 'Sakina Mehndi',      '+919900000004', 'sakina@example.com',     'female', 'customer', 'Mumbai',    'Dongri',         '400009', 18.9540, 72.8350, 'active', 'provider'),
('a0000000-0000-0000-0000-000000000005', 'Murtaza Electronics', '+919900000005', 'murtaza@example.com',   'male',   'customer', 'Pune',      'Camp',           '411001', 18.5195, 73.8553, 'active', 'provider'),
('a0000000-0000-0000-0000-000000000006', 'Zahra Sweets',       '+919900000006', 'zahra@example.com',      'female', 'customer', 'Surat',     'Rander',         '395005', 21.1865, 72.7910, 'active', 'provider'),
-- Customers
('a0000000-0000-0000-0000-000000000007', 'Ahmed Bohra',        '+919900000007', 'ahmed@example.com',      'male',   'customer', 'Mumbai',    'Malabar Hill',   '400006', 18.9598, 72.8040, 'active', 'customer'),
('a0000000-0000-0000-0000-000000000008', 'Aisha Merchant',     '+919900000008', 'aisha@example.com',      'female', 'customer', 'Mumbai',    'Bhendi Bazaar',  '400003', 18.9558, 72.8332, 'active', 'customer'),
('a0000000-0000-0000-0000-000000000009', 'Maryam Shabbir',     '+919900000009', 'maryam@example.com',     'female', 'customer', 'Pune',      'Koregaon Park',  '411001', 18.5362, 73.8930, 'active', 'customer'),
('a0000000-0000-0000-0000-000000000010', 'Yusuf Contractor',   '+919900000010', 'yusuf@example.com',      'male',   'customer', 'Surat',     'Athwa Lines',    '395001', 21.1790, 72.8070, 'active', 'customer');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CATEGORIES                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order) VALUES
('c0000000-0000-0000-0000-000000000001', 'Tailoring & Alterations', 'tailoring',    'Custom stitching, alterations & embroidery',        '🧵', true, 1),
('c0000000-0000-0000-0000-000000000002', 'Catering & Tiffin',      'catering',     'Home-cooked meals, event catering & tiffin service', '🍲', true, 2),
('c0000000-0000-0000-0000-000000000003', 'Mehndi & Henna',         'mehndi',       'Bridal mehndi, party henna & nail art',              '🌿', true, 3),
('c0000000-0000-0000-0000-000000000004', 'Electronics Repair',     'electronics',  'Mobile, laptop, TV & appliance repair',              '🔧', true, 4),
('c0000000-0000-0000-0000-000000000005', 'Sweets & Bakery',        'sweets',       'Traditional mithai, cakes & confectionery',          '🍬', true, 5),
('c0000000-0000-0000-0000-000000000006', 'Home Services',          'home-services','Plumbing, electrical & deep cleaning',               '🏠', true, 6),
('c0000000-0000-0000-0000-000000000007', 'Beauty & Salon',         'beauty',       'Hair styling, facials & grooming',                   '💇', true, 7),
('c0000000-0000-0000-0000-000000000008', 'Photography',            'photography',  'Event photography, portraits & videography',         '📷', true, 8),
('c0000000-0000-0000-0000-000000000009', 'Tuition & Coaching',     'tuition',      'Academic coaching, Quran classes & skill training',  '📚', true, 9),
('c0000000-0000-0000-0000-000000000010', 'Event Planning',         'events',       'Wedding decor, party planning & tent services',      '🎉', true, 10);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDERS                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO providers (id, user_id, brand_name, description, address, city, area, pincode, latitude, longitude, contact_number, open_time, close_time, is_available, profile_photo_url, banner_image_url, is_women_led, community_verified, status, is_featured) VALUES
('b0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000002',
 'Fatima''s Tailoring House',
 'Premium bespoke tailoring for women. Specialising in Rida work, bridal outfits, and everyday ethnic wear with 15+ years of experience.',
 'Shop 12, Saify Jubilee St, Bhendi Bazaar',
 'Mumbai', 'Bhendi Bazaar', '400003',
 18.9565, 72.8335, '+919900000002',
 '10:00', '19:00', true,
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800',
 true, true, 'active', true),

('b0000000-0000-0000-0000-000000000002',
 'a0000000-0000-0000-0000-000000000003',
 'Husain''s Kitchen',
 'Authentic Bohri cuisine and catering for all occasions — from intimate dinners to grand weddings. Fresh ingredients, traditional recipes.',
 '3rd Floor, Najafi House, Mohammed Ali Rd',
 'Mumbai', 'Mohammed Ali Rd', '400003',
 18.9550, 72.8328, '+919900000003',
 '08:00', '22:00', true,
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400',
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
 false, true, 'active', true),

('b0000000-0000-0000-0000-000000000003',
 'a0000000-0000-0000-0000-000000000004',
 'Sakina Mehndi Arts',
 'Intricate bridal and party mehndi designs. Arabic, Indian, and modern fusion styles. Available for home visits across Mumbai.',
 '45, Pakmodia St, Dongri',
 'Mumbai', 'Dongri', '400009',
 18.9540, 72.8350, '+919900000004',
 '09:00', '20:00', true,
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
 true, false, 'active', false),

('b0000000-0000-0000-0000-000000000004',
 'a0000000-0000-0000-0000-000000000005',
 'Murtaza Tech Repairs',
 'Expert mobile, laptop, and appliance repair with genuine parts. Same-day service for most repairs. 10 years of trusted service in Pune.',
 '22, MG Road, Camp Area',
 'Pune', 'Camp', '411001',
 18.5195, 73.8553, '+919900000005',
 '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400',
 NULL,
 false, true, 'active', false),

('b0000000-0000-0000-0000-000000000005',
 'a0000000-0000-0000-0000-000000000006',
 'Zahra''s Sweet Corner',
 'Handmade Bohri sweets and bakery items. Famous for malpua, halwa, and custom celebration cakes. Fresh daily, no preservatives.',
 '7, Ring Road, Rander',
 'Surat', 'Rander', '395005',
 21.1865, 72.7910, '+919900000006',
 '07:00', '21:00', true,
 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400',
 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800',
 true, false, 'active', true);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER ↔ CATEGORY  mapping                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_categories (id, provider_id, category_id) VALUES
-- Fatima: Tailoring + Beauty
('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007'),
-- Husain: Catering + Events
('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000010'),
-- Sakina: Mehndi + Beauty
('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'),
('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000007'),
-- Murtaza: Electronics + Home Services
('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004'),
('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000006'),
-- Zahra: Sweets
('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PRODUCTS  (3-5 per provider)                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO products (id, provider_id, name, description, price, currency, photo_url, is_active, display_order) VALUES
-- Fatima's Tailoring
('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Custom Rida Stitching',   'Full custom Rida with your choice of fabric and embellishments. Includes fitting sessions.',                2500.00, 'INR', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', true, 1),
('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Bridal Outfit Package',   'Complete bridal outfit — lehnga, dupatta, and blouse. Premium embroidery included.',                        15000.00, 'INR', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', true, 2),
('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Alteration & Repair',     'Quick alterations for any garment. Hemming, resizing, zip replacement.',                                     300.00, 'INR', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400', true, 3),
('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Kids Ethnic Wear',        'Custom ethnic outfits for children — kurta, pajama, frocks. All sizes available.',                          1200.00, 'INR', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400', true, 4),

-- Husain's Kitchen
('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Daily Tiffin Service',    'Home-cooked Bohri thali delivered daily. Rice, dal, sabzi, roti, and salad.',                                150.00, 'INR', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400', true, 1),
('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Wedding Catering (per plate)', 'Full course wedding menu — appetizers, mains, desserts, and beverages. Min 100 plates.',                 800.00, 'INR', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', true, 2),
('e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'Party Snacks Platter',    'Assorted samosa, kebab, cutlet, and chutney platter. Serves 15-20 people.',                                 1500.00, 'INR', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', true, 3),
('e0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'Dessert Box (12 pcs)',    'Assorted Bohri sweets — malpua, kheer, firni, and jalebi. Freshly prepared.',                                600.00, 'INR', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400', true, 4),

-- Sakina Mehndi
('e0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'Bridal Mehndi (Full)',    'Both hands and feet. Intricate traditional Bohri bridal design. 3-4 hour session.',                         5000.00, 'INR', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', true, 1),
('e0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'Party Mehndi (Hands)',    'Beautiful Arabic/Indian design on both hands. Perfect for Eid, mehfil, or any occasion.',                   1500.00, 'INR', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400', true, 2),
('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'Kids Mehndi Special',     'Fun and simple designs for children. Quick 30-minute session.',                                              500.00, 'INR', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=400', true, 3),

-- Murtaza Tech Repairs
('e0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'Mobile Screen Replacement', 'Original screen replacement for all major brands. 6-month warranty.',                                     2000.00, 'INR', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400', true, 1),
('e0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000004', 'Laptop Service & Repair', 'Hardware & software diagnostics, SSD upgrade, OS reinstall. All brands.',                                   1500.00, 'INR', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', true, 2),
('e0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000004', 'AC Service & Gas Refill', 'Split and window AC deep cleaning, gas top-up, and general maintenance.',                                    800.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 3),

-- Zahra's Sweet Corner
('e0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000005', 'Classic Malpua Box (12)', 'Traditional Bohri malpua soaked in sugar syrup. Made fresh daily.',                                          450.00, 'INR', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400', true, 1),
('e0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005', 'Custom Celebration Cake', 'Eggless custom cake for birthdays, walima, or any celebration. 1 kg starting.',                             1200.00, 'INR', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', true, 2),
('e0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000005', 'Mixed Mithai Box (500g)', 'Assorted barfi, ladoo, peda, and jalebi. Perfect for gifting.',                                              350.00, 'INR', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', true, 3),
('e0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000005', 'Halwa Platter (1 kg)',    'Rich sooji halwa with dry fruits. Made with pure ghee, no preservatives.',                                   500.00, 'INR', 'https://images.unsplash.com/photo-1606890737304-86acd94755aa?w=400', true, 4);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PHOTOS  (3-5 per provider)                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO photos (id, provider_id, image_url, storage_key, display_order, uploaded_at) VALUES
-- Fatima
('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600', 'providers/b1/photo1.jpg', 1, NOW() - INTERVAL '30 days'),
('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600', 'providers/b1/photo2.jpg', 2, NOW() - INTERVAL '28 days'),
('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600', 'providers/b1/photo3.jpg', 3, NOW() - INTERVAL '25 days'),
('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=600', 'providers/b1/photo4.jpg', 4, NOW() - INTERVAL '20 days'),
-- Husain
('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600', 'providers/b2/photo1.jpg', 1, NOW() - INTERVAL '26 days'),
('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', 'providers/b2/photo2.jpg', 2, NOW() - INTERVAL '22 days'),
('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', 'providers/b2/photo3.jpg', 3, NOW() - INTERVAL '18 days'),
('f0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600', 'providers/b2/photo4.jpg', 4, NOW() - INTERVAL '15 days'),
('f0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600', 'providers/b2/photo5.jpg', 5, NOW() - INTERVAL '10 days'),
-- Sakina
('f0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600', 'providers/b3/photo1.jpg', 1, NOW() - INTERVAL '24 days'),
('f0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=600', 'providers/b3/photo2.jpg', 2, NOW() - INTERVAL '20 days'),
('f0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=600', 'providers/b3/photo3.jpg', 3, NOW() - INTERVAL '16 days'),
-- Murtaza
('f0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600', 'providers/b4/photo1.jpg', 1, NOW() - INTERVAL '21 days'),
('f0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600', 'providers/b4/photo2.jpg', 2, NOW() - INTERVAL '17 days'),
('f0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600', 'providers/b4/photo3.jpg', 3, NOW() - INTERVAL '12 days'),
-- Zahra
('f0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600', 'providers/b5/photo1.jpg', 1, NOW() - INTERVAL '19 days'),
('f0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', 'providers/b5/photo2.jpg', 2, NOW() - INTERVAL '14 days'),
('f0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600', 'providers/b5/photo3.jpg', 3, NOW() - INTERVAL '9 days'),
('f0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1606890737304-86acd94755aa?w=600', 'providers/b5/photo4.jpg', 4, NOW() - INTERVAL '5 days');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEWS  (2-4 per provider, from different customers)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reviews (id, provider_id, reviewer_id, star_rating, review_text, status, posted_at, reply_text, replied_at) VALUES
-- Fatima's Tailoring (avg ~4.7)
('70000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 5,
 'Absolutely stunning Rida work! The fitting was perfect and the embroidery detail is exquisite. Fatima really understands what we need.',
 'active', NOW() - INTERVAL '45 days',
 'Thank you so much, Ahmed bhai! It was a pleasure working on your order. Looking forward to serving you again!', NOW() - INTERVAL '44 days'),

('70000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 5,
 'Got my bridal outfit done here and it was beyond beautiful. Everyone at the wedding complimented it. Worth every rupee!',
 'active', NOW() - INTERVAL '30 days', NULL, NULL),

('70000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 4,
 'Good quality stitching. Took a bit longer than promised but the final result was excellent. Would recommend.',
 'active', NOW() - INTERVAL '15 days', NULL, NULL),

-- Husain's Kitchen (avg ~4.5)
('70000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 5,
 'Best caterer in the area! Absolutely delicious food for our family gathering. Everyone was raving about the biryani.',
 'active', NOW() - INTERVAL '40 days',
 'Alhamdulillah! So happy your family enjoyed the food. We put our heart into every dish.', NOW() - INTERVAL '39 days'),

('70000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 4,
 'The daily tiffin service is really good. Variety changes every day and portions are generous. Delivery is sometimes 15-20 min late.',
 'active', NOW() - INTERVAL '20 days', NULL, NULL),

('70000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 5,
 'Ordered for a walima function. 200 plates, everything was hot and on time. Professional service from start to finish.',
 'active', NOW() - INTERVAL '10 days', NULL, NULL),

('70000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009', 4,
 'Really tasty snacks platter for our mehfil. Fresh and well-presented. Will order again for sure.',
 'active', NOW() - INTERVAL '5 days', NULL, NULL),

-- Sakina Mehndi (avg ~4.7)
('70000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 5,
 'Amazing henna work! Intricate and beautiful designs. Sakina is so talented and patient. My bridal mehndi was perfect.',
 'active', NOW() - INTERVAL '35 days',
 'JazakAllah Aisha! Your bridal mehndi session was so special. Wishing you a blessed married life!', NOW() - INTERVAL '34 days'),

('70000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 5,
 'Came home to apply mehndi for all the ladies before Eid. Such beautiful Arabic designs and very quick too!',
 'active', NOW() - INTERVAL '18 days', NULL, NULL),

('70000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 4,
 'Got mehndi for my daughter''s birthday party. Kids loved it. Affordable and beautiful work.',
 'active', NOW() - INTERVAL '8 days', NULL, NULL),

-- Murtaza Tech (avg ~4.3)
('70000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000009', 5,
 'Fixed my iPhone screen in under an hour. Original parts and the phone works like new. Very reasonable price too.',
 'active', NOW() - INTERVAL '25 days',
 'Thank you Maryam! We always use genuine parts. 6-month warranty on all repairs.', NOW() - INTERVAL '24 days'),

('70000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000010', 4,
 'Good laptop repair service. Diagnosed the issue quickly and had it back the next day. Fair pricing.',
 'active', NOW() - INTERVAL '14 days', NULL, NULL),

('70000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', 4,
 'AC service was thorough. Cooling improved noticeably. Would prefer if they gave appointment time slots though.',
 'active', NOW() - INTERVAL '3 days', NULL, NULL),

-- Zahra's Sweets (avg ~4.8)
('70000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000010', 5,
 'The best malpua in Surat! Tastes exactly like my grandmother used to make. Fresh, crispy, and perfectly sweet.',
 'active', NOW() - INTERVAL '22 days',
 'Your kind words made our day! Grandmother''s recipes are our inspiration.', NOW() - INTERVAL '21 days'),

('70000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 5,
 'Ordered a birthday cake and mithai box. Both were gorgeous and tasted amazing. Everyone asked where we got them from!',
 'active', NOW() - INTERVAL '12 days', NULL, NULL),

('70000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 5,
 'Pure ghee halwa is divine! You can taste the quality. No artificial anything. This is the real deal.',
 'active', NOW() - INTERVAL '4 days', NULL, NULL),

('70000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000009', 4,
 'Lovely mixed mithai box for gifting. Beautifully packed and very fresh. Slightly on the pricey side but worth it.',
 'active', NOW() - INTERVAL '1 day', NULL, NULL);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEW PHOTOS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO review_photos (id, review_id, image_url, storage_key) VALUES
('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300', 'reviews/r1/photo1.jpg'),
('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300', 'reviews/r2/photo1.jpg'),
('71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300', 'reviews/r4/photo1.jpg'),
('71000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300', 'reviews/r8/photo1.jpg'),
('71000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000014', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=300', 'reviews/r14/photo1.jpg');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VERIFICATIONS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO verifications (id, user_id, aadhaar_doc_url, aadhaar_status, ijamat_number, ijamat_expiry, ijamat_doc_url, ijamat_status, status, reviewed_at, reviewed_by) VALUES
('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'https://example.com/docs/fatima-aadhaar.pdf',  'approved', 'ITS-12345', '2028-12-31', 'https://example.com/docs/fatima-ijamat.pdf',  'approved',       'approved', NOW() - INTERVAL '60 days', 'a0000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'https://example.com/docs/husain-aadhaar.pdf',  'approved', 'ITS-23456', '2027-06-30', 'https://example.com/docs/husain-ijamat.pdf',  'approved',       'approved', NOW() - INTERVAL '55 days', 'a0000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'https://example.com/docs/sakina-aadhaar.pdf',  'approved', NULL,         NULL,          NULL,                                          'not_submitted',  'approved', NOW() - INTERVAL '50 days', 'a0000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'https://example.com/docs/murtaza-aadhaar.pdf', 'approved', 'ITS-45678', '2029-03-15', 'https://example.com/docs/murtaza-ijamat.pdf', 'approved',       'approved', NOW() - INTERVAL '45 days', 'a0000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'https://example.com/docs/zahra-aadhaar.pdf',   'pending',  NULL,         NULL,          NULL,                                          'not_submitted',  'pending',  NULL,                        NULL);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BOOKINGS                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO bookings (id, user_id, provider_id, status, total_amount, currency, notes, scheduled_at, completed_at, created_at) VALUES
('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'completed', 2500.00, 'INR', 'Custom Rida order',                  NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '52 days'),
('90000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'completed', 4800.00, 'INR', 'Catering for family gathering (6 pax)', NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '44 days'),
('90000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'completed', 5000.00, 'INR', 'Bridal mehndi full package',          NOW() - INTERVAL '36 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '38 days'),
('90000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004', 'completed', 2000.00, 'INR', 'iPhone screen replacement',           NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '28 days'),
('90000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000005', 'completed', 1400.00, 'INR', 'Malpua + Mithai box for Eid',         NOW() - INTERVAL '24 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '25 days'),
('90000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'confirmed', 800.00,  'INR', 'Wedding catering inquiry',            NOW() + INTERVAL '5 days',  NULL,                        NOW() - INTERVAL '2 days'),
('90000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'pending',   15000.00,'INR', 'Bridal outfit — lehnga set',          NOW() + INTERVAL '30 days', NULL,                        NOW() - INTERVAL '1 day');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROMO BANNERS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO promo_banners (id, title, subtitle, gradient, emoji, cta, tag, link_url, is_active, display_order, starts_at, ends_at) VALUES
('aa000000-0000-0000-0000-000000000001', 'Eid Special Offers',      'Up to 30% off on bridal mehndi & tailoring',  'from-amber-500 to-orange-600',   '🌙', 'Explore Offers',  'EID SALE',    '/all-services?tag=eid',   true, 1, NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days'),
('aa000000-0000-0000-0000-000000000002', 'New Provider? Join Free', 'List your services and reach the community',  'from-teal-500 to-emerald-600',   '🚀', 'Get Started',     'FREE',        '/provider-onboarding',    true, 2, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
('aa000000-0000-0000-0000-000000000003', 'Top Rated This Week',     'Discover community favourites near you',       'from-purple-500 to-indigo-600',  '⭐', 'See Top Rated',   'TRENDING',    '/all-services?sort=rating', true, 3, NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SAVED LOCATIONS (for customer users)                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO saved_locations (id, user_id, title, label, latitude, longitude, city, area, full_address) VALUES
('bb000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'home', 'Malabar Hill Home',     18.9598, 72.8040, 'Mumbai', 'Malabar Hill',    '12/B, Walkeshwar Rd, Malabar Hill, Mumbai 400006'),
('bb000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'work', 'Office - Fort',         18.9338, 72.8353, 'Mumbai', 'Fort',            'Eros Building, DN Rd, Fort, Mumbai 400001'),
('bb000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 'home', 'Bhendi Bazaar Home',    18.9558, 72.8332, 'Mumbai', 'Bhendi Bazaar',   'Flat 3, Taheri Manzil, Bhendi Bazaar, Mumbai 400003'),
('bb000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000009', 'home', 'Koregaon Park Flat',    18.5362, 73.8930, 'Pune',   'Koregaon Park',   'B-wing, Lane 5, Koregaon Park, Pune 411001');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SAVED ITEMS (providers + products saved by customers)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO saved_items (id, user_id, item_id, item_type) VALUES
-- Ahmed saved 2 providers + 1 product
('cc000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'provider'),
('cc000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'provider'),
('cc000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000005', 'product'),
-- Aisha saved 1 provider + 2 products
('cc000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'provider'),
('cc000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000009', 'product'),
('cc000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000015', 'product'),
-- Maryam saved 1 provider
('cc000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004', 'provider');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONVERSATIONS + PARTICIPANTS + MESSAGES                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Conversation 1: Ahmed ↔ Fatima (direct, about provider)
INSERT INTO conversations (id, type, context_type, context_id, context_title, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('dd000000-0000-0000-0000-000000000001', 'direct', 'provider', 'b0000000-0000-0000-0000-000000000001', 'Fatima''s Tailoring House', 'active', NOW() - INTERVAL '2 hours', 'Yes, I can have it ready by next Thursday inshAllah.', 'a0000000-0000-0000-0000-000000000002');

INSERT INTO conversation_participants (id, conversation_id, user_id, role, unread_count, is_active) VALUES
('de000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'customer', 1, true),
('de000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'provider', 0, true);

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, status, created_at) VALUES
('df000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'Salaam! I saw your Rida stitching service. Can you do a custom design with lace work?', 'text', 'read', NOW() - INTERVAL '3 hours'),
('df000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Wa alaikum assalam! Yes absolutely, lace work is one of our specialities. Would you like to visit the shop or share a reference photo?', 'text', 'read', NOW() - INTERVAL '2 hours 45 minutes'),
('df000000-0000-0000-0000-000000000003', 'dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'I''ll send a photo. How long does it usually take?', 'text', 'read', NOW() - INTERVAL '2 hours 30 minutes'),
('df000000-0000-0000-0000-000000000004', 'dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Yes, I can have it ready by next Thursday inshAllah.', 'text', 'sent', NOW() - INTERVAL '2 hours');

-- Conversation 2: Aisha ↔ Husain (enquiry about catering product)
INSERT INTO conversations (id, type, context_type, context_id, context_title, context_image_url, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('dd000000-0000-0000-0000-000000000002', 'enquiry', 'product', 'e0000000-0000-0000-0000-000000000006', 'Wedding Catering (per plate)', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', 'active', NOW() - INTERVAL '1 day', 'We can do a tasting session this weekend if you are free.', 'a0000000-0000-0000-0000-000000000003');

INSERT INTO conversation_participants (id, conversation_id, user_id, role, unread_count, is_active) VALUES
('de000000-0000-0000-0000-000000000003', 'dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'customer', 1, true),
('de000000-0000-0000-0000-000000000004', 'dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'provider', 0, true);

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, status, created_at) VALUES
('df000000-0000-0000-0000-000000000005', 'dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'Salaam Husain bhai, I need catering for my sister''s walima. Around 150 guests. What would be the cost per plate?', 'enquiry', 'read', NOW() - INTERVAL '1 day 3 hours'),
('df000000-0000-0000-0000-000000000006', 'dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Wa alaikum assalam! For 150 plates with our full wedding menu, it would be 750/plate. This includes starters, 2 mains, rice, bread, dessert, and drinks.', 'text', 'read', NOW() - INTERVAL '1 day 2 hours'),
('df000000-0000-0000-0000-000000000007', 'dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'That sounds good! Can we customize the menu? My sister wants both Bohri and Mughlai items.', 'text', 'read', NOW() - INTERVAL '1 day 1 hour'),
('df000000-0000-0000-0000-000000000008', 'dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'We can do a tasting session this weekend if you are free.', 'text', 'sent', NOW() - INTERVAL '1 day');

-- Conversation 3: Maryam ↔ Murtaza (direct about provider)
INSERT INTO conversations (id, type, context_type, context_id, context_title, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('dd000000-0000-0000-0000-000000000003', 'direct', 'provider', 'b0000000-0000-0000-0000-000000000004', 'Murtaza Tech Repairs', 'active', NOW() - INTERVAL '12 hours', 'Your laptop is ready for pickup! Everything is working perfectly now.', 'a0000000-0000-0000-0000-000000000005');

INSERT INTO conversation_participants (id, conversation_id, user_id, role, unread_count, is_active) VALUES
('de000000-0000-0000-0000-000000000005', 'dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 'customer', 1, true),
('de000000-0000-0000-0000-000000000006', 'dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'provider', 0, true);

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, status, created_at) VALUES
('df000000-0000-0000-0000-000000000009', 'dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 'Hi, my laptop keeps overheating and shutting down. Can you take a look?', 'text', 'read', NOW() - INTERVAL '2 days'),
('df000000-0000-0000-0000-000000000010', 'dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Sure, please bring it in tomorrow. Sounds like it might need a thermal paste replacement and fan cleaning. Usually takes 2-3 hours.', 'text', 'read', NOW() - INTERVAL '1 day 20 hours'),
('df000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Your laptop is ready for pickup! Everything is working perfectly now.', 'text', 'sent', NOW() - INTERVAL '12 hours');

COMMIT;
