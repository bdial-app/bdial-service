-- ============================================================================
-- Tijarah Connect — UAT Seed: 08 BOOKINGS
-- 30 bookings across various providers and customers
-- Schema: id, user_id, provider_id, status, total_amount, currency, notes,
--         scheduled_at, completed_at, cancelled_at
-- ============================================================================

BEGIN;

INSERT INTO bookings (id, user_id, provider_id, status, total_amount, currency, notes, scheduled_at, completed_at, cancelled_at) VALUES

-- Completed bookings (12)
('a1b00001-1111-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'completed', 2500.00, 'INR', 'Custom Rida stitching — blue silk',               NOW()-INTERVAL '60 days', NOW()-INTERVAL '45 days', NULL),
('a1b00002-1111-4f7a-8b9c-000000000002', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'completed', 4000.00, 'INR', 'Wedding catering for 50 guests',                  NOW()-INTERVAL '55 days', NOW()-INTERVAL '54 days', NULL),
('a1b00003-1111-4f7a-8b9c-000000000003', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'completed', 5000.00, 'INR', 'Full bridal mehndi — both hands and feet',        NOW()-INTERVAL '50 days', NOW()-INTERVAL '49 days', NULL),
('a1b00004-1111-4f7a-8b9c-000000000004', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'completed', 1500.00, 'INR', 'AC repair — gas refill + cleaning',               NOW()-INTERVAL '40 days', NOW()-INTERVAL '39 days', NULL),
('a1b00005-1111-4f7a-8b9c-000000000005', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'completed', 3500.00, 'INR', 'Custom birthday cake — 2kg chocolate truffle',    NOW()-INTERVAL '35 days', NOW()-INTERVAL '33 days', NULL),
('a1b00006-1111-4f7a-8b9c-000000000006', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'completed', 25000.00, 'INR', 'Wedding photography — full day coverage',         NOW()-INTERVAL '45 days', NOW()-INTERVAL '44 days', NULL),
('a1b00007-1111-4f7a-8b9c-000000000007', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'completed', 800.00,  'INR', 'Eid sweet box — 2kg assorted',                    NOW()-INTERVAL '30 days', NOW()-INTERVAL '29 days', NULL),
('a1b00008-1111-4f7a-8b9c-000000000008', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'completed', 15000.00, 'INR', 'Event photography — corporate function',          NOW()-INTERVAL '28 days', NOW()-INTERVAL '27 days', NULL),
('a1b00009-1111-4f7a-8b9c-000000000009', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'completed', 4500.00, 'INR', 'Designer abaya — custom fit',                     NOW()-INTERVAL '22 days', NOW()-INTERVAL '18 days', NULL),
('a1b00010-1111-4f7a-8b9c-000000000010', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'completed', 5000.00, 'INR', 'Full house deep cleaning',                         NOW()-INTERVAL '15 days', NOW()-INTERVAL '14 days', NULL),
('a1b00011-1111-4f7a-8b9c-000000000011', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'completed', 2000.00, 'INR', 'Bathroom pipe replacement',                        NOW()-INTERVAL '25 days', NOW()-INTERVAL '24 days', NULL),
('a1b00012-1111-4f7a-8b9c-000000000012', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'completed', 12000.00, 'INR', 'Bridal makeup package — nikah day',               NOW()-INTERVAL '48 days', NOW()-INTERVAL '47 days', NULL),

-- Confirmed bookings (6)
('a1b00013-1111-4f7a-8b9c-000000000013', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'confirmed', 16000.00, 'INR', 'Walima catering — 20 guests, full course',        NOW()+INTERVAL '5 days',  NULL, NULL),
('a1b00014-1111-4f7a-8b9c-000000000014', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16', 'confirmed', 5000.00, 'INR', 'Bridal mehndi — both hands, full intricate',      NOW()+INTERVAL '10 days', NULL, NULL),
('a1b00015-1111-4f7a-8b9c-000000000015', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'confirmed', 45000.00, 'INR', 'Modular kitchen installation',                     NOW()+INTERVAL '15 days', NULL, NULL),
('a1b00016-1111-4f7a-8b9c-000000000016', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'confirmed', 3000.00, 'INR', 'Monthly tuition — Maths & Science (Class 10)',    NOW()+INTERVAL '2 days',  NULL, NULL),
('a1b00017-1111-4f7a-8b9c-000000000017', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'confirmed', 35000.00, 'INR', 'Wedding decoration — full venue',                 NOW()+INTERVAL '20 days', NULL, NULL),
('a1b00018-1111-4f7a-8b9c-000000000018', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'confirmed', 4500.00, 'INR', 'Monthly tiffin service — 30 days',                NOW()+INTERVAL '1 day',   NULL, NULL),

-- Pending bookings (5)
('a1b00019-1111-4f7a-8b9c-000000000019', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'pending', 8000.00, 'INR', 'Spa and bridal prep package',                      NOW()+INTERVAL '7 days',  NULL, NULL),
('a1b00020-1111-4f7a-8b9c-000000000020', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'pending', 3000.00, 'INR', 'Full house rewiring — 2BHK',                       NOW()+INTERVAL '12 days', NULL, NULL),
('a1b00021-1111-4f7a-8b9c-000000000021', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'pending', 1800.00, 'INR', 'Party salwar kameez — rush order',                 NOW()+INTERVAL '4 days',  NULL, NULL),
('a1b00022-1111-4f7a-8b9c-000000000022', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'pending', 15000.00, 'INR', 'Birthday party decoration',                        NOW()+INTERVAL '8 days',  NULL, NULL),
('a1b00023-1111-4f7a-8b9c-000000000023', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'pending', 2500.00, 'INR', 'iPhone screen repair + battery',                   NOW()+INTERVAL '1 day',   NULL, NULL),

-- In-progress bookings (3)
('a1b00024-1111-4f7a-8b9c-000000000024', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'in_progress', 15000.00, 'INR', 'Bridal outfit package — lehenga + dupatta',      NOW()-INTERVAL '5 days',  NULL, NULL),
('a1b00025-1111-4f7a-8b9c-000000000025', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27', 'in_progress', 2500.00, 'INR', 'Quran hifz classes — 3 month package',            NOW()-INTERVAL '30 days', NULL, NULL),
('a1b00026-1111-4f7a-8b9c-000000000026', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'in_progress', 3500.00, 'INR', 'Washing machine repair — parts ordered',          NOW()-INTERVAL '3 days',  NULL, NULL),

-- Cancelled bookings (4)
('a1b00027-1111-4f7a-8b9c-000000000027', 'f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'cancelled', 800.00, 'INR', 'Biryani order cancelled — plans changed',          NOW()-INTERVAL '10 days', NULL, NOW()-INTERVAL '9 days'),
('a1b00028-1111-4f7a-8b9c-000000000028', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'cancelled', 2000.00, 'INR', 'Cancelled — found cheaper option',                 NOW()-INTERVAL '8 days',  NULL, NOW()-INTERVAL '7 days'),
('a1b00029-1111-4f7a-8b9c-000000000029', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'cancelled', 5000.00, 'INR', 'Keratin treatment — allergic reaction concern',    NOW()-INTERVAL '12 days', NULL, NOW()-INTERVAL '11 days'),
('a1b00030-1111-4f7a-8b9c-000000000030', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'cancelled', 12000.00, 'INR', 'Event catering cancelled — venue changed',        NOW()-INTERVAL '15 days', NULL, NOW()-INTERVAL '14 days');

COMMIT;
