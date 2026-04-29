-- ============================================================================
-- Tijarah Connect — UAT Seed: 13 SYSTEM
-- 15 system settings + 20 search synonyms
-- Schema: system_settings(id, key, value, type, "group", description)
--         search_synonyms(id, term, canonical_term, language)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SYSTEM SETTINGS (15)                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO system_settings (id, key, value, type, "group", description) VALUES
('a1500001-dddd-4f7a-8b9c-000000000001', 'app.name',                        'Tijarah Connect',               'string',  'general',       'Application display name'),
('a1500002-dddd-4f7a-8b9c-000000000002', 'app.version',                     '1.2.3',                         'string',  'general',       'Current app version'),
('a1500003-dddd-4f7a-8b9c-000000000003', 'app.maintenance_mode',            'false',                         'boolean', 'general',       'Enable maintenance mode'),
('a1500004-dddd-4f7a-8b9c-000000000004', 'app.support_email',               'support@tijarah.com',           'string',  'general',       'Support contact email'),
('a1500005-dddd-4f7a-8b9c-000000000005', 'app.support_phone',               '+919876543210',                 'string',  'general',       'Support contact phone'),
('a1500006-dddd-4f7a-8b9c-000000000006', 'search.radius_km',                '25',                            'number',  'search',        'Default search radius in km'),
('a1500007-dddd-4f7a-8b9c-000000000007', 'search.max_results',              '50',                            'number',  'search',        'Max search results per page'),
('a1500008-dddd-4f7a-8b9c-000000000008', 'search.min_rating_filter',        '1',                             'number',  'search',        'Minimum rating filter threshold'),
('a1500009-dddd-4f7a-8b9c-000000000009', 'provider.auto_approve',           'false',                         'boolean', 'provider',      'Auto-approve new providers'),
('a1500010-dddd-4f7a-8b9c-000000000010', 'provider.max_products',           '50',                            'number',  'provider',      'Max products per provider'),
('a1500011-dddd-4f7a-8b9c-000000000011', 'provider.max_photos',             '20',                            'number',  'provider',      'Max gallery photos per provider'),
('a1500012-dddd-4f7a-8b9c-000000000012', 'notification.batch_size',         '500',                           'number',  'notifications', 'Max batch size for push notifications'),
('a1500013-dddd-4f7a-8b9c-000000000013', 'moderation.auto_flag_threshold',  '3',                             'number',  'moderation',    'Auto-flag after N reports'),
('a1500014-dddd-4f7a-8b9c-000000000014', 'moderation.suspend_threshold',    '5',                             'number',  'moderation',    'Auto-suspend after N reports'),
('a1500015-dddd-4f7a-8b9c-000000000015', 'ads.cost_per_click_default',      '5.00',                          'number',  'ads',           'Default cost per click for sponsored listings');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SEARCH SYNONYMS (20)                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO search_synonyms (id, term, canonical_term, language) VALUES
('b1500001-eeee-4f7a-8b9c-000000000001', 'darzi',          'tailor',           'hi'),
('b1500002-eeee-4f7a-8b9c-000000000002', 'silai',          'stitching',        'hi'),
('b1500003-eeee-4f7a-8b9c-000000000003', 'khayyat',        'tailor',           'ar'),
('b1500004-eeee-4f7a-8b9c-000000000004', 'mehendi',        'mehndi',           'en'),
('b1500005-eeee-4f7a-8b9c-000000000005', 'mehandi',        'mehndi',           'en'),
('b1500006-eeee-4f7a-8b9c-000000000006', 'heena',          'henna',            'en'),
('b1500007-eeee-4f7a-8b9c-000000000007', 'bawarchi',       'cook',             'hi'),
('b1500008-eeee-4f7a-8b9c-000000000008', 'dabba',          'tiffin',           'hi'),
('b1500009-eeee-4f7a-8b9c-000000000009', 'mistri',         'plumber',          'hi'),
('b1500010-eeee-4f7a-8b9c-000000000010', 'karigar',        'craftsman',        'hi'),
('b1500011-eeee-4f7a-8b9c-000000000011', 'bijli',          'electrician',      'hi'),
('b1500012-eeee-4f7a-8b9c-000000000012', 'parlour',        'salon',            'en'),
('b1500013-eeee-4f7a-8b9c-000000000013', 'parlor',         'salon',            'en'),
('b1500014-eeee-4f7a-8b9c-000000000014', 'tasweer',        'photography',      'ar'),
('b1500015-eeee-4f7a-8b9c-000000000015', 'musawwir',       'photographer',     'ar'),
('b1500016-eeee-4f7a-8b9c-000000000016', 'ustaad',         'teacher',          'hi'),
('b1500017-eeee-4f7a-8b9c-000000000017', 'halwai',         'sweet shop',       'hi'),
('b1500018-eeee-4f7a-8b9c-000000000018', 'mithai',         'sweets',           'hi'),
('b1500019-eeee-4f7a-8b9c-000000000019', 'ghar ki marammat','home repair',     'hi'),
('b1500020-eeee-4f7a-8b9c-000000000020', 'tajmeel',        'beauty',           'ar');

COMMIT;
