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

DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM review_reports;
DELETE FROM review_photos;
DELETE FROM reviews;
DELETE FROM saved_items;
DELETE FROM saved_locations;
DELETE FROM bookings;
DELETE FROM products;
DELETE FROM photos;
DELETE FROM provider_categories;
DELETE FROM promo_banners;
DELETE FROM verifications;
DELETE FROM listing_categories;
DELETE FROM listings;
DELETE FROM providers;
DELETE FROM categories;
DELETE FROM users;

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
('10f1bc81-448a-4a9e-a6b2-bc5b50c187fc', 'Admin Bohri',        '+919900000001', 'admin@tijarah.com',      'male',   'admin',    'Mumbai',    'Bhendi Bazaar',  '400003', 18.9560, 72.8340, 'active', 'customer'),
-- Provider owners
('9132b63e-f162-47e4-a9c3-49e03602f8ac', 'Fatima Tailor',      '+919900000002', 'fatima@example.com',     'female', 'customer', 'Mumbai',    'Bhendi Bazaar',  '400003', 18.9565, 72.8335, 'active', 'provider'),
('366eb16f-508e-4ad7-b7c9-3acfe059a0ee', 'Husain Caterer',     '+919900000003', 'husain@example.com',     'male',   'customer', 'Mumbai',    'Mohammed Ali Rd', '400003', 18.9550, 72.8328, 'active', 'provider'),
('e27a984d-6548-41d0-bfcd-9eb1a7cad415', 'Sakina Mehndi',      '+919900000004', 'sakina@example.com',     'female', 'customer', 'Mumbai',    'Dongri',         '400009', 18.9540, 72.8350, 'active', 'provider'),
('24933b83-7577-40a9-a491-f0b2ea1fca65', 'Murtaza Electronics', '+919900000005', 'murtaza@example.com',   'male',   'customer', 'Pune',      'Camp',           '411001', 18.5195, 73.8553, 'active', 'provider'),
('beb79919-3f22-4af8-a3be-d01d43cf2fde', 'Zahra Sweets',       '+919900000006', 'zahra@example.com',      'female', 'customer', 'Surat',     'Rander',         '395005', 21.1865, 72.7910, 'active', 'provider'),
-- Customers
('bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'Ahmed Bohra',        '+919900000007', 'ahmed@example.com',      'male',   'customer', 'Mumbai',    'Malabar Hill',   '400006', 18.9598, 72.8040, 'active', 'customer'),
('956269f0-e5d7-4875-adad-d6c795a76d79', 'Aisha Merchant',     '+919900000008', 'aisha@example.com',      'female', 'customer', 'Mumbai',    'Bhendi Bazaar',  '400003', 18.9558, 72.8332, 'active', 'customer'),
('ff50bde4-3825-47b8-9cab-cc97663f1c97', 'Maryam Shabbir',     '+919900000009', 'maryam@example.com',     'female', 'customer', 'Pune',      'Koregaon Park',  '411001', 18.5362, 73.8930, 'active', 'customer'),
('7e570ddf-8270-40a8-a369-b584ff5e9ff0', 'Yusuf Contractor',   '+919900000010', 'yusuf@example.com',      'male',   'customer', 'Surat',     'Athwa Lines',    '395001', 21.1790, 72.8070, 'active', 'customer');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CATEGORIES                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order) VALUES
('81f76d1c-2dbc-4134-830f-f46e8026695f', 'Tailoring & Alterations', 'tailoring',    'Custom stitching, alterations & embroidery',        '🧵', true, 1),
('a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f', 'Catering & Tiffin',      'catering',     'Home-cooked meals, event catering & tiffin service', '🍲', true, 2),
('81f631d4-a392-41a7-9777-a4774c66e0a8', 'Mehndi & Henna',         'mehndi',       'Bridal mehndi, party henna & nail art',              '🌿', true, 3),
('5fb8d16c-2720-497d-b2eb-d6899be578c7', 'Electronics Repair',     'electronics',  'Mobile, laptop, TV & appliance repair',              '🔧', true, 4),
('f4188f3f-8a14-4e62-a95b-4715c333e861', 'Sweets & Bakery',        'sweets',       'Traditional mithai, cakes & confectionery',          '🍬', true, 5),
('eb2263dd-87c5-421e-ac24-a3c5c754108f', 'Home Services',          'home-services','Plumbing, electrical & deep cleaning',               '🏠', true, 6),
('7d154385-52fb-443b-9954-6eb400257ad1', 'Beauty & Salon',         'beauty',       'Hair styling, facials & grooming',                   '💇', true, 7),
('5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'Photography',            'photography',  'Event photography, portraits & videography',         '📷', true, 8),
('ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', 'Tuition & Coaching',     'tuition',      'Academic coaching, Quran classes & skill training',  '📚', true, 9),
('3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', 'Event Planning',         'events',       'Wedding decor, party planning & tent services',      '🎉', true, 10);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDERS                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO providers (id, user_id, brand_name, description, address, city, area, pincode, latitude, longitude, contact_number, open_time, close_time, is_available, profile_photo_url, banner_image_url, is_women_led, community_verified, status, is_featured) VALUES
('988c24c9-61b1-4d22-a280-1c4510435a10',
 '9132b63e-f162-47e4-a9c3-49e03602f8ac',
 'Fatima''s Tailoring House',
 'Premium bespoke tailoring for women. Specialising in Rida work, bridal outfits, and everyday ethnic wear with 15+ years of experience.',
 'Shop 12, Saify Jubilee St, Bhendi Bazaar',
 'Mumbai', 'Bhendi Bazaar', '400003',
 18.9565, 72.8335, '+919900000002',
 '10:00', '19:00', true,
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800',
 true, true, 'active', true),

('405cacec-8774-49a9-b7d2-1e02ff01cf99',
 '366eb16f-508e-4ad7-b7c9-3acfe059a0ee',
 'Husain''s Kitchen',
 'Authentic Bohri cuisine and catering for all occasions — from intimate dinners to grand weddings. Fresh ingredients, traditional recipes.',
 '3rd Floor, Najafi House, Mohammed Ali Rd',
 'Mumbai', 'Mohammed Ali Rd', '400003',
 18.9550, 72.8328, '+919900000003',
 '08:00', '22:00', true,
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400',
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
 false, true, 'active', true),

('f143262f-dc5c-4eed-8da0-365bf89897b9',
 'e27a984d-6548-41d0-bfcd-9eb1a7cad415',
 'Sakina Mehndi Arts',
 'Intricate bridal and party mehndi designs. Arabic, Indian, and modern fusion styles. Available for home visits across Mumbai.',
 '45, Pakmodia St, Dongri',
 'Mumbai', 'Dongri', '400009',
 18.9540, 72.8350, '+919900000004',
 '09:00', '20:00', true,
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
 true, false, 'active', false),

('1d53434b-b881-49b9-ae27-0da702f06b90',
 '24933b83-7577-40a9-a491-f0b2ea1fca65',
 'Murtaza Tech Repairs',
 'Expert mobile, laptop, and appliance repair with genuine parts. Same-day service for most repairs. 10 years of trusted service in Pune.',
 '22, MG Road, Camp Area',
 'Pune', 'Camp', '411001',
 18.5195, 73.8553, '+919900000005',
 '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400',
 NULL,
 false, true, 'active', false),

('c0398710-8976-4334-a281-7efdae849217',
 'beb79919-3f22-4af8-a3be-d01d43cf2fde',
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
('b09b2a5c-badc-432a-8159-0f538a0f4efb', '988c24c9-61b1-4d22-a280-1c4510435a10', '81f76d1c-2dbc-4134-830f-f46e8026695f'),
('66245bfa-4fcc-439a-b683-d2e6337ea2df', '988c24c9-61b1-4d22-a280-1c4510435a10', '7d154385-52fb-443b-9954-6eb400257ad1'),
-- Husain: Catering + Events
('5f987c71-a65e-488e-abf3-ad39fec21bbe', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f'),
('7394988f-847f-49b4-a64d-1bcb702753a1', '405cacec-8774-49a9-b7d2-1e02ff01cf99', '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff'),
-- Sakina: Mehndi + Beauty
('1064005c-3985-43cf-bf76-be1d1efa2197', 'f143262f-dc5c-4eed-8da0-365bf89897b9', '81f631d4-a392-41a7-9777-a4774c66e0a8'),
('8dcdcd03-969b-4662-8562-8059568cc69b', 'f143262f-dc5c-4eed-8da0-365bf89897b9', '7d154385-52fb-443b-9954-6eb400257ad1'),
-- Murtaza: Electronics + Home Services
('01d74256-3860-4ab6-96a4-02f23ae8cc93', '1d53434b-b881-49b9-ae27-0da702f06b90', '5fb8d16c-2720-497d-b2eb-d6899be578c7'),
('0f1259e0-a18f-46b6-b535-106e122c9a56', '1d53434b-b881-49b9-ae27-0da702f06b90', 'eb2263dd-87c5-421e-ac24-a3c5c754108f'),
-- Zahra: Sweets
('080aadfb-e7c9-4b26-9141-25c63a9bedd4', 'c0398710-8976-4334-a281-7efdae849217', 'f4188f3f-8a14-4e62-a95b-4715c333e861');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PRODUCTS  (3-5 per provider)                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO products (id, provider_id, name, description, price, currency, photo_url, is_active, display_order) VALUES
-- Fatima's Tailoring
('dd59ba71-36b8-4481-bb3a-4e3e7c52fa17', '988c24c9-61b1-4d22-a280-1c4510435a10', 'Custom Rida Stitching',   'Full custom Rida with your choice of fabric and embellishments. Includes fitting sessions.',                2500.00, 'INR', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', true, 1),
('2a25a888-0f02-4ad0-a706-7ef466aa9385', '988c24c9-61b1-4d22-a280-1c4510435a10', 'Bridal Outfit Package',   'Complete bridal outfit — lehnga, dupatta, and blouse. Premium embroidery included.',                        15000.00, 'INR', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', true, 2),
('63f2ae24-fc3d-4348-808d-4127610461e3', '988c24c9-61b1-4d22-a280-1c4510435a10', 'Alteration & Repair',     'Quick alterations for any garment. Hemming, resizing, zip replacement.',                                     300.00, 'INR', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400', true, 3),
('c8fe3ccd-c8b8-49c6-ad30-49cf43e458fc', '988c24c9-61b1-4d22-a280-1c4510435a10', 'Kids Ethnic Wear',        'Custom ethnic outfits for children — kurta, pajama, frocks. All sizes available.',                          1200.00, 'INR', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400', true, 4),

-- Husain's Kitchen
('b253d218-6c4a-47ea-8906-17f2747b6dba', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'Daily Tiffin Service',    'Home-cooked Bohri thali delivered daily. Rice, dal, sabzi, roti, and salad.',                                150.00, 'INR', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400', true, 1),
('c88a618e-fed4-457d-bb02-6576f512c4c3', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'Wedding Catering (per plate)', 'Full course wedding menu — appetizers, mains, desserts, and beverages. Min 100 plates.',                 800.00, 'INR', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', true, 2),
('7c967f79-b7e9-4aca-a970-65e18e46d534', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'Party Snacks Platter',    'Assorted samosa, kebab, cutlet, and chutney platter. Serves 15-20 people.',                                 1500.00, 'INR', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', true, 3),
('37bb3eec-4bf5-4b52-b09d-258c27a0c3d7', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'Dessert Box (12 pcs)',    'Assorted Bohri sweets — malpua, kheer, firni, and jalebi. Freshly prepared.',                                600.00, 'INR', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400', true, 4),

-- Sakina Mehndi
('bc594585-9445-48c0-8ef8-c2d6f7fd5646', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'Bridal Mehndi (Full)',    'Both hands and feet. Intricate traditional Bohri bridal design. 3-4 hour session.',                         5000.00, 'INR', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', true, 1),
('504867ba-bf7b-439b-8f9a-ea4b8acd4e10', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'Party Mehndi (Hands)',    'Beautiful Arabic/Indian design on both hands. Perfect for Eid, mehfil, or any occasion.',                   1500.00, 'INR', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400', true, 2),
('7a0ecfea-958c-49ba-8cd6-20c20ea2622b', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'Kids Mehndi Special',     'Fun and simple designs for children. Quick 30-minute session.',                                              500.00, 'INR', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=400', true, 3),

-- Murtaza Tech Repairs
('87f7e1fb-da4b-49ca-ab5c-f46780bacd64', '1d53434b-b881-49b9-ae27-0da702f06b90', 'Mobile Screen Replacement', 'Original screen replacement for all major brands. 6-month warranty.',                                     2000.00, 'INR', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400', true, 1),
('82010c62-f5f5-4b22-8e8f-a8e0284d82e5', '1d53434b-b881-49b9-ae27-0da702f06b90', 'Laptop Service & Repair', 'Hardware & software diagnostics, SSD upgrade, OS reinstall. All brands.',                                   1500.00, 'INR', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', true, 2),
('118a9d29-2f92-4996-99f1-95d014822f53', '1d53434b-b881-49b9-ae27-0da702f06b90', 'AC Service & Gas Refill', 'Split and window AC deep cleaning, gas top-up, and general maintenance.',                                    800.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 3),

-- Zahra's Sweet Corner
('dca02eec-acda-4acc-9165-e21098543881', 'c0398710-8976-4334-a281-7efdae849217', 'Classic Malpua Box (12)', 'Traditional Bohri malpua soaked in sugar syrup. Made fresh daily.',                                          450.00, 'INR', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400', true, 1),
('f10c718b-1eb0-438a-a75d-d5af3c365296', 'c0398710-8976-4334-a281-7efdae849217', 'Custom Celebration Cake', 'Eggless custom cake for birthdays, walima, or any celebration. 1 kg starting.',                             1200.00, 'INR', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', true, 2),
('94340a03-3f07-4814-91d6-3f78e3e9de99', 'c0398710-8976-4334-a281-7efdae849217', 'Mixed Mithai Box (500g)', 'Assorted barfi, ladoo, peda, and jalebi. Perfect for gifting.',                                              350.00, 'INR', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', true, 3),
('14fcdd54-9e8f-4965-8a2c-827e98326856', 'c0398710-8976-4334-a281-7efdae849217', 'Halwa Platter (1 kg)',    'Rich sooji halwa with dry fruits. Made with pure ghee, no preservatives.',                                   500.00, 'INR', 'https://images.unsplash.com/photo-1606890737304-86acd94755aa?w=400', true, 4);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PHOTOS  (3-5 per provider)                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO photos (id, provider_id, image_url, storage_key, display_order, uploaded_at) VALUES
-- Fatima
('90b2b633-956b-4c0c-a849-9b926b5252e3', '988c24c9-61b1-4d22-a280-1c4510435a10', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600', 'providers/b1/photo1.jpg', 1, NOW() - INTERVAL '30 days'),
('42c18a62-ef48-48d5-90fd-9d3f85d51695', '988c24c9-61b1-4d22-a280-1c4510435a10', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600', 'providers/b1/photo2.jpg', 2, NOW() - INTERVAL '28 days'),
('506e5a9a-b758-488d-ab73-295b344a54b8', '988c24c9-61b1-4d22-a280-1c4510435a10', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600', 'providers/b1/photo3.jpg', 3, NOW() - INTERVAL '25 days'),
('21813d25-6552-48a6-83ff-50113d1a85dd', '988c24c9-61b1-4d22-a280-1c4510435a10', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=600', 'providers/b1/photo4.jpg', 4, NOW() - INTERVAL '20 days'),
-- Husain
('750cab75-4ccc-4bc2-a53f-8a28abf3e3fc', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600', 'providers/b2/photo1.jpg', 1, NOW() - INTERVAL '26 days'),
('ef8c485b-c07a-40f2-add4-253b50f0fd0a', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', 'providers/b2/photo2.jpg', 2, NOW() - INTERVAL '22 days'),
('9f044aed-7552-4327-8262-7f7312922f83', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', 'providers/b2/photo3.jpg', 3, NOW() - INTERVAL '18 days'),
('19985f15-ff00-4d4d-9020-59e4ff9ab5c2', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600', 'providers/b2/photo4.jpg', 4, NOW() - INTERVAL '15 days'),
('8181a8cc-3691-47eb-89a2-688b12c136e0', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600', 'providers/b2/photo5.jpg', 5, NOW() - INTERVAL '10 days'),
-- Sakina
('5958a499-eeea-463e-a1e8-ac6843e42caf', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600', 'providers/b3/photo1.jpg', 1, NOW() - INTERVAL '24 days'),
('3e896c64-e117-4ac3-919c-4ea3e1805081', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=600', 'providers/b3/photo2.jpg', 2, NOW() - INTERVAL '20 days'),
('702cdd20-2862-48b8-88f4-ef125e9953d2', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=600', 'providers/b3/photo3.jpg', 3, NOW() - INTERVAL '16 days'),
-- Murtaza
('4d71c366-b41b-4143-8b10-550cd5704f32', '1d53434b-b881-49b9-ae27-0da702f06b90', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600', 'providers/b4/photo1.jpg', 1, NOW() - INTERVAL '21 days'),
('ce9e1a11-fcbb-4e59-bbdd-cf7c9c96e9ec', '1d53434b-b881-49b9-ae27-0da702f06b90', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600', 'providers/b4/photo2.jpg', 2, NOW() - INTERVAL '17 days'),
('aaf91531-0200-41f0-8768-a84fa76afde6', '1d53434b-b881-49b9-ae27-0da702f06b90', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600', 'providers/b4/photo3.jpg', 3, NOW() - INTERVAL '12 days'),
-- Zahra
('ee87905e-4ca4-45ea-8dfa-6a56d12dbc9a', 'c0398710-8976-4334-a281-7efdae849217', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600', 'providers/b5/photo1.jpg', 1, NOW() - INTERVAL '19 days'),
('e0ccedc5-f05d-476e-9a84-a51aa9d3d7c7', 'c0398710-8976-4334-a281-7efdae849217', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', 'providers/b5/photo2.jpg', 2, NOW() - INTERVAL '14 days'),
('e3c43657-1d8c-4bac-83b4-09ef2260e70f', 'c0398710-8976-4334-a281-7efdae849217', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600', 'providers/b5/photo3.jpg', 3, NOW() - INTERVAL '9 days'),
('27cb6f2a-8da0-4097-be0f-051b1b66b5a9', 'c0398710-8976-4334-a281-7efdae849217', 'https://images.unsplash.com/photo-1606890737304-86acd94755aa?w=600', 'providers/b5/photo4.jpg', 4, NOW() - INTERVAL '5 days');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEWS  (2-4 per provider, from different customers)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reviews (id, provider_id, reviewer_id, star_rating, review_text, status, posted_at, reply_text, replied_at) VALUES
-- Fatima's Tailoring (avg ~4.7)
('bdd640fb-0667-4ad1-9c80-317fa3b1799d', '988c24c9-61b1-4d22-a280-1c4510435a10', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 5,
 'Absolutely stunning Rida work! The fitting was perfect and the embroidery detail is exquisite. Fatima really understands what we need.',
 'active', NOW() - INTERVAL '45 days',
 'Thank you so much, Ahmed bhai! It was a pleasure working on your order. Looking forward to serving you again!', NOW() - INTERVAL '44 days'),

('23b8c1e9-3924-46de-beb1-3b9046685257', '988c24c9-61b1-4d22-a280-1c4510435a10', '956269f0-e5d7-4875-adad-d6c795a76d79', 5,
 'Got my bridal outfit done here and it was beyond beautiful. Everyone at the wedding complimented it. Worth every rupee!',
 'active', NOW() - INTERVAL '30 days', NULL, NULL),

('bd9c66b3-ad3c-4d6d-9a3d-1fa7bc8960a9', '988c24c9-61b1-4d22-a280-1c4510435a10', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 4,
 'Good quality stitching. Took a bit longer than promised but the final result was excellent. Would recommend.',
 'active', NOW() - INTERVAL '15 days', NULL, NULL),

-- Husain's Kitchen (avg ~4.5)
('972a8469-1641-4f82-8b9d-2434e465e150', '405cacec-8774-49a9-b7d2-1e02ff01cf99', '956269f0-e5d7-4875-adad-d6c795a76d79', 5,
 'Best caterer in the area! Absolutely delicious food for our family gathering. Everyone was raving about the biryani.',
 'active', NOW() - INTERVAL '40 days',
 'Alhamdulillah! So happy your family enjoyed the food. We put our heart into every dish.', NOW() - INTERVAL '39 days'),

('17fc695a-07a0-4a6e-8822-e8f36c031199', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 4,
 'The daily tiffin service is really good. Variety changes every day and portions are generous. Delivery is sometimes 15-20 min late.',
 'active', NOW() - INTERVAL '20 days', NULL, NULL),

('9a1de644-815e-46d1-bb8f-aa1837f8a88b', '405cacec-8774-49a9-b7d2-1e02ff01cf99', '7e570ddf-8270-40a8-a369-b584ff5e9ff0', 5,
 'Ordered for a walima function. 200 plates, everything was hot and on time. Professional service from start to finish.',
 'active', NOW() - INTERVAL '10 days', NULL, NULL),

('b74d0fb1-32e7-4629-8fad-c1a606cb0fb3', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 4,
 'Really tasty snacks platter for our mehfil. Fresh and well-presented. Will order again for sure.',
 'active', NOW() - INTERVAL '5 days', NULL, NULL),

-- Sakina Mehndi (avg ~4.7)
('6b65a6a4-8b81-48f6-b38a-088ca65ed389', 'f143262f-dc5c-4eed-8da0-365bf89897b9', '956269f0-e5d7-4875-adad-d6c795a76d79', 5,
 'Amazing henna work! Intricate and beautiful designs. Sakina is so talented and patient. My bridal mehndi was perfect.',
 'active', NOW() - INTERVAL '35 days',
 'JazakAllah Aisha! Your bridal mehndi session was so special. Wishing you a blessed married life!', NOW() - INTERVAL '34 days'),

('47378190-96da-4dac-b2ff-5d2a386ecbe0', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 5,
 'Came home to apply mehndi for all the ladies before Eid. Such beautiful Arabic designs and very quick too!',
 'active', NOW() - INTERVAL '18 days', NULL, NULL),

('c241330b-01a9-471f-9e8a-774bcf36d58b', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 4,
 'Got mehndi for my daughter''s birthday party. Kids loved it. Affordable and beautiful work.',
 'active', NOW() - INTERVAL '8 days', NULL, NULL),

-- Murtaza Tech (avg ~4.3)
('6c307511-b2b9-437a-a8df-6ec4ce4a2bbd', '1d53434b-b881-49b9-ae27-0da702f06b90', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 5,
 'Fixed my iPhone screen in under an hour. Original parts and the phone works like new. Very reasonable price too.',
 'active', NOW() - INTERVAL '25 days',
 'Thank you Maryam! We always use genuine parts. 6-month warranty on all repairs.', NOW() - INTERVAL '24 days'),

('371ecd7b-27cd-4130-8722-9389571aa876', '1d53434b-b881-49b9-ae27-0da702f06b90', '7e570ddf-8270-40a8-a369-b584ff5e9ff0', 4,
 'Good laptop repair service. Diagnosed the issue quickly and had it back the next day. Fair pricing.',
 'active', NOW() - INTERVAL '14 days', NULL, NULL),

('1a2a73ed-562b-4f79-8374-59eef50bea63', '1d53434b-b881-49b9-ae27-0da702f06b90', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 4,
 'AC service was thorough. Cooling improved noticeably. Would prefer if they gave appointment time slots though.',
 'active', NOW() - INTERVAL '3 days', NULL, NULL),

-- Zahra's Sweets (avg ~4.8)
('5be6128e-18c2-4797-a142-ea7d17be3111', 'c0398710-8976-4334-a281-7efdae849217', '7e570ddf-8270-40a8-a369-b584ff5e9ff0', 5,
 'The best malpua in Surat! Tastes exactly like my grandmother used to make. Fresh, crispy, and perfectly sweet.',
 'active', NOW() - INTERVAL '22 days',
 'Your kind words made our day! Grandmother''s recipes are our inspiration.', NOW() - INTERVAL '21 days'),

('43b7a3a6-9a8d-4a03-980d-7b71d8f56413', 'c0398710-8976-4334-a281-7efdae849217', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 5,
 'Ordered a birthday cake and mithai box. Both were gorgeous and tasted amazing. Everyone asked where we got them from!',
 'active', NOW() - INTERVAL '12 days', NULL, NULL),

('759cde66-bacf-43d0-8b1f-9163ce9ff57f', 'c0398710-8976-4334-a281-7efdae849217', '956269f0-e5d7-4875-adad-d6c795a76d79', 5,
 'Pure ghee halwa is divine! You can taste the quality. No artificial anything. This is the real deal.',
 'active', NOW() - INTERVAL '4 days', NULL, NULL),

('ec1b8ca1-f91e-4d4c-9ff4-9b7889463e85', 'c0398710-8976-4334-a281-7efdae849217', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 4,
 'Lovely mixed mithai box for gifting. Beautifully packed and very fresh. Slightly on the pricey side but worth it.',
 'active', NOW() - INTERVAL '1 day', NULL, NULL);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEW PHOTOS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO review_photos (id, review_id, image_url, storage_key) VALUES
('4b0dbb41-8d52-48f1-942c-3fe860e7a113', 'bdd640fb-0667-4ad1-9c80-317fa3b1799d', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300', 'reviews/r1/photo1.jpg'),
('e2acf72f-9e57-4f7a-a0ee-89aed453dd32', '23b8c1e9-3924-46de-beb1-3b9046685257', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300', 'reviews/r2/photo1.jpg'),
('3139d32c-93cd-49bf-9c94-1cf0dc98d2c1', '972a8469-1641-4f82-8b9d-2434e465e150', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300', 'reviews/r4/photo1.jpg'),
('a9488d99-0bbb-4599-91ce-5dd2b45ed1f0', '6b65a6a4-8b81-48f6-b38a-088ca65ed389', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300', 'reviews/r8/photo1.jpg'),
('fc377a4c-4a15-444d-85e7-ce8a3a578a8e', '5be6128e-18c2-4797-a142-ea7d17be3111', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=300', 'reviews/r14/photo1.jpg');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VERIFICATIONS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO verifications (id, user_id, aadhaar_doc_url, aadhaar_status, ijamat_number, ijamat_expiry, ijamat_doc_url, ijamat_status, status, reviewed_at, reviewed_by) VALUES
('ddd1dfb2-3b98-4ef8-9af6-1a26146d3f31', '9132b63e-f162-47e4-a9c3-49e03602f8ac', 'https://example.com/docs/fatima-aadhaar.pdf',  'approved', 'ITS-12345', '2028-12-31', 'https://example.com/docs/fatima-ijamat.pdf',  'approved',       'approved', NOW() - INTERVAL '60 days', '10f1bc81-448a-4a9e-a6b2-bc5b50c187fc'),
('7412b293-4729-4739-a14f-f3d719db3ad0', '366eb16f-508e-4ad7-b7c9-3acfe059a0ee', 'https://example.com/docs/husain-aadhaar.pdf',  'approved', 'ITS-23456', '2027-06-30', 'https://example.com/docs/husain-ijamat.pdf',  'approved',       'approved', NOW() - INTERVAL '55 days', '10f1bc81-448a-4a9e-a6b2-bc5b50c187fc'),
('29a3b2e9-5d65-4441-9588-42dea2bc372f', 'e27a984d-6548-41d0-bfcd-9eb1a7cad415', 'https://example.com/docs/sakina-aadhaar.pdf',  'approved', NULL,         NULL,          NULL,                                          'not_submitted',  'approved', NOW() - INTERVAL '50 days', '10f1bc81-448a-4a9e-a6b2-bc5b50c187fc'),
('ab9099a4-35a2-40ae-9af3-05535ec42e08', '24933b83-7577-40a9-a491-f0b2ea1fca65', 'https://example.com/docs/murtaza-aadhaar.pdf', 'approved', 'ITS-45678', '2029-03-15', 'https://example.com/docs/murtaza-ijamat.pdf', 'approved',       'approved', NOW() - INTERVAL '45 days', '10f1bc81-448a-4a9e-a6b2-bc5b50c187fc'),
('aefcfad8-efc8-4849-b3aa-7efe4458a885', 'beb79919-3f22-4af8-a3be-d01d43cf2fde', 'https://example.com/docs/zahra-aadhaar.pdf',   'pending',  NULL,         NULL,          NULL,                                          'not_submitted',  'pending',  NULL,                        NULL);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BOOKINGS                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO bookings (id, user_id, provider_id, status, total_amount, currency, notes, scheduled_at, completed_at, created_at) VALUES
('a28defe3-9bf0-4273-9247-6f57a5e5a5ab', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', '988c24c9-61b1-4d22-a280-1c4510435a10', 'completed', 2500.00, 'INR', 'Custom Rida order',                  NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '52 days'),
('3eabedcb-baa8-4dd4-88bd-64072bcfbe01', '956269f0-e5d7-4875-adad-d6c795a76d79', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'completed', 4800.00, 'INR', 'Catering for family gathering (6 pax)', NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '44 days'),
('451b4cf3-6123-4df7-b656-af7229d4beef', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'completed', 5000.00, 'INR', 'Bridal mehndi full package',          NOW() - INTERVAL '36 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '38 days'),
('b02b61c4-a3d7-4628-ace6-6fa2fd5166e6', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', '1d53434b-b881-49b9-ae27-0da702f06b90', 'completed', 2000.00, 'INR', 'iPhone screen replacement',           NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '28 days'),
('5304317f-af42-412f-b838-b3268e944239', '7e570ddf-8270-40a8-a369-b584ff5e9ff0', 'c0398710-8976-4334-a281-7efdae849217', 'completed', 1400.00, 'INR', 'Malpua + Mithai box for Eid',         NOW() - INTERVAL '24 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '25 days'),
('0e51f30d-c6a7-4e39-84b0-32ccd7c524a5', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'confirmed', 800.00,  'INR', 'Wedding catering inquiry',            NOW() + INTERVAL '5 days',  NULL,                        NOW() - INTERVAL '2 days'),
('ce177b4e-0837-48a3-9261-a7ab3aa2e4f9', '956269f0-e5d7-4875-adad-d6c795a76d79', '988c24c9-61b1-4d22-a280-1c4510435a10', 'pending',   15000.00,'INR', 'Bridal outfit — lehnga set',          NOW() + INTERVAL '30 days', NULL,                        NOW() - INTERVAL '1 day');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROMO BANNERS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO promo_banners (id, title, subtitle, gradient, emoji, cta, tag, link_url, is_active, display_order, starts_at, ends_at) VALUES
('dc713d96-0c0f-4195-817a-f08a1745d6d8', 'Eid Special Offers',      'Up to 30% off on bridal mehndi & tailoring',  'from-amber-500 to-orange-600',   '🌙', 'Explore Offers',  'EID SALE',    '/all-services?tag=eid',   true, 1, NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days'),
('28f49481-a0a0-4dc4-a720-9bdf1c11f735', 'New Provider? Join Free', 'List your services and reach the community',  'from-teal-500 to-emerald-600',   '🚀', 'Get Started',     'FREE',        '/provider-onboarding',    true, 2, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
('98ae4334-6c12-4ce8-ae34-0454cac5b68c', 'Top Rated This Week',     'Discover community favourites near you',       'from-purple-500 to-indigo-600',  '⭐', 'See Top Rated',   'TRENDING',    '/all-services?sort=rating', true, 3, NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SAVED LOCATIONS (for customer users)                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO saved_locations (id, user_id, title, label, latitude, longitude, city, area, full_address) VALUES
('5715bd6f-a416-4293-84c2-e2e3444ea7c8', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'home', 'Malabar Hill Home',     18.9598, 72.8040, 'Mumbai', 'Malabar Hill',    '12/B, Walkeshwar Rd, Malabar Hill, Mumbai 400006'),
('287d06ca-6f4c-469a-8b22-d3081c8eaee9', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'work', 'Office - Fort',         18.9338, 72.8353, 'Mumbai', 'Fort',            'Eros Building, DN Rd, Fort, Mumbai 400001'),
('b8db0672-f42d-47cc-80d4-af5974273ca3', '956269f0-e5d7-4875-adad-d6c795a76d79', 'home', 'Bhendi Bazaar Home',    18.9558, 72.8332, 'Mumbai', 'Bhendi Bazaar',   'Flat 3, Taheri Manzil, Bhendi Bazaar, Mumbai 400003'),
('f8cda88b-436d-46e2-b83c-fe0be037e5ed', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 'home', 'Koregaon Park Flat',    18.5362, 73.8930, 'Pune',   'Koregaon Park',   'B-wing, Lane 5, Koregaon Park, Pune 411001');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SAVED ITEMS (providers + products saved by customers)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO saved_items (id, user_id, item_id, item_type) VALUES
-- Ahmed saved 2 providers + 1 product
('14296c07-f26b-4776-913e-4de2e0c53cb8', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', '988c24c9-61b1-4d22-a280-1c4510435a10', 'provider'),
('d0e6e660-7c69-4ee1-bb5e-4bcf15ed6269', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', '405cacec-8774-49a9-b7d2-1e02ff01cf99', 'provider'),
('885f6e66-c2b6-42c5-ba5d-310011b7e948', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'b253d218-6c4a-47ea-8906-17f2747b6dba', 'product'),
-- Aisha saved 1 provider + 2 products
('a8e56e0c-20de-435d-a031-d750c40db9b4', '956269f0-e5d7-4875-adad-d6c795a76d79', 'f143262f-dc5c-4eed-8da0-365bf89897b9', 'provider'),
('2a45c2ab-8cbf-4db0-b264-accc79ac1b1e', '956269f0-e5d7-4875-adad-d6c795a76d79', 'bc594585-9445-48c0-8ef8-c2d6f7fd5646', 'product'),
('9b49bd26-df57-459a-8715-a10343dac043', '956269f0-e5d7-4875-adad-d6c795a76d79', 'dca02eec-acda-4acc-9165-e21098543881', 'product'),
-- Maryam saved 1 provider
('edcd465e-3638-4821-b6e0-7cc06c52c49f', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', '1d53434b-b881-49b9-ae27-0da702f06b90', 'provider');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONVERSATIONS + PARTICIPANTS + MESSAGES                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Conversation 1: Ahmed ↔ Fatima (direct, about provider)
INSERT INTO conversations (id, type, context_type, context_id, context_title, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('839fbc50-1223-4513-9496-f63cdc1110c1', 'direct', 'provider', '988c24c9-61b1-4d22-a280-1c4510435a10', 'Fatima''s Tailoring House', 'active', NOW() - INTERVAL '2 hours', 'Yes, I can have it ready by next Thursday inshAllah.', '9132b63e-f162-47e4-a9c3-49e03602f8ac');

INSERT INTO conversation_participants (id, conversation_id, user_id, role, unread_count, is_active) VALUES
('93829b43-922f-415a-a1e3-db63ef7ddc76', '839fbc50-1223-4513-9496-f63cdc1110c1', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'customer', 1, true),
('7914c120-c8dc-419f-be35-11287900f7f9', '839fbc50-1223-4513-9496-f63cdc1110c1', '9132b63e-f162-47e4-a9c3-49e03602f8ac', 'provider', 0, true);

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, status, created_at) VALUES
('0f844fef-1931-49ee-a56c-0941fbf24050', '839fbc50-1223-4513-9496-f63cdc1110c1', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'Salaam! I saw your Rida stitching service. Can you do a custom design with lace work?', 'text', 'read', NOW() - INTERVAL '3 hours'),
('ccf3a171-56dc-4907-ba6c-34ab6712303a', '839fbc50-1223-4513-9496-f63cdc1110c1', '9132b63e-f162-47e4-a9c3-49e03602f8ac', 'Wa alaikum assalam! Yes absolutely, lace work is one of our specialities. Would you like to visit the shop or share a reference photo?', 'text', 'read', NOW() - INTERVAL '2 hours 45 minutes'),
('310c0c00-3fa7-4104-9bf9-0e27dc96925e', '839fbc50-1223-4513-9496-f63cdc1110c1', 'bf3c4c06-4343-48bc-89fa-6a688fb5d27b', 'I''ll send a photo. How long does it usually take?', 'text', 'read', NOW() - INTERVAL '2 hours 30 minutes'),
('23e2fcb4-72d8-467d-894a-05e430b187ef', '839fbc50-1223-4513-9496-f63cdc1110c1', '9132b63e-f162-47e4-a9c3-49e03602f8ac', 'Yes, I can have it ready by next Thursday inshAllah.', 'text', 'sent', NOW() - INTERVAL '2 hours');

-- Conversation 2: Aisha ↔ Husain (enquiry about catering product)
INSERT INTO conversations (id, type, context_type, context_id, context_title, context_image_url, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('7c441fe7-ab42-40a7-874a-493b3ceddf2d', 'enquiry', 'product', 'c88a618e-fed4-457d-bb02-6576f512c4c3', 'Wedding Catering (per plate)', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', 'active', NOW() - INTERVAL '1 day', 'We can do a tasting session this weekend if you are free.', '366eb16f-508e-4ad7-b7c9-3acfe059a0ee');

INSERT INTO conversation_participants (id, conversation_id, user_id, role, unread_count, is_active) VALUES
('1825bc54-30be-445f-a835-14f2ceb81f9d', '7c441fe7-ab42-40a7-874a-493b3ceddf2d', '956269f0-e5d7-4875-adad-d6c795a76d79', 'customer', 1, true),
('5ab33edf-6e59-4ed3-a8b3-17fa18d0752b', '7c441fe7-ab42-40a7-874a-493b3ceddf2d', '366eb16f-508e-4ad7-b7c9-3acfe059a0ee', 'provider', 0, true);

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, status, created_at) VALUES
('766ecb15-474e-4c19-aef9-12766c006f61', '7c441fe7-ab42-40a7-874a-493b3ceddf2d', '956269f0-e5d7-4875-adad-d6c795a76d79', 'Salaam Husain bhai, I need catering for my sister''s walima. Around 150 guests. What would be the cost per plate?', 'enquiry', 'read', NOW() - INTERVAL '1 day 3 hours'),
('134c6c92-ec5b-427c-9fde-4fbf3ff350bf', '7c441fe7-ab42-40a7-874a-493b3ceddf2d', '366eb16f-508e-4ad7-b7c9-3acfe059a0ee', 'Wa alaikum assalam! For 150 plates with our full wedding menu, it would be 750/plate. This includes starters, 2 mains, rice, bread, dessert, and drinks.', 'text', 'read', NOW() - INTERVAL '1 day 2 hours'),
('db20a56e-dc81-4fe7-8eda-8bbb71710434', '7c441fe7-ab42-40a7-874a-493b3ceddf2d', '956269f0-e5d7-4875-adad-d6c795a76d79', 'That sounds good! Can we customize the menu? My sister wants both Bohri and Mughlai items.', 'text', 'read', NOW() - INTERVAL '1 day 1 hour'),
('a6f2f7b8-0cf3-4b58-9910-8be58ce21ea3', '7c441fe7-ab42-40a7-874a-493b3ceddf2d', '366eb16f-508e-4ad7-b7c9-3acfe059a0ee', 'We can do a tasting session this weekend if you are free.', 'text', 'sent', NOW() - INTERVAL '1 day');

-- Conversation 3: Maryam ↔ Murtaza (direct about provider)
INSERT INTO conversations (id, type, context_type, context_id, context_title, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('b92da22b-21df-406f-8a0b-3c3336d8393a', 'direct', 'provider', '1d53434b-b881-49b9-ae27-0da702f06b90', 'Murtaza Tech Repairs', 'active', NOW() - INTERVAL '12 hours', 'Your laptop is ready for pickup! Everything is working perfectly now.', '24933b83-7577-40a9-a491-f0b2ea1fca65');

INSERT INTO conversation_participants (id, conversation_id, user_id, role, unread_count, is_active) VALUES
('dd2467ac-778e-4db3-a93d-ffbc6c6fa611', 'b92da22b-21df-406f-8a0b-3c3336d8393a', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 'customer', 1, true),
('a748dbcf-ac61-4e63-8dde-29a6baa4b71a', 'b92da22b-21df-406f-8a0b-3c3336d8393a', '24933b83-7577-40a9-a491-f0b2ea1fca65', 'provider', 0, true);

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, status, created_at) VALUES
('03c72ba8-d605-4770-8a63-f881ffd0f9d5', 'b92da22b-21df-406f-8a0b-3c3336d8393a', 'ff50bde4-3825-47b8-9cab-cc97663f1c97', 'Hi, my laptop keeps overheating and shutting down. Can you take a look?', 'text', 'read', NOW() - INTERVAL '2 days'),
('c0e9ab30-ed26-42e9-97e0-11b7f8102383', 'b92da22b-21df-406f-8a0b-3c3336d8393a', '24933b83-7577-40a9-a491-f0b2ea1fca65', 'Sure, please bring it in tomorrow. Sounds like it might need a thermal paste replacement and fan cleaning. Usually takes 2-3 hours.', 'text', 'read', NOW() - INTERVAL '1 day 20 hours'),
('680ac07a-2a93-4d62-bc83-5dc0d9441fa5', 'b92da22b-21df-406f-8a0b-3c3336d8393a', '24933b83-7577-40a9-a491-f0b2ea1fca65', 'Your laptop is ready for pickup! Everything is working perfectly now.', 'text', 'sent', NOW() - INTERVAL '12 hours');

COMMIT;
