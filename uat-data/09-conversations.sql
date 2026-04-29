-- ============================================================================
-- Tijarah Connect — UAT Seed: 09 CONVERSATIONS
-- 15 conversations + 30 participants + 38 messages
-- Schema: conversations(id, type, context_type, context_id, context_title,
--         context_image_url, status, last_message_at, last_message_preview,
--         last_message_sender_id)
--         conversation_participants(id, conversation_id, user_id, role,
--         last_read_at, unread_count, is_active)
--         messages(id, conversation_id, sender_id, content, message_type,
--         metadata, status)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONVERSATIONS (15)                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO conversations (id, type, context_type, context_id, context_title, context_image_url, status, last_message_at, last_message_preview, last_message_sender_id) VALUES
('d1c00001-2222-4f7a-8b9c-000000000001', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Fatima''s Tailoring House',    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', 'active',   NOW()-INTERVAL '2 hours',  'I''ll have it ready by Thursday, insha''Allah.',  '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82'),
('d1c00002-2222-4f7a-8b9c-000000000002', 'enquiry', 'product',  'e1a00006-aaaa-4f7a-8b9c-000000000006', 'Daily Tiffin Service',         'https://images.unsplash.com/photo-1555244162-803834f70033?w=400', 'active',   NOW()-INTERVAL '5 hours',  'Yes, we deliver to Malabar Hill area.',            'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43'),
('d1c00003-2222-4f7a-8b9c-000000000003', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'Sakina Mehndi Arts',           'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', 'active',   NOW()-INTERVAL '1 day',    'For 10 ladies, it would be ₹8,000 total.',         'd4e5f6a7-8b9c-4d0e-1f2a-3b4c5d6e7f80'),
('d1c00004-2222-4f7a-8b9c-000000000004', 'direct',  NULL,       NULL,                                     NULL,                           NULL,                                                              'active',   NOW()-INTERVAL '3 hours',  'JazakAllah! Will visit tomorrow.',                 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d'),
('d1c00005-2222-4f7a-8b9c-000000000005', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'Muffadal Photography',        'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400', 'active',   NOW()-INTERVAL '8 hours',  'Package includes drone coverage.',                 '6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c'),
('d1c00006-2222-4f7a-8b9c-000000000006', 'enquiry', 'product',  'e1a00014-aaaa-4f7a-8b9c-000000000014', 'Bridal Makeup Package',        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400', 'active',   NOW()-INTERVAL '12 hours', 'Trial session available on weekdays.',              'e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c'),
('d1c00007-2222-4f7a-8b9c-000000000007', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'Saifee Catering & Events',    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', 'active',   NOW()-INTERVAL '6 hours',  'Menu will be shared by evening.',                  '2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c'),
('d1c00008-2222-4f7a-8b9c-000000000008', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'Murtaza Tech Repairs',        'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400', 'active',   NOW()-INTERVAL '4 hours',  'Screen replacement will take 45 mins.',            '8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e'),
('d1c00009-2222-4f7a-8b9c-000000000009', 'direct',  NULL,       NULL,                                     NULL,                           NULL,                                                              'active',   NOW()-INTERVAL '10 hours', 'Shukran behen! The sweets were delicious.',         'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f'),
('d1c00010-2222-4f7a-8b9c-000000000010', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'Noor Photography Studio',     'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400', 'active',   NOW()-INTERVAL '1 day',    'We also offer same-day highlight reels.',          '9a0b1c2d-3e4f-4a5b-6c7d-8e9f0a1b2c3d'),
('d1c00011-2222-4f7a-8b9c-000000000011', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'Arwa Boutique',               NULL,                                                              'active',   NOW()-INTERVAL '2 days',   'New Eid collection arriving next week.',            'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'),
('d1c00012-2222-4f7a-8b9c-000000000012', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'Murtaza Decorator',           NULL,                                                              'active',   NOW()-INTERVAL '3 days',   'Lighting package starts at ₹10,000.',              'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9c'),
('d1c00013-2222-4f7a-8b9c-000000000013', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'Qaidjohar Plumbing Solutions', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', 'archived', NOW()-INTERVAL '20 days',  'Work done. Thank you!',                            'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d'),
('d1c00014-2222-4f7a-8b9c-000000000014', 'enquiry', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'Shabbir AC & Appliance Repair','https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', 'closed',   NOW()-INTERVAL '30 days',  'Issue resolved. Please leave a review!',           '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f'),
('d1c00015-2222-4f7a-8b9c-000000000015', 'direct',  NULL,       NULL,                                     NULL,                           NULL,                                                              'active',   NOW()-INTERVAL '1 hour',   'Can you share the price list?',                    'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONVERSATION PARTICIPANTS (30 — 2 per conversation)                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO conversation_participants (id, conversation_id, user_id, role, last_read_at, unread_count, is_active) VALUES
-- Conv 1: Ahmed ↔ Fatima
('e1900001-3333-4f7a-8b9c-000000000001', 'd1c00001-2222-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'customer', NOW()-INTERVAL '2 hours', 1, true),
('e1900002-3333-4f7a-8b9c-000000000002', 'd1c00001-2222-4f7a-8b9c-000000000001', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'provider', NOW()-INTERVAL '2 hours', 0, true),
-- Conv 2: Ahmed ↔ Husain
('e1900003-3333-4f7a-8b9c-000000000003', 'd1c00002-2222-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'customer', NOW()-INTERVAL '6 hours', 1, true),
('e1900004-3333-4f7a-8b9c-000000000004', 'd1c00002-2222-4f7a-8b9c-000000000002', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'provider', NOW()-INTERVAL '5 hours', 0, true),
-- Conv 3: Aisha ↔ Sakina
('e1900005-3333-4f7a-8b9c-000000000005', 'd1c00003-2222-4f7a-8b9c-000000000003', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'customer', NOW()-INTERVAL '1 day',  0, true),
('e1900006-3333-4f7a-8b9c-000000000006', 'd1c00003-2222-4f7a-8b9c-000000000003', 'd4e5f6a7-8b9c-4d0e-1f2a-3b4c5d6e7f80', 'provider', NOW()-INTERVAL '1 day',  0, true),
-- Conv 4: Ahmed ↔ Rashida (direct)
('e1900007-3333-4f7a-8b9c-000000000007', 'd1c00004-2222-4f7a-8b9c-000000000004', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'customer', NOW()-INTERVAL '3 hours', 0, true),
('e1900008-3333-4f7a-8b9c-000000000008', 'd1c00004-2222-4f7a-8b9c-000000000004', 'e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c', 'provider', NOW()-INTERVAL '4 hours', 1, true),
-- Conv 5: Maryam ↔ Muffadal Photography
('e1900009-3333-4f7a-8b9c-000000000009', 'd1c00005-2222-4f7a-8b9c-000000000005', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'customer', NOW()-INTERVAL '9 hours', 1, true),
('e1900010-3333-4f7a-8b9c-000000000010', 'd1c00005-2222-4f7a-8b9c-000000000005', '6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c', 'provider', NOW()-INTERVAL '8 hours', 0, true),
-- Conv 6: Aisha ↔ Rashida Beauty
('e1900011-3333-4f7a-8b9c-000000000011', 'd1c00006-2222-4f7a-8b9c-000000000006', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'customer', NOW()-INTERVAL '13 hours', 1, true),
('e1900012-3333-4f7a-8b9c-000000000012', 'd1c00006-2222-4f7a-8b9c-000000000006', 'e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c', 'provider', NOW()-INTERVAL '12 hours', 0, true),
-- Conv 7: Maryam ↔ Saifee Catering
('e1900013-3333-4f7a-8b9c-000000000013', 'd1c00007-2222-4f7a-8b9c-000000000007', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'customer', NOW()-INTERVAL '7 hours', 1, true),
('e1900014-3333-4f7a-8b9c-000000000014', 'd1c00007-2222-4f7a-8b9c-000000000007', '2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c', 'provider', NOW()-INTERVAL '6 hours', 0, true),
-- Conv 8: Sakina Wala ↔ Murtaza Tech
('e1900015-3333-4f7a-8b9c-000000000015', 'd1c00008-2222-4f7a-8b9c-000000000008', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'customer', NOW()-INTERVAL '5 hours', 1, true),
('e1900016-3333-4f7a-8b9c-000000000016', 'd1c00008-2222-4f7a-8b9c-000000000008', '8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e', 'provider', NOW()-INTERVAL '4 hours', 0, true),
-- Conv 9: Yusuf ↔ Zahra Sweets (direct)
('e1900017-3333-4f7a-8b9c-000000000017', 'd1c00009-2222-4f7a-8b9c-000000000009', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'customer', NOW()-INTERVAL '10 hours', 0, true),
('e1900018-3333-4f7a-8b9c-000000000018', 'd1c00009-2222-4f7a-8b9c-000000000009', '4b5c6d7e-8f9a-4b0c-1d2e-3f4a5b6c7d8e', 'provider', NOW()-INTERVAL '11 hours', 1, true),
-- Conv 10: Ruqaiya ↔ Noor Photography
('e1900019-3333-4f7a-8b9c-000000000019', 'd1c00010-2222-4f7a-8b9c-000000000010', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'customer', NOW()-INTERVAL '1 day', 0, true),
('e1900020-3333-4f7a-8b9c-000000000020', 'd1c00010-2222-4f7a-8b9c-000000000010', '9a0b1c2d-3e4f-4a5b-6c7d-8e9f0a1b2c3d', 'provider', NOW()-INTERVAL '1 day', 0, true),
-- Conv 11: Zainab Customer ↔ Arwa Boutique
('e1900021-3333-4f7a-8b9c-000000000021', 'd1c00011-2222-4f7a-8b9c-000000000011', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'customer', NOW()-INTERVAL '2 days', 0, true),
('e1900022-3333-4f7a-8b9c-000000000022', 'd1c00011-2222-4f7a-8b9c-000000000011', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'provider', NOW()-INTERVAL '2 days', 0, true),
-- Conv 12: Hussain Limdi ↔ Murtaza Decorator
('e1900023-3333-4f7a-8b9c-000000000023', 'd1c00012-2222-4f7a-8b9c-000000000012', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'customer', NOW()-INTERVAL '3 days', 0, true),
('e1900024-3333-4f7a-8b9c-000000000024', 'd1c00012-2222-4f7a-8b9c-000000000012', 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9c', 'provider', NOW()-INTERVAL '3 days', 0, true),
-- Conv 13: Ahmed ↔ Qaidjohar (archived)
('e1900025-3333-4f7a-8b9c-000000000025', 'd1c00013-2222-4f7a-8b9c-000000000013', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'customer', NOW()-INTERVAL '20 days', 0, true),
('e1900026-3333-4f7a-8b9c-000000000026', 'd1c00013-2222-4f7a-8b9c-000000000013', '5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b', 'provider', NOW()-INTERVAL '20 days', 0, true),
-- Conv 14: Ahmed ↔ Shabbir AC (closed)
('e1900027-3333-4f7a-8b9c-000000000027', 'd1c00014-2222-4f7a-8b9c-000000000014', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'customer', NOW()-INTERVAL '30 days', 0, true),
('e1900028-3333-4f7a-8b9c-000000000028', 'd1c00014-2222-4f7a-8b9c-000000000014', '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f', 'provider', NOW()-INTERVAL '30 days', 0, true),
-- Conv 15: Aisha ↔ Tasneem Salon (direct)
('e1900029-3333-4f7a-8b9c-000000000029', 'd1c00015-2222-4f7a-8b9c-000000000015', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'customer', NOW()-INTERVAL '1 hour', 0, true),
('e1900030-3333-4f7a-8b9c-000000000030', 'd1c00015-2222-4f7a-8b9c-000000000015', '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e', 'provider', NOW()-INTERVAL '2 hours', 1, true);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  MESSAGES (38)                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO messages (id, conversation_id, sender_id, content, message_type, metadata, status) VALUES
-- Conv 1: Ahmed ↔ Fatima (4 msgs)
('f1300001-4444-4f7a-8b9c-000000000001', 'd1c00001-2222-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'Assalamu Alaikum, I need a custom Rida stitched for my wife.', 'text', NULL, 'read'),
('f1300002-4444-4f7a-8b9c-000000000002', 'd1c00001-2222-4f7a-8b9c-000000000001', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'Wa Alaikum Assalam! We''d love to help. What fabric and colour preference?', 'text', NULL, 'read'),
('f1300003-4444-4f7a-8b9c-000000000003', 'd1c00001-2222-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'Blue silk with minimal embroidery. When can it be ready?', 'text', NULL, 'read'),
('f1300004-4444-4f7a-8b9c-000000000004', 'd1c00001-2222-4f7a-8b9c-000000000001', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'I''ll have it ready by Thursday, insha''Allah.', 'text', NULL, 'delivered'),

-- Conv 2: Ahmed ↔ Husain (3 msgs)
('f1300005-4444-4f7a-8b9c-000000000005', 'd1c00002-2222-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'Do you deliver tiffin to Malabar Hill?', 'text', NULL, 'read'),
('f1300006-4444-4f7a-8b9c-000000000006', 'd1c00002-2222-4f7a-8b9c-000000000002', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'Yes, we deliver to Malabar Hill area.', 'text', NULL, 'delivered'),
('f1300007-4444-4f7a-8b9c-000000000007', 'd1c00002-2222-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', NULL, 'enquiry', '{"productId": "e1a00006-aaaa-4f7a-8b9c-000000000006", "productName": "Daily Tiffin Service", "productImage": "https://images.unsplash.com/photo-1555244162-803834f70033?w=400", "productPrice": 150, "currency": "INR"}', 'read'),

-- Conv 3: Aisha ↔ Sakina (3 msgs)
('f1300008-4444-4f7a-8b9c-000000000008', 'd1c00003-2222-4f7a-8b9c-000000000003', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'What would be the cost for mehndi for 10 ladies at my home?', 'text', NULL, 'read'),
('f1300009-4444-4f7a-8b9c-000000000009', 'd1c00003-2222-4f7a-8b9c-000000000003', 'd4e5f6a7-8b9c-4d0e-1f2a-3b4c5d6e7f80', 'For 10 ladies, it would be ₹8,000 total.', 'text', NULL, 'read'),
('f1300010-4444-4f7a-8b9c-000000000010', 'd1c00003-2222-4f7a-8b9c-000000000003', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'That sounds good. Please confirm the date — 15th next month.', 'text', NULL, 'delivered'),

-- Conv 4: Ahmed ↔ Rashida direct (2 msgs)
('f1300011-4444-4f7a-8b9c-000000000011', 'd1c00004-2222-4f7a-8b9c-000000000004', 'e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c', 'Ahmed bhai, your wife''s appointment is confirmed for tomorrow at 3 PM.', 'text', NULL, 'read'),
('f1300012-4444-4f7a-8b9c-000000000012', 'd1c00004-2222-4f7a-8b9c-000000000004', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'JazakAllah! Will visit tomorrow.', 'text', NULL, 'sent'),

-- Conv 5: Maryam ↔ Muffadal Photography (3 msgs)
('f1300013-4444-4f7a-8b9c-000000000013', 'd1c00005-2222-4f7a-8b9c-000000000005', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'What does your wedding package include?', 'text', NULL, 'read'),
('f1300014-4444-4f7a-8b9c-000000000014', 'd1c00005-2222-4f7a-8b9c-000000000005', '6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c', 'Full day coverage, 2 photographers, 1 videographer, drone, album with 200 photos.', 'text', NULL, 'read'),
('f1300015-4444-4f7a-8b9c-000000000015', 'd1c00005-2222-4f7a-8b9c-000000000005', '6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c', 'Package includes drone coverage.', 'text', NULL, 'delivered'),

-- Conv 6: Aisha ↔ Rashida Beauty (2 msgs)
('f1300016-4444-4f7a-8b9c-000000000016', 'd1c00006-2222-4f7a-8b9c-000000000006', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'Is a trial session available before the wedding day?', 'text', NULL, 'read'),
('f1300017-4444-4f7a-8b9c-000000000017', 'd1c00006-2222-4f7a-8b9c-000000000006', 'e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c', 'Trial session available on weekdays.', 'text', NULL, 'delivered'),

-- Conv 7: Maryam ↔ Saifee Catering (3 msgs)
('f1300018-4444-4f7a-8b9c-000000000018', 'd1c00007-2222-4f7a-8b9c-000000000007', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'Need catering for 50 people for a house party. What cuisines do you offer?', 'text', NULL, 'read'),
('f1300019-4444-4f7a-8b9c-000000000019', 'd1c00007-2222-4f7a-8b9c-000000000007', '2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c', 'We offer Mughlai, Bohri thali, and continental. I''ll share the full menu.', 'text', NULL, 'read'),
('f1300020-4444-4f7a-8b9c-000000000020', 'd1c00007-2222-4f7a-8b9c-000000000007', '2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c', 'Menu will be shared by evening.', 'text', NULL, 'delivered'),

-- Conv 8: Sakina Wala ↔ Murtaza Tech (3 msgs)
('f1300021-4444-4f7a-8b9c-000000000021', 'd1c00008-2222-4f7a-8b9c-000000000008', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'My iPhone 13 screen is cracked. How much for replacement?', 'text', NULL, 'read'),
('f1300022-4444-4f7a-8b9c-000000000022', 'd1c00008-2222-4f7a-8b9c-000000000008', '8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e', '₹4,500 with genuine display. Warranty 6 months.', 'text', NULL, 'read'),
('f1300023-4444-4f7a-8b9c-000000000023', 'd1c00008-2222-4f7a-8b9c-000000000008', '8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e', 'Screen replacement will take 45 mins.', 'text', NULL, 'delivered'),

-- Conv 9: Yusuf ↔ Zahra (direct, 2 msgs)
('f1300024-4444-4f7a-8b9c-000000000024', 'd1c00009-2222-4f7a-8b9c-000000000009', '4b5c6d7e-8f9a-4b0c-1d2e-3f4a5b6c7d8e', 'Your order is ready for pickup!', 'text', NULL, 'read'),
('f1300025-4444-4f7a-8b9c-000000000025', 'd1c00009-2222-4f7a-8b9c-000000000009', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'Shukran behen! The sweets were delicious.', 'text', NULL, 'sent'),

-- Conv 10: Ruqaiya ↔ Noor Photography (2 msgs)
('f1300026-4444-4f7a-8b9c-000000000026', 'd1c00010-2222-4f7a-8b9c-000000000010', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'Do you offer same-day highlight reels?', 'text', NULL, 'read'),
('f1300027-4444-4f7a-8b9c-000000000027', 'd1c00010-2222-4f7a-8b9c-000000000010', '9a0b1c2d-3e4f-4a5b-6c7d-8e9f0a1b2c3d', 'We also offer same-day highlight reels.', 'text', NULL, 'read'),

-- Conv 11: Zainab Customer ↔ Arwa (2 msgs)
('f1300028-4444-4f7a-8b9c-000000000028', 'd1c00011-2222-4f7a-8b9c-000000000011', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'When is the new Eid collection arriving?', 'text', NULL, 'read'),
('f1300029-4444-4f7a-8b9c-000000000029', 'd1c00011-2222-4f7a-8b9c-000000000011', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'New Eid collection arriving next week.', 'text', NULL, 'read'),

-- Conv 12: Hussain Limdi ↔ Murtaza Decorator (2 msgs)
('f1300030-4444-4f7a-8b9c-000000000030', 'd1c00012-2222-4f7a-8b9c-000000000012', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'What is the minimum package for wedding lighting?', 'text', NULL, 'read'),
('f1300031-4444-4f7a-8b9c-000000000031', 'd1c00012-2222-4f7a-8b9c-000000000012', 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9c', 'Lighting package starts at ₹10,000.', 'text', NULL, 'read'),

-- Conv 13: Ahmed ↔ Qaidjohar (archived, 3 msgs)
('f1300032-4444-4f7a-8b9c-000000000032', 'd1c00013-2222-4f7a-8b9c-000000000013', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'The bathroom pipe is leaking badly. Can you come today?', 'text', NULL, 'read'),
('f1300033-4444-4f7a-8b9c-000000000033', 'd1c00013-2222-4f7a-8b9c-000000000013', '5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b', 'On my way. Should be there in 30 mins.', 'text', NULL, 'read'),
('f1300034-4444-4f7a-8b9c-000000000034', 'd1c00013-2222-4f7a-8b9c-000000000013', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'Work done. Thank you!', 'text', NULL, 'read'),

-- Conv 14: Ahmed ↔ Shabbir AC (closed, 2 msgs)
('f1300035-4444-4f7a-8b9c-000000000035', 'd1c00014-2222-4f7a-8b9c-000000000014', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'AC fixed perfectly. What do I owe you?', 'text', NULL, 'read'),
('f1300036-4444-4f7a-8b9c-000000000036', 'd1c00014-2222-4f7a-8b9c-000000000014', '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f', 'Issue resolved. Please leave a review!', 'text', NULL, 'read'),

-- Conv 15: Aisha ↔ Tasneem Salon (2 msgs)
('f1300037-4444-4f7a-8b9c-000000000037', 'd1c00015-2222-4f7a-8b9c-000000000015', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'Can you share the price list?', 'text', NULL, 'delivered'),
('f1300038-4444-4f7a-8b9c-000000000038', 'd1c00015-2222-4f7a-8b9c-000000000015', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', NULL, 'image', '{"url": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600", "storageKey": "chat/conv15/pricelist.jpg", "width": 800, "height": 600}', 'delivered');

COMMIT;
