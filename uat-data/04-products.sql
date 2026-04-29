-- ============================================================================
-- Tijarah Connect — UAT Seed: 04 PRODUCTS
-- 105 products & services across all 40 providers
-- Mix of product_type = 'product' and 'service'
-- ============================================================================

BEGIN;

INSERT INTO products (id, provider_id, name, description, price, currency, photo_url, is_active, display_order, product_type) VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- P01: FATIMA'S TAILORING (5)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00001-aaaa-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Custom Rida Stitching',     'Full custom Rida with your choice of fabric and embellishments. Includes 2 fitting sessions.',  2500.00, 'INR', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', true, 1, 'service'),
('e1a00002-aaaa-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Bridal Outfit Package',     'Complete bridal outfit — lehenga, dupatta, and blouse. Premium zardozi embroidery.',            15000.00, 'INR', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', true, 2, 'product'),
('e1a00003-aaaa-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Alteration & Repair',       'Quick alterations for any garment. Hemming, resizing, zip replacement.',                         300.00, 'INR', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400', true, 3, 'service'),
('e1a00004-aaaa-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Kids Ethnic Wear',          'Custom ethnic outfits for children — kurta, pajama, frocks.',                                  1200.00, 'INR', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400', true, 4, 'product'),
('e1a00005-aaaa-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'Abaya Collection',          'Ready-made designer abayas in premium fabrics. Sizes S to XXL.',                               3500.00, 'INR', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400', true, 5, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P02: HUSAIN'S KITCHEN (5)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00006-aaaa-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'Daily Tiffin Service',      'Home-cooked Bohri thali delivered daily. Rice, dal, sabzi, roti, and salad.',                    150.00, 'INR', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400', true, 1, 'service'),
('e1a00007-aaaa-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'Wedding Catering (per plate)','Full course wedding menu — appetizers, mains, desserts, and beverages.',                       800.00, 'INR', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', true, 2, 'service'),
('e1a00008-aaaa-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'Party Snacks Platter',      'Assorted samosa, kebab, cutlet, and chutney platter. Serves 15-20.',                           1500.00, 'INR', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', true, 3, 'product'),
('e1a00009-aaaa-4f7a-8b9c-000000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'Dessert Box (12 pcs)',      'Assorted Bohri sweets — malpua, kheer, firni, and jalebi.',                                     600.00, 'INR', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400', true, 4, 'product'),
('e1a00010-aaaa-4f7a-8b9c-000000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'Biryani Family Pack',       'Aromatic Bohri biryani with raita and salad. Serves 4-6.',                                      700.00, 'INR', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', true, 5, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P03: SAKINA MEHNDI (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00011-aaaa-4f7a-8b9c-000000000011', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'Bridal Mehndi (Full)',      'Both hands and feet. Intricate traditional Bohri bridal design. 3-4 hours.',                   5000.00, 'INR', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', true, 1, 'service'),
('e1a00012-aaaa-4f7a-8b9c-000000000012', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'Party Mehndi (Hands)',      'Arabic/Indian design on both hands. Perfect for Eid or any occasion.',                         1500.00, 'INR', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400', true, 2, 'service'),
('e1a00013-aaaa-4f7a-8b9c-000000000013', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'Kids Mehndi Special',       'Fun and simple designs for children. Quick 30-minute session.',                                  500.00, 'INR', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P04: RASHIDA'S BEAUTY (4)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00014-aaaa-4f7a-8b9c-000000000014', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'Bridal Makeup Package',     'Complete bridal makeup with trial. Includes hair styling, draping, touch-ups.',                12000.00, 'INR', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400', true, 1, 'service'),
('e1a00015-aaaa-4f7a-8b9c-000000000015', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'Keratin Hair Treatment',    'Professional keratin smoothening. Lasts 3-4 months. All hair types.',                          5000.00, 'INR', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', true, 2, 'service'),
('e1a00016-aaaa-4f7a-8b9c-000000000016', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'Gold Facial',               'Luxury gold facial for instant glow. 60-minute session.',                                      1500.00, 'INR', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400', true, 3, 'service'),
('e1a00017-aaaa-4f7a-8b9c-000000000017', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'Manicure & Pedicure Combo', 'Relaxing mani-pedi with scrub, massage, and polish.',                                            800.00, 'INR', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400', true, 4, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P05: TAHER EVENT PLANNERS (2) — pending provider
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00018-aaaa-4f7a-8b9c-000000000018', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'Wedding Planning Package',  'End-to-end wedding planning. Venue, decor, catering, entertainment.',                        100000.00, 'INR', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400', true, 1, 'service'),
('e1a00019-aaaa-4f7a-8b9c-000000000019', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'Birthday Party Setup',      'Theme-based birthday party setup with balloon decor and backdrop.',                            15000.00, 'INR', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P06: BURHANUDDIN GENERAL STORE (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00020-aaaa-4f7a-8b9c-000000000020', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'Dry Fruit Gift Box (1 kg)', 'Premium mixed dry fruits — almonds, cashews, pistachios, raisins.',                              850.00, 'INR', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', true, 1, 'product'),
('e1a00021-aaaa-4f7a-8b9c-000000000021', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'Imported Dates (500g)',     'Premium Ajwa dates imported from Madinah. Vacuum packed.',                                       600.00, 'INR', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', true, 2, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P07: TASNEEM LADIES SALON (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00022-aaaa-4f7a-8b9c-000000000022', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'Bridal Makeover Complete',  'Full bridal makeover with saree draping, jewellery setting, and touch-ups.',                   18000.00, 'INR', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', true, 1, 'service'),
('e1a00023-aaaa-4f7a-8b9c-000000000023', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'Hair Spa Treatment',        'Deep conditioning hair spa with hot oil massage. 90 minutes.',                                 2500.00, 'INR', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', true, 2, 'service'),
('e1a00024-aaaa-4f7a-8b9c-000000000024', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'Nail Art Package',          'Gel nail art with custom designs. Includes 2 hands.',                                          1200.00, 'INR', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P08: SHABBIR AC REPAIR (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00025-aaaa-4f7a-8b9c-000000000025', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'AC Deep Cleaning',          'Complete split/window AC servicing with jet wash and gas check.',                                800.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 1, 'service'),
('e1a00026-aaaa-4f7a-8b9c-000000000026', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'Fridge Repair & Service',   'Refrigerator compressor, thermostat, and gas issues. 90-day warranty.',                         1200.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 2, 'service'),
('e1a00027-aaaa-4f7a-8b9c-000000000027', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'Washing Machine Repair',    'All brands — top load and front load. Motor, drum, and PCB repair.',                           1000.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P09: NAFISA CAKE STUDIO (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00028-aaaa-4f7a-8b9c-000000000028', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'Custom Birthday Cake (1kg)','Eggless custom design cake. Fondant or cream. Choose your theme.',                             1800.00, 'INR', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', true, 1, 'product'),
('e1a00029-aaaa-4f7a-8b9c-000000000029', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'Cupcake Box (12 pcs)',      'Assorted flavour cupcakes with buttercream frosting.',                                           800.00, 'INR', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', true, 2, 'product'),
('e1a00030-aaaa-4f7a-8b9c-000000000030', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'Wedding Cake (3 tier)',     '3-tier wedding cake with custom decoration. Eggless available.',                                8000.00, 'INR', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', true, 3, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P10: QAIDJOHAR PLUMBING (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00031-aaaa-4f7a-8b9c-000000000031', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'Plumbing Repair',           'Fix leaks, blocked drains, tap replacement. Same-day service.',                                  500.00, 'INR', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', true, 1, 'service'),
('e1a00032-aaaa-4f7a-8b9c-000000000032', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'Bathroom Renovation',       'Complete bathroom fitting — tiles, fixtures, plumbing. Turnkey solution.',                      25000.00, 'INR', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P11: MUFFADAL PHOTOGRAPHY (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00033-aaaa-4f7a-8b9c-000000000033', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'Wedding Photography',       'Full-day coverage with 2 photographers. 500+ edited photos.',                                 35000.00, 'INR', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400', true, 1, 'service'),
('e1a00034-aaaa-4f7a-8b9c-000000000034', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'Corporate Event Video',     'Professional multi-camera video for corporate events and seminars.',                           20000.00, 'INR', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400', true, 2, 'service'),
('e1a00035-aaaa-4f7a-8b9c-000000000035', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'Portrait Session',          '1-hour studio or outdoor portrait session. 20 edited photos.',                                 5000.00, 'INR', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P12: KHADIJA TUITION (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00036-aaaa-4f7a-8b9c-000000000036', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'CBSE Maths (Class 8-10)',   'Batch of 5 students max. Board exam focused.',                                                 2000.00, 'INR', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', true, 1, 'service'),
('e1a00037-aaaa-4f7a-8b9c-000000000037', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'Quran & Hifz Classes',      'One-on-one Quran recitation and memorization. Flexible timings.',                               1500.00, 'INR', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400', true, 2, 'service'),
('e1a00038-aaaa-4f7a-8b9c-000000000038', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'English Speaking Course',   '3-month conversational English course.',                                                        3000.00, 'INR', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P13: MURTAZA TECH REPAIRS (4)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00039-aaaa-4f7a-8b9c-000000000039', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'Mobile Screen Replacement', 'Original screen replacement for all major brands. 6-month warranty.',                           2000.00, 'INR', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400', true, 1, 'service'),
('e1a00040-aaaa-4f7a-8b9c-000000000040', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'Laptop Service & Repair',   'Hardware & software diagnostics, SSD upgrade, OS reinstall.',                                  1500.00, 'INR', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', true, 2, 'service'),
('e1a00041-aaaa-4f7a-8b9c-000000000041', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'Data Recovery',             'Recover lost data from phones, hard drives, and SSDs.',                                        3000.00, 'INR', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400', true, 3, 'service'),
('e1a00042-aaaa-4f7a-8b9c-000000000042', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'TV & LED Repair',           'LCD/LED TV repair — display, motherboard, power supply.',                                      1200.00, 'INR', 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400', true, 4, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P14: AMINA TUTORING (2) — in_review
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00043-aaaa-4f7a-8b9c-000000000043', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b14', 'ICSE Science Coaching',     'Physics, chemistry, and biology for Class 9-10.',                                              2500.00, 'INR', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', true, 1, 'service'),
('e1a00044-aaaa-4f7a-8b9c-000000000044', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b14', 'Quran Recitation Class',    'Weekly Quran tajweed and recitation for all ages.',                                             1000.00, 'INR', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P15: ALIASGAR WOODCRAFT (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00045-aaaa-4f7a-8b9c-000000000045', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'Modular Kitchen',           'Custom modular kitchen design and installation. All materials included.',                      75000.00, 'INR', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', true, 1, 'service'),
('e1a00046-aaaa-4f7a-8b9c-000000000046', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'Custom Wardrobe',           'Built-in wardrobes with sliding doors. Measurement to installation.',                          35000.00, 'INR', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P16: JUMANA MEHNDI (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00047-aaaa-4f7a-8b9c-000000000047', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16', 'Bridal Mehndi Package',     'Elaborate bridal design on hands and feet. 4-5 hour session.',                                 6000.00, 'INR', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400', true, 1, 'service'),
('e1a00048-aaaa-4f7a-8b9c-000000000048', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16', 'Group Mehndi (5+ people)',  'Per person rate for group bookings. Party and Eid specials.',                                    700.00, 'INR', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P17: SAIFEE CATERING (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00049-aaaa-4f7a-8b9c-000000000049', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'Corporate Lunch Box',       'Premium packed lunch for corporate events. Min 50 boxes.',                                      350.00, 'INR', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', true, 1, 'service'),
('e1a00050-aaaa-4f7a-8b9c-000000000050', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'Wedding Buffet (per plate)','Multi-cuisine buffet with live counters. Min 100 plates.',                                      950.00, 'INR', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', true, 2, 'service'),
('e1a00051-aaaa-4f7a-8b9c-000000000051', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'Eid Special Platter',       'Festive platter with kebabs, biryani, and sheer khurma. Serves 8.',                            2000.00, 'INR', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', true, 3, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P18: INSIYA BEAUTY STUDIO (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00052-aaaa-4f7a-8b9c-000000000052', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b18', 'Organic Facial',            'Chemical-free facial using organic products. 75-minute session.',                               2000.00, 'INR', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400', true, 1, 'service'),
('e1a00053-aaaa-4f7a-8b9c-000000000053', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b18', 'Bridal Makeup (Organic)',   'Bridal makeover using organic and cruelty-free products.',                                     15000.00, 'INR', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P19: ZAHRA'S SWEET CORNER (4)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00054-aaaa-4f7a-8b9c-000000000054', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'Classic Malpua Box (12)',   'Traditional Bohri malpua soaked in sugar syrup. Made fresh daily.',                              450.00, 'INR', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400', true, 1, 'product'),
('e1a00055-aaaa-4f7a-8b9c-000000000055', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'Mixed Mithai Box (500g)',   'Assorted barfi, ladoo, peda, and jalebi. Perfect for gifting.',                                  350.00, 'INR', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', true, 2, 'product'),
('e1a00056-aaaa-4f7a-8b9c-000000000056', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'Halwa Platter (1 kg)',      'Rich sooji halwa with dry fruits. Pure ghee, no preservatives.',                                 500.00, 'INR', 'https://images.unsplash.com/photo-1606890737304-86acd94755aa?w=400', true, 3, 'product'),
('e1a00057-aaaa-4f7a-8b9c-000000000057', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'Custom Celebration Cake',   'Eggless custom cake for birthdays or walima. Starting 1 kg.',                                  1200.00, 'INR', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', true, 4, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P20: HATIM ELECTRICAL (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00058-aaaa-4f7a-8b9c-000000000058', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'House Wiring & MCB',        'Complete house wiring, MCB panel installation. ISI certified.',                                 3000.00, 'INR', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400', true, 1, 'service'),
('e1a00059-aaaa-4f7a-8b9c-000000000059', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'Fan & Light Repair',        'Ceiling fan, exhaust fan, tube light, and LED repair.',                                          400.00, 'INR', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P21: RUKAIYA TAILORING (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00060-aaaa-4f7a-8b9c-000000000060', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'Salwar Kameez Set',         'Custom salwar kameez with dupatta. Designer cuts available.',                                   2000.00, 'INR', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', true, 1, 'service'),
('e1a00061-aaaa-4f7a-8b9c-000000000061', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'Lehenga Choli',             'Full bridal lehenga choli with heavy embroidery.',                                            18000.00, 'INR', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', true, 2, 'product'),
('e1a00062-aaaa-4f7a-8b9c-000000000062', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'Quick Alterations',         'Same-day hemming, resizing, and zip replacement.',                                               250.00, 'INR', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P22: MUSTAFA CATERING (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00063-aaaa-4f7a-8b9c-000000000063', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'Bohra Thali (per head)',    'Complete traditional Bohra thali with 8+ items.',                                                500.00, 'INR', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', true, 1, 'service'),
('e1a00064-aaaa-4f7a-8b9c-000000000064', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'Dastarkhwan Setup',         'Full dastarkhwan setup with crockery and serving for 50+ guests.',                              8000.00, 'INR', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P23: TAHERA HENNA ART (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00065-aaaa-4f7a-8b9c-000000000065', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b23', 'Organic Bridal Henna',      'All-natural henna paste. Rich dark stain. Bridal hands + feet.',                               4500.00, 'INR', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=400', true, 1, 'service'),
('e1a00066-aaaa-4f7a-8b9c-000000000066', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b23', 'Eid Mehndi Special',        'Quick beautiful designs for Eid. Per person rate.',                                              600.00, 'INR', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P24: NOOR PHOTOGRAPHY (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00067-aaaa-4f7a-8b9c-000000000067', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'Wedding Photography',       'Full-day coverage with 2 photographers. 500+ edited photos.',                                 35000.00, 'INR', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400', true, 1, 'service'),
('e1a00068-aaaa-4f7a-8b9c-000000000068', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'Pre-Wedding Shoot',         'Creative pre-wedding photoshoot at location of your choice.',                                 15000.00, 'INR', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400', true, 2, 'service'),
('e1a00069-aaaa-4f7a-8b9c-000000000069', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'Event Videography',         'Professional video with drone shots. Cinematic highlight reel.',                               25000.00, 'INR', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P25: AMATULLAH'S SWEET BOX (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00070-aaaa-4f7a-8b9c-000000000070', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'Ladoo Assortment (500g)',   'Besan, motichur, and coconut ladoo. Freshly made.',                                              400.00, 'INR', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', true, 1, 'product'),
('e1a00071-aaaa-4f7a-8b9c-000000000071', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'Festive Gift Hamper',       'Premium sweets + dry fruits in decorative box.',                                               1500.00, 'INR', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', true, 2, 'product'),
('e1a00072-aaaa-4f7a-8b9c-000000000072', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'Barfi Collection (250g)',   'Kaju, pista, and badam barfi. Pure ghee.',                                                       350.00, 'INR', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400', true, 3, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P26: MOIZ TECH HUB (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00073-aaaa-4f7a-8b9c-000000000073', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b26', 'Laptop SSD Upgrade',        'Upgrade to NVMe SSD with OS migration. Instant speed boost.',                                  3500.00, 'INR', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', true, 1, 'service'),
('e1a00074-aaaa-4f7a-8b9c-000000000074', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b26', 'WiFi Network Setup',        'Home and office WiFi setup with mesh routing and security.',                                   2500.00, 'INR', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P27: SAKINA TUITIONS (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00075-aaaa-4f7a-8b9c-000000000075', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27', 'Home Tuition (All Subjects)','Personalised 1-on-1 tuition. Class 1 to 10.',                                                 3000.00, 'INR', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400', true, 1, 'service'),
('e1a00076-aaaa-4f7a-8b9c-000000000076', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27', 'Quran Classes (Online)',    'Online Quran recitation for kids and adults. Flexible timing.',                                 1200.00, 'INR', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P28: HUSSAIN PAINTING (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00077-aaaa-4f7a-8b9c-000000000077', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b28', 'Full House Painting',       'Interior and exterior painting for 2BHK/3BHK. Asian Paints.',                                 25000.00, 'INR', 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400', true, 1, 'service'),
('e1a00078-aaaa-4f7a-8b9c-000000000078', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b28', 'Texture Wall & Accent',     'Designer texture wall for living room. Multiple finish options.',                               8000.00, 'INR', 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P29: IQBAL HOME SERVICES (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00079-aaaa-4f7a-8b9c-000000000079', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'Plumbing Repair',           'Fix leaks, blocked drains, tap replacement. Same-day service.',                                  500.00, 'INR', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', true, 1, 'service'),
('e1a00080-aaaa-4f7a-8b9c-000000000080', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'Electrical Work',           'Wiring, switchboard repair, MCB installation. Licensed.',                                        600.00, 'INR', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400', true, 2, 'service'),
('e1a00081-aaaa-4f7a-8b9c-000000000081', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'Deep Home Cleaning',        'Full apartment deep cleaning. Kitchen, bathrooms, windows.',                                   3000.00, 'INR', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P30: ZAINAB FASHION HOUSE (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00082-aaaa-4f7a-8b9c-000000000082', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'Bridal Lehenga (Custom)',   'Full bridal lehenga with zardozi. Premium Banarasi fabric.',                                  45000.00, 'INR', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400', true, 1, 'product'),
('e1a00083-aaaa-4f7a-8b9c-000000000083', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'Indo-Western Gown',         'Designer Indo-Western gown for parties and receptions.',                                       12000.00, 'INR', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400', true, 2, 'product'),
('e1a00084-aaaa-4f7a-8b9c-000000000084', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'Custom Embroidery Work',    'Zardozi, aari, and thread embroidery on any fabric.',                                          3000.00, 'INR', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P31: ABDEALI CATERING (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00085-aaaa-4f7a-8b9c-000000000085', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31', 'Biryani Catering (per kg)', 'Authentic Mughlai biryani with raita. Min 5 kg order.',                                          600.00, 'INR', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', true, 1, 'service'),
('e1a00086-aaaa-4f7a-8b9c-000000000086', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31', 'Kebab Platter (50 pcs)',    'Seekh, galouti, and shami kebabs. Party size.',                                                2500.00, 'INR', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', true, 2, 'product'),
('e1a00087-aaaa-4f7a-8b9c-000000000087', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31', 'Wedding Catering Package',  'Complete wedding catering for 200+ guests. Multi-course.',                                     85000.00, 'INR', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', true, 3, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P32: MARIAM SALON (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00088-aaaa-4f7a-8b9c-000000000088', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b32', 'Full Body Spa',             'Relaxing full body spa with aromatherapy. 120 minutes.',                                       4000.00, 'INR', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400', true, 1, 'service'),
('e1a00089-aaaa-4f7a-8b9c-000000000089', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b32', 'Hair Colour & Highlights',  'Global colour or highlights. Loreal and Schwarzkopf products.',                                3500.00, 'INR', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P33: HAKIMUDDIN EVENTS (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00090-aaaa-4f7a-8b9c-000000000090', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'Wedding Stage Setup',       'Grand stage with lighting, backdrop, and floral. Up to 500 guests.',                          50000.00, 'INR', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400', true, 1, 'service'),
('e1a00091-aaaa-4f7a-8b9c-000000000091', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b33', 'Mehndi Night Decor',        'Colourful mehndi night setup with fairy lights and props.',                                    20000.00, 'INR', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P34: JUZER PHOTOGRAPHY (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00092-aaaa-4f7a-8b9c-000000000092', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34', 'Nikah Photography',         'Candid and traditional coverage. 300+ edited photos.',                                        20000.00, 'INR', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400', true, 1, 'service'),
('e1a00093-aaaa-4f7a-8b9c-000000000093', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34', 'Family Portrait Session',   'Studio or outdoor shoot for families. 15 edited photos.',                                      6000.00, 'INR', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P35: FATEMA HOME KITCHEN (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00094-aaaa-4f7a-8b9c-000000000094', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'Daily Tiffin (Veg)',        'Vegetarian home-cooked tiffin. Rice, dal, sabzi, roti.',                                        180.00, 'INR', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', true, 1, 'service'),
('e1a00095-aaaa-4f7a-8b9c-000000000095', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'Party Order (per head)',    'Bohri thali with starters for house parties. Min 10 heads.',                                     450.00, 'INR', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', true, 2, 'service'),
('e1a00096-aaaa-4f7a-8b9c-000000000096', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'Sheer Khurma (1 litre)',    'Traditional sheer khurma with vermicelli, dates, and nuts.',                                     400.00, 'INR', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400', true, 3, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P36: YUSUF AC & COOLING (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00097-aaaa-4f7a-8b9c-000000000097', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36', 'Split AC Installation',     'Installation with copper piping, stand, and gas charge.',                                      3500.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 1, 'service'),
('e1a00098-aaaa-4f7a-8b9c-000000000098', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36', 'AC AMC (Annual)',           'Annual maintenance contract — 4 services per year.',                                           4000.00, 'INR', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P37: ARWA BOUTIQUE (3)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00099-aaaa-4f7a-8b9c-000000000099', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'Designer Kurta Set',        'Ready-made designer kurta with dupatta. Multiple sizes.',                                      2800.00, 'INR', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400', true, 1, 'product'),
('e1a00100-aaaa-4f7a-8b9c-000000000100', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'Festive Outfit Collection', 'Eid and wedding-ready outfits. Latest designs.',                                               5000.00, 'INR', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400', true, 2, 'product'),
('e1a00101-aaaa-4f7a-8b9c-000000000101', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'Accessories & Jewellery',   'Handcrafted earrings, bangles, and clutches.',                                                   800.00, 'INR', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400', true, 3, 'product'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P38: TAHA ELECTRONICS (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00102-aaaa-4f7a-8b9c-000000000102', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'Mobile Screen Guard (Pack)','Tempered glass screen guard. Available for all models.',                                         150.00, 'INR', 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400', true, 1, 'product'),
('e1a00103-aaaa-4f7a-8b9c-000000000103', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'Phone Repair Service',      'Screen, battery, and charging port repair. 1-hour service.',                                   1500.00, 'INR', 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P39: SAKINA HOME SERVICES (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00104-aaaa-4f7a-8b9c-000000000104', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'Deep Cleaning (2BHK)',      'Full house deep cleaning with bathroom scrubbing.',                                            3500.00, 'INR', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', true, 1, 'service'),
('e1a00105-aaaa-4f7a-8b9c-000000000105', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'Pest Control Service',      'Termite, cockroach, and mosquito treatment. 6-month warranty.',                                2000.00, 'INR', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', true, 2, 'service'),

-- ═══════════════════════════════════════════════════════════════════════════
-- P40: MURTAZA EVENT DECORATOR (2)
-- ═══════════════════════════════════════════════════════════════════════════
('e1a00106-aaaa-4f7a-8b9c-000000000106', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'Tent & Shamiana Setup',     'Shamiana, tent, and flooring for outdoor events. Up to 300 guests.',                          30000.00, 'INR', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400', true, 1, 'service'),
('e1a00107-aaaa-4f7a-8b9c-000000000107', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'Flower Decoration',         'Fresh flower decoration for stage, entrance, and mandap.',                                    15000.00, 'INR', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400', true, 2, 'service');

COMMIT;
