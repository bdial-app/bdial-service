-- ============================================================================
-- Tijarah Connect — UAT Seed: 05 PHOTOS
-- 3 gallery photos per active provider (38 active × 3 = 114 photos)
-- ============================================================================

BEGIN;

INSERT INTO photos (id, provider_id, image_url, storage_key, display_order, uploaded_at) VALUES
-- P01 Fatima
('f1a00001-bbbb-4f7a-8b9c-000000000001', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800', 'providers/p01/photo1.jpg', 1, NOW()-INTERVAL '60 days'),
('f1a00002-bbbb-4f7a-8b9c-000000000002', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800', 'providers/p01/photo2.jpg', 2, NOW()-INTERVAL '55 days'),
('f1a00003-bbbb-4f7a-8b9c-000000000003', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800', 'providers/p01/photo3.jpg', 3, NOW()-INTERVAL '50 days'),
-- P02 Husain
('f1a00004-bbbb-4f7a-8b9c-000000000004', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800', 'providers/p02/photo1.jpg', 1, NOW()-INTERVAL '58 days'),
('f1a00005-bbbb-4f7a-8b9c-000000000005', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'providers/p02/photo2.jpg', 2, NOW()-INTERVAL '52 days'),
('f1a00006-bbbb-4f7a-8b9c-000000000006', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', 'providers/p02/photo3.jpg', 3, NOW()-INTERVAL '46 days'),
-- P03 Sakina
('f1a00007-bbbb-4f7a-8b9c-000000000007', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800', 'providers/p03/photo1.jpg', 1, NOW()-INTERVAL '56 days'),
('f1a00008-bbbb-4f7a-8b9c-000000000008', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=800', 'providers/p03/photo2.jpg', 2, NOW()-INTERVAL '48 days'),
('f1a00009-bbbb-4f7a-8b9c-000000000009', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', 'https://images.unsplash.com/photo-1591981896316-41ef7e584adf?w=800', 'providers/p03/photo3.jpg', 3, NOW()-INTERVAL '42 days'),
-- P04 Rashida
('f1a00010-bbbb-4f7a-8b9c-000000000010', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', 'providers/p04/photo1.jpg', 1, NOW()-INTERVAL '50 days'),
('f1a00011-bbbb-4f7a-8b9c-000000000011', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', 'providers/p04/photo2.jpg', 2, NOW()-INTERVAL '41 days'),
('f1a00012-bbbb-4f7a-8b9c-000000000012', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800', 'providers/p04/photo3.jpg', 3, NOW()-INTERVAL '33 days'),
-- P05 Taher (pending)
('f1a00013-bbbb-4f7a-8b9c-000000000013', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800', 'providers/p05/photo1.jpg', 1, NOW()-INTERVAL '10 days'),
('f1a00014-bbbb-4f7a-8b9c-000000000014', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', 'providers/p05/photo2.jpg', 2, NOW()-INTERVAL '8 days'),
('f1a00015-bbbb-4f7a-8b9c-000000000015', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800', 'providers/p05/photo3.jpg', 3, NOW()-INTERVAL '5 days'),
-- P06 Burhanuddin
('f1a00016-bbbb-4f7a-8b9c-000000000016', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800', 'providers/p06/photo1.jpg', 1, NOW()-INTERVAL '40 days'),
('f1a00017-bbbb-4f7a-8b9c-000000000017', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800', 'providers/p06/photo2.jpg', 2, NOW()-INTERVAL '35 days'),
('f1a00018-bbbb-4f7a-8b9c-000000000018', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800', 'providers/p06/photo3.jpg', 3, NOW()-INTERVAL '30 days'),
-- P07 Tasneem
('f1a00019-bbbb-4f7a-8b9c-000000000019', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', 'providers/p07/photo1.jpg', 1, NOW()-INTERVAL '45 days'),
('f1a00020-bbbb-4f7a-8b9c-000000000020', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800', 'providers/p07/photo2.jpg', 2, NOW()-INTERVAL '38 days'),
('f1a00021-bbbb-4f7a-8b9c-000000000021', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b07', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', 'providers/p07/photo3.jpg', 3, NOW()-INTERVAL '30 days'),
-- P08 Shabbir
('f1a00022-bbbb-4f7a-8b9c-000000000022', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800', 'providers/p08/photo1.jpg', 1, NOW()-INTERVAL '43 days'),
('f1a00023-bbbb-4f7a-8b9c-000000000023', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800', 'providers/p08/photo2.jpg', 2, NOW()-INTERVAL '36 days'),
('f1a00024-bbbb-4f7a-8b9c-000000000024', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b08', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800', 'providers/p08/photo3.jpg', 3, NOW()-INTERVAL '28 days'),
-- P09 Nafisa
('f1a00025-bbbb-4f7a-8b9c-000000000025', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', 'providers/p09/photo1.jpg', 1, NOW()-INTERVAL '42 days'),
('f1a00026-bbbb-4f7a-8b9c-000000000026', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', 'providers/p09/photo2.jpg', 2, NOW()-INTERVAL '34 days'),
('f1a00027-bbbb-4f7a-8b9c-000000000027', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b09', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', 'providers/p09/photo3.jpg', 3, NOW()-INTERVAL '26 days'),
-- P10 Qaidjohar
('f1a00028-bbbb-4f7a-8b9c-000000000028', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', 'providers/p10/photo1.jpg', 1, NOW()-INTERVAL '38 days'),
('f1a00029-bbbb-4f7a-8b9c-000000000029', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', 'providers/p10/photo2.jpg', 2, NOW()-INTERVAL '30 days'),
('f1a00030-bbbb-4f7a-8b9c-000000000030', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b10', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', 'providers/p10/photo3.jpg', 3, NOW()-INTERVAL '22 days'),
-- P11 Muffadal
('f1a00031-bbbb-4f7a-8b9c-000000000031', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800', 'providers/p11/photo1.jpg', 1, NOW()-INTERVAL '51 days'),
('f1a00032-bbbb-4f7a-8b9c-000000000032', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', 'providers/p11/photo2.jpg', 2, NOW()-INTERVAL '43 days'),
('f1a00033-bbbb-4f7a-8b9c-000000000033', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b11', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800', 'providers/p11/photo3.jpg', 3, NOW()-INTERVAL '36 days'),
-- P12 Khadija
('f1a00034-bbbb-4f7a-8b9c-000000000034', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 'providers/p12/photo1.jpg', 1, NOW()-INTERVAL '35 days'),
('f1a00035-bbbb-4f7a-8b9c-000000000035', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800', 'providers/p12/photo2.jpg', 2, NOW()-INTERVAL '28 days'),
('f1a00036-bbbb-4f7a-8b9c-000000000036', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b12', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800', 'providers/p12/photo3.jpg', 3, NOW()-INTERVAL '20 days'),
-- P13 Murtaza Tech
('f1a00037-bbbb-4f7a-8b9c-000000000037', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800', 'providers/p13/photo1.jpg', 1, NOW()-INTERVAL '54 days'),
('f1a00038-bbbb-4f7a-8b9c-000000000038', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', 'providers/p13/photo2.jpg', 2, NOW()-INTERVAL '47 days'),
('f1a00039-bbbb-4f7a-8b9c-000000000039', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b13', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800', 'providers/p13/photo3.jpg', 3, NOW()-INTERVAL '39 days'),
-- P17 Saifee Catering
('f1a00040-bbbb-4f7a-8b9c-000000000040', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'providers/p17/photo1.jpg', 1, NOW()-INTERVAL '44 days'),
('f1a00041-bbbb-4f7a-8b9c-000000000041', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'providers/p17/photo2.jpg', 2, NOW()-INTERVAL '37 days'),
('f1a00042-bbbb-4f7a-8b9c-000000000042', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b17', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'providers/p17/photo3.jpg', 3, NOW()-INTERVAL '29 days'),
-- P19 Zahra
('f1a00043-bbbb-4f7a-8b9c-000000000043', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800', 'providers/p19/photo1.jpg', 1, NOW()-INTERVAL '53 days'),
('f1a00044-bbbb-4f7a-8b9c-000000000044', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', 'providers/p19/photo2.jpg', 2, NOW()-INTERVAL '45 days'),
('f1a00045-bbbb-4f7a-8b9c-000000000045', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b19', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800', 'providers/p19/photo3.jpg', 3, NOW()-INTERVAL '37 days'),
-- P21 Rukaiya
('f1a00046-bbbb-4f7a-8b9c-000000000046', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800', 'providers/p21/photo1.jpg', 1, NOW()-INTERVAL '48 days'),
('f1a00047-bbbb-4f7a-8b9c-000000000047', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800', 'providers/p21/photo2.jpg', 2, NOW()-INTERVAL '40 days'),
('f1a00048-bbbb-4f7a-8b9c-000000000048', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b21', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800', 'providers/p21/photo3.jpg', 3, NOW()-INTERVAL '32 days'),
-- P24 Noor
('f1a00049-bbbb-4f7a-8b9c-000000000049', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800', 'providers/p24/photo1.jpg', 1, NOW()-INTERVAL '49 days'),
('f1a00050-bbbb-4f7a-8b9c-000000000050', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', 'providers/p24/photo2.jpg', 2, NOW()-INTERVAL '41 days'),
('f1a00051-bbbb-4f7a-8b9c-000000000051', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b24', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800', 'providers/p24/photo3.jpg', 3, NOW()-INTERVAL '33 days'),
-- P25 Amatullah
('f1a00052-bbbb-4f7a-8b9c-000000000052', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800', 'providers/p25/photo1.jpg', 1, NOW()-INTERVAL '46 days'),
('f1a00053-bbbb-4f7a-8b9c-000000000053', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800', 'providers/p25/photo2.jpg', 2, NOW()-INTERVAL '38 days'),
('f1a00054-bbbb-4f7a-8b9c-000000000054', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b25', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800', 'providers/p25/photo3.jpg', 3, NOW()-INTERVAL '30 days'),
-- P29 Iqbal
('f1a00055-bbbb-4f7a-8b9c-000000000055', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', 'providers/p29/photo1.jpg', 1, NOW()-INTERVAL '49 days'),
('f1a00056-bbbb-4f7a-8b9c-000000000056', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800', 'providers/p29/photo2.jpg', 2, NOW()-INTERVAL '38 days'),
('f1a00057-bbbb-4f7a-8b9c-000000000057', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b29', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', 'providers/p29/photo3.jpg', 3, NOW()-INTERVAL '29 days'),
-- P30 Zainab
('f1a00058-bbbb-4f7a-8b9c-000000000058', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800', 'providers/p30/photo1.jpg', 1, NOW()-INTERVAL '44 days'),
('f1a00059-bbbb-4f7a-8b9c-000000000059', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800', 'providers/p30/photo2.jpg', 2, NOW()-INTERVAL '36 days'),
('f1a00060-bbbb-4f7a-8b9c-000000000060', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b30', 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800', 'providers/p30/photo3.jpg', 3, NOW()-INTERVAL '28 days'),
-- P37 Arwa
('f1a00061-bbbb-4f7a-8b9c-000000000061', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800', 'providers/p37/photo1.jpg', 1, NOW()-INTERVAL '40 days'),
('f1a00062-bbbb-4f7a-8b9c-000000000062', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800', 'providers/p37/photo2.jpg', 2, NOW()-INTERVAL '32 days'),
('f1a00063-bbbb-4f7a-8b9c-000000000063', 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b37', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800', 'providers/p37/photo3.jpg', 3, NOW()-INTERVAL '24 days');

COMMIT;
