-- ============================================================================
-- Tijarah Connect — UAT Seed: 15 NOTIFICATIONS
-- 15 device tokens, 10 notification preferences, 3 batches, 20 notifications
-- Schema: device_tokens(id, user_id, token, platform, device_info, is_active, last_used_at)
--         notification_preferences(id, user_id, push_enabled, chat_messages,
--         reviews_received, provider_status_updates, verification_updates,
--         booking_updates, promotional, system_announcements,
--         quiet_hours_enabled, quiet_hours_start, quiet_hours_end)
--         notification_batches(id, title, body, image_url, data, target_type,
--         target_criteria, sent_by, total_recipients, delivered_count,
--         read_count, failed_count, status, scheduled_at, sent_at)
--         notifications(id, user_id, type, title, body, image_url, data,
--         is_read, read_at, sent_at, source, batch_id)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DEVICE TOKENS (15)                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO device_tokens (id, user_id, token, platform, device_info, is_active, last_used_at) VALUES
('d7100001-6666-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'expo-push-token-ahmed-iphone14',   'ios',     '{"model":"iPhone 14","os":"iOS 17.4"}',          true,  NOW()-INTERVAL '1 hour'),
('d7100002-6666-4f7a-8b9c-000000000002', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'expo-push-token-ahmed-ipad',       'ios',     '{"model":"iPad Air","os":"iPadOS 17.3"}',         true,  NOW()-INTERVAL '2 days'),
('d7100003-6666-4f7a-8b9c-000000000003', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'expo-push-token-aisha-galaxy',     'android', '{"model":"Galaxy S23","os":"Android 14"}',         true,  NOW()-INTERVAL '3 hours'),
('d7100004-6666-4f7a-8b9c-000000000004', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'expo-push-token-omar-pixel',       'android', '{"model":"Pixel 8","os":"Android 14"}',            true,  NOW()-INTERVAL '6 hours'),
('d7100005-6666-4f7a-8b9c-000000000005', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'expo-push-token-khadija-oneplus',  'android', '{"model":"OnePlus 11","os":"Android 14"}',         true,  NOW()-INTERVAL '1 day'),
('d7100006-6666-4f7a-8b9c-000000000006', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'expo-push-token-yusuf-iphone13',   'ios',     '{"model":"iPhone 13","os":"iOS 17.3"}',            true,  NOW()-INTERVAL '12 hours'),
('d7100007-6666-4f7a-8b9c-000000000007', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'expo-push-token-mariam-redmi',     'android', '{"model":"Redmi Note 12","os":"Android 13"}',      true,  NOW()-INTERVAL '4 hours'),
('d7100008-6666-4f7a-8b9c-000000000008', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'expo-push-token-ali-samsung',      'android', '{"model":"Galaxy A54","os":"Android 14"}',          true,  NOW()-INTERVAL '8 hours'),
('d7100009-6666-4f7a-8b9c-000000000009', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 'expo-push-token-sara-iphone15',    'ios',     '{"model":"iPhone 15","os":"iOS 17.4"}',            true,  NOW()-INTERVAL '30 minutes'),
('d7100010-6666-4f7a-8b9c-000000000010', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'expo-push-token-hassan-xiaomi',    'android', '{"model":"Xiaomi 13","os":"Android 14"}',           true,  NOW()-INTERVAL '2 hours'),
-- Provider owner devices
('d7100011-6666-4f7a-8b9c-000000000011', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'expo-push-token-p01-owner',        'android', '{"model":"Samsung M34","os":"Android 13"}',         true,  NOW()-INTERVAL '5 hours'),
('d7100012-6666-4f7a-8b9c-000000000012', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'expo-push-token-p02-owner',        'ios',     '{"model":"iPhone 14 Pro","os":"iOS 17.4"}',        true,  NOW()-INTERVAL '1 hour'),
('d7100013-6666-4f7a-8b9c-000000000013', 'f2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d', 'expo-push-token-p05-owner',        'android', '{"model":"Poco X5","os":"Android 13"}',             true,  NOW()-INTERVAL '3 hours'),
-- Inactive old tokens
('d7100014-6666-4f7a-8b9c-000000000014', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'expo-push-token-ahmed-old-phone',  'android', '{"model":"Galaxy S21","os":"Android 12"}',          false, NOW()-INTERVAL '90 days'),
('d7100015-6666-4f7a-8b9c-000000000015', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'expo-push-token-aisha-old-phone',  'android', '{"model":"Redmi Note 10","os":"Android 12"}',       false, NOW()-INTERVAL '120 days');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  NOTIFICATION PREFERENCES (10)                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO notification_preferences (id, user_id, push_enabled, chat_messages, reviews_received, provider_status_updates, verification_updates, booking_updates, promotional, system_announcements, quiet_hours_enabled, quiet_hours_start, quiet_hours_end) VALUES
('09100001-7777-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', true,  true,  true,  true,  true,  true,  true,  true,  true,  '22:00', '07:00'),
('09100002-7777-4f7a-8b9c-000000000002', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', true,  true,  true,  true,  true,  true,  false, true,  false, NULL,    NULL),
('09100003-7777-4f7a-8b9c-000000000003', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', true,  true,  true,  true,  true,  true,  true,  true,  false, NULL,    NULL),
('09100004-7777-4f7a-8b9c-000000000004', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', true,  true,  false, true,  true,  true,  false, true,  true,  '23:00', '06:00'),
('09100005-7777-4f7a-8b9c-000000000005', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', false, false, false, false, false, false, false, false, false, NULL,    NULL),
('09100006-7777-4f7a-8b9c-000000000006', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', true,  true,  true,  true,  true,  true,  true,  true,  false, NULL,    NULL),
('09100007-7777-4f7a-8b9c-000000000007', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', true,  true,  true,  true,  true,  true,  true,  true,  true,  '21:00', '06:00'),
('09100008-7777-4f7a-8b9c-000000000008', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', true,  true,  true,  true,  true,  true,  false, true,  false, NULL,    NULL),
('09100009-7777-4f7a-8b9c-000000000009', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', true,  true,  true,  true,  true,  true,  true,  true,  false, NULL,    NULL),
('09100010-7777-4f7a-8b9c-000000000010', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', true,  true,  false, false, false, false, false, true,  false, NULL,    NULL);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  NOTIFICATION BATCHES (3)                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO notification_batches (id, title, body, image_url, data, target_type, target_criteria, sent_by, total_recipients, delivered_count, read_count, failed_count, status, scheduled_at, sent_at) VALUES
('0b100001-8888-4f7a-8b9c-000000000001', 'Ramadan Special Offers!',      'Discover exclusive deals from local providers this Ramadan.',                     NULL, '{"screen": "explore"}',            'all',     NULL,                                          '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', 55, 48, 32, 2, 'sent',      NOW()-INTERVAL '20 days', NOW()-INTERVAL '20 days'),
('0b100002-8888-4f7a-8b9c-000000000002', 'New Feature: Save Providers',  'You can now save your favourite providers for quick access. Try it today!',        NULL, '{"screen": "saved"}',              'all',     NULL,                                          'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', 55, 50, 25, 1, 'sent',      NOW()-INTERVAL '10 days', NOW()-INTERVAL '10 days'),
('0b100003-8888-4f7a-8b9c-000000000003', 'Rate Your Recent Experience',  'Share your feedback about the services you used this week.',                       NULL, '{"screen": "reviews"}',            'segment', '{"city": "Mumbai", "has_bookings": true}',    '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', 20, 18, 8,  0, 'sent',      NOW()-INTERVAL '5 days',  NOW()-INTERVAL '5 days');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  NOTIFICATIONS (20)                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO notifications (id, user_id, type, title, body, image_url, data, is_read, read_at, sent_at, source, batch_id) VALUES
-- Batch notifications
('01a00001-9999-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'promotional',  'Ramadan Special Offers!',      'Discover exclusive deals from local providers this Ramadan.',                     NULL, '{"screen":"explore"}',                        true,  NOW()-INTERVAL '19 days', NOW()-INTERVAL '20 days', 'admin', '0b100001-8888-4f7a-8b9c-000000000001'),
('01a00002-9999-4f7a-8b9c-000000000002', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'promotional',  'Ramadan Special Offers!',      'Discover exclusive deals from local providers this Ramadan.',                     NULL, '{"screen":"explore"}',                        true,  NOW()-INTERVAL '18 days', NOW()-INTERVAL '20 days', 'admin', '0b100001-8888-4f7a-8b9c-000000000001'),
('01a00003-9999-4f7a-8b9c-000000000003', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'system_announcement',       'New Feature: Save Providers',  'You can now save your favourite providers for quick access. Try it today!',        NULL, '{"screen":"saved"}',                          true,  NOW()-INTERVAL '9 days',  NOW()-INTERVAL '10 days', 'admin', '0b100002-8888-4f7a-8b9c-000000000002'),
('01a00004-9999-4f7a-8b9c-000000000004', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'system_announcement',       'New Feature: Save Providers',  'You can now save your favourite providers for quick access. Try it today!',        NULL, '{"screen":"saved"}',                          false, NULL,                     NOW()-INTERVAL '10 days', 'admin', '0b100002-8888-4f7a-8b9c-000000000002'),
('01a00005-9999-4f7a-8b9c-000000000005', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'system_announcement',       'Rate Your Recent Experience',  'Share your feedback about the services you used this week.',                       NULL, '{"screen":"reviews"}',                        false, NULL,                     NOW()-INTERVAL '5 days',  'admin', '0b100003-8888-4f7a-8b9c-000000000003'),

-- Chat notifications
('01a00006-9999-4f7a-8b9c-000000000006', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'chat_message',         'New message from Fatima Tailors',    'Assalam, your rida is ready for pickup!',                                   NULL, '{"screen":"chat","conversationId":"d1c00001-0001-4f7a-8b9c-000000000001"}',  true,  NOW()-INTERVAL '1 day',   NOW()-INTERVAL '1 day',   'system', NULL),
('01a00007-9999-4f7a-8b9c-000000000007', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'chat_message',         'New message from Zahra Beauty',     'Sure, we can do bridal mehndi. When is the event?',                          NULL, '{"screen":"chat","conversationId":"d1c00002-0001-4f7a-8b9c-000000000002"}',  false, NULL,                     NOW()-INTERVAL '2 hours', 'system', NULL),

-- Review notifications (to provider owners)
('01a00008-9999-4f7a-8b9c-000000000008', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'review_received',       'New Review Received',          'Ahmed gave you 5 stars! "Excellent stitching quality."',                      NULL, '{"screen":"reviews","providerId":"c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01"}', true,  NOW()-INTERVAL '2 days',  NOW()-INTERVAL '3 days',  'system', NULL),
('01a00009-9999-4f7a-8b9c-000000000009', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'review_received',       'New Review Received',          'Aisha gave you 4 stars! "Beautiful designs."',                               NULL, '{"screen":"reviews","providerId":"c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02"}', false, NULL,                     NOW()-INTERVAL '1 day',   'system', NULL),

-- Booking notifications
('01a00010-9999-4f7a-8b9c-000000000010', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'booking_update',      'Booking Confirmed',            'Your booking with Fatima Tailors has been confirmed for tomorrow.',            NULL, '{"screen":"bookings"}',                       true,  NOW()-INTERVAL '5 days',  NOW()-INTERVAL '5 days',  'system', NULL),
('01a00011-9999-4f7a-8b9c-000000000011', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'booking_update',      'Booking Completed',            'Your service with Zahra Beauty has been marked complete. Please leave a review.', NULL, '{"screen":"bookings"}',                    true,  NOW()-INTERVAL '4 days',  NOW()-INTERVAL '4 days',  'system', NULL),

-- Verification notifications (to provider owners)
('01a00012-9999-4f7a-8b9c-000000000012', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'verification_update', 'Verification Approved',        'Your Aadhaar verification has been approved. Your profile is now verified!',   NULL, '{"screen":"provider_dashboard"}',              true,  NOW()-INTERVAL '30 days', NOW()-INTERVAL '30 days', 'system', NULL),
('01a00013-9999-4f7a-8b9c-000000000013', 'f2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d', 'verification_update', 'Verification Rejected',        'Your Aadhaar verification was rejected. Please re-upload a clearer document.', NULL, '{"screen":"provider_verification"}',           true,  NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days', 'system', NULL),

-- Provider status notifications
('01a00014-9999-4f7a-8b9c-000000000014', '8d9e0f1a-2b3c-4d4e-5f6a-7b8c9d0e1f2a', 'provider_status', 'Account Suspended',         'Your account has been suspended due to multiple fraud reports. Contact support.', NULL, '{"screen":"provider_dashboard"}',             true,  NOW()-INTERVAL '10 days', NOW()-INTERVAL '10 days', 'system', NULL),

-- Warning notification
('01a00015-9999-4f7a-8b9c-000000000015', '5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b', 'system_announcement',      'Response Time Warning',        'Your response time is above 48 hours. Please respond to enquiries promptly.',  NULL, '{"screen":"provider_dashboard"}',              false, NULL,                     NOW()-INTERVAL '3 days',  'system', NULL),

-- Lead notifications (to provider owners)
('01a00016-9999-4f7a-8b9c-000000000016', '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'system_announcement',         'New Hot Lead!',                'A customer searched for "tailor" and viewed your profile. Check your leads.',  NULL, '{"screen":"provider_leads"}',                  true,  NOW()-INTERVAL '2 hours', NOW()-INTERVAL '3 hours', 'system', NULL),
('01a00017-9999-4f7a-8b9c-000000000017', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'system_announcement',         'New Hot Lead!',                'A customer found you on the home feed and called. Check your leads.',          NULL, '{"screen":"provider_leads"}',                  false, NULL,                     NOW()-INTERVAL '5 hours', 'system', NULL),

-- System maintenance notification
('01a00018-9999-4f7a-8b9c-000000000018', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'system_announcement',       'Scheduled Maintenance',        'The app will undergo maintenance on Friday 2am-4am IST. Services may be briefly unavailable.', NULL, '{"type":"maintenance"}', false, NULL,                     NOW()-INTERVAL '1 day',   'system', NULL),
('01a00019-9999-4f7a-8b9c-000000000019', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'system_announcement',       'Scheduled Maintenance',        'The app will undergo maintenance on Friday 2am-4am IST. Services may be briefly unavailable.', NULL, '{"type":"maintenance"}', false, NULL,                     NOW()-INTERVAL '1 day',   'system', NULL),

-- Report resolution notification
('01a00020-9999-4f7a-8b9c-000000000020', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'report_update',       'Report Update',                'Your report about a provider has been reviewed. Action has been taken. Thank you for helping keep Tijarah safe.', NULL, '{"screen":"reports"}', true, NOW()-INTERVAL '14 days', NOW()-INTERVAL '15 days', 'system', NULL);

COMMIT;
