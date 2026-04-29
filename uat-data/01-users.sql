-- ============================================================================
-- Tijarah Connect — UAT Seed: 01 USERS
-- 55 users: 2 admins, 40 provider-owners, 13 customers
-- Cities: Mumbai, Pune, Surat, Bangalore, Delhi, Hyderabad, Ahmedabad, Indore
-- ============================================================================

BEGIN;

INSERT INTO users (id, name, mobile_number, email, gender, role, city, area, pincode, latitude, longitude, status, preferred_mode, preferred_language, last_seen_at) VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMINS (2)
-- ═══════════════════════════════════════════════════════════════════════════
('3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', 'Admin Bohri',          '+919900000001', 'admin@tijarah.com',        'male',   'admin',    'Mumbai',     'Bhendi Bazaar',    '400003', 18.9560, 72.8340, 'active', 'customer', 'en', NOW() - INTERVAL '1 hour'),
('ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', 'Mufaddal Admin',       '+919900000099', 'mufaddal@tijarah.com',     'male',   'admin',    'Mumbai',     'Fort',             '400001', 18.9338, 72.8353, 'active', 'customer', 'en', NOW() - INTERVAL '3 hours'),

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVIDER OWNERS (40) — one user per provider
-- ═══════════════════════════════════════════════════════════════════════════
-- Mumbai providers (12)
('5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82', 'Fatima Tailor',        '+919900000002', 'fatima@example.com',       'female', 'customer', 'Mumbai',     'Bhendi Bazaar',    '400003', 18.9565, 72.8335, 'active', 'provider', 'en', NOW() - INTERVAL '30 minutes'),
('a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'Husain Caterer',       '+919900000003', 'husain@example.com',       'male',   'customer', 'Mumbai',     'Mohammed Ali Rd',  '400003', 18.9550, 72.8328, 'active', 'provider', 'en', NOW() - INTERVAL '2 hours'),
('d4e5f6a7-8b9c-4d0e-1f2a-3b4c5d6e7f80', 'Sakina Mehndi',        '+919900000004', 'sakina@example.com',       'female', 'customer', 'Mumbai',     'Dongri',           '400009', 18.9540, 72.8350, 'active', 'provider', 'hi', NOW() - INTERVAL '4 hours'),
('e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c', 'Rashida Beautician',   '+919900000012', 'rashida@example.com',      'female', 'customer', 'Mumbai',     'Byculla',          '400008', 18.9784, 72.8328, 'active', 'provider', 'en', NOW() - INTERVAL '12 hours'),
('f2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d', 'Taher Eventman',       '+919900000015', 'taher@example.com',        'male',   'customer', 'Mumbai',     'Worli',            '400018', 19.0096, 72.8155, 'active', 'provider', 'en', NOW() - INTERVAL '3 days'),
('1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', 'Burhanuddin Grocer',   '+919900000030', 'burhan@example.com',       'male',   'customer', 'Mumbai',     'Mazgaon',          '400010', 18.9680, 72.8395, 'active', 'provider', 'en', NOW() - INTERVAL '6 hours'),
('2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e', 'Tasneem Salon',        '+919900000031', 'tasneem@example.com',      'female', 'customer', 'Mumbai',     'Nagpada',          '400008', 18.9630, 72.8270, 'active', 'provider', 'en', NOW() - INTERVAL '5 hours'),
('3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f', 'Shabbir AC Repair',    '+919900000032', 'shabbir@example.com',      'male',   'customer', 'Mumbai',     'Null Bazaar',      '400003', 18.9575, 72.8340, 'active', 'provider', 'hi', NOW() - INTERVAL '8 hours'),
('4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a', 'Nafisa Cake Studio',   '+919900000033', 'nafisa@example.com',       'female', 'customer', 'Mumbai',     'Bandra',           '400050', 19.0596, 72.8295, 'active', 'provider', 'en', NOW() - INTERVAL '10 hours'),
('5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b', 'Qaidjohar Plumber',    '+919900000034', 'qaidjohar@example.com',    'male',   'customer', 'Mumbai',     'Dadar',            '400014', 19.0178, 72.8478, 'active', 'provider', 'hi', NOW() - INTERVAL '1 day'),
('6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c', 'Muffadal Photographer','+919900000035', 'muffadal@example.com',     'male',   'customer', 'Mumbai',     'Colaba',           '400005', 18.9067, 72.8147, 'active', 'provider', 'en', NOW() - INTERVAL '14 hours'),
('7a8b9c0d-1e2f-4a3b-4c5d-6e7f8a9b0c1d', 'Khadija Tutor',        '+919900000036', 'khadija@example.com',      'female', 'customer', 'Mumbai',     'Mahim',            '400016', 19.0395, 72.8430, 'active', 'provider', 'en', NOW() - INTERVAL '18 hours'),

-- Pune providers (6)
('8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e', 'Murtaza Electronics',  '+919900000005', 'murtaza@example.com',      'male',   'customer', 'Pune',       'Camp',             '411001', 18.5195, 73.8553, 'active', 'provider', 'en', NOW() - INTERVAL '1 day'),
('9c0d1e2f-3a4b-4c5d-6e7f-8a9b0c1d2e3f', 'Amina Tutor',          '+919900000014', 'amina@example.com',        'female', 'customer', 'Pune',       'Koregaon Park',    '411001', 18.5362, 73.8930, 'active', 'provider', 'en', NOW() - INTERVAL '2 days'),
('0d1e2f3a-4b5c-4d6e-7f8a-9b0c1d2e3f4a', 'Aliasgar Carpenter',   '+919900000037', 'aliasgar@example.com',     'male',   'customer', 'Pune',       'Aundh',            '411007', 18.5583, 73.8083, 'active', 'provider', 'en', NOW() - INTERVAL '1 day'),
('1e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b', 'Jumana Mehndi',        '+919900000038', 'jumana@example.com',       'female', 'customer', 'Pune',       'Viman Nagar',      '411014', 18.5679, 73.9143, 'active', 'provider', 'hi', NOW() - INTERVAL '2 days'),
('2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c', 'Saifee Caterer',       '+919900000039', 'saifee@example.com',       'male',   'customer', 'Pune',       'Hadapsar',         '411028', 18.5089, 73.9260, 'active', 'provider', 'en', NOW() - INTERVAL '3 days'),
('3a4b5c6d-7e8f-4a9b-0c1d-2e3f4a5b6c7d', 'Insiya Beauty Studio', '+919900000040', 'insiya@example.com',       'female', 'customer', 'Pune',       'Kalyani Nagar',    '411006', 18.5465, 73.9005, 'active', 'provider', 'en', NOW() - INTERVAL '4 days'),

-- Surat providers (5)
('4b5c6d7e-8f9a-4b0c-1d2e-3f4a5b6c7d8e', 'Zahra Sweets',         '+919900000006', 'zahra@example.com',        'female', 'customer', 'Surat',      'Rander',           '395005', 21.1865, 72.7910, 'active', 'provider', 'en', NOW() - INTERVAL '6 hours'),
('5c6d7e8f-9a0b-4c1d-2e3f-4a5b6c7d8e9f', 'Hatim Electrical',     '+919900000041', 'hatim@example.com',        'male',   'customer', 'Surat',      'Athwa Lines',      '395001', 21.1790, 72.8070, 'active', 'provider', 'hi', NOW() - INTERVAL '1 day'),
('6d7e8f9a-0b1c-4d2e-3f4a-5b6c7d8e9f0a', 'Rukaiya Tailor',       '+919900000042', 'rukaiya@example.com',      'female', 'customer', 'Surat',      'Varachha',         '395006', 21.2089, 72.8570, 'active', 'provider', 'en', NOW() - INTERVAL '2 days'),
('7e8f9a0b-1c2d-4e3f-4a5b-6c7d8e9f0a1b', 'Mustafa Catering',     '+919900000043', 'mustafa@example.com',      'male',   'customer', 'Surat',      'Nanpura',          '395001', 21.1700, 72.8200, 'active', 'provider', 'en', NOW() - INTERVAL '3 days'),
('8f9a0b1c-2d3e-4f4a-5b6c-7d8e9f0a1b2c', 'Tahera Henna Art',     '+919900000044', 'tahera@example.com',       'female', 'customer', 'Surat',      'Adajan',           '395009', 21.1980, 72.7840, 'active', 'provider', 'hi', NOW() - INTERVAL '5 days'),

-- Bangalore providers (5)
('9a0b1c2d-3e4f-4a5b-6c7d-8e9f0a1b2c3d', 'Noor Photographer',    '+919900000011', 'noor@example.com',         'male',   'customer', 'Bangalore',  'Koramangala',      '560034', 12.9352, 77.6245, 'active', 'provider', 'en', NOW() - INTERVAL '8 hours'),
('0b1c2d3e-4f5a-4b6c-7d8e-9f0a1b2c3d4e', 'Amatullah Sweets',     '+919900000045', 'amatullah@example.com',    'female', 'customer', 'Bangalore',  'Frazer Town',      '560005', 12.9988, 77.6177, 'active', 'provider', 'en', NOW() - INTERVAL '9 hours'),
('1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', 'Moiz Tech Hub',        '+919900000046', 'moiz@example.com',         'male',   'customer', 'Bangalore',  'Whitefield',       '560066', 12.9698, 77.7500, 'active', 'provider', 'en', NOW() - INTERVAL '16 hours'),
('2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a', 'Sakina Tuitions',      '+919900000047', 'sakinab@example.com',      'female', 'customer', 'Bangalore',  'Jayanagar',        '560041', 12.9308, 77.5838, 'active', 'provider', 'en', NOW() - INTERVAL '20 hours'),
('3e4f5a6b-7c8d-4e9f-0a1b-2c3d4e5f6a7b', 'Hussain Painter',      '+919900000048', 'hussainp@example.com',     'male',   'customer', 'Bangalore',  'HSR Layout',       '560102', 12.9116, 77.6389, 'active', 'provider', 'en', NOW() - INTERVAL '1 day'),

-- Delhi providers (5)
('4f5a6b7c-8d9e-4f0a-1b2c-3d4e5f6a7b8c', 'Iqbal Handyman',       '+919900000013', 'iqbal@example.com',        'male',   'customer', 'Delhi',      'Chandni Chowk',    '110006', 28.6506, 77.2334, 'active', 'provider', 'hi', NOW() - INTERVAL '1 day'),
('5a6b7c8d-9e0f-4a1b-2c3d-4e5f6a7b8c9d', 'Zainab Fashion House', '+919900000049', 'zainab@example.com',       'female', 'customer', 'Delhi',      'Nizamuddin',       '110013', 28.5922, 77.2441, 'active', 'provider', 'en', NOW() - INTERVAL '2 days'),
('6b7c8d9e-0f1a-4b2c-3d4e-5f6a7b8c9d0e', 'Abdeali Caterer',      '+919900000050', 'abdeali@example.com',      'male',   'customer', 'Delhi',      'Jama Masjid',      '110006', 28.6507, 77.2334, 'active', 'provider', 'hi', NOW() - INTERVAL '3 days'),
('7c8d9e0f-1a2b-4c3d-4e5f-6a7b8c9d0e1f', 'Mariam Salon',         '+919900000051', 'mariam@example.com',       'female', 'customer', 'Delhi',      'Lajpat Nagar',     '110024', 28.5700, 77.2400, 'active', 'provider', 'en', NOW() - INTERVAL '4 days'),
('8d9e0f1a-2b3c-4d4e-5f6a-7b8c9d0e1f2a', 'Hakimuddin Events',    '+919900000052', 'hakim@example.com',        'male',   'customer', 'Delhi',      'Sadar Bazaar',     '110006', 28.6600, 77.2200, 'active', 'provider', 'en', NOW() - INTERVAL '5 days'),

-- Hyderabad providers (3)
('9e0f1a2b-3c4d-4e5f-6a7b-8c9d0e1f2a3b', 'Juzer Photographer',   '+919900000053', 'juzerp@example.com',       'male',   'customer', 'Hyderabad',  'Tolichowki',       '500008', 17.3950, 78.4126, 'active', 'provider', 'en', NOW() - INTERVAL '7 hours'),
('0f1a2b3c-4d5e-4f6a-7b8c-9d0e1f2a3b4c', 'Fatema Home Chef',     '+919900000054', 'fatemac@example.com',      'female', 'customer', 'Hyderabad',  'Banjara Hills',    '500034', 17.4160, 78.4486, 'active', 'provider', 'en', NOW() - INTERVAL '11 hours'),
('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Yusuf AC Service',     '+919900000055', 'yusufac@example.com',      'male',   'customer', 'Hyderabad',  'Mehdipatnam',      '500028', 17.3925, 78.4372, 'active', 'provider', 'hi', NOW() - INTERVAL '15 hours'),

-- Ahmedabad providers (2)
('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Arwa Boutique',        '+919900000056', 'arwa@example.com',         'female', 'customer', 'Ahmedabad',  'Manek Chowk',      '380001', 23.0225, 72.5714, 'active', 'provider', 'en', NOW() - INTERVAL '2 days'),
('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'Taha Electronics',     '+919900000057', 'taha@example.com',         'male',   'customer', 'Ahmedabad',  'CG Road',          '380009', 23.0300, 72.5600, 'active', 'provider', 'en', NOW() - INTERVAL '3 days'),

-- Indore providers (2)
('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8b', 'Sakina Home Services', '+919900000058', 'sakinah@example.com',      'female', 'customer', 'Indore',     'Rajwada',          '452002', 22.7196, 75.8577, 'active', 'provider', 'hi', NOW() - INTERVAL '4 days'),
('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9c', 'Murtaza Decorator',    '+919900000059', 'murtazad@example.com',     'male',   'customer', 'Indore',     'Sapna Sangeeta',   '452001', 22.7180, 75.8650, 'active', 'provider', 'en', NOW() - INTERVAL '6 days'),

-- ═══════════════════════════════════════════════════════════════════════════
-- CUSTOMERS (13)
-- ═══════════════════════════════════════════════════════════════════════════
('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 'Ahmed Bohra',          '+919900000020', 'ahmed@example.com',        'male',   'customer', 'Mumbai',     'Malabar Hill',     '400006', 18.9598, 72.8040, 'active', 'customer', 'en', NOW() - INTERVAL '15 minutes'),
('a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 'Aisha Merchant',       '+919900000021', 'aisha@example.com',        'female', 'customer', 'Mumbai',     'Bhendi Bazaar',    '400003', 18.9558, 72.8332, 'active', 'customer', 'en', NOW() - INTERVAL '45 minutes'),
('b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 'Maryam Shabbir',       '+919900000022', 'maryam@example.com',       'female', 'customer', 'Pune',       'Koregaon Park',    '411001', 18.5362, 73.8930, 'active', 'customer', 'en', NOW() - INTERVAL '3 hours'),
('c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'Yusuf Contractor',     '+919900000023', 'yusuf@example.com',        'male',   'customer', 'Surat',      'Athwa Lines',      '395001', 21.1790, 72.8070, 'active', 'customer', 'en', NOW() - INTERVAL '5 hours'),
('d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'Ruqaiya Fakhri',       '+919900000024', 'ruqaiya@example.com',      'female', 'customer', 'Bangalore',  'Indiranagar',      '560038', 12.9716, 77.6412, 'active', 'customer', 'en', NOW() - INTERVAL '1 day'),
('e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 'Abbas Dawoodi',        '+919900000025', 'abbas@example.com',        'male',   'customer', 'Delhi',      'Nizamuddin',       '110013', 28.5922, 77.2441, 'active', 'customer', 'hi', NOW() - INTERVAL '2 days'),
('f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 'Munira Hakimji',       '+919900000026', 'munira@example.com',       'female', 'customer', 'Mumbai',     'Nagpada',          '400008', 18.9630, 72.8270, 'suspended', 'customer', 'en', NULL),
('a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 'Juzer Rangoonwala',    '+919900000027', 'juzer@example.com',        'male',   'customer', 'Surat',      'Varachha',         '395006', 21.2089, 72.8570, 'active', 'customer', 'en', NOW() - INTERVAL '10 hours'),
('b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 'Taufiq Hakimi',        '+919900000060', 'taufiq@example.com',       'male',   'customer', 'Hyderabad',  'Tolichowki',       '500008', 17.3950, 78.4126, 'active', 'customer', 'en', NOW() - INTERVAL '4 hours'),
('c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 'Zainab Customer',      '+919900000061', 'zainabc@example.com',      'female', 'customer', 'Ahmedabad',  'Manek Chowk',      '380001', 23.0225, 72.5714, 'active', 'customer', 'en', NOW() - INTERVAL '7 hours'),
('d7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 'Hussain Limdi',        '+919900000062', 'hussainl@example.com',     'male',   'customer', 'Indore',     'Rajwada',          '452002', 22.7196, 75.8577, 'active', 'customer', 'hi', NOW() - INTERVAL '9 hours'),
('e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 'Sakina Wala',          '+919900000063', 'sakinaw@example.com',      'female', 'customer', 'Mumbai',     'Grant Road',       '400007', 18.9630, 72.8190, 'active', 'customer', 'en', NOW() - INTERVAL '11 hours'),
('f9a0b1c2-d3e4-4f5a-6b7c-8d9e0f1a2b3c', 'Ali Merchant',         '+919900000064', 'alim@example.com',         'male',   'customer', 'Pune',       'Hinjawadi',        '411057', 18.5573, 73.9346, 'active', 'customer', 'en', NOW() - INTERVAL '13 hours');

-- Google SSO user (demonstrates SSO feature)
UPDATE users SET
  google_id    = 'google-oauth2|112233445566778899',
  google_email = 'ahmed.bohra@gmail.com',
  google_name  = 'Ahmed Bohra',
  sso_provider = 'google'
WHERE id = 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d';

-- Paused user (demonstrates pause feature)
UPDATE users SET
  status       = 'paused',
  paused_at    = NOW() - INTERVAL '5 days'
WHERE id = 'f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c';

COMMIT;
