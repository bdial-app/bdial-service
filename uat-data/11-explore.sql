-- ============================================================================
-- Tijarah Connect — UAT Seed: 11 EXPLORE
-- 6 banners, 8 sponsored listings, 15 badges, 10 offers
-- Schema: promo_banners(id, title, subtitle, image_url, gradient, emoji, cta,
--         tag, link_url, is_active, display_order, starts_at, ends_at)
--         sponsored_listings(id, provider_id, type, budget_amount, spent_amount,
--         cost_per_click, impressions, clicks, target_category_ids, target_cities,
--         target_radius, starts_at, ends_at, is_active, approval_status,
--         admin_notes, reviewed_by, reviewed_at)
--         provider_badges(id, provider_id, type, source, expires_at, is_active)
--         provider_offers(id, provider_id, title, description, discount_type,
--         discount_value, min_order_amount, max_discount, starts_at, ends_at,
--         is_active, usage_count, usage_limit, approval_status, admin_notes,
--         reviewed_by, reviewed_at)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROMO BANNERS (6)                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO promo_banners (id, title, subtitle, image_url, gradient, emoji, cta, tag, link_url, is_active, display_order, starts_at, ends_at) VALUES
('a1e00001-7777-4f7a-8b9c-000000000001', 'Eid Special Offers',           'Up to 30% off on selected services',   'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1200', 'from-green-500 to-emerald-700',  '🌙', 'Explore Deals',    'eid',      '/all-services?tag=eid',            true,  1, NOW()-INTERVAL '5 days', NOW()+INTERVAL '25 days'),
('a1e00002-7777-4f7a-8b9c-000000000002', 'New Providers Near You',       'Discover talented service providers',  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',  'from-blue-500 to-indigo-700',    '✨', 'Browse Now',       'new',      '/search?sort=newest',              true,  2, NOW()-INTERVAL '10 days', NOW()+INTERVAL '20 days'),
('a1e00003-7777-4f7a-8b9c-000000000003', 'Bridal Season',               'Book your wedding services early',     'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200', 'from-pink-500 to-rose-700',      '💍', 'Plan Your Wedding','bridal',   '/search?q=bridal',                 true,  3, NOW()-INTERVAL '15 days', NOW()+INTERVAL '45 days'),
('a1e00004-7777-4f7a-8b9c-000000000004', 'Home Services Week',          'Get your home ready this season',      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200',  'from-orange-500 to-amber-700',   '🏠', 'Book Now',         'home',     '/all-services?category=home-services', true, 4, NOW()-INTERVAL '3 days', NOW()+INTERVAL '10 days'),
('a1e00005-7777-4f7a-8b9c-000000000005', 'Refer & Earn',                'Invite friends, earn rewards',         NULL,                                                                  'from-purple-500 to-violet-700',  '🎁', 'Invite Now',       'referral', '/invite',                          true,  5, NULL, NULL),
('a1e00006-7777-4f7a-8b9c-000000000006', 'Ramadan Deals (Expired)',     'Special offers during Ramadan',        'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1200', 'from-teal-500 to-cyan-700',      '🌙', 'View Offers',      'ramadan',  '/all-services?tag=ramadan',        false, 6, NOW()-INTERVAL '60 days', NOW()-INTERVAL '30 days');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SPONSORED LISTINGS (8)                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO sponsored_listings (id, provider_id, type, budget_amount, spent_amount, cost_per_click, impressions, clicks, target_category_ids, target_cities, target_radius, starts_at, ends_at, is_active, approval_status, admin_notes, reviewed_by, reviewed_at) VALUES
('a1e00001-8888-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'carousel',   5000.00,  1250.00,  5.00, 3200, 250, ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111101']::uuid[], ARRAY['Mumbai'],     25, NOW()-INTERVAL '20 days', NOW()+INTERVAL '40 days', true,  'approved', NULL,                              '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '21 days'),
('a1e00002-8888-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'top_result', 8000.00,  3200.00,  8.00, 5100, 400, ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111102']::uuid[], ARRAY['Mumbai'],     30, NOW()-INTERVAL '30 days', NOW()+INTERVAL '30 days', true,  'approved', 'Top performer',                   '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '31 days'),
('a1e00003-8888-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'carousel',   6000.00,  900.00,   6.00, 2100, 150, ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111108']::uuid[], ARRAY['Mumbai'],     20, NOW()-INTERVAL '15 days', NOW()+INTERVAL '45 days', true,  'approved', NULL,                              'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '16 days'),
('a1e00004-8888-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'inline',     3000.00,  750.00,   5.00, 1800, 150, ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111102']::uuid[], ARRAY['Pune'],       15, NOW()-INTERVAL '10 days', NOW()+INTERVAL '50 days', true,  'approved', NULL,                              '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '11 days'),
('a1e00005-8888-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'carousel',   4000.00,  600.00,   4.00, 1500, 150, ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111105']::uuid[], ARRAY['Surat'],      20, NOW()-INTERVAL '8 days',  NOW()+INTERVAL '52 days', true,  'approved', NULL,                              'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '9 days'),
('a1e00006-8888-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'top_result', 10000.00, 4500.00,  10.00, 6200, 450, ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111108']::uuid[], ARRAY['Bangalore'],  30, NOW()-INTERVAL '25 days', NOW()+INTERVAL '35 days', true,  'approved', NULL,                              '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '26 days'),
('a1e00007-8888-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'inline',     2000.00,  200.00,   4.00, 800,  50,  ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111101']::uuid[], ARRAY['Ahmedabad'],  15, NOW()-INTERVAL '5 days',  NOW()+INTERVAL '55 days', true,  'approved', NULL,                              'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '6 days'),
('a1e00008-8888-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'carousel',   3000.00,  0.00,     5.00, 0,    0,   ARRAY['b1a2c3d4-e5f6-4a7b-8c9d-111111111101']::uuid[], ARRAY['Delhi'],      20, NOW()+INTERVAL '5 days',  NOW()+INTERVAL '65 days', false, 'pending_approval', 'Awaiting review', NULL, NULL);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER BADGES (15)                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_badges (id, provider_id, type, source, expires_at, is_active) VALUES
('a1e00001-9999-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'gold_seller',    'earned',  NOW()+INTERVAL '180 days', true),
('a1e00002-9999-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'trusted',        'earned',  NULL,                      true),
('a1e00003-9999-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'top_rated',      'earned',  NOW()+INTERVAL '90 days',  true),
('a1e00004-9999-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'trusted',        'earned',  NULL,                      true),
('a1e00005-9999-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'express_service', 'paid',   NOW()+INTERVAL '60 days',  true),
('a1e00006-9999-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'top_rated',      'earned',  NOW()+INTERVAL '120 days', true),
('a1e00007-9999-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'trusted',        'earned',  NULL,                      true),
('a1e00008-9999-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'gold_seller',    'earned',  NOW()+INTERVAL '150 days', true),
('a1e00009-9999-4f7a-8b9c-000000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'rising_star',    'earned',  NOW()+INTERVAL '30 days',  true),
('a1e00010-9999-4f7a-8b9c-000000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'top_rated',      'earned',  NOW()+INTERVAL '90 days',  true),
('a1e00011-9999-4f7a-8b9c-000000000011', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'gold_seller',    'paid',    NOW()+INTERVAL '60 days',  true),
('a1e00012-9999-4f7a-8b9c-000000000012', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'rising_star',    'earned',  NOW()+INTERVAL '45 days',  true),
('a1e00013-9999-4f7a-8b9c-000000000013', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'express_service', 'earned', NULL,                      true),
('a1e00014-9999-4f7a-8b9c-000000000014', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'trusted',        'earned',  NULL,                      true),
('a1e00015-9999-4f7a-8b9c-000000000015', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'rising_star',    'earned',  NOW()+INTERVAL '30 days',  true);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER OFFERS (10)                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_offers (id, provider_id, title, description, discount_type, discount_value, min_order_amount, max_discount, starts_at, ends_at, is_active, usage_count, usage_limit, approval_status, admin_notes, reviewed_by, reviewed_at) VALUES
('a1e00001-aaaa-4f7a-8b9c-100000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Eid Special 20% Off',        'Get 20% off on all custom stitching during Eid season',       'percentage', 20.00,  1000.00, 500.00,  NOW()-INTERVAL '5 days',  NOW()+INTERVAL '25 days', true,  12, 50, 'approved', NULL, '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '6 days'),
('a1e00002-aaaa-4f7a-8b9c-100000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', '₹100 Off First Tiffin',      'Flat ₹100 off your first tiffin order',                       'flat',       100.00, 150.00,  NULL,    NOW()-INTERVAL '10 days', NOW()+INTERVAL '20 days', true,  8,  100,'approved', NULL, '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '11 days'),
('a1e00003-aaaa-4f7a-8b9c-100000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', '10% Off Party Mehndi',       'Book mehndi for 5+ guests and get 10% discount',             'percentage', 10.00,  2000.00, 1000.00, NOW()-INTERVAL '8 days',  NOW()+INTERVAL '22 days', true,  3,  20, 'approved', NULL, 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '9 days'),
('a1e00004-aaaa-4f7a-8b9c-100000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'Birthday Cake ₹200 Off',     'Flat ₹200 off any custom cake order above ₹1,500',            'flat',       200.00, 1500.00, NULL,    NOW()-INTERVAL '3 days',  NOW()+INTERVAL '27 days', true,  5,  30, 'approved', NULL, '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '4 days'),
('a1e00005-aaaa-4f7a-8b9c-100000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', '15% Off Wedding Album',      'Premium album with 15% discount for bookings this month',     'percentage', 15.00,  15000.00, 5000.00, NOW()-INTERVAL '12 days', NOW()+INTERVAL '18 days', true,  2,  10, 'approved', NULL, 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '13 days'),
('a1e00006-aaaa-4f7a-8b9c-100000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'Walima Special 25% Off',     'Get 25% off walima catering for 50+ guests',                  'percentage', 25.00,  20000.00, 10000.00, NOW()-INTERVAL '7 days', NOW()+INTERVAL '23 days', true, 1,  5,  'approved', NULL, '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '8 days'),
('a1e00007-aaaa-4f7a-8b9c-100000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'Sweet Box ₹50 Off',          'Flat ₹50 off on 1kg+ sweet box orders',                       'flat',       50.00,  500.00,  NULL,    NOW()-INTERVAL '4 days',  NOW()+INTERVAL '26 days', true,  15, NULL,'approved', NULL, 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '5 days'),
('a1e00008-aaaa-4f7a-8b9c-100000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', '₹500 Off Pre-Wedding Shoot', 'Flat ₹500 off pre-wedding photography package',               'flat',       500.00, 10000.00, NULL,   NOW()-INTERVAL '6 days',  NOW()+INTERVAL '24 days', true,  0,  15, 'approved', NULL, '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '7 days'),
('a1e00009-aaaa-4f7a-8b9c-100000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'New Collection 10% Off',     '10% off on entire new Eid collection',                        'percentage', 10.00,  2000.00, 1000.00, NOW()+INTERVAL '3 days',  NOW()+INTERVAL '33 days', false, 0,  NULL,'pending_approval', 'Awaiting approval', NULL, NULL),
('a1e00010-aaaa-4f7a-8b9c-100000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'AC Service ₹300 Off',        'Flat ₹300 off on full AC servicing',                          'flat',       300.00, 1500.00, NULL,    NOW()-INTERVAL '60 days', NOW()-INTERVAL '30 days', false, 25, 25, 'approved', 'Campaign completed', '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '61 days');

COMMIT;
