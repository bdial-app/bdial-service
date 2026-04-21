-- ============================================================
-- Bohri Connect / TijarahConnect - Development Seed Data
-- Run in Supabase SQL Editor or via psql
-- All IDs are generated with gen_random_uuid() so every reseed
-- produces proper random UUIDs with no hardcoded sequential values.
-- ============================================================

-- Clean existing data (order matters due to FK constraints)
TRUNCATE review_reports, review_photos, reviews, products, photos,
         listing_categories, listings, verifications, providers, users, categories
         CASCADE;

DO $$
DECLARE
  -- Users (20)
  u01 UUID := gen_random_uuid(); -- Adeeb Shah (admin)
  u02 UUID := gen_random_uuid(); -- Fatema Bohra
  u03 UUID := gen_random_uuid(); -- Sakina Rangwala
  u04 UUID := gen_random_uuid(); -- Murtaza Kanchwala
  u05 UUID := gen_random_uuid(); -- Taher Saifee
  u06 UUID := gen_random_uuid(); -- Zahra Mithawala
  u07 UUID := gen_random_uuid(); -- Ayman Dahodwala
  u08 UUID := gen_random_uuid(); -- Nafisa Tawawala
  u09 UUID := gen_random_uuid(); -- Husain Jamali
  u10 UUID := gen_random_uuid(); -- Ruqaiya Poonawala
  u11 UUID := gen_random_uuid(); -- Abbas Chitalwala
  u12 UUID := gen_random_uuid(); -- Munira Badri
  u13 UUID := gen_random_uuid(); -- Qaid Lokhandwala
  u14 UUID := gen_random_uuid(); -- Jumana Vahora
  u15 UUID := gen_random_uuid(); -- Mustafa Gallawala
  u16 UUID := gen_random_uuid(); -- Maryam Hakimuddin (provider)
  u17 UUID := gen_random_uuid(); -- Insiya Kothawala (provider)
  u18 UUID := gen_random_uuid(); -- Rashida Shakir (provider)
  u19 UUID := gen_random_uuid(); -- Tasneem Motiwala (provider)
  u20 UUID := gen_random_uuid(); -- Alifiya Dawoodi (provider)

  -- Categories (20)
  cat01 UUID := gen_random_uuid(); -- Food & Catering
  cat02 UUID := gen_random_uuid(); -- Clothing & Fashion
  cat03 UUID := gen_random_uuid(); -- Beauty & Wellness
  cat04 UUID := gen_random_uuid(); -- Home Decor & Crafts
  cat05 UUID := gen_random_uuid(); -- Education & Tutoring
  cat06 UUID := gen_random_uuid(); -- Health & Fitness
  cat07 UUID := gen_random_uuid(); -- Event Services
  cat08 UUID := gen_random_uuid(); -- IT & Digital
  cat09 UUID := gen_random_uuid(); -- Grocery & Essentials
  cat10 UUID := gen_random_uuid(); -- Professional Services
  cat11 UUID := gen_random_uuid(); -- Tiffin Service (sub of cat01)
  cat12 UUID := gen_random_uuid(); -- Catering (sub of cat01)
  cat13 UUID := gen_random_uuid(); -- Rida & Burqa (sub of cat02)
  cat14 UUID := gen_random_uuid(); -- Tailoring (sub of cat02)
  cat15 UUID := gen_random_uuid(); -- Mehndi Art (sub of cat03)
  cat16 UUID := gen_random_uuid(); -- Skincare (sub of cat03)
  cat17 UUID := gen_random_uuid(); -- Quran Tuition (sub of cat05)
  cat18 UUID := gen_random_uuid(); -- Academic Tuition (sub of cat05)
  cat19 UUID := gen_random_uuid(); -- Event Photography (sub of cat07)
  cat20 UUID := gen_random_uuid(); -- Social Media Marketing (sub of cat08)

  -- Providers (5)
  prv01 UUID := gen_random_uuid(); -- Maryam's Kitchen
  prv02 UUID := gen_random_uuid(); -- Insiya Couture
  prv03 UUID := gen_random_uuid(); -- Glow by Rashida
  prv04 UUID := gen_random_uuid(); -- Noor Academy
  prv05 UUID := gen_random_uuid(); -- Alifiya Digital Studio

  -- Verifications (5)
  ver01 UUID := gen_random_uuid();
  ver02 UUID := gen_random_uuid();
  ver03 UUID := gen_random_uuid();
  ver04 UUID := gen_random_uuid();
  ver05 UUID := gen_random_uuid();

  -- Listings (20)
  lst01 UUID := gen_random_uuid(); -- Maryam's Daily Tiffin
  lst02 UUID := gen_random_uuid(); -- Maryam's Party Catering
  lst03 UUID := gen_random_uuid(); -- Maryam's Mithai Box
  lst04 UUID := gen_random_uuid(); -- Maryam's Cooking Classes
  lst05 UUID := gen_random_uuid(); -- Designer Rida Collection
  lst06 UUID := gen_random_uuid(); -- Custom Tailoring Service
  lst07 UUID := gen_random_uuid(); -- Bridal Trousseau Package
  lst08 UUID := gen_random_uuid(); -- Kids Ethnic Wear
  lst09 UUID := gen_random_uuid(); -- Bridal Mehndi Package
  lst10 UUID := gen_random_uuid(); -- Organic Facial Treatment
  lst11 UUID := gen_random_uuid(); -- Party Mehndi Service
  lst12 UUID := gen_random_uuid(); -- Home Spa Package
  lst13 UUID := gen_random_uuid(); -- Quran Hifz Program
  lst14 UUID := gen_random_uuid(); -- Arabic Language Course
  lst15 UUID := gen_random_uuid(); -- Math & Science Tuition
  lst16 UUID := gen_random_uuid(); -- Summer Workshop 2026
  lst17 UUID := gen_random_uuid(); -- Social Media Management
  lst18 UUID := gen_random_uuid(); -- Logo & Brand Design
  lst19 UUID := gen_random_uuid(); -- Website Development
  lst20 UUID := gen_random_uuid(); -- Event Photography

  -- Listing Categories (20)
  lcat01 UUID := gen_random_uuid();
  lcat02 UUID := gen_random_uuid();
  lcat03 UUID := gen_random_uuid();
  lcat04 UUID := gen_random_uuid();
  lcat05 UUID := gen_random_uuid();
  lcat06 UUID := gen_random_uuid();
  lcat07 UUID := gen_random_uuid();
  lcat08 UUID := gen_random_uuid();
  lcat09 UUID := gen_random_uuid();
  lcat10 UUID := gen_random_uuid();
  lcat11 UUID := gen_random_uuid();
  lcat12 UUID := gen_random_uuid();
  lcat13 UUID := gen_random_uuid();
  lcat14 UUID := gen_random_uuid();
  lcat15 UUID := gen_random_uuid();
  lcat16 UUID := gen_random_uuid();
  lcat17 UUID := gen_random_uuid();
  lcat18 UUID := gen_random_uuid();
  lcat19 UUID := gen_random_uuid();
  lcat20 UUID := gen_random_uuid();

  -- Photos (20)
  pht01 UUID := gen_random_uuid();
  pht02 UUID := gen_random_uuid();
  pht03 UUID := gen_random_uuid();
  pht04 UUID := gen_random_uuid();
  pht05 UUID := gen_random_uuid();
  pht06 UUID := gen_random_uuid();
  pht07 UUID := gen_random_uuid();
  pht08 UUID := gen_random_uuid();
  pht09 UUID := gen_random_uuid();
  pht10 UUID := gen_random_uuid();
  pht11 UUID := gen_random_uuid();
  pht12 UUID := gen_random_uuid();
  pht13 UUID := gen_random_uuid();
  pht14 UUID := gen_random_uuid();
  pht15 UUID := gen_random_uuid();
  pht16 UUID := gen_random_uuid();
  pht17 UUID := gen_random_uuid();
  pht18 UUID := gen_random_uuid();
  pht19 UUID := gen_random_uuid();
  pht20 UUID := gen_random_uuid();

  -- Products (20)
  prd01 UUID := gen_random_uuid();
  prd02 UUID := gen_random_uuid();
  prd03 UUID := gen_random_uuid();
  prd04 UUID := gen_random_uuid();
  prd05 UUID := gen_random_uuid();
  prd06 UUID := gen_random_uuid();
  prd07 UUID := gen_random_uuid();
  prd08 UUID := gen_random_uuid();
  prd09 UUID := gen_random_uuid();
  prd10 UUID := gen_random_uuid();
  prd11 UUID := gen_random_uuid();
  prd12 UUID := gen_random_uuid();
  prd13 UUID := gen_random_uuid();
  prd14 UUID := gen_random_uuid();
  prd15 UUID := gen_random_uuid();
  prd16 UUID := gen_random_uuid();
  prd17 UUID := gen_random_uuid();
  prd18 UUID := gen_random_uuid();
  prd19 UUID := gen_random_uuid();
  prd20 UUID := gen_random_uuid();

  -- Reviews (20)
  rev01 UUID := gen_random_uuid();
  rev02 UUID := gen_random_uuid();
  rev03 UUID := gen_random_uuid();
  rev04 UUID := gen_random_uuid();
  rev05 UUID := gen_random_uuid();
  rev06 UUID := gen_random_uuid();
  rev07 UUID := gen_random_uuid();
  rev08 UUID := gen_random_uuid();
  rev09 UUID := gen_random_uuid();
  rev10 UUID := gen_random_uuid();
  rev11 UUID := gen_random_uuid();
  rev12 UUID := gen_random_uuid();
  rev13 UUID := gen_random_uuid();
  rev14 UUID := gen_random_uuid();
  rev15 UUID := gen_random_uuid();
  rev16 UUID := gen_random_uuid();
  rev17 UUID := gen_random_uuid();
  rev18 UUID := gen_random_uuid();
  rev19 UUID := gen_random_uuid();
  rev20 UUID := gen_random_uuid();

  -- Review Photos (10)
  rph01 UUID := gen_random_uuid();
  rph02 UUID := gen_random_uuid();
  rph03 UUID := gen_random_uuid();
  rph04 UUID := gen_random_uuid();
  rph05 UUID := gen_random_uuid();
  rph06 UUID := gen_random_uuid();
  rph07 UUID := gen_random_uuid();
  rph08 UUID := gen_random_uuid();
  rph09 UUID := gen_random_uuid();
  rph10 UUID := gen_random_uuid();

  -- Review Reports (5)
  rrt01 UUID := gen_random_uuid();
  rrt02 UUID := gen_random_uuid();
  rrt03 UUID := gen_random_uuid();
  rrt04 UUID := gen_random_uuid();
  rrt05 UUID := gen_random_uuid();

BEGIN

  -- ============================================================
  -- 1. USERS (20 users: 1 admin, 15 customers, 5 providers)
  -- ============================================================
  INSERT INTO users (id, mobile_number, email, name, gender, role, city, area, pincode, status, created_at, updated_at) VALUES
    (u01, '9876543210', 'adeeb@tijarahconnect.com',  'Adeeb Shah',        'male',   'admin',    'Mumbai',    'Malabar Hill',    '400006', 'active', NOW() - INTERVAL '90 days', NOW()),
    (u02, '9876543211', 'fatema.b@example.com',       'Fatema Bohra',      'female', 'customer', 'Mumbai',    'Bhendi Bazaar',   '400003', 'active', NOW() - INTERVAL '80 days', NOW()),
    (u03, '9876543212', 'sakina.r@example.com',       'Sakina Rangwala',   'female', 'customer', 'Pune',      'Camp',            '411001', 'active', NOW() - INTERVAL '75 days', NOW()),
    (u04, '9876543213', 'murtaza.k@example.com',      'Murtaza Kanchwala', 'male',   'customer', 'Surat',     'Nanpura',         '395001', 'active', NOW() - INTERVAL '70 days', NOW()),
    (u05, '9876543214', 'taher.s@example.com',        'Taher Saifee',      'male',   'customer', 'Udaipur',   'Hathi Pole',      '313001', 'active', NOW() - INTERVAL '65 days', NOW()),
    (u06, '9876543215', 'zahra.m@example.com',        'Zahra Mithawala',   'female', 'customer', 'Mumbai',    'Dongri',          '400009', 'active', NOW() - INTERVAL '60 days', NOW()),
    (u07, '9876543216', 'ayman.d@example.com',        'Ayman Dahodwala',   'male',   'customer', 'Ahmedabad', 'Jamalpur',        '380001', 'active', NOW() - INTERVAL '55 days', NOW()),
    (u08, '9876543217', 'nafisa.t@example.com',       'Nafisa Tawawala',   'female', 'customer', 'Burhanpur', 'Lal Bagh',        '450331', 'active', NOW() - INTERVAL '50 days', NOW()),
    (u09, '9876543218', 'husain.j@example.com',       'Husain Jamali',     'male',   'customer', 'Indore',    'Rajwada',         '452002', 'active', NOW() - INTERVAL '45 days', NOW()),
    (u10, '9876543219', 'ruqaiya.p@example.com',      'Ruqaiya Poonawala', 'female', 'customer', 'Mumbai',    'Mohammed Ali Rd', '400003', 'active', NOW() - INTERVAL '40 days', NOW()),
    (u11, '9876543220', 'abbas.c@example.com',        'Abbas Chitalwala',  'male',   'customer', 'Surat',     'Varachha',        '395006', 'active', NOW() - INTERVAL '35 days', NOW()),
    (u12, '9876543221', 'munira.b@example.com',       'Munira Badri',      'female', 'customer', 'Pune',      'Kondhwa',         '411048', 'active', NOW() - INTERVAL '30 days', NOW()),
    (u13, '9876543222', 'qaid.l@example.com',         'Qaid Lokhandwala',  'male',   'customer', 'Mumbai',    'Byculla',         '400008', 'active', NOW() - INTERVAL '25 days', NOW()),
    (u14, '9876543223', 'jumana.v@example.com',       'Jumana Vahora',     'female', 'customer', 'Vadodara',  'Fatehpura',       '390001', 'active', NOW() - INTERVAL '20 days', NOW()),
    (u15, '9876543224', 'mustafa.g@example.com',      'Mustafa Gallawala', 'male',   'customer', 'Ahmedabad', 'Shahpur',         '380001', 'active', NOW() - INTERVAL '15 days', NOW()),
    (u16, '9876543225', 'maryam.h@example.com',       'Maryam Hakimuddin', 'female', 'customer', 'Mumbai',    'Bhendi Bazaar',   '400003', 'active', NOW() - INTERVAL '85 days', NOW()),
    (u17, '9876543226', 'insiya.k@example.com',       'Insiya Kothawala',  'female', 'customer', 'Surat',     'Nanpura',         '395001', 'active', NOW() - INTERVAL '82 days', NOW()),
    (u18, '9876543227', 'rashida.s@example.com',      'Rashida Shakir',    'female', 'customer', 'Pune',      'Camp',            '411001', 'active', NOW() - INTERVAL '78 days', NOW()),
    (u19, '9876543228', 'tasneem.m@example.com',      'Tasneem Motiwala',  'female', 'customer', 'Udaipur',   'Chetak Circle',   '313001', 'active', NOW() - INTERVAL '76 days', NOW()),
    (u20, '9876543229', 'alifiya.d@example.com',      'Alifiya Dawoodi',   'female', 'customer', 'Ahmedabad', 'Jamalpur',        '380001', 'active', NOW() - INTERVAL '73 days', NOW());

  -- ============================================================
  -- 2. CATEGORIES (10 parent + 10 sub-categories = 20)
  -- ============================================================
  INSERT INTO categories (id, parent_id, name, slug, description, is_active, display_order, created_at, updated_at) VALUES
    (cat01, NULL,  'Food & Catering',       'food-catering',         'Home-cooked food, tiffin services, catering',        true, 1,  NOW(), NOW()),
    (cat02, NULL,  'Clothing & Fashion',    'clothing-fashion',      'Traditional & modern clothing, tailoring',            true, 2,  NOW(), NOW()),
    (cat03, NULL,  'Beauty & Wellness',     'beauty-wellness',       'Salon, spa, skincare, mehndi',                        true, 3,  NOW(), NOW()),
    (cat04, NULL,  'Home Decor & Crafts',   'home-decor-crafts',     'Handmade crafts, interior decor, event decor',        true, 4,  NOW(), NOW()),
    (cat05, NULL,  'Education & Tutoring',  'education-tutoring',    'Quran classes, academic tuition, skill workshops',    true, 5,  NOW(), NOW()),
    (cat06, NULL,  'Health & Fitness',      'health-fitness',        'Nutrition, yoga, fitness coaching',                   true, 6,  NOW(), NOW()),
    (cat07, NULL,  'Event Services',        'event-services',        'Event planning, photography, entertainment',          true, 7,  NOW(), NOW()),
    (cat08, NULL,  'IT & Digital',          'it-digital',            'Web development, graphic design, social media',       true, 8,  NOW(), NOW()),
    (cat09, NULL,  'Grocery & Essentials',  'grocery-essentials',    'Daily needs, organic products, spices',               true, 9,  NOW(), NOW()),
    (cat10, NULL,  'Professional Services', 'professional-services', 'Accounting, legal, consulting',                       true, 10, NOW(), NOW()),
    (cat11, cat01, 'Tiffin Service',         'tiffin-service',        'Daily tiffin delivery',              true, 1, NOW(), NOW()),
    (cat12, cat01, 'Catering',               'catering',              'Bulk & event catering',              true, 2, NOW(), NOW()),
    (cat13, cat02, 'Rida & Burqa',           'rida-burqa',            'Traditional Bohra attire',           true, 1, NOW(), NOW()),
    (cat14, cat02, 'Tailoring',              'tailoring',             'Custom stitching & alterations',     true, 2, NOW(), NOW()),
    (cat15, cat03, 'Mehndi Art',             'mehndi-art',            'Bridal & festive mehndi',            true, 1, NOW(), NOW()),
    (cat16, cat03, 'Skincare',               'skincare',              'Facials, skincare routines',         true, 2, NOW(), NOW()),
    (cat17, cat05, 'Quran Tuition',          'quran-tuition',         'Online & offline Quran classes',     true, 1, NOW(), NOW()),
    (cat18, cat05, 'Academic Tuition',       'academic-tuition',      'School & college tuition',           true, 2, NOW(), NOW()),
    (cat19, cat07, 'Event Photography',      'event-photography',     'Wedding & event photography',        true, 1, NOW(), NOW()),
    (cat20, cat08, 'Social Media Marketing', 'social-media-marketing','Instagram, FB marketing',            true, 1, NOW(), NOW());

  -- ============================================================
  -- 3. PROVIDERS (5 providers linked to users 16-20)
  -- ============================================================
  INSERT INTO providers (id, user_id, brand_name, description, address, city, area, pincode, latitude, longitude, contact_number, open_time, close_time, is_available, status, created_at, updated_at) VALUES
    (prv01, u16, 'Maryam''s Kitchen',      'Authentic Bohra home-cooked food & catering for all occasions',   '12, Bohri Mohalla, Bhendi Bazaar', 'Mumbai',    'Bhendi Bazaar', '400003', 18.9647, 72.8358, '9876543225', '08:00', '20:00', true,  'active', NOW() - INTERVAL '80 days', NOW()),
    (prv02, u17, 'Insiya Couture',         'Designer Ridas, Burqas & modern ethnic wear with custom fitting',  '45, Nanpura Market',               'Surat',     'Nanpura',       '395001', 21.1959, 72.8302, '9876543226', '10:00', '19:00', true,  'active', NOW() - INTERVAL '78 days', NOW()),
    (prv03, u18, 'Glow by Rashida',        'Professional mehndi art, bridal packages & skincare treatments',   '8, Camp Area',                     'Pune',      'Camp',          '411001', 18.5196, 73.8553, '9876543227', '09:00', '18:00', true,  'active', NOW() - INTERVAL '75 days', NOW()),
    (prv04, u19, 'Noor Academy',           'Quran classes, Arabic & academic tutoring for children & adults',  '22, Chetak Circle',                'Udaipur',   'Chetak Circle', '313001', 24.5854, 73.7125, '9876543228', '07:00', '21:00', true,  'active', NOW() - INTERVAL '72 days', NOW()),
    (prv05, u20, 'Alifiya Digital Studio', 'Social media marketing, graphic design & web development',         '15, CG Road, Jamalpur',            'Ahmedabad', 'Jamalpur',      '380001', 23.0225, 72.5714, '9876543229', '10:00', '18:00', false, 'active', NOW() - INTERVAL '70 days', NOW());

  -- ============================================================
  -- 4. VERIFICATIONS (5 - one per provider user)
  -- ============================================================
  INSERT INTO verifications (id, user_id, aadhaar_doc_url, aadhaar_status, ijamat_number, ijamat_expiry, ijamat_doc_url, ijamat_status, status, admin_notes, reviewed_at, reviewed_by) VALUES
    (ver01, u16, 'https://storage.example.com/verif/aadhaar_16.pdf', 'approved', 'IJ-2024-0016', '2027-12-31', 'https://storage.example.com/verif/ijamat_16.pdf', 'approved',      'approved', 'All documents verified',                 NOW() - INTERVAL '70 days', u01),
    (ver02, u17, 'https://storage.example.com/verif/aadhaar_17.pdf', 'approved', 'IJ-2024-0017', '2028-06-30', 'https://storage.example.com/verif/ijamat_17.pdf', 'approved',      'approved', 'Verified - all clear',                   NOW() - INTERVAL '68 days', u01),
    (ver03, u18, 'https://storage.example.com/verif/aadhaar_18.pdf', 'approved', NULL,           NULL,         NULL,                                              'not_submitted', 'approved', 'Aadhaar approved, no ijamat',            NOW() - INTERVAL '65 days', u01),
    (ver04, u19, 'https://storage.example.com/verif/aadhaar_19.pdf', 'pending',  'IJ-2024-0019', '2026-12-31', 'https://storage.example.com/verif/ijamat_19.pdf', 'pending',       'pending',  NULL,                                     NULL,                        NULL),
    (ver05, u20, 'https://storage.example.com/verif/aadhaar_20.pdf', 'rejected', NULL,           NULL,         NULL,                                              'not_submitted', 'rejected', 'Aadhaar image blurry, please re-upload', NOW() - INTERVAL '60 days', u01);

  -- ============================================================
  -- 5. LISTINGS (20 listings across the 5 providers)
  -- ============================================================
  INSERT INTO listings (id, provider_id, business_name, description, contact_phone, city, area, pincode, latitude, longitude, is_women_led, community_verified, status, submitted_at, approved_at, updated_at) VALUES
    (lst01, prv01, 'Maryam''s Daily Tiffin',    'Fresh home-cooked Bohra thaal delivered daily. Includes dal-chawal, rotla, sabzi & dessert.', '9876543225', 'Mumbai',    'Bhendi Bazaar', '400003', 18.9647, 72.8358, true,  true,  'live',     NOW() - INTERVAL '78 days', NOW() - INTERVAL '75 days', NOW()),
    (lst02, prv01, 'Maryam''s Party Catering',  'Full catering for weddings, milad & community gatherings. Min 50 pax.',                        '9876543225', 'Mumbai',    'Bhendi Bazaar', '400003', 18.9647, 72.8358, true,  true,  'live',     NOW() - INTERVAL '76 days', NOW() - INTERVAL '73 days', NOW()),
    (lst03, prv01, 'Maryam''s Mithai Box',      'Traditional Bohra sweets - malida, halwo, khajur pak. Gift boxes available.',                  '9876543225', 'Mumbai',    'Dongri',        '400009', 18.9590, 72.8370, true,  false, 'live',     NOW() - INTERVAL '60 days', NOW() - INTERVAL '58 days', NOW()),
    (lst04, prv01, 'Maryam''s Cooking Classes', 'Learn authentic Bohra recipes. Weekend batches available.',                                    '9876543225', 'Mumbai',    'Bhendi Bazaar', '400003', 18.9647, 72.8358, true,  false, 'pending',  NOW() - INTERVAL '5 days',  NULL,                        NOW()),
    (lst05, prv02, 'Designer Rida Collection',  'Handcrafted Ridas with contemporary designs. Ready-made & custom sizes.',                      '9876543226', 'Surat',     'Nanpura',       '395001', 21.1959, 72.8302, true,  true,  'live',     NOW() - INTERVAL '75 days', NOW() - INTERVAL '72 days', NOW()),
    (lst06, prv02, 'Custom Tailoring Service',  'Perfect fit guaranteed. Blouse, kurta, ethnic wear stitching.',                                '9876543226', 'Surat',     'Nanpura',       '395001', 21.1959, 72.8302, true,  false, 'live',     NOW() - INTERVAL '70 days', NOW() - INTERVAL '68 days', NOW()),
    (lst07, prv02, 'Bridal Trousseau Package',  'Complete bridal outfit package - Rida, lehnga, accessories.',                                  '9876543226', 'Surat',     'Nanpura',       '395001', 21.1959, 72.8302, true,  true,  'live',     NOW() - INTERVAL '65 days', NOW() - INTERVAL '62 days', NOW()),
    (lst08, prv02, 'Kids Ethnic Wear',          'Traditional outfits for boys & girls. Festive collection.',                                    '9876543226', 'Surat',     'Varachha',      '395006', 21.2138, 72.8686, true,  false, 'pending',  NOW() - INTERVAL '3 days',  NULL,                        NOW()),
    (lst09, prv03, 'Bridal Mehndi Package',     'Intricate bridal mehndi for hands & feet. Arabic & Indian styles.',                           '9876543227', 'Pune',      'Camp',          '411001', 18.5196, 73.8553, true,  true,  'live',     NOW() - INTERVAL '72 days', NOW() - INTERVAL '70 days', NOW()),
    (lst10, prv03, 'Organic Facial Treatment',  'Chemical-free facial using natural ingredients. Suitable for all skin types.',                 '9876543227', 'Pune',      'Camp',          '411001', 18.5196, 73.8553, true,  false, 'live',     NOW() - INTERVAL '68 days', NOW() - INTERVAL '66 days', NOW()),
    (lst11, prv03, 'Party Mehndi Service',      'Quick mehndi for events, Eid & milad. Group discounts available.',                            '9876543227', 'Pune',      'Kondhwa',       '411048', 18.4638, 73.8943, true,  false, 'live',     NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days', NOW()),
    (lst12, prv03, 'Home Spa Package',          'Relaxing spa at your doorstep - massage, scrub, facial combo.',                               '9876543227', 'Pune',      'Camp',          '411001', 18.5196, 73.8553, true,  false, 'rejected', NOW() - INTERVAL '40 days', NULL,                        NOW()),
    (lst13, prv04, 'Quran Hifz Program',        'Structured Quran memorization program for children aged 6-15.',                               '9876543228', 'Udaipur',   'Chetak Circle', '313001', 24.5854, 73.7125, false, true,  'live',     NOW() - INTERVAL '70 days', NOW() - INTERVAL '68 days', NOW()),
    (lst14, prv04, 'Arabic Language Course',    'Beginner to advanced Arabic. Conversational & Quranic Arabic.',                               '9876543228', 'Udaipur',   'Chetak Circle', '313001', 24.5854, 73.7125, false, false, 'live',     NOW() - INTERVAL '65 days', NOW() - INTERVAL '63 days', NOW()),
    (lst15, prv04, 'Math & Science Tuition',    'CBSE/ICSE coaching for classes 8-12. Experienced faculty.',                                   '9876543228', 'Udaipur',   'Hathi Pole',    '313001', 24.5787, 73.6831, false, false, 'live',     NOW() - INTERVAL '55 days', NOW() - INTERVAL '53 days', NOW()),
    (lst16, prv04, 'Summer Workshop 2026',      'Fun learning workshops - art, calligraphy, robotics for kids.',                               '9876543228', 'Udaipur',   'Chetak Circle', '313001', 24.5854, 73.7125, false, false, 'pending',  NOW() - INTERVAL '2 days',  NULL,                        NOW()),
    (lst17, prv05, 'Social Media Management',   'Instagram & Facebook management for small businesses. Content + reels.',                      '9876543229', 'Ahmedabad', 'Jamalpur',      '380001', 23.0225, 72.5714, true,  false, 'live',     NOW() - INTERVAL '68 days', NOW() - INTERVAL '65 days', NOW()),
    (lst18, prv05, 'Logo & Brand Design',       'Professional logo, visiting card & brand identity packages.',                                 '9876543229', 'Ahmedabad', 'Jamalpur',      '380001', 23.0225, 72.5714, true,  true,  'live',     NOW() - INTERVAL '62 days', NOW() - INTERVAL '60 days', NOW()),
    (lst19, prv05, 'Website Development',       'Responsive websites for small businesses. E-commerce ready.',                                 '9876543229', 'Ahmedabad', 'CG Road',       '380006', 23.0305, 72.5619, true,  false, 'live',     NOW() - INTERVAL '45 days', NOW() - INTERVAL '43 days', NOW()),
    (lst20, prv05, 'Event Photography',         'Professional photography for weddings, milad & corporate events.',                            '9876543229', 'Ahmedabad', 'Jamalpur',      '380001', 23.0225, 72.5714, true,  false, 'inactive', NOW() - INTERVAL '30 days', NULL,                        NOW());

  -- ============================================================
  -- 6. LISTING_CATEGORIES
  -- ============================================================
  INSERT INTO listing_categories (id, listing_id, category_id) VALUES
    (lcat01, lst01, cat11), (lcat02, lst02, cat12), (lcat03, lst03, cat01),
    (lcat04, lst04, cat05), (lcat05, lst05, cat13), (lcat06, lst06, cat14),
    (lcat07, lst07, cat02), (lcat08, lst08, cat02), (lcat09, lst09, cat15),
    (lcat10, lst10, cat16), (lcat11, lst11, cat15), (lcat12, lst12, cat03),
    (lcat13, lst13, cat17), (lcat14, lst14, cat05), (lcat15, lst15, cat18),
    (lcat16, lst16, cat05), (lcat17, lst17, cat20), (lcat18, lst18, cat08),
    (lcat19, lst19, cat08), (lcat20, lst20, cat19);

  -- ============================================================
  -- 7. PHOTOS (20 - one per listing)
  -- ============================================================
  INSERT INTO photos (id, listing_id, image_url, storage_key, display_order, uploaded_at) VALUES
    (pht01, lst01, 'https://placehold.co/600x400?text=Tiffin+Service',   'listings/tiffin_01.jpg',    0, NOW() - INTERVAL '75 days'),
    (pht02, lst02, 'https://placehold.co/600x400?text=Party+Catering',   'listings/catering_01.jpg',  0, NOW() - INTERVAL '73 days'),
    (pht03, lst03, 'https://placehold.co/600x400?text=Mithai+Box',       'listings/mithai_01.jpg',    0, NOW() - INTERVAL '58 days'),
    (pht04, lst04, 'https://placehold.co/600x400?text=Cooking+Class',    'listings/cooking_01.jpg',   0, NOW() - INTERVAL '5 days'),
    (pht05, lst05, 'https://placehold.co/600x400?text=Rida+Collection',  'listings/rida_01.jpg',      0, NOW() - INTERVAL '72 days'),
    (pht06, lst06, 'https://placehold.co/600x400?text=Tailoring',        'listings/tailoring_01.jpg', 0, NOW() - INTERVAL '68 days'),
    (pht07, lst07, 'https://placehold.co/600x400?text=Bridal+Trousseau', 'listings/bridal_01.jpg',    0, NOW() - INTERVAL '62 days'),
    (pht08, lst08, 'https://placehold.co/600x400?text=Kids+Ethnic',      'listings/kids_01.jpg',      0, NOW() - INTERVAL '3 days'),
    (pht09, lst09, 'https://placehold.co/600x400?text=Bridal+Mehndi',    'listings/mehndi_01.jpg',    0, NOW() - INTERVAL '70 days'),
    (pht10, lst10, 'https://placehold.co/600x400?text=Organic+Facial',   'listings/facial_01.jpg',    0, NOW() - INTERVAL '66 days'),
    (pht11, lst11, 'https://placehold.co/600x400?text=Party+Mehndi',     'listings/pmehndi_01.jpg',   0, NOW() - INTERVAL '48 days'),
    (pht12, lst12, 'https://placehold.co/600x400?text=Home+Spa',         'listings/spa_01.jpg',       0, NOW() - INTERVAL '40 days'),
    (pht13, lst13, 'https://placehold.co/600x400?text=Quran+Hifz',       'listings/quran_01.jpg',     0, NOW() - INTERVAL '68 days'),
    (pht14, lst14, 'https://placehold.co/600x400?text=Arabic+Course',    'listings/arabic_01.jpg',    0, NOW() - INTERVAL '63 days'),
    (pht15, lst15, 'https://placehold.co/600x400?text=Math+Tuition',     'listings/math_01.jpg',      0, NOW() - INTERVAL '53 days'),
    (pht16, lst16, 'https://placehold.co/600x400?text=Summer+Workshop',  'listings/workshop_01.jpg',  0, NOW() - INTERVAL '2 days'),
    (pht17, lst17, 'https://placehold.co/600x400?text=Social+Media',     'listings/social_01.jpg',    0, NOW() - INTERVAL '65 days'),
    (pht18, lst18, 'https://placehold.co/600x400?text=Logo+Design',      'listings/logo_01.jpg',      0, NOW() - INTERVAL '60 days'),
    (pht19, lst19, 'https://placehold.co/600x400?text=Web+Dev',          'listings/web_01.jpg',       0, NOW() - INTERVAL '43 days'),
    (pht20, lst20, 'https://placehold.co/600x400?text=Photography',      'listings/photo_01.jpg',     0, NOW() - INTERVAL '30 days');

  -- ============================================================
  -- 8. PRODUCTS (20 - spread across listings)
  -- ============================================================
  INSERT INTO products (id, listing_id, name, description, price, currency, is_active, display_order) VALUES
    (prd01, lst01, 'Veg Thaal Tiffin',       'Dal, sabzi, rotla, rice, dessert - serves 2',          250.00,   'INR', true, 1),
    (prd02, lst01, 'Non-Veg Thaal Tiffin',   'Chicken/mutton curry, dal, rice, rotla, dessert',      350.00,   'INR', true, 2),
    (prd03, lst02, 'Standard Catering (50)', 'Full thaal menu for 50 guests',                        15000.00, 'INR', true, 1),
    (prd04, lst02, 'Premium Catering (50)',  'Premium thaal with 8 dishes + live counter',           25000.00, 'INR', true, 2),
    (prd05, lst03, 'Malida Box (500g)',       'Traditional Bohra malida, packed fresh',               400.00,   'INR', true, 1),
    (prd06, lst03, 'Khajur Pak Box (250g)',  'Dates & dry fruit sweet, no preservatives',            300.00,   'INR', true, 2),
    (prd07, lst05, 'Everyday Rida',          'Comfortable cotton Rida for daily wear',               1500.00,  'INR', true, 1),
    (prd08, lst05, 'Festive Rida',           'Embroidered Rida for Eid & special occasions',        3500.00,  'INR', true, 2),
    (prd09, lst06, 'Blouse Stitching',       'Custom blouse with lining & hooks',                    500.00,   'INR', true, 1),
    (prd10, lst06, 'Kurta Set Stitching',    'Full kurta + pajama/salwar stitching',                 800.00,   'INR', true, 2),
    (prd11, lst09, 'Bridal Full Hands',      'Full hand mehndi - front & back, up to elbow',        3000.00,  'INR', true, 1),
    (prd12, lst09, 'Bridal Hands + Feet',   'Complete bridal package with feet design',             5000.00,  'INR', true, 2),
    (prd13, lst10, 'Basic Facial',           '45-min organic facial with cleanup',                   800.00,   'INR', true, 1),
    (prd14, lst10, 'Gold Facial',            '90-min gold facial with mask & serum',                 1500.00,  'INR', true, 2),
    (prd15, lst13, 'Monthly Quran Class',    '4 classes/week, 1 hour each - monthly fee',           1000.00,  'INR', true, 1),
    (prd16, lst14, 'Arabic Beginner Course', '3-month beginner course - 3 sessions/week',           3000.00,  'INR', true, 1),
    (prd17, lst15, 'Class 10 Batch',         'CBSE Math + Science - 5 days/week',                   2500.00,  'INR', true, 1),
    (prd18, lst17, 'Monthly Social Pack',    '30 posts + 8 reels + analytics report',               5000.00,  'INR', true, 1),
    (prd19, lst18, 'Logo Package',           'Logo + visiting card + letterhead design',             3000.00,  'INR', true, 1),
    (prd20, lst19, 'Basic Website',          '5-page responsive website with contact form',          15000.00, 'INR', true, 1);

  -- ============================================================
  -- 9. REVIEWS (20 - customers reviewing live listings)
  -- ============================================================
  INSERT INTO reviews (id, listing_id, reviewer_id, star_rating, review_text, status, posted_at) VALUES
    (rev01, lst01, u02, 5, 'Amazing food! Tastes exactly like maa ke haath ka khana. The dal-chawal is perfection.',    'active', NOW() - INTERVAL '70 days'),
    (rev02, lst01, u03, 4, 'Very good tiffin service. Fresh and on time. Would love more variety.',                     'active', NOW() - INTERVAL '65 days'),
    (rev03, lst02, u04, 5, 'Catered for our son''s aqiqa. Every dish was outstanding. Highly recommend!',              'active', NOW() - INTERVAL '60 days'),
    (rev04, lst03, u05, 4, 'Malida was absolutely delicious. Khajur pak was a bit too sweet for my taste.',            'active', NOW() - INTERVAL '50 days'),
    (rev05, lst05, u06, 5, 'Beautiful Rida! The fabric quality and stitching are top-notch. Got so many compliments.', 'active', NOW() - INTERVAL '68 days'),
    (rev06, lst05, u08, 4, 'Lovely designs. Delivery took a bit longer than expected but the quality made up for it.', 'active', NOW() - INTERVAL '55 days'),
    (rev07, lst06, u10, 5, 'Perfect fitting on the first try. Insiya behen really knows her craft.',                   'active', NOW() - INTERVAL '58 days'),
    (rev08, lst07, u12, 5, 'My wedding trousseau was absolutely stunning. Everyone asked where I got it!',              'active', NOW() - INTERVAL '52 days'),
    (rev09, lst09, u02, 5, 'The bridal mehndi was gorgeous. Rashida is incredibly talented and patient.',              'active', NOW() - INTERVAL '62 days'),
    (rev10, lst09, u14, 4, 'Very intricate work. Took longer than quoted but the result was beautiful.',               'active', NOW() - INTERVAL '48 days'),
    (rev11, lst10, u03, 4, 'Skin felt so fresh after the facial. Using all natural products is a big plus.',           'active', NOW() - INTERVAL '55 days'),
    (rev12, lst11, u06, 3, 'Mehndi was nice but the design was simpler than what was shown in the samples.',           'active', NOW() - INTERVAL '40 days'),
    (rev13, lst13, u07, 5, 'My son has memorized 5 juz in 6 months. The teaching method is excellent.',               'active', NOW() - INTERVAL '50 days'),
    (rev14, lst14, u09, 4, 'Good Arabic course. The teacher is knowledgeable. Wish there were more practice sessions.','active', NOW() - INTERVAL '45 days'),
    (rev15, lst15, u05, 4, 'My daughter''s math grades improved significantly. Grateful for the personal attention.',  'active', NOW() - INTERVAL '38 days'),
    (rev16, lst17, u11, 5, 'Our Instagram grew from 200 to 2000 followers in 2 months! Great work.',                  'active', NOW() - INTERVAL '42 days'),
    (rev17, lst17, u13, 4, 'Good content creation. Reel quality could be better but the strategy works.',              'active', NOW() - INTERVAL '30 days'),
    (rev18, lst18, u04, 5, 'Love my new logo! Professional work and quick turnaround time.',                           'active', NOW() - INTERVAL '35 days'),
    (rev19, lst19, u07, 4, 'Website looks great on mobile. A few minor tweaks needed but overall happy.',              'active', NOW() - INTERVAL '25 days'),
    (rev20, lst01, u15, 3, 'Food is decent but portion size could be bigger for the price. Delivery was late once.',   'active', NOW() - INTERVAL '20 days');

  -- ============================================================
  -- 10. REVIEW_PHOTOS (10 - some reviews have photos)
  -- ============================================================
  INSERT INTO review_photos (id, review_id, image_url, storage_key) VALUES
    (rph01, rev01, 'https://placehold.co/400x300?text=Tiffin+Review',   'reviews/r01_photo.jpg'),
    (rph02, rev03, 'https://placehold.co/400x300?text=Catering+Review', 'reviews/r03_photo.jpg'),
    (rph03, rev05, 'https://placehold.co/400x300?text=Rida+Review',     'reviews/r05_photo.jpg'),
    (rph04, rev08, 'https://placehold.co/400x300?text=Bridal+Review',   'reviews/r08_photo.jpg'),
    (rph05, rev09, 'https://placehold.co/400x300?text=Mehndi+Review',   'reviews/r09_photo.jpg'),
    (rph06, rev13, 'https://placehold.co/400x300?text=Quran+Review',    'reviews/r13_photo.jpg'),
    (rph07, rev16, 'https://placehold.co/400x300?text=Social+Review',   'reviews/r16_photo.jpg'),
    (rph08, rev18, 'https://placehold.co/400x300?text=Logo+Review',     'reviews/r18_photo.jpg'),
    (rph09, rev04, 'https://placehold.co/400x300?text=Mithai+Review',   'reviews/r04_photo.jpg'),
    (rph10, rev11, 'https://placehold.co/400x300?text=Facial+Review',   'reviews/r11_photo.jpg');

  -- ============================================================
  -- 11. REVIEW_REPORTS (5 - some reports on reviews)
  -- ============================================================
  INSERT INTO review_reports (id, review_id, reporter_id, reason, status, reported_at) VALUES
    (rrt01, rev12, u18, 'Review seems unfairly harsh and not constructive',          'pending',   NOW() - INTERVAL '38 days'),
    (rrt02, rev20, u16, 'Customer complaint was resolved but review not updated',    'reviewed',  NOW() - INTERVAL '18 days'),
    (rrt03, rev17, u20, 'Competitor posting fake review',                            'pending',   NOW() - INTERVAL '28 days'),
    (rrt04, rev06, u17, 'Review mentions wrong product',                             'dismissed', NOW() - INTERVAL '50 days'),
    (rrt05, rev15, u19, 'Inappropriate language in review',                          'pending',   NOW() - INTERVAL '35 days');

END $$;

-- ============================================================
-- DONE! Summary:
-- users:              20 (1 admin + 15 customers + 5 provider-customers)
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
-- All IDs are random UUIDs (gen_random_uuid())
-- ============================================================

-- ============================================================
-- 12. LINK SUPABASE AUTH USERS (run AFTER seed-supabase-users.ts)
-- ============================================================
UPDATE users SET supabase_id = auth_user.id::text
FROM auth.users AS auth_user
WHERE users.email = auth_user.email
  AND users.supabase_id IS NULL;
