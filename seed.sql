-- ============================================================
-- Bohri Connect / TijarahConnect â€” Development Seed Data
-- Run in Supabase SQL Editor or via psql
-- ============================================================

-- Clean existing data (order matters due to FK constraints)
TRUNCATE review_reports, review_photos, reviews, products, photos,
         listing_categories, listings, verifications, providers, users, categories
         CASCADE;

-- ============================================================
-- 1. USERS (20 users: 1 admin, 15 customers, 4 providers)
-- ============================================================
INSERT INTO users (id, mobile_number, email, name, gender, role, city, area, pincode, status, created_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', '9876543210', 'adeeb@tijarahconnect.com',   'Adeeb Shah',          'male',   'admin',    'Mumbai',     'Malabar Hill',    '400006', 'active', NOW() - INTERVAL '90 days', NOW()),
  ('a0000000-0000-4000-8000-000000000002', '9876543211', 'fatema.b@example.com',        'Fatema Bohra',        'female', 'customer', 'Mumbai',     'Bhendi Bazaar',   '400003', 'active', NOW() - INTERVAL '80 days', NOW()),
  ('a0000000-0000-4000-8000-000000000003', '9876543212', 'sakina.r@example.com',        'Sakina Rangwala',     'female', 'customer', 'Pune',       'Camp',            '411001', 'active', NOW() - INTERVAL '75 days', NOW()),
  ('a0000000-0000-4000-8000-000000000004', '9876543213', 'murtaza.k@example.com',       'Murtaza Kanchwala',   'male',   'customer', 'Surat',      'Nanpura',         '395001', 'active', NOW() - INTERVAL '70 days', NOW()),
  ('a0000000-0000-4000-8000-000000000005', '9876543214', 'taher.s@example.com',         'Taher Saifee',        'male',   'customer', 'Udaipur',    'Hathi Pole',      '313001', 'active', NOW() - INTERVAL '65 days', NOW()),
  ('a0000000-0000-4000-8000-000000000006', '9876543215', 'zahra.m@example.com',         'Zahra Mithawala',     'female', 'customer', 'Mumbai',     'Dongri',          '400009', 'active', NOW() - INTERVAL '60 days', NOW()),
  ('a0000000-0000-4000-8000-000000000007', '9876543216', 'ayman.d@example.com',         'Ayman Dahodwala',     'male',   'customer', 'Ahmedabad',  'Jamalpur',        '380001', 'active', NOW() - INTERVAL '55 days', NOW()),
  ('a0000000-0000-4000-8000-000000000008', '9876543217', 'nafisa.t@example.com',        'Nafisa Tawawala',     'female', 'customer', 'Burhanpur',  'Lal Bagh',        '450331', 'active', NOW() - INTERVAL '50 days', NOW()),
  ('a0000000-0000-4000-8000-000000000009', '9876543218', 'husain.j@example.com',        'Husain Jamali',       'male',   'customer', 'Indore',     'Rajwada',         '452002', 'active', NOW() - INTERVAL '45 days', NOW()),
  ('a0000000-0000-4000-8000-000000000010', '9876543219', 'ruqaiya.p@example.com',       'Ruqaiya Poonawala',   'female', 'customer', 'Mumbai',     'Mohammed Ali Rd', '400003', 'active', NOW() - INTERVAL '40 days', NOW()),
  ('a0000000-0000-4000-8000-000000000011', '9876543220', 'abbas.c@example.com',         'Abbas Chitalwala',    'male',   'customer', 'Surat',      'Varachha',        '395006', 'active', NOW() - INTERVAL '35 days', NOW()),
  ('a0000000-0000-4000-8000-000000000012', '9876543221', 'munira.b@example.com',        'Munira Badri',        'female', 'customer', 'Pune',       'Kondhwa',         '411048', 'active', NOW() - INTERVAL '30 days', NOW()),
  ('a0000000-0000-4000-8000-000000000013', '9876543222', 'qaid.l@example.com',          'Qaid Lokhandwala',    'male',   'customer', 'Mumbai',     'Byculla',         '400008', 'active', NOW() - INTERVAL '25 days', NOW()),
  ('a0000000-0000-4000-8000-000000000014', '9876543223', 'jumana.v@example.com',        'Jumana Vahora',       'female', 'customer', 'Vadodara',   'Fatehpura',       '390001', 'active', NOW() - INTERVAL '20 days', NOW()),
  ('a0000000-0000-4000-8000-000000000015', '9876543224', 'mustafa.g@example.com',       'Mustafa Gallawala',   'male',   'customer', 'Ahmedabad',  'Shahpur',         '380001', 'active', NOW() - INTERVAL '15 days', NOW()),
  -- These 5 users are also providers
  ('a0000000-0000-4000-8000-000000000016', '9876543225', 'maryam.h@example.com',        'Maryam Hakimuddin',   'female', 'customer', 'Mumbai',     'Bhendi Bazaar',   '400003', 'active', NOW() - INTERVAL '85 days', NOW()),
  ('a0000000-0000-4000-8000-000000000017', '9876543226', 'insiya.k@example.com',        'Insiya Kothawala',    'female', 'customer', 'Surat',      'Nanpura',         '395001', 'active', NOW() - INTERVAL '82 days', NOW()),
  ('a0000000-0000-4000-8000-000000000018', '9876543227', 'rashida.s@example.com',       'Rashida Shakir',      'female', 'customer', 'Pune',       'Camp',            '411001', 'active', NOW() - INTERVAL '78 days', NOW()),
  ('a0000000-0000-4000-8000-000000000019', '9876543228', 'tasneem.m@example.com',       'Tasneem Motiwala',    'female', 'customer', 'Udaipur',    'Chetak Circle',   '313001', 'active', NOW() - INTERVAL '76 days', NOW()),
  ('a0000000-0000-4000-8000-000000000020', '9876543229', 'alifiya.d@example.com',       'Alifiya Dawoodi',     'female', 'customer', 'Ahmedabad',  'Jamalpur',        '380001', 'active', NOW() - INTERVAL '73 days', NOW());

-- ============================================================
-- 2. CATEGORIES (10 parent + 10 sub-categories = 20)
-- ============================================================
INSERT INTO categories (id, parent_id, name, slug, description, is_active, display_order, created_at, updated_at) VALUES
  -- Parent categories
  ('b0000000-0000-4000-8000-000000000001', NULL, 'Food & Catering',      'food-catering',        'Home-cooked food, tiffin services, catering',        true, 1,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000002', NULL, 'Clothing & Fashion',   'clothing-fashion',     'Traditional & modern clothing, tailoring',            true, 2,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000003', NULL, 'Beauty & Wellness',    'beauty-wellness',      'Salon, spa, skincare, mehndi',                        true, 3,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000004', NULL, 'Home Decor & Crafts',  'home-decor-crafts',    'Handmade crafts, interior decor, event decor',        true, 4,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000005', NULL, 'Education & Tutoring', 'education-tutoring',   'Quran classes, academic tuition, skill workshops',    true, 5,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000006', NULL, 'Health & Fitness',     'health-fitness',       'Nutrition, yoga, fitness coaching',                   true, 6,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000007', NULL, 'Event Services',       'event-services',       'Event planning, photography, entertainment',          true, 7,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000008', NULL, 'IT & Digital',         'it-digital',           'Web development, graphic design, social media',       true, 8,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000009', NULL, 'Grocery & Essentials', 'grocery-essentials',   'Daily needs, organic products, spices',               true, 9,  NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000010', NULL, 'Professional Services','professional-services','Accounting, legal, consulting',                       true, 10, NOW(), NOW()),
  -- Sub-categories
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Tiffin Service',       'tiffin-service',       'Daily tiffin delivery', true, 1, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'Catering',             'catering',             'Bulk & event catering', true, 2, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000002', 'Rida & Burqa',         'rida-burqa',           'Traditional Bohra attire', true, 1, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000002', 'Tailoring',            'tailoring',            'Custom stitching & alterations', true, 2, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000003', 'Mehndi Art',           'mehndi-art',           'Bridal & festive mehndi', true, 1, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000003', 'Skincare',             'skincare',             'Facials, skincare routines', true, 2, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000005', 'Quran Tuition',        'quran-tuition',        'Online & offline Quran classes', true, 1, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000005', 'Academic Tuition',     'academic-tuition',     'School & college tuition', true, 2, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000007', 'Event Photography',    'event-photography',    'Wedding & event photography', true, 1, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000008', 'Social Media Marketing','social-media-marketing','Instagram, FB marketing', true, 1, NOW(), NOW());

-- ============================================================
-- 3. PROVIDERS (5 providers linked to users 16-20)
-- ============================================================
INSERT INTO providers (id, user_id, brand_name, description, address, city, area, pincode, latitude, longitude, contact_number, open_time, close_time, is_available, status, created_at, updated_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000016', 'Maryam''s Kitchen',       'Authentic Bohra home-cooked food & catering for all occasions', '12, Bohri Mohalla, Bhendi Bazaar', 'Mumbai', 'Bhendi Bazaar', '400003', 18.9647, 72.8358, '9876543225', '08:00', '20:00', true,  'active', NOW() - INTERVAL '80 days', NOW()),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000017', 'Insiya Couture',          'Designer Ridas, Burqas & modern ethnic wear with custom fitting', '45, Nanpura Market', 'Surat', 'Nanpura', '395001', 21.1959, 72.8302, '9876543226', '10:00', '19:00', true,  'active', NOW() - INTERVAL '78 days', NOW()),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000018', 'Glow by Rashida',         'Professional mehndi art, bridal packages & skincare treatments', '8, Camp Area', 'Pune', 'Camp', '411001', 18.5196, 73.8553, '9876543227', '09:00', '18:00', true,  'active', NOW() - INTERVAL '75 days', NOW()),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000019', 'Noor Academy',            'Quran classes, Arabic & academic tutoring for children & adults', '22, Chetak Circle', 'Udaipur', 'Chetak Circle', '313001', 24.5854, 73.7125, '9876543228', '07:00', '21:00', true,  'active', NOW() - INTERVAL '72 days', NOW()),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000020', 'Alifiya Digital Studio',  'Social media marketing, graphic design & web development', '15, CG Road, Jamalpur', 'Ahmedabad', 'Jamalpur', '380001', 23.0225, 72.5714, '9876543229', '10:00', '18:00', false, 'active', NOW() - INTERVAL '70 days', NOW());

-- ============================================================
-- 4. VERIFICATIONS (5 â€” one per provider user)
-- ============================================================
INSERT INTO verifications (id, user_id, aadhaar_doc_url, aadhaar_status, ijamat_number, ijamat_expiry, ijamat_doc_url, ijamat_status, status, admin_notes, reviewed_at, reviewed_by) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000016', 'https://storage.example.com/verif/aadhaar_16.pdf', 'approved', 'IJ-2024-0016', '2027-12-31', 'https://storage.example.com/verif/ijamat_16.pdf', 'approved', 'approved', 'All documents verified',      NOW() - INTERVAL '70 days', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000017', 'https://storage.example.com/verif/aadhaar_17.pdf', 'approved', 'IJ-2024-0017', '2028-06-30', 'https://storage.example.com/verif/ijamat_17.pdf', 'approved', 'approved', 'Verified - all clear',        NOW() - INTERVAL '68 days', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000018', 'https://storage.example.com/verif/aadhaar_18.pdf', 'approved', NULL, NULL, NULL, 'not_submitted', 'approved', 'Aadhaar approved, no ijamat', NOW() - INTERVAL '65 days', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000019', 'https://storage.example.com/verif/aadhaar_19.pdf', 'pending',  'IJ-2024-0019', '2026-12-31', 'https://storage.example.com/verif/ijamat_19.pdf', 'pending', 'pending', NULL, NULL, NULL),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000020', 'https://storage.example.com/verif/aadhaar_20.pdf', 'rejected', NULL, NULL, NULL, 'not_submitted', 'rejected', 'Aadhaar image blurry, please re-upload', NOW() - INTERVAL '60 days', 'a0000000-0000-4000-8000-000000000001');

-- ============================================================
-- 5. LISTINGS (20 listings across the 5 providers)
-- ============================================================
INSERT INTO listings (id, provider_id, business_name, description, contact_phone, city, area, pincode, latitude, longitude, is_women_led, community_verified, status, submitted_at, approved_at, updated_at) VALUES
  -- Maryam's Kitchen (provider user 16) - 4 listings
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Maryam''s Daily Tiffin',       'Fresh home-cooked Bohra thaal delivered daily. Includes dal-chawal, rotla, sabzi & dessert.', '9876543225', 'Mumbai', 'Bhendi Bazaar', '400003', 18.9647, 72.8358, true,  true,  'live',     NOW() - INTERVAL '78 days', NOW() - INTERVAL '75 days', NOW()),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Maryam''s Party Catering',     'Full catering for weddings, milad & community gatherings. Min 50 pax.', '9876543225', 'Mumbai', 'Bhendi Bazaar', '400003', 18.9647, 72.8358, true,  true,  'live',     NOW() - INTERVAL '76 days', NOW() - INTERVAL '73 days', NOW()),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Maryam''s Mithai Box',         'Traditional Bohra sweets â€” malida, halwo, khajur pak. Gift boxes available.', '9876543225', 'Mumbai', 'Dongri', '400009', 18.9590, 72.8370, true,  false, 'live',     NOW() - INTERVAL '60 days', NOW() - INTERVAL '58 days', NOW()),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'Maryam''s Cooking Classes',    'Learn authentic Bohra recipes. Weekend batches available.', '9876543225', 'Mumbai', 'Bhendi Bazaar', '400003', 18.9647, 72.8358, true,  false, 'pending',  NOW() - INTERVAL '5 days', NULL, NOW()),
  -- Insiya Couture (provider user 17) - 4 listings
  ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'Designer Rida Collection',     'Handcrafted Ridas with contemporary designs. Ready-made & custom sizes.', '9876543226', 'Surat', 'Nanpura', '395001', 21.1959, 72.8302, true,  true,  'live',     NOW() - INTERVAL '75 days', NOW() - INTERVAL '72 days', NOW()),
  ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000002', 'Custom Tailoring Service',     'Perfect fit guaranteed. Blouse, kurta, ethnic wear stitching.', '9876543226', 'Surat', 'Nanpura', '395001', 21.1959, 72.8302, true,  false, 'live',     NOW() - INTERVAL '70 days', NOW() - INTERVAL '68 days', NOW()),
  ('e0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'Bridal Trousseau Package',     'Complete bridal outfit package â€” Rida, lehnga, accessories.', '9876543226', 'Surat', 'Nanpura', '395001', 21.1959, 72.8302, true,  true,  'live',     NOW() - INTERVAL '65 days', NOW() - INTERVAL '62 days', NOW()),
  ('e0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000002', 'Kids Ethnic Wear',             'Traditional outfits for boys & girls. Festive collection.', '9876543226', 'Surat', 'Varachha', '395006', 21.2138, 72.8686, true,  false, 'pending',  NOW() - INTERVAL '3 days', NULL, NOW()),
  -- Glow by Rashida (provider user 18) - 4 listings
  ('e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000003', 'Bridal Mehndi Package',        'Intricate bridal mehndi for hands & feet. Arabic & Indian styles.', '9876543227', 'Pune', 'Camp', '411001', 18.5196, 73.8553, true,  true,  'live',     NOW() - INTERVAL '72 days', NOW() - INTERVAL '70 days', NOW()),
  ('e0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000003', 'Organic Facial Treatment',     'Chemical-free facial using natural ingredients. Suitable for all skin types.', '9876543227', 'Pune', 'Camp', '411001', 18.5196, 73.8553, true,  false, 'live',     NOW() - INTERVAL '68 days', NOW() - INTERVAL '66 days', NOW()),
  ('e0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000003', 'Party Mehndi Service',         'Quick mehndi for events, Eid & milad. Group discounts available.', '9876543227', 'Pune', 'Kondhwa', '411048', 18.4638, 73.8943, true,  false, 'live',     NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days', NOW()),
  ('e0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000003', 'Home Spa Package',             'Relaxing spa at your doorstep â€” massage, scrub, facial combo.', '9876543227', 'Pune', 'Camp', '411001', 18.5196, 73.8553, true,  false, 'rejected', NOW() - INTERVAL '40 days', NULL, NOW()),
  -- Noor Academy (provider user 19) - 4 listings
  ('e0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000004', 'Quran Hifz Program',           'Structured Quran memorization program for children aged 6-15.', '9876543228', 'Udaipur', 'Chetak Circle', '313001', 24.5854, 73.7125, false, true,  'live',     NOW() - INTERVAL '70 days', NOW() - INTERVAL '68 days', NOW()),
  ('e0000000-0000-4000-8000-000000000014', 'c0000000-0000-4000-8000-000000000004', 'Arabic Language Course',       'Beginner to advanced Arabic. Conversational & Quranic Arabic.', '9876543228', 'Udaipur', 'Chetak Circle', '313001', 24.5854, 73.7125, false, false, 'live',     NOW() - INTERVAL '65 days', NOW() - INTERVAL '63 days', NOW()),
  ('e0000000-0000-4000-8000-000000000015', 'c0000000-0000-4000-8000-000000000004', 'Math & Science Tuition',       'CBSE/ICSE coaching for classes 8-12. Experienced faculty.', '9876543228', 'Udaipur', 'Hathi Pole', '313001', 24.5787, 73.6831, false, false, 'live',     NOW() - INTERVAL '55 days', NOW() - INTERVAL '53 days', NOW()),
  ('e0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-000000000004', 'Summer Workshop 2026',         'Fun learning workshops â€” art, calligraphy, robotics for kids.', '9876543228', 'Udaipur', 'Chetak Circle', '313001', 24.5854, 73.7125, false, false, 'pending',  NOW() - INTERVAL '2 days', NULL, NOW()),
  -- Alifiya Digital Studio (provider user 20) - 4 listings
  ('e0000000-0000-4000-8000-000000000017', 'c0000000-0000-4000-8000-000000000005', 'Social Media Management',      'Instagram & Facebook management for small businesses. Content + reels.', '9876543229', 'Ahmedabad', 'Jamalpur', '380001', 23.0225, 72.5714, true,  false, 'live',     NOW() - INTERVAL '68 days', NOW() - INTERVAL '65 days', NOW()),
  ('e0000000-0000-4000-8000-000000000018', 'c0000000-0000-4000-8000-000000000005', 'Logo & Brand Design',          'Professional logo, visiting card & brand identity packages.', '9876543229', 'Ahmedabad', 'Jamalpur', '380001', 23.0225, 72.5714, true,  true,  'live',     NOW() - INTERVAL '62 days', NOW() - INTERVAL '60 days', NOW()),
  ('e0000000-0000-4000-8000-000000000019', 'c0000000-0000-4000-8000-000000000005', 'Website Development',          'Responsive websites for small businesses. E-commerce ready.', '9876543229', 'Ahmedabad', 'CG Road', '380006', 23.0305, 72.5619, true,  false, 'live',     NOW() - INTERVAL '45 days', NOW() - INTERVAL '43 days', NOW()),
  ('e0000000-0000-4000-8000-000000000020', 'c0000000-0000-4000-8000-000000000005', 'Event Photography',            'Professional photography for weddings, milad & corporate events.', '9876543229', 'Ahmedabad', 'Jamalpur', '380001', 23.0225, 72.5714, true,  false, 'inactive', NOW() - INTERVAL '30 days', NULL, NOW());

-- ============================================================
-- 6. LISTING_CATEGORIES (20 â€” linking listings to categories)
-- ============================================================
INSERT INTO listing_categories (id, listing_id, category_id) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011'), -- Tiffin â†’ Tiffin Service
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000012'), -- Catering â†’ Catering
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001'), -- Mithai â†’ Food & Catering
  ('f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005'), -- Cooking Class â†’ Education
  ('f0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000013'), -- Rida â†’ Rida & Burqa
  ('f0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000014'), -- Tailoring â†’ Tailoring
  ('f0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002'), -- Bridal â†’ Clothing
  ('f0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000002'), -- Kids Wear â†’ Clothing
  ('f0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000015'), -- Bridal Mehndi â†’ Mehndi
  ('f0000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000016'), -- Facial â†’ Skincare
  ('f0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000015'), -- Party Mehndi â†’ Mehndi
  ('f0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000003'), -- Home Spa â†’ Beauty
  ('f0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000017'), -- Quran Hifz â†’ Quran Tuition
  ('f0000000-0000-4000-8000-000000000014', 'e0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000005'), -- Arabic â†’ Education
  ('f0000000-0000-4000-8000-000000000015', 'e0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000018'), -- Math â†’ Academic Tuition
  ('f0000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000005'), -- Workshop â†’ Education
  ('f0000000-0000-4000-8000-000000000017', 'e0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000020'), -- Social Media â†’ Social Media Marketing
  ('f0000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000008'), -- Logo â†’ IT & Digital
  ('f0000000-0000-4000-8000-000000000019', 'e0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000008'), -- Website â†’ IT & Digital
  ('f0000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000019'); -- Photography â†’ Event Photography

-- ============================================================
-- 7. PHOTOS (20 â€” one per listing)
-- ============================================================
INSERT INTO photos (id, listing_id, image_url, storage_key, display_order, uploaded_at) VALUES
  ('10000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'https://placehold.co/600x400?text=Tiffin+Service',    'listings/tiffin_01.jpg',     0, NOW() - INTERVAL '75 days'),
  ('10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'https://placehold.co/600x400?text=Party+Catering',     'listings/catering_01.jpg',   0, NOW() - INTERVAL '73 days'),
  ('10000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', 'https://placehold.co/600x400?text=Mithai+Box',         'listings/mithai_01.jpg',     0, NOW() - INTERVAL '58 days'),
  ('10000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'https://placehold.co/600x400?text=Cooking+Class',      'listings/cooking_01.jpg',    0, NOW() - INTERVAL '5 days'),
  ('10000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005', 'https://placehold.co/600x400?text=Rida+Collection',    'listings/rida_01.jpg',       0, NOW() - INTERVAL '72 days'),
  ('10000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', 'https://placehold.co/600x400?text=Tailoring',          'listings/tailoring_01.jpg',  0, NOW() - INTERVAL '68 days'),
  ('10000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', 'https://placehold.co/600x400?text=Bridal+Trousseau',   'listings/bridal_01.jpg',     0, NOW() - INTERVAL '62 days'),
  ('10000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000008', 'https://placehold.co/600x400?text=Kids+Ethnic',        'listings/kids_01.jpg',       0, NOW() - INTERVAL '3 days'),
  ('10000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000009', 'https://placehold.co/600x400?text=Bridal+Mehndi',      'listings/mehndi_01.jpg',     0, NOW() - INTERVAL '70 days'),
  ('10000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000010', 'https://placehold.co/600x400?text=Organic+Facial',     'listings/facial_01.jpg',     0, NOW() - INTERVAL '66 days'),
  ('10000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000011', 'https://placehold.co/600x400?text=Party+Mehndi',       'listings/pmehndi_01.jpg',    0, NOW() - INTERVAL '48 days'),
  ('10000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000012', 'https://placehold.co/600x400?text=Home+Spa',           'listings/spa_01.jpg',        0, NOW() - INTERVAL '40 days'),
  ('10000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000013', 'https://placehold.co/600x400?text=Quran+Hifz',         'listings/quran_01.jpg',      0, NOW() - INTERVAL '68 days'),
  ('10000000-0000-4000-8000-000000000014', 'e0000000-0000-4000-8000-000000000014', 'https://placehold.co/600x400?text=Arabic+Course',      'listings/arabic_01.jpg',     0, NOW() - INTERVAL '63 days'),
  ('10000000-0000-4000-8000-000000000015', 'e0000000-0000-4000-8000-000000000015', 'https://placehold.co/600x400?text=Math+Tuition',       'listings/math_01.jpg',       0, NOW() - INTERVAL '53 days'),
  ('10000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-000000000016', 'https://placehold.co/600x400?text=Summer+Workshop',    'listings/workshop_01.jpg',   0, NOW() - INTERVAL '2 days'),
  ('10000000-0000-4000-8000-000000000017', 'e0000000-0000-4000-8000-000000000017', 'https://placehold.co/600x400?text=Social+Media',       'listings/social_01.jpg',     0, NOW() - INTERVAL '65 days'),
  ('10000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000018', 'https://placehold.co/600x400?text=Logo+Design',        'listings/logo_01.jpg',       0, NOW() - INTERVAL '60 days'),
  ('10000000-0000-4000-8000-000000000019', 'e0000000-0000-4000-8000-000000000019', 'https://placehold.co/600x400?text=Web+Dev',            'listings/web_01.jpg',        0, NOW() - INTERVAL '43 days'),
  ('10000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000020', 'https://placehold.co/600x400?text=Photography',        'listings/photo_01.jpg',      0, NOW() - INTERVAL '30 days');

-- ============================================================
-- 8. PRODUCTS (20 â€” spread across listings)
-- ============================================================
INSERT INTO products (id, listing_id, name, description, price, currency, is_active, display_order) VALUES
  ('20000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Veg Thaal Tiffin',        'Dal, sabzi, rotla, rice, dessert â€” serves 2',          250.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Non-Veg Thaal Tiffin',    'Chicken/mutton curry, dal, rice, rotla, dessert',      350.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'Standard Catering (50)',   'Full thaal menu for 50 guests',                        15000.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', 'Premium Catering (50)',    'Premium thaal with 8 dishes + live counter',           25000.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000003', 'Malida Box (500g)',        'Traditional Bohra malida, packed fresh',                400.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000003', 'Khajur Pak Box (250g)',    'Dates & dry fruit sweet, no preservatives',            300.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000005', 'Everyday Rida',           'Comfortable cotton Rida for daily wear',                1500.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000005', 'Festive Rida',            'Embroidered Rida for Eid & special occasions',         3500.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000006', 'Blouse Stitching',        'Custom blouse with lining & hooks',                    500.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000006', 'Kurta Set Stitching',     'Full kurta + pajama/salwar stitching',                 800.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000009', 'Bridal Full Hands',       'Full hand mehndi â€” front & back, up to elbow',        3000.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000009', 'Bridal Hands + Feet',     'Complete bridal package with feet design',             5000.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000010', 'Basic Facial',            '45-min organic facial with cleanup',                   800.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000014', 'e0000000-0000-4000-8000-000000000010', 'Gold Facial',             '90-min gold facial with mask & serum',                 1500.00, 'INR', true, 2),
  ('20000000-0000-4000-8000-000000000015', 'e0000000-0000-4000-8000-000000000013', 'Monthly Quran Class',     '4 classes/week, 1 hour each â€” monthly fee',            1000.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-000000000014', 'Arabic Beginner Course',  '3-month beginner course â€” 3 sessions/week',           3000.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000017', 'e0000000-0000-4000-8000-000000000015', 'Class 10 Batch',          'CBSE Math + Science â€” 5 days/week',                    2500.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000017', 'Monthly Social Pack',     '30 posts + 8 reels + analytics report',               5000.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000019', 'e0000000-0000-4000-8000-000000000018', 'Logo Package',            'Logo + visiting card + letterhead design',             3000.00, 'INR', true, 1),
  ('20000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000019', 'Basic Website',           '5-page responsive website with contact form',          15000.00, 'INR', true, 1);

-- ============================================================
-- 9. REVIEWS (20 â€” customers reviewing live listings)
-- ============================================================
INSERT INTO reviews (id, listing_id, reviewer_id, star_rating, review_text, status, posted_at) VALUES
  ('30000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 5, 'Amazing food! Tastes exactly like maa ke haath ka khana. The dal-chawal is perfection.', 'active', NOW() - INTERVAL '70 days'),
  ('30000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 4, 'Very good tiffin service. Fresh and on time. Would love more variety.', 'active', NOW() - INTERVAL '65 days'),
  ('30000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 5, 'Catered for our son''s aqiqa. Every dish was outstanding. Highly recommend!', 'active', NOW() - INTERVAL '60 days'),
  ('30000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005', 4, 'Malida was absolutely delicious. Khajur pak was a bit too sweet for my taste.', 'active', NOW() - INTERVAL '50 days'),
  ('30000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006', 5, 'Beautiful Rida! The fabric quality and stitching are top-notch. Got so many compliments.', 'active', NOW() - INTERVAL '68 days'),
  ('30000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000008', 4, 'Lovely designs. Delivery took a bit longer than expected but the quality made up for it.', 'active', NOW() - INTERVAL '55 days'),
  ('30000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000010', 5, 'Perfect fitting on the first try. Insiya behen really knows her craft.', 'active', NOW() - INTERVAL '58 days'),
  ('30000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000012', 5, 'My wedding trousseau was absolutely stunning. Everyone asked where I got it!', 'active', NOW() - INTERVAL '52 days'),
  ('30000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002', 5, 'The bridal mehndi was gorgeous. Rashida is incredibly talented and patient.', 'active', NOW() - INTERVAL '62 days'),
  ('30000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000014', 4, 'Very intricate work. Took longer than quoted but the result was beautiful.', 'active', NOW() - INTERVAL '48 days'),
  ('30000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000003', 4, 'Skin felt so fresh after the facial. Using all natural products is a big plus.', 'active', NOW() - INTERVAL '55 days'),
  ('30000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000006', 3, 'Mehndi was nice but the design was simpler than what was shown in the samples.', 'active', NOW() - INTERVAL '40 days'),
  ('30000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000007', 5, 'My son has memorized 5 juz in 6 months. The teaching method is excellent.', 'active', NOW() - INTERVAL '50 days'),
  ('30000000-0000-4000-8000-000000000014', 'e0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000009', 4, 'Good Arabic course. The teacher is knowledgeable. Wish there were more practice sessions.', 'active', NOW() - INTERVAL '45 days'),
  ('30000000-0000-4000-8000-000000000015', 'e0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000005', 4, 'My daughter''s math grades improved significantly. Grateful for the personal attention.', 'active', NOW() - INTERVAL '38 days'),
  ('30000000-0000-4000-8000-000000000016', 'e0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000011', 5, 'Our Instagram grew from 200 to 2000 followers in 2 months! Great work.', 'active', NOW() - INTERVAL '42 days'),
  ('30000000-0000-4000-8000-000000000017', 'e0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000013', 4, 'Good content creation. Reel quality could be better but the strategy works.', 'active', NOW() - INTERVAL '30 days'),
  ('30000000-0000-4000-8000-000000000018', 'e0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000004', 5, 'Love my new logo! Professional work and quick turnaround time.', 'active', NOW() - INTERVAL '35 days'),
  ('30000000-0000-4000-8000-000000000019', 'e0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000007', 4, 'Website looks great on mobile. A few minor tweaks needed but overall happy.', 'active', NOW() - INTERVAL '25 days'),
  ('30000000-0000-4000-8000-000000000020', 'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000015', 3, 'Food is decent but portion size could be bigger for the price. Delivery was late once.', 'active', NOW() - INTERVAL '20 days');

-- ============================================================
-- 10. REVIEW_PHOTOS (10 â€” some reviews have photos)
-- ============================================================
INSERT INTO review_photos (id, review_id, image_url, storage_key) VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'https://placehold.co/400x300?text=Tiffin+Review', 'reviews/r01_photo.jpg'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'https://placehold.co/400x300?text=Catering+Review', 'reviews/r03_photo.jpg'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'https://placehold.co/400x300?text=Rida+Review', 'reviews/r05_photo.jpg'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000008', 'https://placehold.co/400x300?text=Bridal+Review', 'reviews/r08_photo.jpg'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000009', 'https://placehold.co/400x300?text=Mehndi+Review', 'reviews/r09_photo.jpg'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000013', 'https://placehold.co/400x300?text=Quran+Review', 'reviews/r13_photo.jpg'),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000016', 'https://placehold.co/400x300?text=Social+Review', 'reviews/r16_photo.jpg'),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000018', 'https://placehold.co/400x300?text=Logo+Review', 'reviews/r18_photo.jpg'),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000004', 'https://placehold.co/400x300?text=Mithai+Review', 'reviews/r04_photo.jpg'),
  ('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000011', 'https://placehold.co/400x300?text=Facial+Review', 'reviews/r11_photo.jpg');

-- ============================================================
-- 11. REVIEW_REPORTS (5 â€” some reports on reviews)
-- ============================================================
INSERT INTO review_reports (id, review_id, reporter_id, reason, status, reported_at) VALUES
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000018', 'Review seems unfairly harsh and not constructive',    'pending',   NOW() - INTERVAL '38 days'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000016', 'Customer complaint was resolved but review not updated', 'reviewed', NOW() - INTERVAL '18 days'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000020', 'Competitor posting fake review',                       'pending',   NOW() - INTERVAL '28 days'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000017', 'Review mentions wrong product',                        'dismissed', NOW() - INTERVAL '50 days'),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000019', 'Inappropriate language in review',                     'pending',   NOW() - INTERVAL '35 days');

-- ============================================================
-- DONE! Summary:
-- users:              20 (1 admin + 15 customers + 4 provider-customers)
-- categories:         20 (10 parent + 10 sub-categories)
-- providers:           5
-- verifications:       5
-- listings:           20 (14 live + 4 pending + 1 rejected + 1 inactive)
-- listing_categories: 20
-- photos:             20
-- products:           20
-- reviews:            20
-- review_photos:      10
-- review_reports:      5
-- ============================================================

-- ============================================================
-- 12. LINK SUPABASE AUTH USERS (run AFTER seed-supabase-users.ts)
-- This updates the supabase_id column in users table to match
-- the Supabase Auth user IDs by email.
-- ============================================================
UPDATE users SET supabase_id = auth_user.id::text
FROM auth.users AS auth_user
WHERE users.email = auth_user.email
  AND users.supabase_id IS NULL;



