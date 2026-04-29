-- ============================================================================
-- Tijarah Connect — UAT Seed: 12 REPORTS, WARNINGS & BUG REPORTS
-- 8 reports + 4 provider warnings + 5 bug reports
-- Schema: reports(id, reporter_id, entity_type, entity_id, reason, description,
--         status, admin_action, admin_notes, reviewed_by, reviewed_at)
--         provider_warnings(id, provider_id, warning_type, title, message,
--         report_id, issued_by, is_read, read_at)
--         bug_reports(id, reporter_id, category, description, steps_to_reproduce,
--         device_info, status, admin_notes)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REPORTS (8)                                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reports (id, reporter_id, entity_type, entity_id, reason, description, status, admin_action, admin_notes, reviewed_by, reviewed_at) VALUES
-- Provider reports
('41a00001-aaaa-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'inappropriate_content', 'Provider profile has misleading description and fake photos.',     'action_taken', 'warning',  'Warning issued. Profile updated.',                '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '15 days'),
('41a00002-aaaa-4f7a-8b9c-000000000002', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'fraud_scam',            'Charged for services not delivered. No response from provider.',   'action_taken', 'suspend',  'Provider suspended pending investigation.',       '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '10 days'),
('41a00003-aaaa-4f7a-8b9c-000000000003', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'wrong_category',        'Listed as tailoring but actually a catering service.',            'dismissed',    NULL,       'Category is correct per business registration.', 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '8 days'),

-- Product reports
('41a00004-aaaa-4f7a-8b9c-000000000004', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'product',  'e1a00008-aaaa-4f7a-8b9c-000000000008', 'wrong_price',           'Price listed is ₹1500 but actual charge was ₹2500.',             'under_review', NULL,       NULL,                                              NULL,                                   NULL),
('41a00005-aaaa-4f7a-8b9c-000000000005', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'product',  'e1a00014-aaaa-4f7a-8b9c-000000000014', 'fake_product',          'Photos don''t match actual service quality.',                      'pending',      NULL,       NULL,                                              NULL,                                   NULL),

-- Message reports
('41a00006-aaaa-4f7a-8b9c-000000000006', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'message',  'f1300004-4444-4f7a-8b9c-000000000004', 'spam',                  'Received promotional messages from this provider.',               'dismissed',    NULL,       'Message was a normal business reply.',            'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NOW()-INTERVAL '5 days'),
('41a00007-aaaa-4f7a-8b9c-000000000007', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'harassment',            'Provider was rude when I asked about pricing.',                   'pending',      NULL,       NULL,                                              NULL,                                   NULL),
('41a00008-aaaa-4f7a-8b9c-000000000008', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 'provider', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'fake_business',         'This appears to be a duplicate listing.',                         'under_review', NULL,       'Investigating duplicate claim.',                  '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NOW()-INTERVAL '2 days');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER WARNINGS (4)                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_warnings (id, provider_id, "warningType", title, message, report_id, issued_by, is_read, read_at) VALUES
('61a00001-bbbb-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'report_warning',    'Content Policy Warning',       'Your profile was reported for misleading content. Please update your description and photos to accurately represent your services. Further violations may result in suspension.', '41a00001-aaaa-4f7a-8b9c-000000000001', '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', true,  NOW()-INTERVAL '14 days'),
('61a00002-bbbb-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'report_warning',    'Fraud Report — Account Suspended', 'Multiple reports of fraud received. Your account has been suspended pending investigation. Please contact support to resolve.', '41a00002-aaaa-4f7a-8b9c-000000000002', '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', true,  NOW()-INTERVAL '9 days'),
('61a00003-bbbb-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'policy_violation',  'Response Time Warning',         'Your average response time has exceeded 48 hours. Please respond to customer enquiries promptly to maintain your listing quality.', NULL, 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', false, NULL),
('61a00004-bbbb-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'content_warning',   'Photo Quality Notice',          'Some of your gallery photos appear blurry. Please upload higher resolution images to improve your profile visibility.', NULL, 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', false, NULL);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  BUG REPORTS (5)                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO bug_reports (id, reporter_id, category, description, steps_to_reproduce, device_info, status, admin_notes) VALUES
('c1b00001-cccc-4f7a-8b9c-000000000001', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'ui_issue',             'Search results page shows blank white screen when scrolling quickly.',                 '1. Open search\n2. Type "tailor"\n3. Scroll quickly down and up\n4. Screen goes blank', 'iPhone 14, iOS 17.4, Safari',      'in_progress', 'Reproduced on iOS Safari. Virtual scroll issue.'),
('c1b00002-cccc-4f7a-8b9c-000000000002', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'feature_not_working',  'Cannot save a provider after unsaving and trying to save again.',                      '1. Save a provider\n2. Unsave it\n3. Try to save again\n4. Heart icon doesn''t respond', 'Samsung Galaxy S23, Android 14, Chrome', 'open', NULL),
('c1b00003-cccc-4f7a-8b9c-000000000003', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'login_auth',           'OTP not received for 5+ minutes. Had to request 3 times.',                            '1. Enter phone number\n2. Tap Send OTP\n3. Wait 5 mins — no SMS received',             'OnePlus 11, Android 14, Chrome',   'resolved',    'SMS gateway was throttled. Increased rate limit.'),
('c1b00004-cccc-4f7a-8b9c-000000000004', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'performance',          'App takes 8-10 seconds to load the home page on 4G.',                                 '1. Open app on 4G connection\n2. Wait for home page to load\n3. Observe delay',         'Redmi Note 12, Android 13, Chrome', 'open', NULL),
('c1b00005-cccc-4f7a-8b9c-000000000005', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'crash',                'App crashes when uploading a photo larger than 10MB in chat.',                         '1. Open a conversation\n2. Tap photo icon\n3. Select a 12MB image\n4. App crashes',     'iPhone 13, iOS 17.3, Safari',      'closed',      'Fixed in v1.2.3 — added client-side compression.');

COMMIT;
