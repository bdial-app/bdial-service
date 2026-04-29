-- ============================================================================
-- Tijarah Connect — UAT Seed: 14 ANALYTICS
-- 20 search logs, 15 analytics events, 10 leads, 8 ad events, 6 invites
-- Schema: search_logs(id, query, user_id, result_count, lat, lng, city)
--         provider_analytics_events(id, provider_id, user_id, session_id,
--         event_type, entity_id, metadata, duration, source)
--         provider_leads(id, provider_id, user_id, session_id, visitor_key,
--         tier, score, source, search_query, products_viewed,
--         actions_performed, total_duration, first_seen_at, last_seen_at,
--         is_unlocked)
--         ad_events(id, event_type, entity_type, entity_id, user_id, metadata)
--         app_invites(id, inviter_id, invite_method)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SEARCH LOGS (20)                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO search_logs (id, query, user_id, result_count, lat, lng, city) VALUES
('51a00001-1111-4f7a-8b9c-000000000001', 'tailor',                 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 8,  18.9560, 72.8340, 'Mumbai'),
('51a00002-1111-4f7a-8b9c-000000000002', 'biryani catering',       'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 5,  18.9560, 72.8340, 'Mumbai'),
('51a00003-1111-4f7a-8b9c-000000000003', 'bridal mehndi',          'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 4,  18.9558, 72.8332, 'Mumbai'),
('51a00004-1111-4f7a-8b9c-000000000004', 'beauty salon ladies',    'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 6,  18.9558, 72.8332, 'Mumbai'),
('51a00005-1111-4f7a-8b9c-000000000005', 'wedding photographer',   'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 3,  18.5362, 73.8930, 'Pune'),
('51a00006-1111-4f7a-8b9c-000000000006', 'plumber emergency',      'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 2,  18.9560, 72.8340, 'Mumbai'),
('51a00007-1111-4f7a-8b9c-000000000007', 'AC repair',              'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 3,  21.1790, 72.8070, 'Surat'),
('51a00008-1111-4f7a-8b9c-000000000008', 'eggless cake',           'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 2,  12.9716, 77.6412, 'Bangalore'),
('51a00009-1111-4f7a-8b9c-000000000009', 'quran classes',          'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 4,  28.5922, 77.2441, 'Delhi'),
('51a00010-1111-4f7a-8b9c-000000000010', 'darzi',                  NULL,                                    7,  18.9560, 72.8340, 'Mumbai'),
('51a00011-1111-4f7a-8b9c-000000000011', 'halwai',                 NULL,                                    5,  21.1865, 72.7910, 'Surat'),
('51a00012-1111-4f7a-8b9c-000000000012', 'wedding decoration',     'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 3,  28.5922, 77.2441, 'Delhi'),
('51a00013-1111-4f7a-8b9c-000000000013', 'mobile repair',          'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 4,  18.9630, 72.8190, 'Mumbai'),
('51a00014-1111-4f7a-8b9c-000000000014', 'caterer',                'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 6,  17.3950, 78.4126, 'Hyderabad'),
('51a00015-1111-4f7a-8b9c-000000000015', 'boutique abaya',         'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 2,  23.0225, 72.5714, 'Ahmedabad'),
('51a00016-1111-4f7a-8b9c-000000000016', 'home cleaning',          'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 1,  22.7196, 75.8577, 'Indore'),
('51a00017-1111-4f7a-8b9c-000000000017', 'rida stitching',         NULL,                                    3,  18.9565, 72.8335, 'Mumbai'),
('51a00018-1111-4f7a-8b9c-000000000018', 'tiffin service',         'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4,  18.9560, 72.8340, 'Mumbai'),
('51a00019-1111-4f7a-8b9c-000000000019', 'electrician',            NULL,                                    5,  21.1790, 72.8070, 'Surat'),
('51a00020-1111-4f7a-8b9c-000000000020', 'birthday cake custom',   'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 2,  21.2089, 72.8570, 'Surat');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER ANALYTICS EVENTS (15)                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_analytics_events (id, provider_id, user_id, session_id, event_type, entity_id, metadata, duration, source) VALUES
('91a00001-2222-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'sess-001-abc', 'profile_view',     NULL, NULL, 45, 'search'),
('91a00002-2222-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'sess-001-abc', 'product_view',     'e1a00001-aaaa-4f7a-8b9c-000000000001', '{"productName": "Custom Rida Stitching"}', 20, 'search'),
('91a00003-2222-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'sess-001-abc', 'chat_initiated',   NULL, NULL, NULL, 'search'),
('91a00004-2222-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'sess-002-def', 'profile_view',     NULL, NULL, 60, 'home_feed'),
('91a00005-2222-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'sess-002-def', 'call_clicked',     NULL, NULL, NULL, 'home_feed'),
('91a00006-2222-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-003-ghi', 'profile_view',     NULL, NULL, 90, 'explore'),
('91a00007-2222-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-003-ghi', 'photo_viewed',     'f1a00031-bbbb-4f7a-8b9c-000000000031', NULL, 15, 'explore'),
('91a00008-2222-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-003-ghi', 'share_clicked',    NULL, '{"method": "whatsapp"}', NULL, 'explore'),
('91a00009-2222-4f7a-8b9c-000000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-004-jkl', 'profile_view',     NULL, NULL, 30, 'search'),
('91a00010-2222-4f7a-8b9c-000000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-004-jkl', 'saved',            NULL, NULL, NULL, 'search'),
('91a00011-2222-4f7a-8b9c-000000000011', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'sess-005-mno', 'profile_view',     NULL, NULL, 55, 'search'),
('91a00012-2222-4f7a-8b9c-000000000012', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'sess-005-mno', 'direction_clicked', NULL, NULL, NULL, 'search'),
('91a00013-2222-4f7a-8b9c-000000000013', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'sess-006-pqr', 'profile_view',     NULL, NULL, 40, 'explore'),
('91a00014-2222-4f7a-8b9c-000000000014', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'sess-006-pqr', 'offer_viewed',     'a1e00009-aaaa-4f7a-8b9c-100000000009', NULL, 10, 'explore'),
('91a00015-2222-4f7a-8b9c-000000000015', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'sess-007-stu', 'search_click',     NULL, '{"query": "halwai", "position": 2}', NULL, 'search');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER LEADS (10)                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_leads (id, provider_id, user_id, session_id, visitor_key, tier, score, source, search_query, products_viewed, actions_performed, total_duration, first_seen_at, last_seen_at, is_unlocked) VALUES
('11a00001-3333-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'sess-001-abc', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'hot',  85, 'search', 'tailor',                ARRAY['e1a00001-aaaa-4f7a-8b9c-000000000001']::uuid[], ARRAY['profile_view','product_view','chat_initiated'], 120, NOW()-INTERVAL '60 days', NOW()-INTERVAL '2 hours', true),
('11a00002-3333-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'sess-002-def', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'hot',  90, 'home_feed', NULL,                 ARRAY['e1a00006-aaaa-4f7a-8b9c-000000000006']::uuid[], ARRAY['profile_view','call_clicked'],                  80,  NOW()-INTERVAL '45 days', NOW()-INTERVAL '5 hours', true),
('11a00003-3333-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-003-ghi', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'warm', 65, 'explore',  'wedding photographer', ARRAY[]::uuid[],                                       ARRAY['profile_view','photo_viewed','share_clicked'],  105, NOW()-INTERVAL '30 days', NOW()-INTERVAL '8 hours', false),
('11a00004-3333-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'sess-004-jkl', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e:p17', 'warm', 55, 'search', 'caterer pune',        ARRAY[]::uuid[],                                       ARRAY['profile_view','saved'],                         45,  NOW()-INTERVAL '20 days', NOW()-INTERVAL '6 hours', false),
('11a00005-3333-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'sess-005-mno', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'warm', 60, 'search',  'wedding photographer', ARRAY[]::uuid[],                                       ARRAY['profile_view','direction_clicked'],              55,  NOW()-INTERVAL '15 days', NOW()-INTERVAL '1 day',   false),
('11a00006-3333-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'sess-006-pqr', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'soft', 35, 'explore',  'boutique abaya',     ARRAY[]::uuid[],                                       ARRAY['profile_view','offer_viewed'],                  50,  NOW()-INTERVAL '10 days', NOW()-INTERVAL '2 days',  false),
('11a00007-3333-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'sess-007-stu', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'soft', 30, 'search',  'halwai',              ARRAY[]::uuid[],                                       ARRAY['search_click'],                                 15,  NOW()-INTERVAL '5 days',  NOW()-INTERVAL '5 days',  false),
('11a00008-3333-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', NULL,                                    'sess-008-vwx', 'anon:sess-008-vwx',                               'cold', 10, 'search',  'birthday cake',      ARRAY[]::uuid[],                                       ARRAY['search_appearance'],                            5,   NOW()-INTERVAL '3 days',  NOW()-INTERVAL '3 days',  false),
('11a00009-3333-4f7a-8b9c-000000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'sess-009-yza', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'hot',  80, 'search',  'mobile repair',      ARRAY[]::uuid[],                                       ARRAY['profile_view','chat_initiated'],                95,  NOW()-INTERVAL '8 days',  NOW()-INTERVAL '4 hours', true),
('11a00010-3333-4f7a-8b9c-000000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'sess-010-bcd', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'warm', 50, 'search', 'wedding decoration',   ARRAY[]::uuid[],                                       ARRAY['profile_view','saved'],                         35,  NOW()-INTERVAL '4 days',  NOW()-INTERVAL '3 days',  false);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  AD EVENTS (8)                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO ad_events (id, event_type, entity_type, entity_id, user_id, metadata) VALUES
('ae100001-4444-4f7a-8b9c-000000000001', 'impression', 'sponsored_listing', 'a1e00001-8888-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', '{"position": 1, "page": "search"}'),
('ae100002-4444-4f7a-8b9c-000000000002', 'click',      'sponsored_listing', 'a1e00001-8888-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', '{"position": 1, "page": "search"}'),
('ae100003-4444-4f7a-8b9c-000000000003', 'impression', 'promo_banner',      'a1e00001-7777-4f7a-8b9c-000000000001', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', '{"position": 1, "page": "home"}'),
('ae100004-4444-4f7a-8b9c-000000000004', 'click',      'promo_banner',      'a1e00001-7777-4f7a-8b9c-000000000001', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', '{"position": 1, "page": "home"}'),
('ae100005-4444-4f7a-8b9c-000000000005', 'impression', 'sponsored_listing', 'a1e00002-8888-4f7a-8b9c-000000000002', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', '{"position": 0, "page": "search"}'),
('ae100006-4444-4f7a-8b9c-000000000006', 'click',      'sponsored_listing', 'a1e00002-8888-4f7a-8b9c-000000000002', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', '{"position": 0, "page": "search"}'),
('ae100007-4444-4f7a-8b9c-000000000007', 'impression', 'provider_offer',    'a1e00001-aaaa-4f7a-8b9c-100000000001', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', '{"page": "provider_detail"}'),
('ae100008-4444-4f7a-8b9c-000000000008', 'impression', 'provider_offer',    'a1e00002-aaaa-4f7a-8b9c-100000000002', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', '{"page": "provider_detail"}');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  APP INVITES (6)                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO app_invites (id, inviter_id, invite_method) VALUES
('a0100001-5555-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'whatsapp'),
('a0100002-5555-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'copy_link'),
('a0100003-5555-4f7a-8b9c-000000000003', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'whatsapp'),
('a0100004-5555-4f7a-8b9c-000000000004', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'native_share'),
('a0100005-5555-4f7a-8b9c-000000000005', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'sms'),
('a0100006-5555-4f7a-8b9c-000000000006', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'whatsapp');

COMMIT;
