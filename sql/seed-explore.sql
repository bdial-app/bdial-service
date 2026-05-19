-- ============================================================================
-- Tijarah Connect — Explore Feature Seed Data
-- Run AFTER seed.sql (depends on existing providers)
-- Adds: sponsored_listings, provider_badges, provider_offers, promo_banners
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CLEAN EXPLORE TABLES                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DELETE FROM ad_events;
DELETE FROM sponsored_listings;
DELETE FROM provider_badges;
DELETE FROM provider_offers;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SPONSORED LISTINGS — CPC ads for explore carousel                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Using provider UUIDs from seed.sql: 988c24c9-61b1-4d22-a280-1c4510435a10..005

INSERT INTO sponsored_listings (id, provider_id, type, budget_amount, spent_amount, cost_per_click, impressions, clicks, target_category_ids, target_cities, target_radius, starts_at, ends_at, is_active) VALUES
-- Fatima's Tailoring — carousel ad, targeting Mumbai, ₹500 budget
('9974d75b-3338-44fe-a179-0134676b1b69',
 '988c24c9-61b1-4d22-a280-1c4510435a10',
 'carousel', 500.00, 25.00, 5.00, 120, 5,
 ARRAY['81f76d1c-2dbc-4134-830f-f46e8026695f']::uuid[],
 ARRAY['Mumbai', 'Pune']::text[],
 30,
 NOW() - INTERVAL '5 days',
 NOW() + INTERVAL '25 days',
 true),

-- Husain's Kitchen — carousel ad, targeting Mumbai, ₹1000 budget
('221c4e00-3f99-41ee-baf2-7f802dc5fd3d',
 '405cacec-8774-49a9-b7d2-1e02ff01cf99',
 'carousel', 1000.00, 80.00, 8.00, 250, 10,
 ARRAY['a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f']::uuid[],
 ARRAY['Mumbai']::text[],
 25,
 NOW() - INTERVAL '3 days',
 NOW() + INTERVAL '27 days',
 true),

-- Sakina Mehndi — inline ad, wide targeting
('baa1c6f1-404b-4eaf-962a-01dec28753f8',
 'f143262f-dc5c-4eed-8da0-365bf89897b9',
 'carousel', 300.00, 15.00, 3.00, 80, 5,
 ARRAY['81f631d4-a392-41a7-9777-a4774c66e0a8', '7d154385-52fb-443b-9954-6eb400257ad1']::uuid[],
 NULL,
 50,
 NOW() - INTERVAL '1 day',
 NOW() + INTERVAL '29 days',
 true),

-- Zahra's Sweets — top_result ad, Surat focused
('b35331ce-af2e-49dd-87e3-55b26210b784',
 'c0398710-8976-4334-a281-7efdae849217',
 'carousel', 200.00, 0.00, 4.00, 0, 0,
 ARRAY['f4188f3f-8a14-4e62-a95b-4715c333e861']::uuid[],
 ARRAY['Surat', 'Mumbai', 'Pune']::text[],
 NULL,
 NOW(),
 NOW() + INTERVAL '30 days',
 true),

-- Murtaza Tech — carousel, Pune focused
('9fb932d4-f039-4722-96ff-82e389e3995a',
 '1d53434b-b881-49b9-ae27-0da702f06b90',
 'carousel', 750.00, 42.00, 6.00, 150, 7,
 ARRAY['5fb8d16c-2720-497d-b2eb-d6899be578c7', 'eb2263dd-87c5-421e-ac24-a3c5c754108f']::uuid[],
 ARRAY['Pune']::text[],
 20,
 NOW() - INTERVAL '7 days',
 NOW() + INTERVAL '23 days',
 true);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER BADGES — earned + paid badges                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_badges (id, provider_id, type, source, expires_at, is_active) VALUES
-- Fatima: top_rated (earned) + gold_seller (paid)
('b8e3c71f-6bf0-4d62-b310-57ca7d411fab',
 '988c24c9-61b1-4d22-a280-1c4510435a10',
 'top_rated', 'earned', NULL, true),
('cae8c077-3779-45b3-96a1-da2c9cfbba43',
 '988c24c9-61b1-4d22-a280-1c4510435a10',
 'gold_seller', 'paid', NOW() + INTERVAL '90 days', true),

-- Husain: trusted (earned)
('d283eb3a-5fbd-438e-89cf-158de6e96d45',
 '405cacec-8774-49a9-b7d2-1e02ff01cf99',
 'trusted', 'earned', NULL, true),

-- Sakina: rising_star (earned)
('366c5acd-aeaf-4905-9c8a-c0bb635b4c41',
 'f143262f-dc5c-4eed-8da0-365bf89897b9',
 'rising_star', 'earned', NULL, true),

-- Murtaza: express_service (paid)
('2dd301c8-a91a-4a5c-b623-c4dd26fb984f',
 '1d53434b-b881-49b9-ae27-0da702f06b90',
 'express_service', 'paid', NOW() + INTERVAL '60 days', true),

-- Zahra: top_rated (earned) + trusted (earned)
('153d3a3f-56bc-49cb-9121-5785d9977338',
 'c0398710-8976-4334-a281-7efdae849217',
 'top_rated', 'earned', NULL, true),
('ad689cf8-8759-4153-b778-5728f2655b19',
 'c0398710-8976-4334-a281-7efdae849217',
 'trusted', 'earned', NULL, true);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER OFFERS — active deals and discounts                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_offers (id, provider_id, title, description, discount_type, discount_value, min_order_amount, max_discount, starts_at, ends_at, is_active, usage_count, usage_limit) VALUES
-- Fatima: 20% off bridal
('50fe3281-7812-4170-967a-34d0c643e653',
 '988c24c9-61b1-4d22-a280-1c4510435a10',
 '20% Off Bridal Collection',
 'Get 20% off on all bridal outfit packages this wedding season! Limited slots available.',
 'percentage', 20.00, 5000.00, 3000.00,
 NOW() - INTERVAL '2 days',
 NOW() + INTERVAL '28 days',
 true, 3, 50),

-- Husain: ₹100 off tiffin
('8ed5f036-44f7-48cd-8aeb-34f967124890',
 '405cacec-8774-49a9-b7d2-1e02ff01cf99',
 '₹100 Off Monthly Tiffin',
 'Subscribe to monthly tiffin plan and get ₹100 off your first month.',
 'flat', 100.00, 500.00, NULL,
 NOW() - INTERVAL '5 days',
 NOW() + INTERVAL '25 days',
 true, 8, 100),

-- Sakina: 15% off party mehndi
('5ccedc77-3429-479c-acda-4ccb01f35efe',
 'f143262f-dc5c-4eed-8da0-365bf89897b9',
 '15% Off Party Mehndi',
 'Book party mehndi for 3+ people and get 15% discount! Perfect for Eid celebrations.',
 'percentage', 15.00, 1500.00, 500.00,
 NOW(),
 NOW() + INTERVAL '14 days',
 true, 0, 30),

-- Murtaza: ₹200 off screen repair
('14b062ae-88c8-4ad1-aee1-f220fd547512',
 '1d53434b-b881-49b9-ae27-0da702f06b90',
 '₹200 Off Screen Repair',
 'Mobile screen replacement at discounted price. Original screens only.',
 'flat', 200.00, 1000.00, NULL,
 NOW() - INTERVAL '1 day',
 NOW() + INTERVAL '29 days',
 true, 5, NULL),

-- Zahra: 10% off sweet boxes
('32b55d35-e676-46f1-84c6-9290764b5018',
 'c0398710-8976-4334-a281-7efdae849217',
 '10% Off Sweet Boxes',
 'Order any 2 sweet boxes and get 10% off. Great for gifting!',
 'percentage', 10.00, 700.00, 200.00,
 NOW() - INTERVAL '3 days',
 NOW() + INTERVAL '27 days',
 true, 12, 200),

-- Husain: 25% off weekend catering
('0d2329d9-fa09-4a46-b673-89669b02a56d',
 '405cacec-8774-49a9-b7d2-1e02ff01cf99',
 '25% Off Weekend Catering',
 'Book weekend catering for 50+ guests and get 25% off. Limited weekends available.',
 'percentage', 25.00, 10000.00, 5000.00,
 NOW(),
 NOW() + INTERVAL '21 days',
 true, 1, 10);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROMO BANNERS — interstitial banner ads                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Update existing or insert fresh

DELETE FROM promo_banners;

INSERT INTO promo_banners (id, title, subtitle, image_url, gradient, emoji, cta, tag, link_url, is_active, display_order, starts_at, ends_at) VALUES
('f3d2273a-3740-4227-a10f-4d0c5b86c0ef',
 'Wedding Season Sale',
 'Up to 30% off on bridal services',
 NULL,
 'linear-gradient(135deg, #f59e0b, #dc2626)',
 '💒',
 'Explore Deals',
 'SEASON SPECIAL',
 '/search?q=wedding',
 true, 1,
 NOW() - INTERVAL '5 days',
 NOW() + INTERVAL '25 days'),

('bf5cb443-292a-48f3-b713-b4c7ebb7344d',
 'New on Tijarah?',
 'Get ₹200 off your first booking',
 NULL,
 'linear-gradient(135deg, #7c3aed, #2563eb)',
 '🎉',
 'Claim Now',
 'NEW USER',
 '/search',
 true, 2,
 NOW(),
 NOW() + INTERVAL '60 days'),

('ecc2c55e-986d-4842-b114-3591cab5f7c4',
 'Invite Your Community',
 'Help friends discover trusted local businesses near them',
 NULL,
 'linear-gradient(135deg, #059669, #0d9488)',
 '🤝',
 'Invite Now',
 'COMMUNITY',
 '/invite',
 true, 3,
 NOW(),
 NOW() + INTERVAL '90 days');

COMMIT;
