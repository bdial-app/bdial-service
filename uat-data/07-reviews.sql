-- ============================================================================
-- Tijarah Connect — UAT Seed: 07 REVIEWS
-- 80 reviews + 15 review photos + 3 review reports
-- Schema: reviews(id, provider_id, reviewer_id, star_rating, review_text, status,
--         flag_reason, posted_at, moderated_at, moderated_by, reply_text, replied_at)
--         review_photos(id, review_id, image_url, storage_key)
--         review_reports(id, review_id, reporter_id, reason, status, reported_at)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEWS (80) — 2 reviews per provider from different customers        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO reviews (id, provider_id, reviewer_id, star_rating, review_text, status, flag_reason, posted_at, moderated_at, moderated_by, reply_text, replied_at) VALUES

-- P01 Fatima's Tailoring
('b1a00001-dddd-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 5, 'Masha''Allah, beautiful work on my Rida. Fatima behen is very talented!', 'active', NULL, NOW()-INTERVAL '60 days', NULL, NULL, 'Shukran! We are glad you loved it.', NOW()-INTERVAL '59 days'),
('b1a00002-dddd-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 4, 'Good stitching quality. Delivery was a bit delayed but worth the wait.', 'active', NULL, NOW()-INTERVAL '45 days', NULL, NULL, NULL, NULL),

-- P02 Husain's Kitchen
('b1a00003-dddd-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 5, 'Best Bohri food in Mumbai! The biryani was incredible, dastarkhwan style thali was perfect.', 'active', NULL, NOW()-INTERVAL '55 days', NULL, NULL, 'Thank you! We take pride in our traditional recipes.', NOW()-INTERVAL '54 days'),
('b1a00004-dddd-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 4, 'Ordered tiffin service for a week. Portions were generous and taste was homely.', 'active', NULL, NOW()-INTERVAL '40 days', NULL, NULL, NULL, NULL),

-- P03 Sakina Mehndi
('b1a00005-dddd-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 5, 'Beautiful bridal mehndi! All the guests at the nikah were impressed.', 'active', NULL, NOW()-INTERVAL '50 days', NULL, NULL, 'Jazak''Allah! May the couple be blessed.', NOW()-INTERVAL '49 days'),
('b1a00006-dddd-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 4, 'Good design work. She was patient with my kids too. Will book again for Eid.', 'active', NULL, NOW()-INTERVAL '35 days', NULL, NULL, NULL, NULL),

-- P04 Rashida's Beauty
('b1a00007-dddd-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 5, 'Amazing bridal makeup. I looked exactly how I imagined. Highly recommend!', 'active', NULL, NOW()-INTERVAL '48 days', NULL, NULL, NULL, NULL),
('b1a00008-dddd-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 3, 'Keratin treatment was OK. Expected it to last longer. Staff was friendly though.', 'active', NULL, NOW()-INTERVAL '30 days', NULL, NULL, 'We apologise for the experience. Please visit again for a follow-up.', NOW()-INTERVAL '29 days'),

-- P06 Burhanuddin Store
('b1a00009-dddd-4f7a-8b9c-000000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 4, 'Great selection of imported dry fruits. Fair prices and fresh stock.', 'active', NULL, NOW()-INTERVAL '42 days', NULL, NULL, NULL, NULL),
('b1a00010-dddd-4f7a-8b9c-000000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'f9a0b1c2-d3e4-4f5a-6b7c-8d9e0f1a2b3c', 5, 'Best general store in the area. Burhanuddin bhai always has what you need.', 'active', NULL, NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL),

-- P07 Tasneem Salon
('b1a00011-dddd-4f7a-8b9c-000000000011', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 5, 'Best ladies salon! Comfortable, clean, and great results every time.', 'active', NULL, NOW()-INTERVAL '38 days', NULL, NULL, NULL, NULL),
('b1a00012-dddd-4f7a-8b9c-000000000012', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 4, 'Nice spa experience. A bit pricey but quality products used.', 'active', NULL, NOW()-INTERVAL '25 days', NULL, NULL, NULL, NULL),

-- P08 Shabbir AC Repair
('b1a00013-dddd-4f7a-8b9c-000000000013', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 5, 'Fixed my AC in an hour. Very professional and reasonable price.', 'active', NULL, NOW()-INTERVAL '36 days', NULL, NULL, 'Thank you bhai! Happy to help.', NOW()-INTERVAL '35 days'),
('b1a00014-dddd-4f7a-8b9c-000000000014', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 4, 'Good service. Came on time and was transparent about the cost.', 'active', NULL, NOW()-INTERVAL '22 days', NULL, NULL, NULL, NULL),

-- P09 Nafisa Cake Studio
('b1a00015-dddd-4f7a-8b9c-000000000015', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 5, 'The birthday cake was stunning! Eggless and still so moist and delicious.', 'active', NULL, NOW()-INTERVAL '34 days', NULL, NULL, NULL, NULL),
('b1a00016-dddd-4f7a-8b9c-000000000016', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 4, 'Cupcakes were beautiful and tasty. Loved the packaging too.', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),

-- P10 Qaidjohar Plumbing
('b1a00017-dddd-4f7a-8b9c-000000000017', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Fixed the bathroom leak quickly. Reliable service.', 'active', NULL, NOW()-INTERVAL '32 days', NULL, NULL, NULL, NULL),
('b1a00018-dddd-4f7a-8b9c-000000000018', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'a8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d', 3, 'Decent work but charged more than quoted initially.', 'active', NULL, NOW()-INTERVAL '18 days', NULL, NULL, NULL, NULL),

-- P11 Muffadal Photography
('b1a00019-dddd-4f7a-8b9c-000000000019', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 5, 'Masha''Allah, the wedding album is a treasure. Cinematic video was top class!', 'active', NULL, NOW()-INTERVAL '44 days', NULL, NULL, NULL, NULL),
('b1a00020-dddd-4f7a-8b9c-000000000020', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 5, 'Best photographer for nikah events. Captured every emotion beautifully.', 'active', NULL, NOW()-INTERVAL '30 days', NULL, NULL, 'JazakAllah khair! It was our pleasure.', NOW()-INTERVAL '29 days'),

-- P12 Khadija Tuition
('b1a00021-dddd-4f7a-8b9c-000000000021', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 5, 'My daughter''s grades improved significantly. Khadija apa is an excellent teacher.', 'active', NULL, NOW()-INTERVAL '40 days', NULL, NULL, NULL, NULL),
('b1a00022-dddd-4f7a-8b9c-000000000022', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 4, 'Good coaching for Quran hifz. My son enjoys the classes.', 'active', NULL, NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL),

-- P13 Murtaza Tech
('b1a00023-dddd-4f7a-8b9c-000000000023', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 5, 'Fixed my iPhone screen in 30 mins. Genuine parts and fair price.', 'active', NULL, NOW()-INTERVAL '38 days', NULL, NULL, NULL, NULL),
('b1a00024-dddd-4f7a-8b9c-000000000024', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'f9a0b1c2-d3e4-4f5a-6b7c-8d9e0f1a2b3c', 4, 'Laptop repair done well. Took 2 days but works perfectly now.', 'active', NULL, NOW()-INTERVAL '25 days', NULL, NULL, NULL, NULL),

-- P15 Aliasgar Woodcraft
('b1a00025-dddd-4f7a-8b9c-000000000025', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 5, 'Beautiful custom bookshelf. Excellent craftsmanship and attention to detail.', 'active', NULL, NOW()-INTERVAL '30 days', NULL, NULL, NULL, NULL),
('b1a00026-dddd-4f7a-8b9c-000000000026', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b15', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 4, 'Good modular kitchen work. Slightly over budget but quality is great.', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),

-- P16 Jumana Mehndi
('b1a00027-dddd-4f7a-8b9c-000000000027', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 5, 'Gorgeous bridal henna! Jumana was so patient and creative.', 'active', NULL, NOW()-INTERVAL '35 days', NULL, NULL, NULL, NULL),
('b1a00028-dddd-4f7a-8b9c-000000000028', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b16', 'f9a0b1c2-d3e4-4f5a-6b7c-8d9e0f1a2b3c', 4, 'Nice Eid mehndi. Colour came out beautifully dark.', 'active', NULL, NOW()-INTERVAL '22 days', NULL, NULL, NULL, NULL),

-- P17 Saifee Catering
('b1a00029-dddd-4f7a-8b9c-000000000029', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'f9a0b1c2-d3e4-4f5a-6b7c-8d9e0f1a2b3c', 5, 'Catered our walima. 200 guests and not a single complaint. Phenomenal!', 'active', NULL, NOW()-INTERVAL '42 days', NULL, NULL, 'Shukran! It was our honour to serve.', NOW()-INTERVAL '41 days'),
('b1a00030-dddd-4f7a-8b9c-000000000030', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 4, 'Good party food. The mughlai dishes were authentic and delicious.', 'active', NULL, NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL),

-- P18 Insiya Beauty
('b1a00031-dddd-4f7a-8b9c-000000000031', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b18', 'b9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e', 5, 'Love the organic products they use. My skin felt amazing after the facial.', 'active', NULL, NOW()-INTERVAL '26 days', NULL, NULL, NULL, NULL),
('b1a00032-dddd-4f7a-8b9c-000000000032', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b18', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 4, 'Nice bridal makeover experience. Very professional setup.', 'active', NULL, NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),

-- P19 Zahra Sweets
('b1a00033-dddd-4f7a-8b9c-000000000033', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 5, 'The malpua was divine! Tastes just like what my nani used to make.', 'active', NULL, NOW()-INTERVAL '40 days', NULL, NULL, NULL, NULL),
('b1a00034-dddd-4f7a-8b9c-000000000034', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 5, 'Ordered celebration cake for Eid. Beautifully decorated and tasted amazing.', 'active', NULL, NOW()-INTERVAL '25 days', NULL, NULL, 'Eid Mubarak! Thank you for choosing us.', NOW()-INTERVAL '24 days'),

-- P20 Hatim Electrical
('b1a00035-dddd-4f7a-8b9c-000000000035', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 4, 'Good wiring work for the new house. Clean installation.', 'active', NULL, NOW()-INTERVAL '35 days', NULL, NULL, NULL, NULL),
('b1a00036-dddd-4f7a-8b9c-000000000036', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b20', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 3, 'Decent work but had to call back for a minor fix. Sorted it quickly though.', 'active', NULL, NOW()-INTERVAL '18 days', NULL, NULL, NULL, NULL),

-- P21 Rukaiya Tailoring
('b1a00037-dddd-4f7a-8b9c-000000000037', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 5, 'Beautiful salwar kameez stitched perfectly to my measurements.', 'active', NULL, NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL),
('b1a00038-dddd-4f7a-8b9c-000000000038', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 4, 'Lehenga work was beautiful. A little late on delivery but great quality.', 'active', NULL, NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),

-- P22 Mustafa Catering
('b1a00039-dddd-4f7a-8b9c-000000000039', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 5, 'Authentic Bohra thali setup for our family gathering. Everyone loved it!', 'active', NULL, NOW()-INTERVAL '32 days', NULL, NULL, NULL, NULL),
('b1a00040-dddd-4f7a-8b9c-000000000040', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b22', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 4, 'Good halal catering for the community event. Food was fresh and tasty.', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),

-- P23 Tahera Henna
('b1a00041-dddd-4f7a-8b9c-000000000041', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b23', 'a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d', 5, 'Organic henna left a beautiful dark stain. No allergic reaction at all!', 'active', NULL, NOW()-INTERVAL '26 days', NULL, NULL, NULL, NULL),
('b1a00042-dddd-4f7a-8b9c-000000000042', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b23', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 4, 'Pretty mehndi designs for my daughters. Tahera was gentle and patient.', 'active', NULL, NOW()-INTERVAL '14 days', NULL, NULL, NULL, NULL),

-- P24 Noor Photography
('b1a00043-dddd-4f7a-8b9c-000000000043', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 5, 'Stunning nikah photography. Every shot was a masterpiece.', 'active', NULL, NOW()-INTERVAL '36 days', NULL, NULL, NULL, NULL),
('b1a00044-dddd-4f7a-8b9c-000000000044', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 4, 'Good pre-wedding shoot. Creative poses and locations.', 'active', NULL, NOW()-INTERVAL '22 days', NULL, NULL, NULL, NULL),

-- P25 Amatullah Sweets
('b1a00045-dddd-4f7a-8b9c-000000000045', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 5, 'Best kheer and firni in Bangalore! Reminded me of home.', 'active', NULL, NOW()-INTERVAL '30 days', NULL, NULL, NULL, NULL),
('b1a00046-dddd-4f7a-8b9c-000000000046', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 4, 'Good mithai for Eid. Freshly made and well packed.', 'active', NULL, NOW()-INTERVAL '18 days', NULL, NULL, NULL, NULL),

-- P26 Moiz Tech Hub
('b1a00047-dddd-4f7a-8b9c-000000000047', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b26', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 4, 'Fixed my laptop motherboard issue. Knowledgeable team.', 'active', NULL, NOW()-INTERVAL '25 days', NULL, NULL, NULL, NULL),
('b1a00048-dddd-4f7a-8b9c-000000000048', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b26', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 3, 'Data recovery took longer than promised. But they did recover everything.', 'active', NULL, NOW()-INTERVAL '12 days', NULL, NULL, NULL, NULL),

-- P27 Sakina Tuitions
('b1a00049-dddd-4f7a-8b9c-000000000049', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 5, 'My son''s maths improved from 60 to 90! Sakina apa is amazing.', 'active', NULL, NOW()-INTERVAL '35 days', NULL, NULL, NULL, NULL),
('b1a00050-dddd-4f7a-8b9c-000000000050', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b27', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 4, 'Good science coaching. Makes concepts easy to understand.', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),

-- P28 Hussain Painter
('b1a00051-dddd-4f7a-8b9c-000000000051', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b28', 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 4, 'Good interior painting work. Clean and professional.', 'active', NULL, NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL),
('b1a00052-dddd-4f7a-8b9c-000000000052', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b28', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 3, 'OK work. Some touch-up needed after completion.', 'active', NULL, NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),

-- P29 Iqbal Handyman
('b1a00053-dddd-4f7a-8b9c-000000000053', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 5, 'Jack of all trades! Fixed plumbing, electrical, and door in one visit.', 'active', NULL, NOW()-INTERVAL '40 days', NULL, NULL, NULL, NULL),
('b1a00054-dddd-4f7a-8b9c-000000000054', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Reliable handyman. Reasonably priced and honest about what needs fixing.', 'active', NULL, NOW()-INTERVAL '26 days', NULL, NULL, NULL, NULL),

-- P30 Zainab Fashion
('b1a00055-dddd-4f7a-8b9c-000000000055', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 5, 'Gorgeous designer collection. The party wear was showstopping!', 'active', NULL, NOW()-INTERVAL '33 days', NULL, NULL, NULL, NULL),
('b1a00056-dddd-4f7a-8b9c-000000000056', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Nice everyday kurtas. Good fabric and reasonable prices.', 'active', NULL, NOW()-INTERVAL '18 days', NULL, NULL, NULL, NULL),

-- P31 Abdeali Caterer
('b1a00057-dddd-4f7a-8b9c-000000000057', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 4, 'Good catering for our family dinner. Mughlai kebabs were top notch.', 'active', NULL, NOW()-INTERVAL '30 days', NULL, NULL, NULL, NULL),
('b1a00058-dddd-4f7a-8b9c-000000000058', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b31', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 3, 'Food was good but arrived 45 mins late. Communication could be better.', 'active', NULL, NOW()-INTERVAL '16 days', NULL, NULL, NULL, NULL),

-- P32 Mariam Salon
('b1a00059-dddd-4f7a-8b9c-000000000059', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b32', 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b', 5, 'Wonderful salon experience. Mariam is very skilled with hair styling.', 'active', NULL, NOW()-INTERVAL '25 days', NULL, NULL, NULL, NULL),
('b1a00060-dddd-4f7a-8b9c-000000000060', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b32', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Good facial treatment. Skin felt refreshed and glowing.', 'active', NULL, NOW()-INTERVAL '12 days', NULL, NULL, NULL, NULL),

-- P34 Juzer Photography
('b1a00061-dddd-4f7a-8b9c-000000000061', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 5, 'Captured our family gathering perfectly. Great candid shots!', 'active', NULL, NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL),
('b1a00062-dddd-4f7a-8b9c-000000000062', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b34', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Professional portrait session. Delivered within a week.', 'active', NULL, NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),

-- P35 Fatema Home Chef
('b1a00063-dddd-4f7a-8b9c-000000000063', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 5, 'The tiffin is like eating at home. So comforting and delicious!', 'active', NULL, NOW()-INTERVAL '22 days', NULL, NULL, NULL, NULL),
('b1a00064-dddd-4f7a-8b9c-000000000064', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b35', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Ordered biryani for the weekend. Authentic Hyderabadi flavour.', 'active', NULL, NOW()-INTERVAL '10 days', NULL, NULL, NULL, NULL),

-- P36 Yusuf AC Service
('b1a00065-dddd-4f7a-8b9c-000000000065', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 4, 'Quick AC servicing. Thorough cleaning and gas refill.', 'active', NULL, NOW()-INTERVAL '18 days', NULL, NULL, NULL, NULL),
('b1a00066-dddd-4f7a-8b9c-000000000066', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b36', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 3, 'Service was OK. Had to follow up for the warranty card.', 'active', NULL, NOW()-INTERVAL '8 days', NULL, NULL, NULL, NULL),

-- P37 Arwa Boutique
('b1a00067-dddd-4f7a-8b9c-000000000067', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 5, 'Lovely boutique with unique designer pieces. Arwa behen has great taste!', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),
('b1a00068-dddd-4f7a-8b9c-000000000068', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Good abayas collection. Fabric quality is premium.', 'active', NULL, NOW()-INTERVAL '10 days', NULL, NULL, NULL, NULL),

-- P38 Taha Electronics
('b1a00069-dddd-4f7a-8b9c-000000000069', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'c6d7e8f9-a0b1-4c2d-3e4f-5a6b7c8d9e0f', 4, 'Good repair for my washing machine. Fair pricing.', 'active', NULL, NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),
('b1a00070-dddd-4f7a-8b9c-000000000070', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b38', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 3, 'TV repair took longer than expected. But works fine now.', 'active', NULL, NOW()-INTERVAL '6 days', NULL, NULL, NULL, NULL),

-- P39 Sakina Home Services
('b1a00071-dddd-4f7a-8b9c-000000000071', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 5, 'Deep cleaning service was thorough. House looks brand new!', 'active', NULL, NOW()-INTERVAL '14 days', NULL, NULL, NULL, NULL),
('b1a00072-dddd-4f7a-8b9c-000000000072', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b39', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Good pest control service. Effective and used safe products.', 'active', NULL, NOW()-INTERVAL '5 days', NULL, NULL, NULL, NULL),

-- P40 Murtaza Decorator
('b1a00073-dddd-4f7a-8b9c-000000000073', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'd7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f1a', 5, 'Masha''Allah, the wedding decoration was breathtaking! Flower work was amazing.', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),
('b1a00074-dddd-4f7a-8b9c-000000000074', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b40', 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d', 4, 'Good stage decoration for our milad event. Creative lighting.', 'active', NULL, NOW()-INTERVAL '8 days', NULL, NULL, NULL, NULL),

-- FLAGGED / REMOVED reviews (6 more to reach ~80)
('b1a00075-dddd-4f7a-8b9c-000000000075', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 1, 'Terrible food! Made me sick.', 'flagged', 'Suspected fake review', NOW()-INTERVAL '15 days', NOW()-INTERVAL '14 days', '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NULL, NULL),
('b1a00076-dddd-4f7a-8b9c-000000000076', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 1, 'Complete fraud! Charged double and did nothing.', 'removed', 'Abusive language in original review', NOW()-INTERVAL '10 days', NOW()-INTERVAL '9 days', '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff', NULL, NULL),
('b1a00077-dddd-4f7a-8b9c-000000000077', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 2, 'Sweets were stale and overpriced.', 'flagged', 'Reviewer is suspended user', NOW()-INTERVAL '8 days', NOW()-INTERVAL '7 days', 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0', NULL, NULL),
('b1a00078-dddd-4f7a-8b9c-000000000078', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 5, 'Murtaza bhai is the best! Fixed everything at my office.', 'active', NULL, NOW()-INTERVAL '20 days', NULL, NULL, NULL, NULL),
('b1a00079-dddd-4f7a-8b9c-000000000079', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'b5c6d7e8-f9a0-4b1c-2d3e-4f5a6b7c8d9e', 5, 'Amazing drone shots for our outdoor event. Worth every rupee!', 'active', NULL, NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),
('b1a00080-dddd-4f7a-8b9c-000000000080', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'e8f9a0b1-c2d3-4e4f-5a6b-7c8d9e0f1a2b', 4, 'Ordered for a house party. Mughlai spread was authentic and filling.', 'active', NULL, NOW()-INTERVAL '10 days', NULL, NULL, NULL, NULL);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEW PHOTOS (15)                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO review_photos (id, review_id, image_url, storage_key) VALUES
('c1a00001-eeee-4f7a-8b9c-000000000001', 'b1a00001-dddd-4f7a-8b9c-000000000001', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600', 'reviews/r01/photo1.jpg'),
('c1a00002-eeee-4f7a-8b9c-000000000002', 'b1a00001-dddd-4f7a-8b9c-000000000001', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600', 'reviews/r01/photo2.jpg'),
('c1a00003-eeee-4f7a-8b9c-000000000003', 'b1a00003-dddd-4f7a-8b9c-000000000003', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600', 'reviews/r03/photo1.jpg'),
('c1a00004-eeee-4f7a-8b9c-000000000004', 'b1a00005-dddd-4f7a-8b9c-000000000005', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600', 'reviews/r05/photo1.jpg'),
('c1a00005-eeee-4f7a-8b9c-000000000005', 'b1a00005-dddd-4f7a-8b9c-000000000005', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=600', 'reviews/r05/photo2.jpg'),
('c1a00006-eeee-4f7a-8b9c-000000000006', 'b1a00007-dddd-4f7a-8b9c-000000000007', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600', 'reviews/r07/photo1.jpg'),
('c1a00007-eeee-4f7a-8b9c-000000000007', 'b1a00015-dddd-4f7a-8b9c-000000000015', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', 'reviews/r15/photo1.jpg'),
('c1a00008-eeee-4f7a-8b9c-000000000008', 'b1a00019-dddd-4f7a-8b9c-000000000019', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600', 'reviews/r19/photo1.jpg'),
('c1a00009-eeee-4f7a-8b9c-000000000009', 'b1a00019-dddd-4f7a-8b9c-000000000019', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600', 'reviews/r19/photo2.jpg'),
('c1a00010-eeee-4f7a-8b9c-000000000010', 'b1a00029-dddd-4f7a-8b9c-000000000029', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', 'reviews/r29/photo1.jpg'),
('c1a00011-eeee-4f7a-8b9c-000000000011', 'b1a00033-dddd-4f7a-8b9c-000000000033', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600', 'reviews/r33/photo1.jpg'),
('c1a00012-eeee-4f7a-8b9c-000000000012', 'b1a00043-dddd-4f7a-8b9c-000000000043', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600', 'reviews/r43/photo1.jpg'),
('c1a00013-eeee-4f7a-8b9c-000000000013', 'b1a00073-dddd-4f7a-8b9c-000000000073', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600', 'reviews/r73/photo1.jpg'),
('c1a00014-eeee-4f7a-8b9c-000000000014', 'b1a00073-dddd-4f7a-8b9c-000000000073', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600', 'reviews/r73/photo2.jpg'),
('c1a00015-eeee-4f7a-8b9c-000000000015', 'b1a00067-dddd-4f7a-8b9c-000000000067', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600', 'reviews/r67/photo1.jpg');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVIEW REPORTS (3)                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO review_reports (id, review_id, reporter_id, reason, status, reported_at) VALUES
('e1a00001-ffff-4f7a-8b9c-000000000001', 'b1a00075-dddd-4f7a-8b9c-000000000075', 'a7f3b1c2-9e84-4d6a-b5f0-1c8e9a2d7b43', 'This review is fake. The person never ordered from us.', 'reviewed', NOW()-INTERVAL '14 days'),
('e1a00002-ffff-4f7a-8b9c-000000000002', 'b1a00076-dddd-4f7a-8b9c-000000000076', '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f', 'Abusive and defamatory language. Already removed.',       'reviewed', NOW()-INTERVAL '9 days'),
('e1a00003-ffff-4f7a-8b9c-000000000003', 'b1a00077-dddd-4f7a-8b9c-000000000077', '4b5c6d7e-8f9a-4b0c-1d2e-3f4a5b6c7d8e', 'Reviewer account is suspended, review should be hidden.',  'pending',  NOW()-INTERVAL '7 days');

COMMIT;
