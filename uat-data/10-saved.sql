-- ============================================================================
-- Tijarah Connect — UAT Seed: 10 SAVED
-- 25 saved items + 10 saved locations
-- Schema: saved_items(id, user_id, item_id, item_type)
--         saved_locations(id, user_id, title, label, latitude, longitude,
--         city, area, full_address, place_id)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SAVED ITEMS (25)                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO saved_items (id, user_id, item_id, item_type) VALUES
-- Ahmed saves
('a1500001-5555-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'provider'),
('a1500002-5555-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'provider'),
('a1500003-5555-4f7a-8b9c-000000000003', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'e1a00014-aaaa-4f7a-8b9c-000000000014', 'product'),
('a1500004-5555-4f7a-8b9c-000000000004', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'provider'),
('a1500005-5555-4f7a-8b9c-000000000005', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'e1a00001-aaaa-4f7a-8b9c-000000000001', 'product'),

-- Aisha saves
('a1500006-5555-4f7a-8b9c-000000000006', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'provider'),
('a1500007-5555-4f7a-8b9c-000000000007', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'provider'),
('a1500008-5555-4f7a-8b9c-000000000008', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'provider'),
('a1500009-5555-4f7a-8b9c-000000000009', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'e1a00011-aaaa-4f7a-8b9c-000000000011', 'product'),

-- Maryam saves
('a1500010-5555-4f7a-8b9c-000000000010', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'provider'),
('a1500011-5555-4f7a-8b9c-000000000011', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'provider'),
('a1500012-5555-4f7a-8b9c-000000000012', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'e1a00007-aaaa-4f7a-8b9c-000000000007', 'product'),

-- Yusuf saves
('a1500013-5555-4f7a-8b9c-000000000013', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'provider'),
('a1500014-5555-4f7a-8b9c-000000000014', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'provider'),

-- Ruqaiya saves
('a1500015-5555-4f7a-8b9c-000000000015', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'provider'),
('a1500016-5555-4f7a-8b9c-000000000016', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'provider'),
('a1500017-5555-4f7a-8b9c-000000000017', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'e1a00015-aaaa-4f7a-8b9c-000000000015', 'product'),

-- Abbas saves
('a1500018-5555-4f7a-8b9c-000000000018', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'provider'),
('a1500019-5555-4f7a-8b9c-000000000019', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'provider'),

-- Taufiq saves
('a1500020-5555-4f7a-8b9c-000000000020', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34', 'provider'),
('a1500021-5555-4f7a-8b9c-000000000021', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'provider'),

-- Zainab Customer saves
('a1500022-5555-4f7a-8b9c-000000000022', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'provider'),
('a1500023-5555-4f7a-8b9c-000000000023', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'provider'),

-- Hussain Limdi saves
('a1500024-5555-4f7a-8b9c-000000000024', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'provider'),
('a1500025-5555-4f7a-8b9c-000000000025', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'provider');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SAVED LOCATIONS (10)                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO saved_locations (id, user_id, title, label, latitude, longitude, city, area, full_address, place_id) VALUES
('b1100001-6666-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'home',  'Malabar Hill, Mumbai',       18.9598, 72.8040, 'Mumbai',     'Malabar Hill',    '12, Ridge Road, Malabar Hill, Mumbai 400006',           'ChIJN1t_tDeuEmsRUsoyG83frY4'),
('b1100002-6666-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'work',  'Bhendi Bazaar, Mumbai',      18.9560, 72.8340, 'Mumbai',     'Bhendi Bazaar',   'Saify Jubilee St, Bhendi Bazaar, Mumbai 400003',        'ChIJKxDbe_G5YjkRk-bvmQgqwu8'),
('b1100003-6666-4f7a-8b9c-000000000003', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'home',  'Bhendi Bazaar, Mumbai',      18.9558, 72.8332, 'Mumbai',     'Bhendi Bazaar',   '5, Bhendi Bazaar, Mumbai 400003',                       'ChIJKxDbe_G5YjkRk-bvmQgqwu9'),
('b1100004-6666-4f7a-8b9c-000000000004', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'home',  'Koregaon Park, Pune',        18.5362, 73.8930, 'Pune',       'Koregaon Park',   '8, Lane 5, Koregaon Park, Pune 411001',                 'ChIJb5n0HKDOB9sRVN_2ky0pfjk'),
('b1100005-6666-4f7a-8b9c-000000000005', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'home',  'Athwa Lines, Surat',         21.1790, 72.8070, 'Surat',      'Athwa Lines',     '3, Athwa Lines Main Road, Surat 395001',                'ChIJrTLr-1u5YzkRoEBB6Y0lmJc'),
('b1100006-6666-4f7a-8b9c-000000000006', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'home',  'Indiranagar, Bangalore',     12.9716, 77.6412, 'Bangalore',  'Indiranagar',     '100 Feet Road, Indiranagar, Bangalore 560038',          'ChIJYzBADIUUrjsR3Bp_FnKA9Eg'),
('b1100007-6666-4f7a-8b9c-000000000007', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'home',  'Nizamuddin, Delhi',          28.5922, 77.2441, 'Delhi',      'Nizamuddin',      '15, Nizamuddin East, New Delhi 110013',                 'ChIJ2WrMN9znDDkRa5s6lROGJk0'),
('b1100008-6666-4f7a-8b9c-000000000008', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'home',  'Tolichowki, Hyderabad',      17.3950, 78.4126, 'Hyderabad',  'Tolichowki',      '7-1-306, Tolichowki Main Road, Hyderabad 500008',      'ChIJOwg_06VOyzsRhN4BTa_1dHo'),
('b1100009-6666-4f7a-8b9c-000000000009', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'home',  'Manek Chowk, Ahmedabad',     23.0225, 72.5714, 'Ahmedabad',  'Manek Chowk',     'Manek Chowk, Old City, Ahmedabad 380001',               'ChIJx8pXwYCHXjkRLi15JcMD_qA'),
('b1100010-6666-4f7a-8b9c-000000000010', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'home',  'Rajwada, Indore',            22.7196, 75.8577, 'Indore',     'Rajwada',         'Rajwada Palace Area, Indore 452002',                    'ChIJYV0pS_DDYjkR5W_YOKXfkKo');

COMMIT;
