-- ============================================================================
-- Tijarah Connect — UAT Seed: 03 PROVIDERS
-- 40 providers across 8 cities, varied statuses & features
-- + provider ↔ category mappings
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDERS (40)                                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO providers (id, user_id, brand_name, description, address, city, area, pincode, latitude, longitude, contact_number, open_time, close_time, is_available, profile_photo_url, banner_image_url, is_women_led, community_verified, status, is_featured, keywords) VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- MUMBAI (12 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P01: Fatima's Tailoring House — women-led, community-verified, featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Fatima''s Tailoring House',
 'Premium bespoke tailoring for women. Specialising in Rida work, bridal outfits, and everyday ethnic wear with 15+ years of experience.',
 'Shop 12, Saify Jubilee St, Bhendi Bazaar', 'Mumbai', 'Bhendi Bazaar', '400003',
 18.9565, 72.8335, '+919900000002', '10:00', '19:00', true,
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200',
 true, true, 'active', true,
 ARRAY['rida specialist','bridal wear','ethnic clothing','bespoke tailoring','women fashion']),

-- P02: Husain's Kitchen — community-verified, featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02',
 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43',
 'Husain''s Kitchen',
 'Authentic Bohri cuisine and catering for all occasions — from intimate dinners to grand weddings.',
 '3rd Floor, Najafi House, Mohammed Ali Rd', 'Mumbai', 'Mohammed Ali Rd', '400003',
 18.9550, 72.8328, '+919900000003', '08:00', '22:00', true,
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400',
 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200',
 false, true, 'active', true,
 ARRAY['bohri food','wedding catering','tiffin service','halal','traditional cuisine']),

-- P03: Sakina Mehndi Arts — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03',
 'd4e5f6a7-8b9c-4d0e-1f2a-3b4c5d6e7f80',
 'Sakina Mehndi Arts',
 'Intricate bridal and party mehndi designs. Arabic, Indian, and modern fusion styles. Home visits across Mumbai.',
 '45, Pakmodia St, Dongri', 'Mumbai', 'Dongri', '400009',
 18.9540, 72.8350, '+919900000004', '09:00', '20:00', true,
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200',
 true, false, 'active', false,
 ARRAY['bridal mehndi','arabic design','henna art','home visit','eid mehndi']),

-- P04: Rashida's Beauty Salon — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04',
 'e1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c',
 'Rashida''s Beauty Salon',
 'Premium ladies salon offering bridal makeup, hair treatments, facials, and complete grooming services.',
 '8, Clare Road, Byculla', 'Mumbai', 'Byculla', '400008',
 18.9784, 72.8328, '+919900000012', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
 true, false, 'active', false,
 ARRAY['bridal makeup','hair treatment','facial','ladies only','keratin']),

-- P05: Taher Event Planners — PENDING
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05',
 'f2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d',
 'Taher Event Planners',
 'Complete wedding and event planning — from intimate mehfils to grand celebrations.',
 '12, Worli Sea Face Road', 'Mumbai', 'Worli', '400018',
 19.0096, 72.8155, '+919900000015', '09:00', '22:00', true,
 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
 false, false, 'pending', false,
 ARRAY['wedding planner','event decorator','nikah planning','stage design','lighting']),

-- P06: Burhanuddin General Store
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06',
 '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
 'Burhanuddin General Store',
 'Community general store with groceries, dry fruits, and imported items. Wholesale and retail.',
 '22, Mazgaon Dock Rd', 'Mumbai', 'Mazgaon', '400010',
 18.9680, 72.8395, '+919900000030', '07:00', '22:00', true,
 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', NULL,
 false, false, 'active', false,
 ARRAY['grocery','dry fruits','imported','wholesale','halal products']),

-- P07: Tasneem Ladies Salon — women-led, featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07',
 '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
 'Tasneem Ladies Salon',
 'Exclusive ladies-only salon with premium products. Bridal packages, spa treatments, and hair care.',
 '15, Nagpada Cross Lane', 'Mumbai', 'Nagpada', '400008',
 18.9630, 72.8270, '+919900000031', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200',
 true, false, 'active', true,
 ARRAY['bridal package','spa','hair care','ladies only','nail art']),

-- P08: Shabbir AC & Appliance Repair
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08',
 '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
 'Shabbir AC & Appliance Repair',
 'Expert AC, refrigerator, and washing machine repair. Same-day service with 90-day warranty.',
 'Shop 5, Null Bazaar Cross Lane', 'Mumbai', 'Null Bazaar', '400003',
 18.9575, 72.8340, '+919900000032', '09:00', '21:00', true,
 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', NULL,
 false, true, 'active', false,
 ARRAY['AC repair','refrigerator repair','washing machine','same day','warranty']),

-- P09: Nafisa Cake Studio — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09',
 '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a',
 'Nafisa Cake Studio',
 'Artisan cakes, cupcakes, and dessert tables. Eggless options available. Custom designs for every occasion.',
 'Shop 8, Bandra West Market', 'Mumbai', 'Bandra', '400050',
 19.0596, 72.8295, '+919900000033', '09:00', '21:00', true,
 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200',
 true, false, 'active', false,
 ARRAY['custom cake','eggless','cupcake','dessert table','birthday cake']),

-- P10: Qaidjohar Plumbing Solutions
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10',
 '5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b',
 'Qaidjohar Plumbing Solutions',
 'Professional plumbing for residential and commercial. Emergency service 24/7. Licensed and insured.',
 '12, Dadar TT Circle', 'Mumbai', 'Dadar', '400014',
 19.0178, 72.8478, '+919900000034', '07:00', '23:00', true,
 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', NULL,
 false, false, 'active', false,
 ARRAY['plumbing','emergency','24/7','pipe repair','bathroom fitting']),

-- P11: Muffadal Photography — community-verified
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11',
 '6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c',
 'Muffadal Photography',
 'Cinematic wedding and event photography. Premium albums, drone shots, and same-day edits.',
 '5, Colaba Causeway', 'Mumbai', 'Colaba', '400005',
 18.9067, 72.8147, '+919900000035', '08:00', '22:00', true,
 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400',
 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1200',
 false, true, 'active', false,
 ARRAY['wedding video','cinematic','drone','same day edit','premium album']),

-- P12: Khadija Tuition Centre — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12',
 '7a8b9c0d-1e2f-4a3b-4c5d-6e7f8a9b0c1d',
 'Khadija Tuition Centre',
 'Expert coaching for CBSE, ICSE, and State boards. Quran memorization and Arabic classes also available.',
 '3, Mahim Causeway', 'Mumbai', 'Mahim', '400016',
 19.0395, 72.8430, '+919900000036', '07:00', '21:00', true,
 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', NULL,
 true, false, 'active', false,
 ARRAY['CBSE coaching','ICSE','quran hifz','arabic','home tuition']),

-- ═══════════════════════════════════════════════════════════════════════════
-- PUNE (6 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P13: Murtaza Tech Repairs — community-verified
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13',
 '8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e',
 'Murtaza Tech Repairs',
 'Expert mobile, laptop, and appliance repair with genuine parts. Same-day service for most repairs.',
 '22, MG Road, Camp Area', 'Pune', 'Camp', '411001',
 18.5195, 73.8553, '+919900000005', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400', NULL,
 false, true, 'active', false,
 ARRAY['iphone repair','samsung repair','laptop service','same day repair','genuine parts']),

-- P14: Amina's Tutoring Academy — IN REVIEW
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b14',
 '9c0d1e2f-3a4b-4c5d-6e7f-8a9b0c1d2e3f',
 'Amina''s Tutoring Academy',
 'Comprehensive coaching for CBSE/ICSE boards, competitive exams, and Quran classes.',
 'Lane 4, Koregaon Park', 'Pune', 'Koregaon Park', '411001',
 18.5362, 73.8930, '+919900000014', '08:00', '20:00', true,
 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', NULL,
 true, false, 'in_review', false,
 ARRAY['CBSE','ICSE','quran classes','hifz','maths tuition','science']),

-- P15: Aliasgar Woodcraft
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15',
 '0d1e2f3a-4b5c-4d6e-7f8a-9b0c1d2e3f4a',
 'Aliasgar Woodcraft & Carpentry',
 'Custom furniture, kitchen cabinets, and woodwork. Traditional and modern designs.',
 '8, Aundh Main Road', 'Pune', 'Aundh', '411007',
 18.5583, 73.8083, '+919900000037', '09:00', '19:00', true,
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', NULL,
 false, false, 'active', false,
 ARRAY['custom furniture','kitchen cabinet','woodwork','modular kitchen','carpenter']),

-- P16: Jumana Mehndi Studio — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16',
 '1e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
 'Jumana Mehndi Studio',
 'Creative mehndi and henna designs for all occasions. Bridal specialists with 8+ years experience.',
 '12, Viman Nagar Main Road', 'Pune', 'Viman Nagar', '411014',
 18.5679, 73.9143, '+919900000038', '10:00', '19:00', true,
 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400',
 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=1200',
 true, false, 'active', false,
 ARRAY['bridal henna','eid mehndi','party mehndi','arabic style','fusion design']),

-- P17: Saifee Catering & Events — featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17',
 '2f3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5b6c',
 'Saifee Catering & Events',
 'Premium catering for weddings, corporate events, and house parties. Mughlai, Bohri, and continental cuisines.',
 'Plot 5, Hadapsar Industrial Estate', 'Pune', 'Hadapsar', '411028',
 18.5089, 73.9260, '+919900000039', '07:00', '23:00', true,
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
 false, false, 'active', true,
 ARRAY['wedding caterer','corporate catering','mughlai','bohri thali','party food']),

-- P18: Insiya Beauty Studio — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b18',
 '3a4b5c6d-7e8f-4a9b-0c1d-2e3f4a5b6c7d',
 'Insiya Beauty Studio',
 'Modern beauty studio with organic products. Specialising in bridal makeover and skin treatments.',
 '7, Kalyani Nagar Main Road', 'Pune', 'Kalyani Nagar', '411006',
 18.5465, 73.9005, '+919900000040', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400',
 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200',
 true, false, 'active', false,
 ARRAY['organic beauty','bridal makeover','skin treatment','ladies only','facial']),

-- ═══════════════════════════════════════════════════════════════════════════
-- SURAT (5 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P19: Zahra's Sweet Corner — women-led, featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19',
 '4b5c6d7e-8f9a-4b0c-1d2e-3f4a5b6c7d8e',
 'Zahra''s Sweet Corner',
 'Handmade Bohri sweets and bakery items. Famous for malpua, halwa, and custom celebration cakes.',
 '7, Ring Road, Rander', 'Surat', 'Rander', '395005',
 21.1865, 72.7910, '+919900000006', '07:00', '21:00', true,
 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400',
 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1200',
 true, false, 'active', true,
 ARRAY['bohri sweets','malpua','halwa','eggless cake','fresh mithai']),

-- P20: Hatim Electrical Works
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20',
 '5c6d7e8f-9a0b-4c1d-2e3f-4a5b6c7d8e9f',
 'Hatim Electrical Works',
 'Licensed electrician for residential and commercial wiring. MCB installation, fan repair, and smart home setup.',
 '3, Athwa Lines Main Road', 'Surat', 'Athwa Lines', '395001',
 21.1790, 72.8070, '+919900000041', '08:00', '20:00', true,
 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400', NULL,
 false, false, 'active', false,
 ARRAY['electrical wiring','MCB','fan repair','smart home','licensed electrician']),

-- P21: Rukaiya Tailoring — women-led, community-verified
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21',
 '6d7e8f9a-0b1c-4d2e-3f4a-5b6c7d8e9f0a',
 'Rukaiya Tailoring & Boutique',
 'Modern and traditional tailoring. Specialising in salwar kameez, lehenga, and party wear.',
 '11, Varachha Road', 'Surat', 'Varachha', '395006',
 21.2089, 72.8570, '+919900000042', '10:00', '19:00', true,
 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200',
 true, true, 'active', false,
 ARRAY['salwar kameez','lehenga','party wear','tailoring','ladies fashion']),

-- P22: Mustafa Catering House
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22',
 '7e8f9a0b-1c2d-4e3f-4a5b-6c7d8e9f0a1b',
 'Mustafa Catering House',
 'Traditional Bohra thali and event catering. Specialising in dastarkhwan setup for community gatherings.',
 '5, Nanpura Gate Road', 'Surat', 'Nanpura', '395001',
 21.1700, 72.8200, '+919900000043', '06:00', '22:00', true,
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200',
 false, false, 'active', false,
 ARRAY['bohra thali','dastarkhwan','community catering','wedding food','halal']),

-- P23: Tahera Henna Art — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b23',
 '8f9a0b1c-2d3e-4f4a-5b6c-7d8e9f0a1b2c',
 'Tahera Henna Art',
 'Organic henna art with natural colours. Bridal, festive, and custom designs.',
 '9, Adajan Patiya Road', 'Surat', 'Adajan', '395009',
 21.1980, 72.7840, '+919900000044', '09:00', '19:00', true,
 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=400',
 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=1200',
 true, false, 'active', false,
 ARRAY['organic henna','natural colours','bridal mehndi','festive','custom design']),

-- ═══════════════════════════════════════════════════════════════════════════
-- BANGALORE (5 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P24: Noor Photography Studio
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24',
 '9a0b1c2d-3e4f-4a5b-6c7d-8e9f0a1b2c3d',
 'Noor Photography Studio',
 'Creative wedding and event photography. Cinematic videography, drone shots, and stunning photo albums.',
 '14, 1st Cross, Koramangala 5th Block', 'Bangalore', 'Koramangala', '560034',
 12.9352, 77.6245, '+919900000011', '09:00', '21:00', true,
 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400',
 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1200',
 false, false, 'active', false,
 ARRAY['wedding photography','drone photography','cinematic video','photo album','pre-wedding']),

-- P25: Amatullah's Sweet Box — women-led, featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25',
 '0b1c2d3e-4f5a-4b6c-7d8e-9f0a1b2c3d4e',
 'Amatullah''s Sweet Box',
 'Home-made traditional sweets and bakery. Ladoo, barfi, and festive gift boxes.',
 '22, Frazer Town Main Road', 'Bangalore', 'Frazer Town', '560005',
 12.9988, 77.6177, '+919900000045', '08:00', '20:00', true,
 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400',
 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=1200',
 true, false, 'active', true,
 ARRAY['ladoo','barfi','festive box','home made sweets','gift hamper']),

-- P26: Moiz Tech Hub
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b26',
 '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
 'Moiz Tech Hub',
 'Laptop, desktop, and networking solutions. Virus removal, data backup, and hardware upgrades.',
 '5, Whitefield Main Road', 'Bangalore', 'Whitefield', '560066',
 12.9698, 77.7500, '+919900000046', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', NULL,
 false, false, 'active', false,
 ARRAY['laptop repair','desktop','networking','virus removal','data backup']),

-- P27: Sakina Tuitions — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27',
 '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',
 'Sakina Tuitions',
 'Personalised home tuition for all subjects. State board and CBSE. Also offers Quran classes.',
 '8, Jayanagar 4th Block', 'Bangalore', 'Jayanagar', '560041',
 12.9308, 77.5838, '+919900000047', '07:00', '20:00', true,
 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400', NULL,
 true, false, 'active', false,
 ARRAY['home tuition','CBSE','state board','quran class','personalised']),

-- P28: Hussain Painting & Decor
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b28',
 '3e4f5a6b-7c8d-4e9f-0a1b-2c3d4e5f6a7b',
 'Hussain Painting & Interiors',
 'Professional house painting, texture work, and interior design consultation.',
 '10, HSR Layout Sector 2', 'Bangalore', 'HSR Layout', '560102',
 12.9116, 77.6389, '+919900000048', '08:00', '19:00', true,
 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400', NULL,
 false, false, 'active', false,
 ARRAY['house painting','texture','interior design','wall art','waterproofing']),

-- ═══════════════════════════════════════════════════════════════════════════
-- DELHI (5 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P29: Iqbal Home Services — community-verified
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29',
 '4f5a6b7c-8d9e-4f0a-1b2c-3d4e5f6a7b8c',
 'Iqbal Home Services',
 'Reliable plumbing, electrical, and deep cleaning in Delhi NCR. 24/7 emergency support.',
 'B-23, Lal Kuan, Chandni Chowk', 'Delhi', 'Chandni Chowk', '110006',
 28.6506, 77.2334, '+919900000013', '07:00', '23:00', true,
 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', NULL,
 false, true, 'active', false,
 ARRAY['plumbing','electrical','deep cleaning','24/7','emergency repair']),

-- P30: Zainab Fashion House — women-led, featured
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30',
 '5a6b7c8d-9e0f-4a1b-2c3d-4e5f6a7b8c9d',
 'Zainab Fashion House',
 'High-end bridal and party wear. Custom embroidery, zardozi, and contemporary Indo-Western designs.',
 '15, Nizamuddin West Market', 'Delhi', 'Nizamuddin', '110013',
 28.5922, 77.2441, '+919900000049', '11:00', '20:00', true,
 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400',
 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=1200',
 true, false, 'active', true,
 ARRAY['bridal wear','zardozi','indo-western','custom embroidery','party gown']),

-- P31: Abdeali Catering Services
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31',
 '6b7c8d9e-0f1a-4b2c-3d4e-5f6a7b8c9d0e',
 'Abdeali Catering Services',
 'North Indian and Mughlai catering for all events. Famous for biryani, kebabs, and shahi sweets.',
 '3, Jama Masjid Lane', 'Delhi', 'Jama Masjid', '110006',
 28.6507, 77.2334, '+919900000050', '06:00', '23:00', true,
 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200',
 false, false, 'active', false,
 ARRAY['mughlai','biryani','kebab','wedding caterer','shahi food']),

-- P32: Mariam Salon & Spa — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b32',
 '7c8d9e0f-1a2b-4c3d-4e5f-6a7b8c9d0e1f',
 'Mariam Salon & Spa',
 'Full-service ladies salon with spa, bridal packages, and advanced skin treatments.',
 '12, Lajpat Nagar Market', 'Delhi', 'Lajpat Nagar', '110024',
 28.5700, 77.2400, '+919900000051', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200',
 true, false, 'active', false,
 ARRAY['bridal makeup','spa','skin treatment','ladies salon','hair colour']),

-- P33: Hakimuddin Events & Decor
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33',
 '8d9e0f1a-2b3c-4d4e-5f6a-7b8c9d0e1f2a',
 'Hakimuddin Events & Decor',
 'Full-service event planning and decoration. Stage design, lighting, and floral arrangements.',
 '8, Sadar Bazaar Main Road', 'Delhi', 'Sadar Bazaar', '110006',
 28.6600, 77.2200, '+919900000052', '09:00', '22:00', true,
 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400',
 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200',
 false, false, 'active', false,
 ARRAY['wedding decor','stage design','lighting','floral','event planner']),

-- ═══════════════════════════════════════════════════════════════════════════
-- HYDERABAD (3 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P34: Juzer Photography
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34',
 '9e0f1a2b-3c4d-4e5f-6a7b-8c9d0e1f2a3b',
 'Juzer Photography',
 'Candid and traditional photography for weddings, pre-weddings, and corporate events.',
 '5, Tolichowki Main Road', 'Hyderabad', 'Tolichowki', '500008',
 17.3950, 78.4126, '+919900000053', '08:00', '21:00', true,
 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
 false, false, 'active', false,
 ARRAY['candid photography','traditional','corporate event','pre-wedding','nikah photo']),

-- P35: Fatema Home Chef — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35',
 '0f1a2b3c-4d5e-4f6a-7b8c-9d0e1f2a3b4c',
 'Fatema''s Home Kitchen',
 'Home-cooked authentic Bohri food. Daily tiffin, party orders, and catering for small gatherings.',
 '3, Banjara Hills Road 12', 'Hyderabad', 'Banjara Hills', '500034',
 17.4160, 78.4486, '+919900000054', '08:00', '21:00', true,
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
 true, false, 'active', false,
 ARRAY['home cooked','bohri food','tiffin','party order','halal']),

-- P36: Yusuf AC & Cooling
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36',
 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
 'Yusuf AC & Cooling Services',
 'AC installation, repair, and annual maintenance. Split and window units. AMC available.',
 '11, Mehdipatnam Cross Road', 'Hyderabad', 'Mehdipatnam', '500028',
 17.3925, 78.4372, '+919900000055', '08:00', '20:00', true,
 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', NULL,
 false, false, 'active', false,
 ARRAY['AC install','split AC','window AC','AMC','gas refill']),

-- ═══════════════════════════════════════════════════════════════════════════
-- AHMEDABAD (2 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P37: Arwa Boutique — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37',
 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
 'Arwa Boutique',
 'Designer ethnic wear and accessories. Ready-made and custom outfits for every occasion.',
 '8, Manek Chowk Lane', 'Ahmedabad', 'Manek Chowk', '380001',
 23.0225, 72.5714, '+919900000056', '10:00', '20:00', true,
 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400',
 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=1200',
 true, false, 'active', false,
 ARRAY['designer wear','ethnic accessories','ready made','custom outfit','festival fashion']),

-- P38: Taha Electronics
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38',
 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
 'Taha Electronics & Mobile',
 'Mobile sales, repair, and accessories. Screen guard, back cover, and charger wholesale.',
 '12, CG Road', 'Ahmedabad', 'CG Road', '380009',
 23.0300, 72.5600, '+919900000057', '10:00', '21:00', true,
 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400', NULL,
 false, false, 'active', false,
 ARRAY['mobile shop','accessories','screen guard','charger','repair']),

-- ═══════════════════════════════════════════════════════════════════════════
-- INDORE (2 providers)
-- ═══════════════════════════════════════════════════════════════════════════

-- P39: Sakina Home Services — women-led
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39',
 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8b',
 'Sakina Home Services',
 'Cleaning, organising, and home management. Deep cleaning, pest control, and laundry services.',
 '5, Rajwada Square', 'Indore', 'Rajwada', '452002',
 22.7196, 75.8577, '+919900000058', '07:00', '20:00', true,
 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', NULL,
 true, false, 'active', false,
 ARRAY['deep cleaning','pest control','laundry','home organising','house help']),

-- P40: Murtaza Event Decorator
('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40',
 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9c',
 'Murtaza Event Decorator',
 'Event decoration, tent house, and lighting for weddings, engagements, and mehfils.',
 '7, Sapna Sangeeta Road', 'Indore', 'Sapna Sangeeta', '452001',
 22.7180, 75.8650, '+919900000059', '08:00', '22:00', true,
 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
 false, false, 'active', false,
 ARRAY['tent house','lighting','flower decoration','stage','wedding setup']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PROVIDER ↔ CATEGORY MAPPING (60+ mappings)                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO provider_categories (id, provider_id, category_id) VALUES
-- P01 Fatima: Tailoring + Beauty
('d8a1b2c3-0001-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111101'),
('d8a1b2c3-0002-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P02 Husain: Catering + Events
('d8a1b2c3-0003-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111102'),
('d8a1b2c3-0004-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110'),
-- P03 Sakina: Mehndi + Beauty
('d8a1b2c3-0005-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111103'),
('d8a1b2c3-0006-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P04 Rashida: Beauty
('d8a1b2c3-0007-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P05 Taher: Events + Catering
('d8a1b2c3-0008-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110'),
('d8a1b2c3-0009-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111102'),
-- P06 Burhanuddin: Home Services (general store)
('d8a1b2c3-0010-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P07 Tasneem: Beauty
('d8a1b2c3-0011-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P08 Shabbir: Electronics + Home Services
('d8a1b2c3-0012-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111104'),
('d8a1b2c3-0013-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P09 Nafisa: Sweets
('d8a1b2c3-0014-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111105'),
-- P10 Qaidjohar: Home Services
('d8a1b2c3-0015-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P11 Muffadal: Photography + Events
('d8a1b2c3-0016-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111108'),
('d8a1b2c3-0017-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110'),
-- P12 Khadija: Tuition
('d8a1b2c3-0018-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111109'),
-- P13 Murtaza: Electronics + Home Services
('d8a1b2c3-0019-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111104'),
('d8a1b2c3-0020-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P14 Amina: Tuition
('d8a1b2c3-0021-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b14', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111109'),
-- P15 Aliasgar: Home Services
('d8a1b2c3-0022-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P16 Jumana: Mehndi
('d8a1b2c3-0023-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111103'),
-- P17 Saifee: Catering + Events
('d8a1b2c3-0024-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111102'),
('d8a1b2c3-0025-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110'),
-- P18 Insiya: Beauty
('d8a1b2c3-0026-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b18', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P19 Zahra: Sweets
('d8a1b2c3-0027-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111105'),
-- P20 Hatim: Home Services + Electronics
('d8a1b2c3-0028-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
('d8a1b2c3-0029-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111104'),
-- P21 Rukaiya: Tailoring
('d8a1b2c3-0030-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111101'),
-- P22 Mustafa: Catering
('d8a1b2c3-0031-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111102'),
-- P23 Tahera: Mehndi
('d8a1b2c3-0032-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b23', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111103'),
-- P24 Noor: Photography + Events
('d8a1b2c3-0033-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111108'),
('d8a1b2c3-0034-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110'),
-- P25 Amatullah: Sweets
('d8a1b2c3-0035-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111105'),
-- P26 Moiz: Electronics
('d8a1b2c3-0036-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b26', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111104'),
-- P27 Sakina Tuitions: Tuition
('d8a1b2c3-0037-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111109'),
-- P28 Hussain Painting: Home Services
('d8a1b2c3-0038-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b28', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P29 Iqbal: Home Services
('d8a1b2c3-0039-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P30 Zainab: Tailoring + Beauty
('d8a1b2c3-0040-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111101'),
('d8a1b2c3-0041-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P31 Abdeali: Catering
('d8a1b2c3-0042-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111102'),
-- P32 Mariam: Beauty
('d8a1b2c3-0043-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b32', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111107'),
-- P33 Hakimuddin: Events
('d8a1b2c3-0044-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110'),
-- P34 Juzer Photo: Photography
('d8a1b2c3-0045-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111108'),
-- P35 Fatema: Catering
('d8a1b2c3-0046-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111102'),
-- P36 Yusuf AC: Home Services + Electronics
('d8a1b2c3-0047-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
('d8a1b2c3-0048-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111104'),
-- P37 Arwa: Tailoring
('d8a1b2c3-0049-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111101'),
-- P38 Taha: Electronics
('d8a1b2c3-0050-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111104'),
-- P39 Sakina Home: Home Services
('d8a1b2c3-0051-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111106'),
-- P40 Murtaza Events: Events
('d8a1b2c3-0052-4f7a-8b9c-aabbccddeef1', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'b1a2c3d4-e5f6-4a7b-8c9d-111111111110');

COMMIT;
