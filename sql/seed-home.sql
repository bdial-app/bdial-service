-- ============================================================
-- Home Page Seed Data
-- Adds: promo_banners, bookings, more providers, more listings, more reviews
-- Run AFTER the main seed.sql
-- ============================================================

-- We need references to existing users, providers, and listings.
-- Since main seed uses gen_random_uuid(), we look them up by known fields.

DO $$
DECLARE
  -- Look up existing users by mobile
  v_admin_id    UUID;
  v_fatema_id   UUID;
  v_sakina_id   UUID;
  v_murtaza_id  UUID;
  v_taher_id    UUID;
  v_zahra_id    UUID;
  v_ayman_id    UUID;
  v_nafisa_id   UUID;
  v_husain_id   UUID;
  v_ruqaiya_id  UUID;
  v_abbas_id    UUID;
  v_munira_id   UUID;
  v_qaid_id     UUID;
  v_jumana_id   UUID;
  v_mustafa_id  UUID;

  -- Existing providers
  v_maryam_prov  UUID;
  v_insiya_prov  UUID;
  v_rashida_prov UUID;
  v_noor_prov    UUID;
  v_alifiya_prov UUID;

  -- Existing listings (we need some for bookings)
  v_lst_tiffin     UUID;
  v_lst_catering   UUID;
  v_lst_rida       UUID;
  v_lst_tailoring  UUID;
  v_lst_mehndi     UUID;
  v_lst_facial     UUID;
  v_lst_quran      UUID;
  v_lst_social     UUID;
  v_lst_logo       UUID;
  v_lst_web        UUID;

  -- New providers
  np01 UUID := gen_random_uuid();
  np02 UUID := gen_random_uuid();
  np03 UUID := gen_random_uuid();
  np04 UUID := gen_random_uuid();
  np05 UUID := gen_random_uuid();

  -- New users for the new providers
  nu01 UUID := gen_random_uuid();
  nu02 UUID := gen_random_uuid();
  nu03 UUID := gen_random_uuid();
  nu04 UUID := gen_random_uuid();
  nu05 UUID := gen_random_uuid();

  -- New listings
  nl01 UUID := gen_random_uuid();
  nl02 UUID := gen_random_uuid();
  nl03 UUID := gen_random_uuid();
  nl04 UUID := gen_random_uuid();
  nl05 UUID := gen_random_uuid();
  nl06 UUID := gen_random_uuid();
  nl07 UUID := gen_random_uuid();
  nl08 UUID := gen_random_uuid();
  nl09 UUID := gen_random_uuid();
  nl10 UUID := gen_random_uuid();

  -- Categories (look up by slug)
  v_cat_food       UUID;
  v_cat_clothing   UUID;
  v_cat_beauty     UUID;
  v_cat_education  UUID;
  v_cat_it         UUID;
  v_cat_home_decor UUID;
  v_cat_health     UUID;
  v_cat_event      UUID;
  v_cat_grocery    UUID;
  v_cat_tiffin     UUID;
  v_cat_tailoring  UUID;
  v_cat_mehndi     UUID;
  v_cat_skincare   UUID;

BEGIN

  -- ============================================================
  -- Look up existing IDs
  -- ============================================================
  SELECT id INTO v_admin_id    FROM users WHERE mobile_number = '9876543210';
  SELECT id INTO v_fatema_id   FROM users WHERE mobile_number = '9876543211';
  SELECT id INTO v_sakina_id   FROM users WHERE mobile_number = '9876543212';
  SELECT id INTO v_murtaza_id  FROM users WHERE mobile_number = '9876543213';
  SELECT id INTO v_taher_id    FROM users WHERE mobile_number = '9876543214';
  SELECT id INTO v_zahra_id    FROM users WHERE mobile_number = '9876543215';
  SELECT id INTO v_ayman_id    FROM users WHERE mobile_number = '9876543216';
  SELECT id INTO v_nafisa_id   FROM users WHERE mobile_number = '9876543217';
  SELECT id INTO v_husain_id   FROM users WHERE mobile_number = '9876543218';
  SELECT id INTO v_ruqaiya_id  FROM users WHERE mobile_number = '9876543219';
  SELECT id INTO v_abbas_id    FROM users WHERE mobile_number = '9876543220';
  SELECT id INTO v_munira_id   FROM users WHERE mobile_number = '9876543221';
  SELECT id INTO v_qaid_id     FROM users WHERE mobile_number = '9876543222';
  SELECT id INTO v_jumana_id   FROM users WHERE mobile_number = '9876543223';
  SELECT id INTO v_mustafa_id  FROM users WHERE mobile_number = '9876543224';

  SELECT id INTO v_maryam_prov  FROM providers WHERE brand_name = 'Maryam''s Kitchen';
  SELECT id INTO v_insiya_prov  FROM providers WHERE brand_name = 'Insiya Couture';
  SELECT id INTO v_rashida_prov FROM providers WHERE brand_name = 'Glow by Rashida';
  SELECT id INTO v_noor_prov    FROM providers WHERE brand_name = 'Noor Academy';
  SELECT id INTO v_alifiya_prov FROM providers WHERE brand_name = 'Alifiya Digital Studio';

  SELECT id INTO v_lst_tiffin    FROM listings WHERE business_name = 'Maryam''s Daily Tiffin';
  SELECT id INTO v_lst_catering  FROM listings WHERE business_name = 'Maryam''s Party Catering';
  SELECT id INTO v_lst_rida      FROM listings WHERE business_name = 'Designer Rida Collection';
  SELECT id INTO v_lst_tailoring FROM listings WHERE business_name = 'Custom Tailoring Service';
  SELECT id INTO v_lst_mehndi    FROM listings WHERE business_name = 'Bridal Mehndi Package';
  SELECT id INTO v_lst_facial    FROM listings WHERE business_name = 'Organic Facial Treatment';
  SELECT id INTO v_lst_quran     FROM listings WHERE business_name = 'Quran Hifz Program';
  SELECT id INTO v_lst_social    FROM listings WHERE business_name = 'Social Media Management';
  SELECT id INTO v_lst_logo      FROM listings WHERE business_name = 'Logo & Brand Design';
  SELECT id INTO v_lst_web       FROM listings WHERE business_name = 'Website Development';

  SELECT id INTO v_cat_food       FROM categories WHERE slug = 'food-catering';
  SELECT id INTO v_cat_clothing   FROM categories WHERE slug = 'clothing-fashion';
  SELECT id INTO v_cat_beauty     FROM categories WHERE slug = 'beauty-wellness';
  SELECT id INTO v_cat_education  FROM categories WHERE slug = 'education-tutoring';
  SELECT id INTO v_cat_it         FROM categories WHERE slug = 'it-digital';
  SELECT id INTO v_cat_home_decor FROM categories WHERE slug = 'home-decor-crafts';
  SELECT id INTO v_cat_health     FROM categories WHERE slug = 'health-fitness';
  SELECT id INTO v_cat_event      FROM categories WHERE slug = 'event-services';
  SELECT id INTO v_cat_grocery    FROM categories WHERE slug = 'grocery-essentials';
  SELECT id INTO v_cat_tiffin     FROM categories WHERE slug = 'tiffin-service';
  SELECT id INTO v_cat_tailoring  FROM categories WHERE slug = 'tailoring';
  SELECT id INTO v_cat_mehndi     FROM categories WHERE slug = 'mehndi-art';
  SELECT id INTO v_cat_skincare   FROM categories WHERE slug = 'skincare';

  -- ============================================================
  -- 1. PROMO BANNERS (6 banners)
  -- ============================================================
  INSERT INTO promo_banners (id, title, subtitle, gradient, emoji, cta, tag, link_url, is_active, display_order, starts_at, ends_at, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Get 20% Off',       'First tailoring order',                       'from-violet-600 to-purple-700',    '✂️',  'Book Now',    'NEW USER',     '/all-services?search=Tailoring',   true, 1, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', NOW(), NOW()),
    (gen_random_uuid(), 'AC Service',         'Starting at ₹499 — beat the summer heat',    'from-cyan-500 to-blue-600',        '❄️',  'Book Now',    'POPULAR',      '/all-services?search=AC+Repair',   true, 2, NOW() - INTERVAL '15 days', NOW() + INTERVAL '90 days', NOW(), NOW()),
    (gen_random_uuid(), 'Beauty at Home',     'Salon-quality services at your doorstep',     'from-pink-500 to-rose-600',        '💅',  'Explore',     'TRENDING',     '/all-services?search=Beauty',      true, 3, NOW() - INTERVAL '10 days', NOW() + INTERVAL '60 days', NOW(), NOW()),
    (gen_random_uuid(), 'Food & Tiffin',      'Homemade Bohra meals delivered daily',        'from-amber-500 to-orange-600',     '🍱',  'Order Now',   'DAILY',        '/all-services?search=Tiffin',      true, 4, NOW() - INTERVAL '20 days', NOW() + INTERVAL '120 days', NOW(), NOW()),
    (gen_random_uuid(), 'Ramadan Special',    'Iftar catering — book early, save 15%',       'from-emerald-500 to-teal-600',     '🌙',  'Book Catering','SEASONAL',    '/all-services?search=Catering',    true, 5, NOW() - INTERVAL '5 days',  NOW() + INTERVAL '30 days', NOW(), NOW()),
    (gen_random_uuid(), 'Rida Collection',    'Festive Ridas starting ₹1,499 — shop now',   'from-fuchsia-500 to-pink-600',     '👗',  'Shop Now',    'EID SPECIAL',  '/all-services?search=Rida',        true, 6, NOW() - INTERVAL '7 days',  NOW() + INTERVAL '45 days', NOW(), NOW());

  -- ============================================================
  -- 2. NEW USERS (5 more provider-users to have 10 total providers)
  -- ============================================================
  INSERT INTO users (id, mobile_number, email, name, gender, role, city, area, pincode, latitude, longitude, status, created_at, updated_at) VALUES
    (nu01, '9876543230', 'huzefa.c@example.com',   'Huzefa Chitalwala',   'male',   'customer', 'Mumbai',    'Bhendi Bazaar', '400003', 18.9650, 72.8360, 'active', NOW() - INTERVAL '60 days', NOW()),
    (nu02, '9876543231', 'sakina.m@example.com',   'Sakina Masalawala',   'female', 'customer', 'Mumbai',    'Dongri',        '400009', 18.9590, 72.8375, 'active', NOW() - INTERVAL '58 days', NOW()),
    (nu03, '9876543232', 'hatim.b@example.com',    'Hatim Borhawala',     'male',   'customer', 'Pune',      'Kondhwa',       '411048', 18.4640, 73.8950, 'active', NOW() - INTERVAL '55 days', NOW()),
    (nu04, '9876543233', 'tayyeba.s@example.com',  'Tayyeba Saifee',      'female', 'customer', 'Surat',     'Nanpura',       '395001', 21.1962, 72.8310, 'active', NOW() - INTERVAL '52 days', NOW()),
    (nu05, '9876543234', 'moiz.q@example.com',     'Moiz Quettawala',     'male',   'customer', 'Mumbai',    'Malabar Hill',  '400006', 18.9550, 72.7980, 'active', NOW() - INTERVAL '50 days', NOW());

  -- ============================================================
  -- 3. NEW PROVIDERS (5 more to increase density)
  -- ============================================================
  INSERT INTO providers (id, user_id, brand_name, description, address, city, area, pincode, latitude, longitude, contact_number, open_time, close_time, is_available, profile_photo_url, status, is_featured, created_at, updated_at) VALUES
    (np01, nu01, 'Huzefa AC Solutions',     'AC repair, installation & maintenance. All brands covered.',              '33, Bhendi Bazaar Market',          'Mumbai', 'Bhendi Bazaar', '400003', 18.9652, 72.8362, '9876543230', '09:00', '19:00', true,  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', 'active',     true,  NOW() - INTERVAL '55 days', NOW()),
    (np02, nu02, 'Sakina''s Home Delights', 'Handmade snacks, pickles & masalas. Authentic Bohra recipes.',            '7, Dongri Cross Lane',              'Mumbai', 'Dongri',        '400009', 18.9592, 72.8378, '9876543231', '08:00', '18:00', true,  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',   'active',     true,  NOW() - INTERVAL '50 days', NOW()),
    (np03, nu03, 'FitLife by Hatim',        'Personal fitness training, diet plans & yoga classes.',                    '12, Kondhwa Budruk',                'Pune',   'Kondhwa',       '411048', 18.4642, 73.8952, '9876543232', '06:00', '20:00', true,  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', 'active',     false, NOW() - INTERVAL '45 days', NOW()),
    (np04, nu04, 'Tayyeba''s Craft Studio', 'Handmade home decor, event decorations & gift items.',                    '28, Nanpura Bazaar',                'Surat',  'Nanpura',       '395001', 21.1965, 72.8315, '9876543233', '10:00', '19:00', true,  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400', 'active',     false, NOW() - INTERVAL '40 days', NOW()),
    (np05, nu05, 'Moiz Photography',        'Professional wedding, event & portrait photography. Drone coverage available.', '15, Malabar Hill',          'Mumbai', 'Malabar Hill',  '400006', 18.9555, 72.7985, '9876543234', '07:00', '22:00', true,  'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400',   'active',     true,  NOW() - INTERVAL '35 days', NOW());

  -- ============================================================
  -- 4. NEW LISTINGS (10 more listings for the new providers)
  -- ============================================================
  INSERT INTO listings (id, provider_id, business_name, description, contact_phone, city, area, pincode, latitude, longitude, is_women_led, community_verified, status, submitted_at, approved_at, updated_at) VALUES
    (nl01, np01, 'AC Repair & Service',        'Split & window AC repair, gas refill, deep cleaning. Same-day service.',      '9876543230', 'Mumbai', 'Bhendi Bazaar', '400003', 18.9652, 72.8362, false, true,  'live', NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days', NOW()),
    (nl02, np01, 'AC Installation Package',    'New AC installation with copper piping, stand & stabilizer. All brands.',     '9876543230', 'Mumbai', 'Bhendi Bazaar', '400003', 18.9652, 72.8362, false, false, 'live', NOW() - INTERVAL '45 days', NOW() - INTERVAL '43 days', NOW()),
    (nl03, np02, 'Homemade Snacks Box',        'Chakli, khandvi, fafda, methi mathri — freshly made to order.',              '9876543231', 'Mumbai', 'Dongri',        '400009', 18.9592, 72.8378, true,  true,  'live', NOW() - INTERVAL '48 days', NOW() - INTERVAL '46 days', NOW()),
    (nl04, np02, 'Custom Masala & Pickle',     'Hand-ground masalas, mango & lime pickles. No preservatives.',               '9876543231', 'Mumbai', 'Dongri',        '400009', 18.9592, 72.8378, true,  false, 'live', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days', NOW()),
    (nl05, np03, 'Personal Fitness Training',  'One-on-one training at home or park. Weight loss & muscle building.',         '9876543232', 'Pune',   'Kondhwa',       '411048', 18.4642, 73.8952, false, false, 'live', NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days', NOW()),
    (nl06, np03, 'Yoga & Meditation Classes',  'Morning yoga for beginners to advanced. Pranayama & meditation.',             '9876543232', 'Pune',   'Kondhwa',       '411048', 18.4642, 73.8952, false, true,  'live', NOW() - INTERVAL '35 days', NOW() - INTERVAL '33 days', NOW()),
    (nl07, np04, 'Event Decoration Service',   'Theme-based decor for milad, walima, birthday & corporate events.',           '9876543233', 'Surat',  'Nanpura',       '395001', 21.1965, 72.8315, true,  true,  'live', NOW() - INTERVAL '38 days', NOW() - INTERVAL '36 days', NOW()),
    (nl08, np04, 'Handmade Gift Hampers',      'Custom gift boxes for Eid, weddings & baby showers. Eco-friendly packaging.','9876543233', 'Surat',  'Nanpura',       '395001', 21.1965, 72.8315, true,  false, 'live', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NOW()),
    (nl09, np05, 'Wedding Photography',        'Full wedding coverage — pre-wedding, ceremony, reception. Cinematic video.',  '9876543234', 'Mumbai', 'Malabar Hill',  '400006', 18.9555, 72.7985, false, true,  'live', NOW() - INTERVAL '32 days', NOW() - INTERVAL '30 days', NOW()),
    (nl10, np05, 'Portrait Photography',       'Professional headshots, family portraits & portfolio shoots.',                '9876543234', 'Mumbai', 'Malabar Hill',  '400006', 18.9555, 72.7985, false, false, 'live', NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days', NOW());

  -- ============================================================
  -- 5. LISTING CATEGORIES for new listings
  -- ============================================================
  INSERT INTO listing_categories (id, listing_id, category_id) VALUES
    (gen_random_uuid(), nl01, v_cat_health),      -- AC Repair under Health (service)
    (gen_random_uuid(), nl02, v_cat_health),
    (gen_random_uuid(), nl03, v_cat_food),         -- Snacks under Food
    (gen_random_uuid(), nl03, v_cat_grocery),       -- Also under Grocery
    (gen_random_uuid(), nl04, v_cat_food),
    (gen_random_uuid(), nl04, v_cat_grocery),
    (gen_random_uuid(), nl05, v_cat_health),       -- Fitness under Health
    (gen_random_uuid(), nl06, v_cat_health),
    (gen_random_uuid(), nl07, v_cat_home_decor),   -- Event decor
    (gen_random_uuid(), nl07, v_cat_event),
    (gen_random_uuid(), nl08, v_cat_home_decor),
    (gen_random_uuid(), nl09, v_cat_event),         -- Photography
    (gen_random_uuid(), nl10, v_cat_event);

  -- ============================================================
  -- 6. PHOTOS for new listings
  -- ============================================================
  INSERT INTO photos (id, listing_id, image_url, storage_key, display_order, uploaded_at) VALUES
    (gen_random_uuid(), nl01, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600', 'listings/ac_repair_01.jpg',   0, NOW() - INTERVAL '48 days'),
    (gen_random_uuid(), nl02, 'https://images.unsplash.com/photo-1631545806609-0f0f6b1b1b0a?w=600', 'listings/ac_install_01.jpg',  0, NOW() - INTERVAL '43 days'),
    (gen_random_uuid(), nl03, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600', 'listings/snacks_01.jpg',      0, NOW() - INTERVAL '46 days'),
    (gen_random_uuid(), nl04, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600', 'listings/masala_01.jpg',      0, NOW() - INTERVAL '38 days'),
    (gen_random_uuid(), nl05, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', 'listings/fitness_01.jpg',     0, NOW() - INTERVAL '40 days'),
    (gen_random_uuid(), nl06, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600',   'listings/yoga_01.jpg',        0, NOW() - INTERVAL '33 days'),
    (gen_random_uuid(), nl07, 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600', 'listings/event_decor_01.jpg', 0, NOW() - INTERVAL '36 days'),
    (gen_random_uuid(), nl08, 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600', 'listings/gift_hamper_01.jpg', 0, NOW() - INTERVAL '28 days'),
    (gen_random_uuid(), nl09, 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600', 'listings/wedding_photo_01.jpg',0, NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), nl10, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600', 'listings/portrait_01.jpg',    0, NOW() - INTERVAL '23 days');

  -- ============================================================
  -- 7. PRODUCTS for new listings
  -- ============================================================
  INSERT INTO products (id, listing_id, name, description, price, currency, is_active, display_order) VALUES
    (gen_random_uuid(), nl01, 'AC Gas Refill',          'R32/R410A gas refill with leak check',         499.00,   'INR', true, 1),
    (gen_random_uuid(), nl01, 'AC Deep Cleaning',       'Complete wash, filter clean, coil cleaning',   699.00,   'INR', true, 2),
    (gen_random_uuid(), nl02, 'Split AC Installation',  '1-1.5 ton with copper piping up to 3ft',      2500.00,  'INR', true, 1),
    (gen_random_uuid(), nl03, 'Snack Box (500g)',       'Assorted namkeen — chakli, mathri, sev',       350.00,   'INR', true, 1),
    (gen_random_uuid(), nl03, 'Festive Combo (1kg)',    'Khandvi + Fafda + Chakli special pack',        600.00,   'INR', true, 2),
    (gen_random_uuid(), nl04, 'Masala Pack (250g)',     'Garam masala + chai masala combo',              200.00,   'INR', true, 1),
    (gen_random_uuid(), nl05, 'Monthly Pack (20 sessions)', '1-hour sessions, 5 days/week',            4000.00,  'INR', true, 1),
    (gen_random_uuid(), nl06, 'Yoga Monthly (12 sessions)', 'Morning batch 6-7 AM, 3 days/week',      1500.00,  'INR', true, 1),
    (gen_random_uuid(), nl07, 'Basic Event Decor',      'Balloon arch + backdrop + table decor',        5000.00,  'INR', true, 1),
    (gen_random_uuid(), nl07, 'Premium Wedding Decor',  'Full stage + entry + table + lighting',        25000.00, 'INR', true, 2),
    (gen_random_uuid(), nl08, 'Eid Gift Hamper',        'Dates + dry fruits + sweets in gift box',      800.00,   'INR', true, 1),
    (gen_random_uuid(), nl09, 'Full Day Wedding',       '12-hour coverage, 2 photographers + video',    35000.00, 'INR', true, 1),
    (gen_random_uuid(), nl09, 'Pre-Wedding Shoot',      '3-hour outdoor shoot, edited album',           15000.00, 'INR', true, 2),
    (gen_random_uuid(), nl10, 'Professional Headshot',  '30-min session, 5 edited photos',              2000.00,  'INR', true, 1);

  -- ============================================================
  -- 8. REVIEWS for new listings
  -- ============================================================
  INSERT INTO reviews (id, listing_id, reviewer_id, star_rating, review_text, status, posted_at) VALUES
    (gen_random_uuid(), nl01, v_fatema_id,  5, 'AC was running like new after the service. Huzefa bhai is very professional and punctual.',             'active', NOW() - INTERVAL '45 days'),
    (gen_random_uuid(), nl01, v_zahra_id,   4, 'Good service but had to wait 2 hours. The AC cooling improved significantly though.',                   'active', NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), nl01, v_qaid_id,    5, 'Best AC repair in the area. Fixed my inverter AC quickly and charges are fair.',                        'active', NOW() - INTERVAL '20 days'),
    (gen_random_uuid(), nl03, v_ruqaiya_id, 5, 'The snacks taste exactly like homemade! Ordered the festive combo and everyone loved it.',              'active', NOW() - INTERVAL '40 days'),
    (gen_random_uuid(), nl03, v_nafisa_id,  4, 'Fresh and tasty. Packaging could be better but the taste makes up for it.',                             'active', NOW() - INTERVAL '25 days'),
    (gen_random_uuid(), nl05, v_husain_id,  5, 'Lost 8 kg in 2 months with Hatim''s guidance. Very motivating trainer.',                                'active', NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), nl05, v_abbas_id,   4, 'Good training but wish there were more flexible timing slots.',                                         'active', NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), nl06, v_sakina_id,  5, 'The yoga sessions have completely changed my mornings. Feeling so much more energetic!',                 'active', NOW() - INTERVAL '25 days'),
    (gen_random_uuid(), nl07, v_jumana_id,  5, 'Our milad decoration was absolutely stunning. Tayyeba has amazing taste.',                              'active', NOW() - INTERVAL '28 days'),
    (gen_random_uuid(), nl07, v_munira_id,  4, 'Beautiful decoration for the walima. A few items were slightly different from the reference photo.',     'active', NOW() - INTERVAL '18 days'),
    (gen_random_uuid(), nl09, v_fatema_id,  5, 'Moiz captured our wedding beautifully. The cinematic video brought tears to our eyes.',                 'active', NOW() - INTERVAL '22 days'),
    (gen_random_uuid(), nl09, v_zahra_id,   5, 'The pre-wedding shoot was fantastic! Great eye for locations and poses.',                                'active', NOW() - INTERVAL '12 days'),
    (gen_random_uuid(), nl09, v_murtaza_id, 4, 'Professional work overall. Delivery of final album took a bit long but quality was excellent.',         'active', NOW() - INTERVAL '8 days'),
    (gen_random_uuid(), nl10, v_taher_id,   5, 'Got amazing headshots for my LinkedIn. Very patient and guided me through poses.',                      'active', NOW() - INTERVAL '15 days');

  -- ============================================================
  -- 9. BOOKINGS (30 bookings — mix of completed, confirmed, in_progress)
  -- These create the social proof and last-booking data.
  -- ============================================================
  INSERT INTO bookings (id, user_id, provider_id, listing_id, status, total_amount, currency, notes, scheduled_at, completed_at, created_at, updated_at) VALUES
    -- Completed bookings (for reorder ribbon + stats)
    (gen_random_uuid(), v_fatema_id,  v_maryam_prov,  v_lst_tiffin,    'completed', 250.00,   'INR', 'Monthly tiffin subscription',     NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '60 days', NOW()),
    (gen_random_uuid(), v_fatema_id,  v_maryam_prov,  v_lst_tiffin,    'completed', 250.00,   'INR', 'Renewed tiffin',                  NOW() - INTERVAL '29 days', NOW() - INTERVAL '2 days',  NOW() - INTERVAL '29 days', NOW()),
    (gen_random_uuid(), v_sakina_id,  v_rashida_prov, v_lst_mehndi,    'completed', 5000.00,  'INR', 'Bridal mehndi for my wedding',    NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '55 days', NOW()),
    (gen_random_uuid(), v_murtaza_id, v_maryam_prov,  v_lst_catering,  'completed', 25000.00, 'INR', 'Aqiqa catering for 50 guests',    NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '50 days', NOW()),
    (gen_random_uuid(), v_taher_id,   v_noor_prov,    v_lst_quran,     'completed', 1000.00,  'INR', 'Monthly Quran class fee',          NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '40 days', NOW()),
    (gen_random_uuid(), v_zahra_id,   v_insiya_prov,  v_lst_rida,      'completed', 3500.00,  'INR', 'Festive Rida order',              NOW() - INTERVAL '35 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '35 days', NOW()),
    (gen_random_uuid(), v_zahra_id,   v_insiya_prov,  v_lst_tailoring, 'completed', 500.00,   'INR', 'Blouse stitching',                NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '20 days', NOW()),
    (gen_random_uuid(), v_ayman_id,   v_alifiya_prov, v_lst_social,    'completed', 5000.00,  'INR', 'Social media monthly pack',        NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day',   NOW() - INTERVAL '30 days', NOW()),
    (gen_random_uuid(), v_nafisa_id,  v_rashida_prov, v_lst_facial,    'completed', 800.00,   'INR', 'Basic facial appointment',         NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '28 days', NOW()),
    (gen_random_uuid(), v_husain_id,  np03,           nl05,            'completed', 4000.00,  'INR', 'Monthly fitness pack',             NOW() - INTERVAL '28 days', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '28 days', NOW()),
    (gen_random_uuid(), v_ruqaiya_id, np02,           nl03,            'completed', 600.00,   'INR', 'Festive snack combo',             NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days', NOW()),
    (gen_random_uuid(), v_abbas_id,   np01,           nl01,            'completed', 499.00,   'INR', 'AC gas refill',                   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '20 days', NOW()),
    (gen_random_uuid(), v_munira_id,  np04,           nl07,            'completed', 5000.00,  'INR', 'Milad decoration',                NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '18 days', NOW()),
    (gen_random_uuid(), v_qaid_id,    v_alifiya_prov, v_lst_logo,      'completed', 3000.00,  'INR', 'Logo for new business',           NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days',  NOW() - INTERVAL '12 days', NOW()),
    (gen_random_uuid(), v_jumana_id,  np04,           nl08,            'completed', 800.00,   'INR', 'Eid gift hampers x5',             NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days',  NOW() - INTERVAL '10 days', NOW()),
    (gen_random_uuid(), v_mustafa_id, np05,           nl10,            'completed', 2000.00,  'INR', 'Professional headshot',            NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days',  NOW() - INTERVAL '10 days', NOW()),

    -- Confirmed / upcoming bookings
    (gen_random_uuid(), v_fatema_id,  np05,           nl09,            'confirmed', 35000.00, 'INR', 'Wedding photography',             NOW() + INTERVAL '15 days', NULL,                        NOW() - INTERVAL '5 days',  NOW()),
    (gen_random_uuid(), v_sakina_id,  np03,           nl06,            'confirmed', 1500.00,  'INR', 'Monthly yoga classes',             NOW() + INTERVAL '2 days',  NULL,                        NOW() - INTERVAL '3 days',  NOW()),
    (gen_random_uuid(), v_murtaza_id, np01,           nl01,            'confirmed', 699.00,   'INR', 'AC deep cleaning',                NOW() + INTERVAL '1 day',   NULL,                        NOW() - INTERVAL '2 days',  NOW()),
    (gen_random_uuid(), v_taher_id,   v_insiya_prov,  v_lst_rida,      'confirmed', 1500.00,  'INR', 'Everyday Rida order',             NOW() + INTERVAL '5 days',  NULL,                        NOW() - INTERVAL '1 day',   NOW()),
    (gen_random_uuid(), v_zahra_id,   v_maryam_prov,  v_lst_tiffin,    'confirmed', 350.00,   'INR', 'Non-veg tiffin trial',            NOW() + INTERVAL '1 day',   NULL,                        NOW(),                       NOW()),
    (gen_random_uuid(), v_ayman_id,   np04,           nl07,            'confirmed', 25000.00, 'INR', 'Wedding decoration',              NOW() + INTERVAL '30 days', NULL,                        NOW() - INTERVAL '4 days',  NOW()),

    -- In-progress bookings
    (gen_random_uuid(), v_nafisa_id,  v_maryam_prov,  v_lst_tiffin,    'in_progress', 250.00, 'INR', 'Ongoing tiffin delivery',         NOW() - INTERVAL '5 days',  NULL,                        NOW() - INTERVAL '5 days',  NOW()),
    (gen_random_uuid(), v_husain_id,  v_alifiya_prov, v_lst_web,       'in_progress', 15000.00,'INR', 'Website development for shop',    NOW() - INTERVAL '10 days', NULL,                        NOW() - INTERVAL '10 days', NOW()),
    (gen_random_uuid(), v_ruqaiya_id, v_insiya_prov,  v_lst_tailoring, 'in_progress', 800.00,  'INR', 'Kurta set stitching',            NOW() - INTERVAL '3 days',  NULL,                        NOW() - INTERVAL '3 days',  NOW()),

    -- Today's completed (for live activity pulse)
    (gen_random_uuid(), v_abbas_id,   v_maryam_prov,  v_lst_tiffin,    'completed', 250.00,   'INR', 'Daily tiffin',                    NOW(),                       NOW(),                       NOW(),                       NOW()),
    (gen_random_uuid(), v_qaid_id,    np01,           nl01,            'completed', 499.00,   'INR', 'AC gas refill urgent',            NOW(),                       NOW(),                       NOW(),                       NOW()),
    (gen_random_uuid(), v_jumana_id,  np02,           nl03,            'completed', 350.00,   'INR', 'Snack box for party',             NOW(),                       NOW(),                       NOW(),                       NOW()),
    (gen_random_uuid(), v_mustafa_id, v_rashida_prov, v_lst_mehndi,    'completed', 3000.00,  'INR', 'Party mehndi for wife',           NOW(),                       NOW(),                       NOW(),                       NOW()),
    (gen_random_uuid(), v_munira_id,  v_noor_prov,    v_lst_quran,     'completed', 1000.00,  'INR', 'Monthly fee renewal',             NOW(),                       NOW(),                       NOW(),                       NOW());

  -- ============================================================
  -- 10. Update existing provider profile photos (they were NULL)
  -- ============================================================
  UPDATE providers SET profile_photo_url = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' WHERE brand_name = 'Maryam''s Kitchen' AND profile_photo_url IS NULL;
  UPDATE providers SET profile_photo_url = 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400' WHERE brand_name = 'Insiya Couture' AND profile_photo_url IS NULL;
  UPDATE providers SET profile_photo_url = 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400' WHERE brand_name = 'Glow by Rashida' AND profile_photo_url IS NULL;
  UPDATE providers SET profile_photo_url = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400' WHERE brand_name = 'Noor Academy' AND profile_photo_url IS NULL;
  UPDATE providers SET profile_photo_url = 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400' WHERE brand_name = 'Alifiya Digital Studio' AND profile_photo_url IS NULL;

  -- Mark some existing providers as featured
  UPDATE providers SET is_featured = true WHERE brand_name IN ('Maryam''s Kitchen', 'Insiya Couture', 'Glow by Rashida');

  -- ============================================================
  -- 11. Verifications for new providers
  -- ============================================================
  INSERT INTO verifications (id, user_id, aadhaar_doc_url, aadhaar_status, status, admin_notes, reviewed_at, reviewed_by) VALUES
    (gen_random_uuid(), nu01, 'https://storage.example.com/verif/aadhaar_nu01.pdf', 'approved', 'approved', 'Verified', NOW() - INTERVAL '50 days', v_admin_id),
    (gen_random_uuid(), nu02, 'https://storage.example.com/verif/aadhaar_nu02.pdf', 'approved', 'approved', 'Verified', NOW() - INTERVAL '45 days', v_admin_id),
    (gen_random_uuid(), nu03, 'https://storage.example.com/verif/aadhaar_nu03.pdf', 'approved', 'approved', 'Verified', NOW() - INTERVAL '40 days', v_admin_id),
    (gen_random_uuid(), nu04, 'https://storage.example.com/verif/aadhaar_nu04.pdf', 'approved', 'approved', 'Verified', NOW() - INTERVAL '35 days', v_admin_id),
    (gen_random_uuid(), nu05, 'https://storage.example.com/verif/aadhaar_nu05.pdf', 'approved', 'approved', 'Verified', NOW() - INTERVAL '30 days', v_admin_id);

END $$;

-- ============================================================
-- DONE! Additional seed summary:
-- promo_banners:   6
-- new users:       5  (total 25)
-- new providers:   5  (total 10)
-- new listings:    10 (total 30)
-- new photos:      10 (total 30)
-- new products:    14 (total 34)
-- new reviews:     14 (total 34)
-- bookings:        30 (16 completed + 6 confirmed + 3 in_progress + 5 today)
-- verifications:   5  (total 10)
-- ============================================================
