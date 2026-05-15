-- ============================================================================
-- Tijarah Connect — Comprehensive Category Seed with Keywords
-- Generated: 2026-05-15
-- Run AFTER: seed.sql + migration-search-keywords.sql
--
-- 105 top-level categories + 184 subcategories = 289 total
-- Each with comprehensive multilingual keywords (English, Hindi, Arabic)
-- Idempotent: safe to re-run (deletes & re-inserts)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SCHEMA GUARDS                                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_storage_key VARCHAR(300);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CLEAN SLATE — remove ALL categories (FK-safe order)                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Remove ALL provider_categories and user_category_interactions
DELETE FROM provider_categories;
DELETE FROM user_category_interactions;

-- 2. Remove all subcategories (self-referencing FK: children before parents)
DELETE FROM categories WHERE parent_id IS NOT NULL;

-- 3. Remove all remaining (top-level) categories
DELETE FROM categories;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — ORIGINAL 10 CATEGORIES (INSERT)                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 1. Tailoring & Alterations
('81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Tailoring & Alterations', 'tailoring',
 'Custom stitching, alterations, rida, kurta, blouse & ethnic wear',
 '✂️', true, 1,
 ARRAY['tailor','tailoring','darzi','stitching','sewing','silai','custom stitching','bespoke',
  'alteration','alterations','hemming','resizing','fitting','rida','abaya','burkha','burqa',
  'kurta','salwar','lehenga','lehnga','blouse','embroidery','zari','zardozi','thread work',
  'dress maker','seamstress','dressmaking','custom clothing','ethnic wear','saree blouse',
  'khayyat','kapde silai','boutique','fashion designer','ladies tailor','gents tailor',
  'silai wala','silai wali','darzi ki dukan','khayaat','tafsseel']),

-- 2. Catering & Tiffin
('a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Catering & Tiffin', 'catering',
 'Wedding catering, tiffin service, party food & home-cooked meals',
 '🍽️', true, 2,
 ARRAY['catering','caterer','tiffin','tiffin service','dabba','dabba service','home food',
  'home cooked','homemade food','lunch box','meal delivery','wedding catering','party food',
  'event catering','khana','nashta','thali','bohri food','bohri cuisine','biryani',
  'dastarkhwan','cook','bawarchi','chef','halal food','halal catering','corporate catering',
  'bulk order','function food','nikah catering','walima catering','aqeeqah food',
  'khansama','rasoi','dabba wala','tiffin wala','matbakh','taaam']),

-- 3. Mehndi & Henna
('81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Mehndi & Henna', 'mehndi',
 'Bridal mehndi, Arabic henna, party mehndi & nail art',
 '🖐️', true, 3,
 ARRAY['mehndi','mehendi','mehandi','henna','bridal mehndi','dulhan mehndi','arabic mehndi',
  'indian mehndi','rajasthani mehndi','mehndi artist','henna artist','henna design',
  'party mehndi','festive mehndi','eid mehndi','wedding mehndi','finger mehndi',
  'hand design','kids mehndi','mehndi wali','temporary tattoo','mehndi cone','nail art',
  'heena','mahendi','bridal henna','organic henna','henna tattoo','mehndi designer',
  'hinna','naqsh']),

-- 4. Electronics Repair
('5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Electronics Repair', 'electronics-repair',
 'Mobile, laptop, TV, appliance repair & service center',
 '🔌', true, 4,
 ARRAY['electronics','repair','mobile repair','phone repair','cell phone','smartphone',
  'laptop repair','computer repair','PC repair','TV repair','television repair','LED repair',
  'washing machine repair','refrigerator repair','fridge repair','microwave repair',
  'oven repair','appliance repair','gadget repair','screen replacement','battery replacement',
  'motherboard repair','charging port','display repair','mistri','technician',
  'service center','AMC','annual maintenance','warranty repair','data recovery','water damage',
  'electronic shop','bijli ka saman','tamir','islah']),

-- 5. Sweets & Bakery
('f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Sweets & Bakery', 'sweets-bakery',
 'Mithai, cakes, pastries, namkeen & confectionery',
 '🍰', true, 5,
 ARRAY['sweets','sweet shop','mithai','mithai shop','bakery','cake','cake shop','pastry','cookies',
  'biscuit','namkeen','confectionery','halwai','malpua','halwa','barfi','ladoo','laddoo',
  'peda','jalebi','gulab jamun','rasgulla','sweet box','birthday cake','wedding cake',
  'custom cake','eggless cake','chocolate','dessert','meethai','kheer','firni','sheer khurma',
  'celebration cake','fondant cake','cupcake','brownie','doughnut','donut','murabba',
  'mithai wala','halwai ki dukan','hulwiyyaat','halwa']),

-- 6. Home Services
('eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Home Services', 'home-services',
 'Plumbing, electrical, carpentry, AC service & home repairs',
 '🏠', true, 6,
 ARRAY['home service','home repair','household','house repair','home maintenance','handyman',
  'plumbing','plumber','electrical','electrician','carpenter','carpentry','painting','painter',
  'wall painting','cleaning','deep cleaning','house cleaning','waterproofing','pest control',
  'AC service','air conditioner','geyser repair','RO repair','water purifier','chimney',
  'installation','mistri','karigar','kaam wala','home renovation','bathroom repair',
  'kitchen repair','leakage','seepage','ghar ki marammat','khadamaat manziliyya']),

-- 7. Beauty & Salon
('7d154385-52fb-443b-9954-6eb400257ad1',
 'Beauty & Salon', 'beauty-salon',
 'Hair, makeup, bridal, spa, grooming & skin care services',
 '💇', true, 7,
 ARRAY['beauty','salon','parlour','parlor','beauty parlour','ladies salon','gents salon',
  'unisex salon','hair','haircut','hairstyle','hair styling','hair color','hair dye','facial',
  'cleanup','threading','waxing','bleach','makeup','make up','bridal makeup','grooming',
  'spa','massage','body massage','skin care','skincare','keratin','smoothening','straightening',
  'rebonding','manicure','pedicure','nail art','beautician','nai','barber','hair treatment',
  'dandruff','hair fall','hair spa','head massage','beauty parlour wali','tajmeel','hammaam']),

-- 8. Photography
('5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Photography', 'photography',
 'Wedding, event, product photography, videography & drone shoots',
 '📸', true, 8,
 ARRAY['photography','photographer','videography','videographer','camera','photo','photo studio',
  'wedding photography','wedding videography','event photography','portrait','headshot',
  'drone','drone photography','aerial','album','photo album','photo editing','video editing',
  'cinematography','pre-wedding','pre wedding shoot','maternity shoot','baby shoot','newborn',
  'product photography','studio','passport photo','photoshoot','photo session','reel',
  'reels making','documentary','corporate video','ad film','tasweer','musawwir']),

-- 9. Tuition & Coaching
('ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Tuition & Coaching', 'tuition-coaching',
 'Academic tuition, coaching centers, Quran classes & exam prep',
 '📚', true, 9,
 ARRAY['tuition','coaching','tutoring','tutor','teacher','classes','academy','institute',
  'education','learning','school','homework help','maths tuition','science tuition',
  'english tuition','hindi tuition','SSC','CBSE','ICSE','IIT coaching','NEET coaching',
  'JEE coaching','competitive exam','board exam','quran','quran classes','hifz',
  'hifz classes','islamic studies','deeniyat','arabic classes','online tuition','home tuition',
  'batch classes','private tuition','subject expert','coaching center','test prep',
  'exam preparation','taalim','ustaad','muallim','madrasa','maktab']),

-- 10. Event Planning
('3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Event Planning', 'event-planning',
 'Wedding planning, decorations, DJ, tent, stage & celebrations',
 '🎉', true, 10,
 ARRAY['event','events','event planning','event planner','wedding planner','party planning',
  'celebration','birthday party','anniversary','decoration','decor','decorator','mandap',
  'shamiana','tent','tent house','pandal','stage','stage decoration','lighting','sound system',
  'DJ','disc jockey','flower decoration','florist','theme party','balloon decoration',
  'banquet','hall booking','venue','entertainment','mehfil','walima','nikah','aqeeqah',
  'milad','jashn','wedding decor','reception','sangeet','engagement','haflah','munazzim']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — NEW TOP-LEVEL CATEGORIES (11–30)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 11. Automotive & Vehicles
('6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Automotive & Vehicles', 'automotive',
 'Car & bike repair, servicing, car wash & driving school',
 '🚗', true, 11,
 ARRAY[
  'auto','automotive','car','vehicle','garage','mechanic','car repair','car service',
  'car mechanic','bike repair','bike service','motorcycle','scooter','two wheeler','puncture',
  'tyre','tire','battery','car battery','engine','oil change','servicing','denting',
  'denting painting','body shop','car wash','car cleaning','detailing','car polish',
  'driving school','driving class','car accessories','auto electrician','gadi','motor',
  'diesel','petrol','CNG','wheel alignment','wheel balancing','brake repair','clutch',
  'suspension','gadi ki marammat','motor mechanic','sayyaraat'
]),

-- 12. Health & Medical
('a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Health & Medical', 'health',
 'Doctors, clinics, pharmacy, lab & diagnostics',
 '🏥', true, 12,
 ARRAY[
  'health','medical','doctor','clinic','hospital','physician','GP','general physician',
  'consultation','medicine','pharmacy','chemist','medical store','dawakhana','pathology',
  'pathology lab','laboratory','blood test','diagnostic','diagnostics','X-ray','xray','scan',
  'ultrasound','sonography','MRI','CT scan','physiotherapy','physio','physiotherapist',
  'ortho','orthopedic','dental','dentist','eye doctor','ophthalmologist','ENT',
  'skin doctor','dermatologist','hakim','unani','ayurveda','ayurvedic','homeopathy',
  'tabib','dawai','ilaj','treatment','OPD','specialist','sihha','tabib','mustashfa'
]),

-- 13. Fitness & Sports
('5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Fitness & Sports', 'fitness',
 'Gym, yoga, sports coaching & personal training',
 '💪', true, 13,
 ARRAY[
  'fitness','gym','gymnasium','workout','exercise','yoga','yoga classes','aerobics','zumba',
  'crossfit','personal trainer','fitness trainer','sports','sports coaching','swimming',
  'swimming pool','martial arts','karate','taekwondo','boxing','kickboxing',
  'cricket coaching','football coaching','badminton','tennis','table tennis','health club',
  'body building','bodybuilding','weight training','weight loss','fat loss','diet plan',
  'nutrition','dietitian','running club','jogging','athletics','physical fitness',
  'vyayam','kasrat','riyaada','laiyaaqa'
]),

-- 14. Legal & Finance
('462dd878-12c2-431d-9781-b95701ce35dc',
 'Legal & Finance', 'legal-finance',
 'Lawyers, CA, tax consultants, insurance & financial planning',
 '⚖️', true, 14,
 ARRAY[
  'legal','lawyer','advocate','attorney','vakil','court','law firm','legal advice','CA',
  'chartered accountant','tax consultant','income tax','GST','GST filing','ITR','ITR filing',
  'tax return','accountant','bookkeeping','auditor','audit','insurance','insurance agent',
  'LIC','health insurance','car insurance','mutual fund','investment','financial advisor',
  'financial planner','loan','bank loan','home loan','personal loan','notary','stamp paper',
  'agreement','contract','will','property paper','registration','compliance','RERA',
  'company registration','muhaami','muhaasib','qanoon'
]),

-- 15. Real Estate & Property
('1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Real Estate & Property', 'real-estate',
 'Property dealers, brokers, PG, rental & commercial spaces',
 '🏢', true, 15,
 ARRAY[
  'real estate','property','flat','apartment','house','bungalow','villa','plot','land',
  'rent','rental','to let','PG','paying guest','hostel','broker','property dealer',
  'property agent','real estate agent','builder','developer','commercial property','shop',
  'office space','warehouse','godown','gala','industrial','makaan','zameen','kiraya',
  'lease','sale','purchase','registry','buy','sell','housing','society','colony',
  'residential','duplex','penthouse','farmhouse','row house','aqaaraat','amlaak'
]),

-- 16. Construction & Renovation
('5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Construction & Renovation', 'construction',
 'Contractors, masons, architects, fabrication & welding',
 '🏗️', true, 16,
 ARRAY[
  'construction','contractor','thekedar','builder','building construction','mason',
  'raj mistri','rajmistri','cement','bricks','RCC','civil','civil engineer','civil work',
  'architect','architecture','design','blueprint','house construction','building',
  'commercial construction','fabrication','welding','welder','lohar','iron work','steel',
  'structure','foundation','pillar','beam','slab','plaster','plastering','labour',
  'construction labor','site supervisor','estimation','BOQ','earth work','excavation',
  'tameer','binaa','muqaawil'
]),

-- 17. Interior Design & Decor
('1e267065-9ae5-40cc-87af-317d7e730a6b',
 'Interior Design & Decor', 'interior-design',
 'Interior designers, false ceiling, wallpaper & modular kitchen',
 '🎨', true, 17,
 ARRAY[
  'interior','interior design','interior designer','interior decorator','home decor',
  'false ceiling','POP','POP ceiling','gypsum','gypsum board','wallpaper','wall painting',
  'texture paint','modular kitchen','kitchen design','wardrobe','modular wardrobe','closet',
  'living room design','bedroom design','curtain','curtains','blinds','window blinds',
  'furniture layout','color consultation','3D design','3D rendering','vastu','feng shui',
  'space planning','home renovation','home makeover','office interior','showroom interior',
  'flooring design','tasmeem daakhili','dekor'
]),

-- 18. Glass & Aluminium
('034260d6-5058-4f92-b598-a87fce4879e9',
 'Glass & Aluminium', 'glass-aluminium',
 'Glass work, mirrors, aluminium fabrication, windows & doors',
 '🪟', true, 18,
 ARRAY[
  'glass','aluminium','aluminum','mirror','sheesha','kaanch','kaach','glass work',
  'glass cutting','glass fitting','glass installation','glass shop','glass dealer',
  'glass seller','mirror work','mirror fitting','mirror seller','aluminium fabrication',
  'aluminium window','aluminium door','sliding window','sliding door','shower enclosure',
  'shower glass','partition','glass partition','office partition','toughened glass',
  'tempered glass','safety glass','laminated glass','window frame','door frame','railing',
  'glass railing','balcony railing','facade','ACP','ACP cladding','kaanch wala',
  'sheesha wala','glass table','glass shelf','aquarium glass','zujaj','miraya'
]),

-- 19. Furniture & Woodwork
('8c8cf84f-d779-4ea6-b617-11b55475379c',
 'Furniture & Woodwork', 'furniture',
 'Custom furniture, sofa, beds, office furniture & repair',
 '🪑', true, 19,
 ARRAY[
  'furniture','woodwork','carpenter','carpentry','sofa','sofa set','couch','table',
  'dining table','center table','chair','bed','double bed','king size','wardrobe','cupboard',
  'cabinet','almirah','almari','desk','study table','bookshelf','rack','TV unit','TV stand',
  'custom furniture','bespoke furniture','wood','plywood','MDF','sunmica','laminate','polish',
  'polish work','furniture repair','upholstery','sofa repair','cushion','mattress',
  'office furniture','modular furniture','wood worker','karigar','khati','mistri',
  'kitchen cabinet','athath','najjaar'
]),

-- 20. Printing & Signage
('ec2aad50-657f-4b57-b798-3e8461d7c733',
 'Printing & Signage', 'printing',
 'Digital printing, banners, visiting cards, wedding cards & signage',
 '🖨️', true, 20,
 ARRAY[
  'printing','print','print shop','printer','digital printing','flex printing','flex',
  'banner','hoarding','sign board','signage','name board','vinyl','vinyl printing','sticker',
  'visiting card','business card','wedding card','invitation card','shaadi card','pamphlet',
  'brochure','flyer','poster','catalogue','catalog','book printing','offset printing',
  'screen printing','T-shirt printing','tshirt print','mug printing','photo printing',
  'lamination','binding','spiral binding','xerox','photocopy','stamp','rubber stamp',
  '3D letter','neon sign','LED sign','glow sign','name plate','acrylic letter',
  'engraving','laser cutting','tibaaa','matbaa'
]),

-- 21. Jewellery & Watches
('49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Jewellery & Watches', 'jewellery',
 'Gold, silver, diamond, imitation jewellery & watch repair',
 '💍', true, 21,
 ARRAY[
  'jewellery','jewelry','jeweller','jeweler','gold','silver','diamond','platinum','ring',
  'engagement ring','chain','necklace','haar','earring','jhumka','bangle','chudi','bracelet',
  'pendant','locket','mangalsutra','nose pin','nath','tika','maang tika',
  'imitation jewellery','artificial jewellery','fashion jewellery','costume jewellery',
  'custom jewellery','polki','kundan','meenakari','jadau','watch','watch repair','clock',
  'clock repair','engraving','jewellery repair','jewellery making','gold plating','rhodium',
  'sonar','sunaar','zargaar','hallmark','BIS','carat','karat','mujawharaat','saayigh'
]),

-- 22. Travel & Tourism
('2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Travel & Tourism', 'travel',
 'Travel agents, visa, hajj & umrah, tour packages & bookings',
 '✈️', true, 22,
 ARRAY[
  'travel','tourism','travel agent','travel agency','tour','tour operator','tour package',
  'holiday','vacation','trip','flight','airline','air ticket','flight booking','hotel',
  'hotel booking','resort','visa','visa service','visa agent','passport','hajj','umrah',
  'ziyarat','pilgrimage','honeymoon package','family tour','group tour','international tour',
  'domestic tour','car rental','cab booking','taxi','bus booking','train booking','IRCTC',
  'cruise','adventure tour','trekking','sightseeing','travel insurance','forex',
  'money exchange','travel package','safar','siyaaha'
]),

-- 23. Packers & Movers
('e0c26276-93d7-4352-ab19-6edf4c49b857',
 'Packers & Movers', 'packers-movers',
 'House & office shifting, relocation, transport & storage',
 '📦', true, 23,
 ARRAY[
  'packers','movers','packers and movers','packing','moving','relocation','shifting',
  'house shifting','home shifting','office shifting','office relocation','transport',
  'transportation','truck','tempo','loading','unloading','storage','warehouse',
  'local shifting','local moving','intercity','intercity shifting','outstation',
  'long distance','furniture moving','vehicle transport','car transport','bike transport',
  'goods transport','logistics','cargo','household goods','safe shifting',
  'packaging material','bubble wrap','insurance','transit insurance',
  'saman le jaana','naql','tahmeel'
]),

-- 24. Laundry & Dry Cleaning
('2a17c19a-cbb0-4297-bb4a-9b8c24c0bb3f',
 'Laundry & Dry Cleaning', 'laundry',
 'Laundry, dry cleaning, ironing, carpet & sofa cleaning',
 '👔', true, 24,
 ARRAY[
  'laundry','dry cleaning','dry clean','wash','washing','ironing','press','iron','istri',
  'dhobi','dhulai','clothes cleaning','clothes wash','stain removal','stain','fabric care',
  'carpet cleaning','carpet wash','curtain cleaning','sofa cleaning','sofa wash',
  'upholstery cleaning','shoe cleaning','shoe wash','steam press','steam clean','fold',
  'pickup delivery','express laundry','same day laundry','professional cleaning',
  'garment care','linen wash','blanket wash','blanket cleaning','woolens','woolen care',
  'suit cleaning','wedding dress cleaning','kapde dhona','ghaseel','tanzeef'
]),

-- 25. Grocery & Daily Needs
('fe7f8471-2f6c-4411-ac1f-399597c3ef4c',
 'Grocery & Daily Needs', 'grocery',
 'Grocery stores, provisions, fresh produce & household essentials',
 '🛒', true, 25,
 ARRAY[
  'grocery','kirana','kirana store','general store','provision store','provision',
  'supermarket','mart','mini mart','daily needs','essentials','ration','rice','dal','atta',
  'flour','oil','cooking oil','ghee','spices','masala','sugar','salt','tea','chai','coffee',
  'milk','dairy','curd','dahi','paneer','cheese','butter','bread','eggs','biscuits','snacks',
  'namkeen','soap','detergent','shampoo','toothpaste','household items','FMCG','organic',
  'fruits','vegetables','sabzi','phal','sabzi mandi','fresh produce','frozen food',
  'rashan','baqaala','dukaan'
]),

-- 26. Fashion & Clothing
('5e5cb6d9-bc0a-4750-995b-53444674fb11',
 'Fashion & Clothing', 'fashion',
 'Readymade garments, ethnic wear, western wear, footwear & accessories',
 '👗', true, 26,
 ARRAY[
  'fashion','clothing','clothes','garments','kapde','readymade','mens wear','menswear',
  'women wear','womenswear','kids wear','kidswear','rida','abaya','burkha','burqa','hijab',
  'kurta','kurta pajama','salwar kameez','salwar suit','saree','sari','lehnga','lehenga',
  'sherwani','suit','blazer','shirt','jeans','trouser','t-shirt','tshirt','ethnic wear',
  'western wear','traditional','designer','boutique','footwear','shoes','sandals','chappal',
  'jutti','mojri','handbag','purse','clutch','dupatta','scarf','shawl','topi','cap','pagdi',
  'malaabis','aziyaa'
]),

-- 27. IT & Computer Services
('6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'IT & Computer Services', 'it-services',
 'Web development, CCTV, computer repair, graphic design & IT support',
 '💻', true, 27,
 ARRAY[
  'IT','computer','technology','tech','software','hardware','web development','website',
  'website design','app development','mobile app','digital marketing','SEO',
  'social media marketing','SMM','graphic design','logo design','logo','branding','CCTV',
  'CCTV installation','security camera','surveillance','access control','biometric',
  'attendance system','networking','LAN','wifi','internet','server','cloud','hosting',
  'domain','data recovery','hard disk','AMC','IT support','tech support','troubleshooting',
  'computer installation','ERP','software development','email marketing','PPC','Google ads',
  'taqniya','hasib','baraamij'
]),

-- 28. Pet Care & Veterinary
('c9b0dbf2-8695-45c7-bf71-45968f4a559f',
 'Pet Care & Veterinary', 'pet-care',
 'Vets, pet grooming, pet shops, boarding & training',
 '🐾', true, 28,
 ARRAY[
  'pet','pets','pet care','veterinary','vet','veterinarian','animal','animal doctor',
  'animal hospital','dog','cat','kitten','puppy','bird','fish','aquarium','pet shop',
  'pet store','pet grooming','dog grooming','cat grooming','pet boarding','kennel','cattery',
  'pet food','dog food','cat food','pet accessories','pet collar','pet leash','pet training',
  'dog training','obedience','vaccination','deworming','spaying','neutering','pet hospital',
  'animal clinic','pet sitting','dog walking','pet adoption','rescue','parrot','rabbit',
  'hamster','turtle','guinea pig','janwar','hayawaan','baytari'
]),

-- 29. Agriculture & Gardening
('b54ab559-c9aa-419e-b0e3-e833d29854ee',
 'Agriculture & Gardening', 'agriculture',
 'Nurseries, landscaping, gardening, seeds & organic farming',
 '🌱', true, 29,
 ARRAY[
  'agriculture','farming','farm','kisan','khet','garden','gardening','mali','nursery',
  'plant nursery','plant','plants','indoor plants','outdoor plants','flower','flowers','phool',
  'tree','sapling','seeds','beej','fertilizer','khad','manure','compost','organic farming',
  'jaivik','landscaping','landscape','lawn','lawn care','lawn mowing','grass',
  'hedge trimming','pruning','irrigation','drip irrigation','sprinkler','terrace garden',
  'balcony garden','kitchen garden','greenhouse','polyhouse','horticulture','pesticide',
  'herbicide','weed','soil','potting mix','ziraat','bustaan','hadeeqa'
]),

-- 30. Courier & Delivery
('73fadeb3-f3c7-40fe-ae59-c1d6b0337219',
 'Courier & Delivery', 'courier',
 'Courier services, express delivery, parcel & document dispatch',
 '🚚', true, 30,
 ARRAY[
  'courier','delivery','parcel','package','shipping','dispatch','express delivery',
  'express courier','same day delivery','next day delivery','overnight','document delivery',
  'document courier','letter','speed post','registered post','international courier',
  'domestic courier','tracking','track parcel','pickup','pick up','door to door','logistics',
  'e-commerce','ecommerce delivery','food delivery','medicine delivery','grocery delivery',
  'bulk courier','franking','postal','post office','last mile','hyperlocal delivery',
  'on demand delivery','instant delivery','bharosa courier','bareed','tawseel'
]);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3 — SUBCATEGORIES                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────
-- Under: Tailoring & Alterations (81f76d1c)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('3dc2fa32-b84c-4e0a-8847-333fe833b61e',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Rida & Abaya Stitching', 'rida-abaya',
 'Custom Rida, Abaya & Islamic women''s wear stitching',
 '🧕', true, 1,
 ARRAY['rida','abaya','burkha','burqa','hijab stitching','pardah','islamic clothing',
  'muslim women wear','abaya design','custom rida','rida alteration','abaya tailor',
  'rida designer','abaya boutique','modest wear','modest fashion','libas','thawb nisa']),

('da21a285-fbe7-4708-bf5b-5bccb68bb7f1',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Bridal Wear', 'bridal-wear',
 'Bridal lehenga, nikah outfits & wedding collection',
 '👰', true, 2,
 ARRAY['bridal','bride','dulhan','wedding outfit','wedding dress','lehnga','lehenga',
  'sharara','gharara','bridal embroidery','nikah dress','walima dress','reception outfit',
  'wedding collection','designer bridal','bridal boutique','trousseau','jahez','aroos']),

('aa39bcfc-f653-4f1a-ac93-1ac49cd25a6d',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Men''s Tailoring', 'mens-tailoring',
 'Suits, sherwanis, kurta-pajama & formal menswear',
 '🤵', true, 3,
 ARRAY['mens tailor','gents tailor','suit stitching','shirt stitching','trouser','pant',
  'kurta pajama','sherwani','pathani suit','achkan','waistcoat','nehru jacket','blazer',
  'formal wear','mardana silai','gents darzi','safari suit','jodhpuri','bandgala']),

('0c4dd18c-05a1-41f0-9f69-809e991cbca2',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Embroidery & Zari Work', 'embroidery-zari',
 'Hand & machine embroidery, zari, zardozi & aari work',
 '✨', true, 4,
 ARRAY['embroidery','zari','zardozi','aari work','thread work','mirror work','sequin',
  'bead work','hand embroidery','machine embroidery','chikankari','lucknowi','phulkari',
  'kashida','dabka','resham','applique','patch work','cutwork','tatreez','naqsh']),

('7311e65e-a423-40b6-bdaf-2fe4a8f9f39f',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Alterations & Repairs', 'alterations-repairs',
 'Hemming, resizing, zip repair & garment fixes',
 '🧷', true, 5,
 ARRAY['alteration','repair','hemming','shortening','lengthening','resizing','zip repair',
  'zip replacement','button','lining','patch','darning','fitting adjustment',
  'trouser alteration','dress alteration','waist adjustment','sleeve alteration',
  'kapde ki marammat','islah malaabis']);

-- ─────────────────────────────────────────────
-- Under: Catering & Tiffin (a013ac6e)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('fc358d68-3935-42ad-9581-7fe5c3bdcef9',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Wedding Catering', 'wedding-catering',
 'Full-service catering for nikah, walima & receptions',
 '💒', true, 1,
 ARRAY['wedding catering','shaadi ka khana','nikah catering','walima','reception food',
  'wedding menu','large event','banquet catering','grand feast','dawat','wedding feast',
  'marriage catering','500 plate','1000 plate','wedding buffet','wedding thali']),

('80b53a1c-fde8-46ae-9c27-0bac7c1c90d4',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Tiffin & Dabba Service', 'tiffin-dabba',
 'Daily home-cooked meal delivery & lunch boxes',
 '🍱', true, 2,
 ARRAY['tiffin','dabba','lunch box','daily meals','home delivery meal','office lunch','mess',
  'PG food','student tiffin','monthly tiffin','weekly menu','daily thali','meal plan',
  'tiffin service','dabba wala','ghar ka khana delivery','home tiffin']),

('026ca80c-ab4f-49da-9c55-03592e3b205c',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Party & Bulk Food', 'party-food',
 'Catering for parties, gatherings & bulk food orders',
 '🍛', true, 3,
 ARRAY['party food','party catering','birthday food','get together','family gathering',
  'bulk order','snacks platter','appetizer','starter','finger food','cocktail snacks',
  'house party','celebration food','iftaar','sehri','mehfil food','dawat ka khana']),

('cb1e926a-8c41-4704-a660-77d1e2ed712f',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Bohri Cuisine', 'bohri-cuisine',
 'Authentic Bohri thaal, specialties & traditional dishes',
 '🥘', true, 4,
 ARRAY['bohri','bohri food','bohra','dawoodi bohra','thaal','naan khatai','dal chawal palida',
  'smoked mutton','raan','bohri biryani','muthiya','kharees','malida','community food',
  'bohri thaal','sabudana khichdi','chicken roast bohri','bohri dabba','lagan nu custard']);

-- ─────────────────────────────────────────────
-- Under: Electronics Repair (5fb8d16c)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('babb23a0-38af-4b8b-ad30-a56cd8938d0b',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Mobile & Phone Repair', 'mobile-repair',
 'Smartphone screen, battery, charging & software repair',
 '📱', true, 1,
 ARRAY['mobile repair','phone repair','smartphone repair','cell phone','iPhone repair',
  'Samsung repair','Vivo','Oppo','Realme','OnePlus','Xiaomi','Redmi','screen repair',
  'cracked screen','battery change','charging issue','water damage','software issue',
  'hang problem','slow phone','data recovery phone','back panel','camera repair phone',
  'mobile ki marammat','phone theek']),

('d1315bf1-0dec-47eb-882f-d1e9f447e718',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Laptop & Computer Repair', 'laptop-repair',
 'Laptop hardware, software, SSD upgrade & virus removal',
 '💻', true, 2,
 ARRAY['laptop repair','computer repair','PC repair','desktop repair','MacBook repair',
  'HP','Dell','Lenovo','Asus','Acer','keyboard repair','trackpad','SSD upgrade',
  'RAM upgrade','OS install','Windows install','formatting','virus removal','malware',
  'overheating','fan repair','hinge repair','motherboard repair laptop','screen repair laptop',
  'laptop ki marammat']),

('311e5dff-f39e-4a2c-823a-2daa66ad622c',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'TV & Display Repair', 'tv-repair',
 'LED, LCD, Smart TV repair, panel replacement & installation',
 '📺', true, 3,
 ARRAY['TV repair','television repair','LED TV','LCD TV','OLED','smart TV','TV screen',
  'display repair','panel repair','no picture','no sound','TV installation','wall mount',
  'set top box','remote','TV remote','power issue','backlight','inverter board',
  'TV ki marammat','television theek']),

('9e18a860-fb0c-4b05-bab7-b75e5793f60f',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Appliance Repair', 'appliance-repair',
 'Washing machine, fridge, microwave, geyser & chimney repair',
 '🔌', true, 4,
 ARRAY['appliance repair','washing machine repair','refrigerator repair','fridge repair',
  'microwave repair','oven repair','dishwasher','geyser repair','water heater','chimney repair',
  'air cooler','mixer grinder repair','iron repair','fan repair','inverter repair',
  'stabilizer repair','RO repair','water purifier repair','induction repair',
  'gharelu upkaran ki marammat']);

-- ─────────────────────────────────────────────
-- Under: Home Services (eb2263dd)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('811f09de-a8d8-414f-a4c9-774b0f792687',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Plumbing', 'plumbing',
 'Pipe fitting, leak repair, taps, drains & water tanks',
 '🔧', true, 1,
 ARRAY['plumber','plumbing','pipe','pipeline','tap','faucet','nalkaa','drain','drainage',
  'blocked drain','leak','leakage','water leak','toilet repair','commode','flush','tank',
  'overhead tank','water tank','water pump','motor','pipe fitting','basin','sink',
  'bathroom fitting','pipeline repair','sewer','nali','plumber near me','nalkaa wala',
  'sabbaak','anabib']),

('eac6fd09-b515-424e-8bf9-20210350fc8c',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Electrical Work', 'electrical',
 'Wiring, switches, fan & light installation, MCB & earthing',
 '⚡', true, 2,
 ARRAY['electrician','electrical','wiring','rewiring','wire','switch','switchboard','socket',
  'MCB','circuit breaker','fuse','short circuit','power','power cut','fan installation',
  'light','light fitting','LED','tube light','chandelier','inverter','UPS','generator',
  'earthing','meter','electrical panel','DB box','ELCB','concealed wiring','open wiring',
  'bijli ka kaam','bijli mistri','kahrabaayi']),

('44842a38-0969-46b4-bc29-c099fd0410ee',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Carpentry', 'carpentry',
 'Door, window, cabinet, shelf & wooden partition work',
 '🪵', true, 3,
 ARRAY['carpenter','carpentry','wood work','door','door repair','door installation','window',
  'window repair','cabinet','shelf','rack','partition','wooden partition','false ceiling wood',
  'furniture repair','polishing','termite treatment wood','door frame','chaukhat',
  'almari repair','khidki','darwaza','khati','mistri','najjaar']),

('34801f1d-5f1d-4869-b3ac-bf8d09ca8b53',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Deep Cleaning', 'deep-cleaning',
 'Full house, bathroom, kitchen & post-construction cleaning',
 '🧹', true, 4,
 ARRAY['deep cleaning','house cleaning','home cleaning','apartment cleaning','flat cleaning',
  'bathroom cleaning','kitchen cleaning','floor cleaning','mopping','scrubbing',
  'sanitization','disinfection','sofa cleaning','mattress cleaning','carpet cleaning',
  'window cleaning','post construction cleaning','move in cleaning','move out cleaning',
  'spring cleaning','safai','safai wala','tanzheef']),

('9965d5f4-3579-41ad-a097-468b8ed0ab57',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Painting & Waterproofing', 'home-painting-waterproofing',
 'Interior & exterior painting, texture, POP & leak solutions',
 '🖌️', true, 5,
 ARRAY['painting','painter','house painting','wall painting','exterior painting',
  'interior painting','texture','texture painting','POP','putty','primer','emulsion',
  'distemper','enamel','wood polish','waterproofing','leakage solution',
  'terrace waterproofing','bathroom waterproofing','damp','dampness','seepage','moisture',
  'crack repair','white wash','colour','color','rang','rangai','rang wala','dihaan','tilaay']),

('21aa221f-3043-476c-adb1-02fc76f56f6a',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Pest Control', 'home-pest-control',
 'Termite, cockroach, mosquito, rodent & bed bug treatment',
 '🐜', true, 6,
 ARRAY['pest control','pest','termite','deemak','cockroach','ant','mosquito','lizard','rat',
  'rodent','mice','bed bug','khatmal','spider','bee removal','wasp','snake','fumigation',
  'spray','herbal pest control','organic pest control','keeda makoda','wood borer',
  'pest control near me','mukaafaha hasharaat']),

('77814dcf-8c85-4323-9c4c-231e351954c0',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'AC & Refrigeration', 'ac-refrigeration',
 'AC installation, repair, gas refill & refrigerator service',
 '❄️', true, 7,
 ARRAY['AC repair','AC service','AC installation','air conditioner','split AC','window AC',
  'cassette AC','central AC','AC gas','AC gas refill','AC gas charge','refrigerant',
  'compressor','AC cleaning','AC maintenance','cooling','not cooling','ice formation',
  'water leaking AC','AC remote','thermostat','refrigerator repair','fridge repair',
  'deep freezer','water cooler','chiller','tabreed','takyyeef']);

-- ─────────────────────────────────────────────
-- Under: Beauty & Salon (7d154385)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('b357d920-3a9d-40c0-a6a3-c58ae59bca69',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Hair Salon', 'hair-salon',
 'Haircuts, styling, color, keratin & hair treatments',
 '💇‍♀️', true, 1,
 ARRAY['hair salon','hair cut','haircut','hair style','hairstyle','styling','blow dry',
  'hair wash','shampoo','hair color','hair dye','highlights','balayage','ombre',
  'global color','root touch up','keratin treatment','smoothening','straightening',
  'rebonding','hair spa','dandruff treatment','hair fall treatment','trim','layer cut',
  'bob cut','pixie','baal','nai','baal katna','hallaaq']),

('6c4009ce-3448-4a88-975e-90db6d8d4b4d',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Makeup & Bridal', 'makeup-bridal',
 'Party makeup, bridal makeup, HD & airbrush application',
 '💄', true, 2,
 ARRAY['makeup','make up','makeup artist','MUA','bridal makeup','dulhan','party makeup',
  'engagement makeup','reception look','airbrush makeup','HD makeup','foundation','concealer',
  'eye makeup','lip','contouring','glam','wedding makeup','mehndi function makeup',
  'sangeet look','haldi look','dulhan ka makeup','tajmeel aroos']),

('50223b3e-00fa-4880-9320-bfe9cb3a808d',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Spa & Massage', 'spa-massage',
 'Body massage, aromatherapy, steam & relaxation therapies',
 '💆', true, 3,
 ARRAY['spa','massage','body massage','head massage','foot massage','thai massage',
  'swedish massage','deep tissue','aromatherapy','hot stone','relaxation','stress relief',
  'wellness','body wrap','body scrub','sauna','steam bath','jacuzzi','hammam','oil massage',
  'ayurvedic massage','malish','champee','tadleek']),

('4971feed-3282-43fe-b5e4-6e0629d71ccc',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Skin Care', 'skin-care',
 'Facials, cleanup, bleach, de-tan & skin treatments',
 '✨', true, 4,
 ARRAY['skin care','skincare','facial','clean up','cleanup','face','glow','brightness',
  'tan removal','pigmentation','acne','pimple','dark spots','anti aging','anti wrinkle',
  'gold facial','diamond facial','fruit facial','bleach','de-tan','face pack','face mask',
  'chemical peel','microdermabrasion','skin treatment','derma','twacha','inaayat al-bashra']),

('a645205b-63a8-4a6c-8f46-07bd0b6e35a9',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Men''s Grooming', 'mens-grooming',
 'Men''s salon, beard, shaving, haircut & grooming',
 '🧔', true, 5,
 ARRAY['mens salon','gents parlour','gents salon','men grooming','beard','beard trim',
  'beard styling','shaving','clean shave','head shave','mens facial','mens hair cut','fade',
  'undercut','skin fade','pompadour','crew cut','buzz cut','mens hair color','mens spa',
  'mens pedicure','mens manicure','groom','dulha','naai','hajjaam']);

-- ─────────────────────────────────────────────
-- Under: Tuition & Coaching (ce88cb2d)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('79d44173-8a22-4cd3-bb92-a98e6edfc0a1',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Academic Tutoring', 'academic-tutoring',
 'School subjects: maths, science, English & board exam prep',
 '📖', true, 1,
 ARRAY['academic','school','CBSE','ICSE','SSC','state board','maths','mathematics','science',
  'physics','chemistry','biology','english','hindi','social studies','history','geography',
  'economics','commerce','accounts','tuition class','home tuition','online class','homework',
  'assignment','class 10','class 12','primary','secondary','higher secondary',
  'padhai','taaleem']),

('ec5b0fb4-729c-45b9-be1c-9a3093a19971',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Quran & Islamic Studies', 'quran-islamic',
 'Quran reading, hifz, tajweed, deeniyat & Arabic language',
 '📿', true, 2,
 ARRAY['quran','quran class','hifz','hifz class','hafiz','nazira','qaida','tajweed','tajwid',
  'islamic','islamic studies','deeniyat','deen','arabic','arabic language','namaz','salah',
  'fiqh','hadees','hadith','seerah','dua','madrasa','maktab','maulana','alim','aalim',
  'diniyat','taalim','muallim','quran teacher','tahfeez','tilawat']),

('6a0586bb-2729-4c02-bcd7-f1aab1ef5335',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Language Classes', 'language-classes',
 'English speaking, IELTS, Hindi, Urdu, Arabic & foreign languages',
 '🗣️', true, 3,
 ARRAY['language','english speaking','spoken english','IELTS','TOEFL','communication','hindi',
  'urdu','arabic','french','german','spanish','japanese','mandarin','foreign language',
  'language course','grammar','vocabulary','pronunciation','fluency','speaking','writing',
  'reading','language tutor','lisaniyat','lugha']),

('9f5e9bfd-19d3-4db5-8c6d-f1bd4d9194da',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Competitive Exam', 'competitive-exam',
 'IIT, NEET, UPSC, banking, SSC & entrance exam coaching',
 '🎯', true, 4,
 ARRAY['competitive exam','entrance exam','IIT','JEE','NEET','UPSC','MPSC','SSC CGL',
  'banking','bank exam','IBPS','SBI','railway','RRB','GATE','CAT','MBA','CLAT',
  'law entrance','NDA','CDS','defence','government exam','sarkari naukri','test series',
  'mock test','previous year','study material','imtihaan']),

('4bae3051-6c0e-481d-bca9-b409bef39485',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Music & Arts', 'music-arts',
 'Music lessons, singing, instruments, dance & art classes',
 '🎵', true, 5,
 ARRAY['music','music class','singing','vocal','instrument','guitar','piano','keyboard',
  'tabla','harmonium','sitar','violin','flute','drums','dance','dance class',
  'classical dance','western dance','hip hop','bollywood dance','kathak','bharatnatyam',
  'drawing','painting','art','art class','sketch','watercolor','oil painting','craft',
  'sculpture','pottery','mooseeqa','raqss','fann']);

-- ─────────────────────────────────────────────
-- Under: Event Planning (3da9c2a9)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('c1b78be0-ddea-45a4-be43-01b252b32b00',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Wedding Planning', 'wedding-planning',
 'Full wedding management, coordination & vendor booking',
 '💒', true, 1,
 ARRAY['wedding','shaadi','nikah','walima','wedding planner','wedding coordinator',
  'wedding management','marriage','vivah','byaah','wedding venue','wedding budget',
  'wedding timeline','guest management','vendor management','destination wedding',
  'royal wedding','wedding consultant','shaadi planner','zafaaf']),

('967999fc-61aa-474d-aa3f-2f9223761c1b',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Decoration & Mandap', 'decoration-mandap',
 'Stage, flower, balloon, LED & theme decoration',
 '🎊', true, 2,
 ARRAY['decoration','decor','mandap','stage','stage decoration','entrance','gate decoration',
  'ceiling decoration','flower decoration','flower arrangement','floral','balloon',
  'balloon decoration','theme decoration','birthday decoration','anniversary decoration',
  'cradle ceremony','naming ceremony','aqeeqah decoration','milad decoration',
  'LED decoration','fairy lights','sajawat','zaynah']),

('23d96ce8-dca2-4c29-9325-966c171c744f',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Tent & Shamiana', 'tent-shamiana',
 'Tent house, shamiana, furniture rental & event setup',
 '⛺', true, 3,
 ARRAY['tent','shamiana','pandal','canopy','tent house','marquee','chairs','tables',
  'furniture rental','crockery','utensils','bartan','catering equipment','stage setup',
  'red carpet','durry','carpet','seating arrangement','outdoor setup','wedding tent',
  'event tent','rental','furniture on rent','khayma']),

('8dc6e96c-5a68-4818-8401-ff932678f8da',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Sound & Lighting', 'sound-lighting',
 'DJ, PA systems, LED screens, projectors & event lighting',
 '🎧', true, 4,
 ARRAY['sound','sound system','speaker','PA system','amplifier','microphone','mic','DJ',
  'disc jockey','DJ service','lighting','LED lights','par lights','moving head','laser',
  'projector','screen','LED screen','LED wall','stage lighting','event lighting',
  'audio visual','AV','music system','karaoke','sawt','idhaaa']),

('41b3d38d-3e87-40ca-bb12-f56c761b6314',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Florist', 'event-florist',
 'Bouquets, garlands, flower arrangements & event florals',
 '💐', true, 5,
 ARRAY['florist','flower','flowers','phool','bouquet','garland','mala','haar','veni','gajra',
  'flower arrangement','floral decoration','centerpiece','flower basket','wedding flowers',
  'funeral wreath','artificial flowers','fresh flowers','rose','lily','jasmine','mogra',
  'marigold','plant gift','flower delivery','phool wala','azzahaar']);

-- ─────────────────────────────────────────────
-- Under: Automotive & Vehicles (aa000011)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('7df7f004-69fa-40d6-9259-1bdd85dbe985',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Car Repair & Service', 'car-repair',
 'Engine, brake, suspension, AC & general car servicing',
 '🔧', true, 1,
 ARRAY['car repair','car service','car mechanic','car garage','engine repair','engine overhaul',
  'oil change','car oil','brake repair','brake pad','clutch repair','gear box','transmission',
  'suspension','shock absorber','power steering','car electrical','car AC','car AC repair',
  'tune up','car diagnostic','OBD','check engine','gadi ki repair','islah sayyara']),

('11110422-0061-4708-94bd-354c3edbc601',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Two-Wheeler Service', 'two-wheeler',
 'Bike, scooter & motorcycle repair & servicing',
 '🏍️', true, 2,
 ARRAY['bike repair','bike service','motorcycle repair','scooter repair','scooty','activa',
  'two wheeler service','puncture repair','bike mechanic','chain','sprocket','battery',
  'kick start','self start','carburetor','fuel injection','silencer','exhaust',
  'tyre change bike','bike oil change','bike wash','bike ki marammat','darraaja naariyya']),

('eb730071-1020-455d-83e7-6089255c18cc',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Car Wash & Detailing', 'car-wash',
 'Car washing, detailing, ceramic coating & polishing',
 '🚿', true, 3,
 ARRAY['car wash','car cleaning','car detailing','interior cleaning','exterior wash',
  'foam wash','pressure wash','ceramic coating','teflon coating','PPF','paint protection',
  'polishing','buffing','wax','scratch removal','headlight restoration','engine wash',
  'underbody coating','anti rust','car spa','gadi dhulai','ghaseel sayyara']),

('5e762c30-0399-413d-a97d-5974c4ee18ee',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Tyre & Battery', 'tyre-battery',
 'Tyre replacement, alignment, balancing & battery service',
 '🛞', true, 4,
 ARRAY['tyre','tire','tyre shop','tyre dealer','tyre repair','tyre replacement','MRF','CEAT',
  'Apollo','Bridgestone','JK Tyre','tubeless','tube type','wheel alignment',
  'wheel balancing','battery','car battery','Exide','Amaron','inverter battery',
  'UPS battery','battery replacement','jump start','tyre pressure','nitrogen',
  'itaaraat','battaariyya']);

-- ─────────────────────────────────────────────
-- Under: Health & Medical (aa000012)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('03e49c1e-abd7-433e-9ab9-7051f90bcab3',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'General Physician', 'general-physician',
 'Family doctor, OPD, health checkups & general consultations',
 '👨‍⚕️', true, 1,
 ARRAY['general physician','GP','doctor','family doctor','clinic','OPD','consultation',
  'fever','cold','cough','flu','infection','general medicine','internal medicine','checkup',
  'health checkup','master health checkup','prescription','blood pressure','BP','diabetes',
  'sugar','thyroid','asthma','allergy','doctor near me','tabib aamm']),

('0ebed759-a0ec-41ec-a9cc-950ea3d32277',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Dentist', 'dentist',
 'Dental clinic, root canal, braces, implants & teeth cleaning',
 '🦷', true, 2,
 ARRAY['dentist','dental','dental clinic','teeth','tooth','toothache','cavity','filling',
  'root canal','RCT','extraction','cleaning','scaling','polishing','braces','orthodontic',
  'alignment','implant','dental implant','crown','cap','bridge','denture','wisdom tooth',
  'gum','bleeding gum','whitening','bleaching','smile design','veneer',
  'pediatric dentist','dant','daant','tabib asnaan']),

('68761f35-f465-4482-b00e-2a53b50e400d',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Pharmacy', 'pharmacy-sub',
 'Chemist, medical store, prescription medicines & health products',
 '💊', true, 3,
 ARRAY['pharmacy','chemist','medical store','medicine','dawai','dawakhana','drug store',
  'prescription','OTC','over the counter','tablet','capsule','syrup','injection','insulin',
  'first aid','surgical','bandage','health product','vitamin','supplement','protein',
  'ayurvedic medicine','homeopathic medicine','generic medicine','online pharmacy',
  'home delivery medicine','24 hour pharmacy','saydaliyya']),

('e6b0ce45-6398-4480-8284-d613666f6742',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Pathology & Lab', 'pathology-lab',
 'Blood tests, diagnostics, X-ray, ultrasound & health screenings',
 '🔬', true, 4,
 ARRAY['pathology','lab','laboratory','blood test','urine test','diagnostic',
  'diagnostic center','health test','CBC','sugar test','thyroid test','lipid profile',
  'liver function','kidney function','X-ray','xray','ultrasound','sonography','ECG','echo',
  'MRI','CT scan','biopsy','culture','sensitivity','COVID test','RT-PCR',
  'home collection','sample collection','mukhtabar']),

('e7c68dcd-0a6a-4956-b437-2a61053e019c',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Physiotherapy', 'physiotherapy',
 'Pain management, rehab, sports injury & mobility therapy',
 '🏃', true, 5,
 ARRAY['physiotherapy','physio','physiotherapist','physical therapy','rehab','rehabilitation',
  'back pain','neck pain','joint pain','knee pain','shoulder pain','sports injury','fracture',
  'post surgery','stroke rehab','paralysis','cerebral palsy','exercise therapy',
  'electrotherapy','ultrasound therapy','TENS','IFT','wax therapy','traction',
  'cupping','dry needling','ilaaj tabii']),

('0e988f1e-5503-46f1-ab63-37b905b5397c',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Alternative Medicine', 'health-alternative-medicine',
 'Unani, Ayurveda, Homeopathy, herbal & traditional healing',
 '🌿', true, 6,
 ARRAY['unani','ayurveda','ayurvedic','homeopathy','homeopathic','naturopathy','hakim',
  'vaid','tabib','herbal','herbal medicine','desi dawai','alternative medicine',
  'traditional medicine','siddha','acupuncture','acupressure','yoga therapy','panchkarma',
  'panchakarma','hijama','cupping therapy','reiki','pranic healing','aromatherapy',
  'tibb badeel','tibb yunani']);

-- ─────────────────────────────────────────────
-- Under: Construction & Renovation (aa000016)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('e212d76e-d00b-44e0-b70d-07a6d6ad3d54',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Civil Contractor', 'civil-contractor',
 'House & commercial building construction, project management',
 '👷', true, 1,
 ARRAY['contractor','thekedar','civil contractor','building contractor','house construction',
  'commercial construction','industrial construction','road construction','labour contractor',
  'project management','site engineer','site supervisor','construction company','turnkey',
  'estimation','quotation','BOQ','bill of quantities','RCC work','structural work',
  'muqaawil','binaa']),

('cf7a60b3-9773-45d7-b43c-f12c2fe38d7b',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Mason & Bricklayer', 'mason',
 'Brick work, plastering, foundation, columns & slabs',
 '🧱', true, 2,
 ARRAY['mason','raj mistri','rajmistri','bricklayer','masonry','brick work','block work',
  'plastering','plaster','wall construction','boundary wall','compound wall','foundation',
  'footing','column','beam','slab','lintel','staircase','ramp','concrete','cement work',
  'mortar','pointing','repair work','bannaa']),

('e2c25f15-e6dd-46c6-91f2-5d5f8299d5f4',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Architect & Design', 'architect',
 'Building plans, 3D elevations, structural design & approvals',
 '📐', true, 3,
 ARRAY['architect','architecture','building design','house design','floor plan','elevation',
  '3D elevation','structural design','MEP','building permit','plan approval','BMC approval',
  'RERA','green building','sustainable design','vastu','vastu consultant','plot planning',
  'layout','site plan','construction drawing','working drawing','miimaar','handasa']),

('1705a947-a57e-429a-89fe-3207b7d198fd',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Fabrication & Welding', 'fabrication-welding',
 'Iron & steel gates, grills, railings, sheds & welding work',
 '⚙️', true, 4,
 ARRAY['fabrication','welding','welder','lohar','iron work','steel work','SS',
  'stainless steel','MS','mild steel','gate','main gate','grill','window grill','railing',
  'handrail','staircase railing','balcony railing','shed','car parking shed',
  'industrial shed','godown','structural steel','fire escape','ladder','tank stand',
  'water tank stand','trolley','lihaam','hadeed']),

('3e769eaf-8b78-406b-a7a1-18865ff4fa26',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Tiles & Flooring', 'tiles-flooring',
 'Wall tiles, floor tiles, marble, granite & flooring installation',
 '🏗️', true, 5,
 ARRAY['tiles','tile','tiling','flooring','floor','wall tiles','floor tiles','bathroom tiles',
  'kitchen tiles','marble','granite','vitrified','ceramic','porcelain','Italian marble',
  'Kota stone','natural stone','mosaic','terrazzo','wooden flooring','laminate flooring',
  'vinyl flooring','epoxy','polishing','marble polishing','granite polishing','tile laying',
  'tile cutting','waterjet cutting','balaataat','rukhaam']);

-- ─────────────────────────────────────────────
-- Under: IT & Computer Services (aa000027)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('f71fea84-94dc-4e32-ad21-2be79e105057',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'Web & App Development', 'web-app-dev',
 'Websites, mobile apps, e-commerce, CMS & custom software',
 '🌐', true, 1,
 ARRAY['web development','website','website design','web design','web developer',
  'landing page','e-commerce','ecommerce','online store','WordPress','Shopify','React',
  'Angular','frontend','backend','full stack','API','mobile app','Android app','iOS app',
  'Flutter','React Native','UI design','UX design','responsive design','PWA','CMS',
  'custom software','ERP','tatbeeq','mawqii']),

('73fb513b-bd86-40ef-9dd6-cca73bb6e300',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'CCTV & Security', 'cctv-security',
 'CCTV installation, security cameras, access control & alarms',
 '📹', true, 2,
 ARRAY['CCTV','CCTV installation','security camera','surveillance','surveillance system',
  'IP camera','dome camera','bullet camera','PTZ','NVR','DVR','monitor','night vision',
  'motion detection','access control','biometric','fingerprint','face recognition',
  'attendance system','boom barrier','video intercom','alarm','burglar alarm','fire alarm',
  'home security','office security','muraaqaba','amn']),

('1bad5d87-2c3c-44b5-99f8-bbff822b6d24',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'Computer Sales & Repair', 'computer-sales-repair',
 'Desktops, laptops, peripherals, networking & repair',
 '🖥️', true, 3,
 ARRAY['computer','PC','desktop','laptop','MacBook','iMac','computer shop','computer store',
  'computer repair','laptop repair','hardware','motherboard','processor','RAM','SSD',
  'hard disk','HDD','graphics card','GPU','power supply','SMPS','cabinet','keyboard','mouse',
  'monitor','printer','scanner','networking','router','switch','cable','LAN','CAT6','fiber',
  'haasib','ajhiza']),

('e8442d1c-442c-4b72-84bc-0345e58286ca',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'Graphic Design', 'graphic-design',
 'Logo, branding, social media design, packaging & print design',
 '🎨', true, 4,
 ARRAY['graphic design','graphics','logo','logo design','branding','brand identity',
  'visiting card design','business card design','letterhead','brochure design','flyer design',
  'poster design','social media design','social media post','banner design',
  'packaging design','label design','catalogue design','presentation','PPT design',
  'infographic','illustration','motion graphics','video editing','animation','2D','3D',
  'tasmeem','rusoom']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 4 — ADDITIONAL TOP-LEVEL CATEGORIES (31–38)                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 31. Perfume & Attar
('d3d4ac8c-a8a7-4bea-a7d2-208ace38732b',
 'Perfume & Attar', 'perfume-attar',
 'Ittar, attar, perfume oils, bakhoor, oudh & fragrances',
 '🌸', true, 31,
 ARRAY[
  'perfume','attar','ittar','itr','fragrance','scent','oudh','oud','agarwood','bakhoor',
  'bukhoor','incense','agarbatti','loban','lobaan','musk','kasturi','essential oil',
  'perfume oil','body mist','deodorant','roll on','arabian perfume','arabic perfume',
  'non alcoholic perfume','halal perfume','surma','kohl','kajal','rose water','gulab jal',
  'sandal','sandalwood','chandan','amber','mitti','khus','vetiver','mogra','jasmine oil',
  'itar wala','attar shop','attar seller','perfume shop','gift set fragrance',
  'itar','utoor','bakhoor dani','dhoop','dhoop batti','muattar'
]),

-- 32. Stationery & Office Supplies
('f6a23a92-fc19-4324-9380-a3ff771ed56f',
 'Stationery & Office Supplies', 'stationery',
 'School & office supplies, books, bags, art materials & gifting',
 '📝', true, 32,
 ARRAY[
  'stationery','stationery shop','office supplies','pen','pencil','notebook','register',
  'diary','file','folder','paper','A4','printer paper','envelope','sticky notes','tape',
  'scissors','stapler','calculator','geometry box','school bag','bag','backpack','lunch box',
  'water bottle','tiffin box','art supplies','colors','crayons','sketch pen','paint',
  'drawing book','chart paper','gift wrap','greeting card','islamic book','quran stand',
  'tasbeeh','prayer cap','topi','books','kitab','office chair','whiteboard','marker',
  'stamp pad','ink','correction pen','eraser','sharpener','ruler','protractor',
  'qarinah','adawaat maktabiyya','kutub'
]),

-- 33. Mobile & Telecom
('cf459ed9-cab9-4717-a0fc-12a3bcfd565a',
 'Mobile & Telecom', 'mobile-telecom',
 'Mobile phones, SIM cards, recharge, accessories & telecom services',
 '📲', true, 33,
 ARRAY[
  'mobile','mobile phone','smartphone','phone','cell phone','handset','iPhone','Samsung',
  'Vivo','Oppo','Realme','OnePlus','Xiaomi','Redmi','Poco','Nothing','Motorola','Nokia',
  'SIM card','SIM','Jio','Airtel','Vi','BSNL','recharge','prepaid','postpaid','plan',
  'data pack','unlimited','DTH','dish','Tata Sky','broadband','WiFi','dongle','fiber',
  'mobile cover','phone case','back cover','tempered glass','screen guard','charger',
  'charging cable','earphone','headphone','TWS','earbuds','power bank','memory card',
  'SD card','OTG','mobile accessories','phone accessories','second hand phone','used phone',
  'exchange','EMI','mobile shop','phone wala','haatif','jawal','iksaswaaraat'
]),

-- 34. Water Supply & Purification
('93ee0c09-6a07-4a09-8c89-95c7d02174f7',
 'Water Supply & Purification', 'water-supply',
 'Water tankers, RO service, borewell, water testing & purifiers',
 '💧', true, 34,
 ARRAY[
  'water','water supply','water tanker','tanker','tanker service','water delivery',
  'drinking water','mineral water','packaged water','water can','20 litre','water jar',
  'RO','RO service','RO repair','RO installation','water purifier','water filter',
  'UV filter','UF filter','Kent','Aquaguard','Pureit','Livpure','AMC','filter change',
  'membrane','cartridge','borewell','bore well','boring','tube well','motor pump',
  'submersible pump','water pump','overhead tank','underground tank','pipeline',
  'water testing','TDS','hard water','soft water','water softener','water treatment',
  'paani','paani ka tanker','paani wala','miyaah','tanqiya miyaah'
]),

-- 35. Daycare & Childcare
('81eae848-6c1a-4e5b-9583-047299404914',
 'Daycare & Childcare', 'daycare-childcare',
 'Crèche, daycare centers, babysitting, nanny & play schools',
 '👶', true, 35,
 ARRAY[
  'daycare','day care','creche','crèche','childcare','child care','babysitting','babysitter',
  'nanny','baby nurse','ayah','maid','caretaker','play school','playschool','play group',
  'playgroup','pre school','preschool','nursery school','montessori','kindergarten','KG',
  'toddler','infant care','newborn care','after school','after school care','kids activity',
  'child development','early learning','mother toddler','baby care','diaper','feeding',
  'potty training','child safety','kids supervision','working parents','working mother',
  'bachche ki dekhbhal','atfaal','hadaana','riwaaya atfaal'
]),

-- 36. Elderly & Home Nursing
('23e21576-3c0b-4ff1-97c2-5adfc4b38280',
 'Elderly & Home Nursing', 'elderly-nursing',
 'Home nurses, caregivers, attendants, elderly care & medical support',
 '🧓', true, 36,
 ARRAY[
  'elderly care','senior care','old age','home nursing','home nurse','nurse','attendant',
  'caregiver','care giver','patient care','bedside','bedridden','paralysis care',
  'stroke care','dementia','alzheimer','physiotherapy home','physio at home','injection',
  'IV drip','dressing','wound care','catheter','oxygen','ventilator','hospital bed',
  'wheelchair','walker','commode chair','diaper adult','adult diaper','medicine reminder',
  'health monitoring','BP check','sugar check','companion','live in nurse','night nurse',
  'post surgery care','palliative','home ICU','trained nurse','ANM','GNM','BSc nursing',
  'buzurgon ki dekhbhal','riwaaya musinneen','tamreedh manzili'
]),

-- 37. Security Services
('34a5572b-44a5-4d98-8a44-2db528085b47',
 'Security Services', 'security-services',
 'Security guards, bouncers, event security, patrol & manpower',
 '🛡️', true, 37,
 ARRAY[
  'security','security guard','guard','chowkidar','watchman','bouncer','bodyguard',
  'security agency','security service','security company','armed guard','unarmed guard',
  'event security','wedding security','corporate security','residential security',
  'society security','gate keeper','patrol','night patrol','escort','VIP security',
  'cash van','ATM security','bank security','fire safety','fire marshal','crowd control',
  'traffic management','security manpower','security supervisor','security officer',
  'ex army','ex serviceman','PSO','personal security','dog squad','K9','sniffer',
  'chowkidaar','pehra','hiraasa','amn','haaris'
]),

-- 38. Rental & Hire
('d0ea9aae-2e3a-4939-b581-5b4aa90db3f9',
 'Rental & Hire', 'rental-hire',
 'Equipment, vehicle, generator, furniture, sound system & tool rental',
 '🔑', true, 38,
 ARRAY[
  'rental','hire','rent','on rent','kiraya','kiray pe','lease','daily rental','monthly rental',
  'car rental','car on rent','self drive','bike rental','scooty rental','vehicle rental',
  'generator rental','generator on rent','genset','DG set','inverter rental',
  'sound system rental','DJ rental','speaker on rent','PA system rental','projector rental',
  'camera rental','lens rental','drone rental','furniture rental','table chair rental',
  'tent rental','AC rental','air cooler rental','water cooler rental','refrigerator rental',
  'freezer rental','tool rental','drill','grinder','cutter','scaffolding','ladder rental',
  'construction equipment','JCB','crane','mixer','compressor','welding machine rental',
  'party supplies rental','crockery rental','bartan','istijar','taajeer'
]);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 4B — NEW TOP-LEVEL CATEGORIES (39–63)                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 39. Restaurant, Café & Street Food
('fdf12ebb-89eb-4147-a193-05f1f0461183',
 'Restaurant, Café & Street Food', 'restaurant-cafe',
 'Restaurants, cafés, dhabas, fast food, juice bars & cloud kitchens',
 '🍽️', true, 39,
 ARRAY[
  'restaurant','cafe','coffee shop','dhaba','hotel','family restaurant','veg restaurant',
  'non veg restaurant','pure veg','biryani','biryani center','fast food','burger','pizza',
  'Chinese','Mughlai','South Indian','North Indian','tandoor','kebab','shawarma','roll',
  'juice bar','juice center','smoothie','shake','ice cream','ice cream parlour','kulfi',
  'food court','food truck','cloud kitchen','home delivery','takeaway','parcel','dine in',
  'buffet','thali restaurant','lunch','dinner','breakfast','nashta hotel','snack bar',
  'street food','chaat','pani puri','pav bhaji','dosa','idli','Zomato','Swiggy',
  'khana','mataam','maqha','qahwa'
]),

-- 40. Halal Meat, Poultry & Seafood
('a4d392a8-640f-4d36-ac55-60519098ec7c',
 'Halal Meat, Poultry & Seafood', 'halal-meat',
 'Halal butcher, chicken, mutton, fish, seafood & cold storage',
 '🥩', true, 40,
 ARRAY[
  'halal','halal meat','meat','meat shop','butcher','qasai','qassab','kasai','gosht',
  'mutton','lamb','bakra','goat','chicken','broiler','desi murgi','country chicken',
  'tandoori chicken','chicken shop','poultry','poultry farm','egg','anda','fish','machli',
  'seafood','prawn','shrimp','jhinga','pomfret','surmai','rawas','crab','lobster',
  'frozen meat','cold storage','fresh meat','bone','keema','mince','liver','kaleji',
  'brain','maghaz','paya','nihari cut','biryani cut','seekh','boti','tikka cut',
  'halal certified','zabiha','jhatka','lahm','dajaj','samak','qasaab'
]),

-- 41. Hardware & Building Materials
('a7e1a7f1-691d-4217-bb09-398ba533bb90',
 'Hardware & Building Materials', 'hardware-materials',
 'Tools, fasteners, cement, sand, bricks, plywood, TMT & paint store',
 '🔩', true, 41,
 ARRAY[
  'hardware','hardware store','hardware shop','tools','power tools','hand tools','drill',
  'grinder','cutter','saw','hammer','screwdriver','wrench','spanner','plier','measuring tape',
  'nuts','bolts','screws','nails','hinges','door fittings','lock','padlock','latch',
  'cement','sand','bricks','aggregate','RMC','ready mix','TMT bar','sariya','rebar',
  'binding wire','plywood','MDF','particle board','sunmica','laminate','adhesive','fevicol',
  'timber','lakdi','wood','paint','primer','putty','Asian Paints','Berger','Nerolac',
  'Dulux','brush','roller','turpentine','thinner','PVC pipe','CPVC','SWR','GI pipe',
  'fitting','elbow','tee','valve','gate valve','ball valve','tank','water tank','Sintex',
  'adawaat','mawaadd binaa'
]),

-- 42. Sanitary Ware & Bathroom Fittings
('c30d0ea2-b014-4022-8765-c412a8e28a07',
 'Sanitary Ware & Bathroom Fittings', 'sanitary-ware',
 'Toilets, basins, taps, showers, bath accessories & CP fittings',
 '🚿', true, 42,
 ARRAY[
  'sanitary','sanitary ware','bathroom','bathroom fitting','CP fitting','chrome','tap',
  'faucet','mixer','shower','rain shower','hand shower','diverter','health faucet',
  'toilet','commode','western toilet','Indian toilet','seat cover','flush','cistern',
  'wash basin','pedestal','counter top basin','urinal','bathtub','jacuzzi',
  'Jaquar','Cera','Hindware','Parryware','Kohler','American Standard','Grohe','DERA',
  'bathroom accessories','towel rod','soap dish','mirror','cabinet','glass shelf',
  'angle valve','concealed valve','geyser connection','drain','floor trap','gratings',
  'adawaat sihiyya','hammaam'
]),

-- 43. Textile & Fabric Store
('35c31d2d-01fd-40c1-8ca8-806e37c3606c',
 'Textile & Fabric Store', 'textile-fabric',
 'Cloth merchants, dress material, suiting-shirting & fabric wholesale',
 '🧶', true, 43,
 ARRAY[
  'textile','fabric','cloth','kapda','cloth shop','cloth merchant','cloth store',
  'dress material','suit piece','suiting','shirting','blouse piece','lining','lace',
  'border','dupatta fabric','chunni','cotton','silk','georgette','chiffon','net','velvet',
  'satin','crepe','organza','brocade','raw silk','tussar','chanderi','banarasi','jacquard',
  'embroidery fabric','printed','digital print','block print','tie dye','bandhani','ikat',
  'wholesale cloth','retail cloth','running fabric','cut piece','rida fabric','abaya fabric',
  'curtain cloth','upholstery fabric','furnishing','aqmisha','qumash','dukaan kapda'
]),

-- 44. Cosmetics & Beauty Products
('d2a8e387-bfe5-421b-9324-2e9e42fd7e4c',
 'Cosmetics & Beauty Products', 'cosmetics-beauty',
 'Makeup, skincare, haircare products, beauty tools & wholesale',
 '💅', true, 44,
 ARRAY[
  'cosmetics','beauty products','makeup','make up','skincare','skin care','haircare',
  'hair care','shampoo','conditioner','serum','cream','moisturizer','lotion','sunscreen',
  'face wash','cleanser','toner','foundation','concealer','compact','powder','lipstick',
  'lip gloss','kajal','eyeliner','mascara','eyeshadow','blush','highlighter','nail polish',
  'nail art supplies','beauty tools','brush set','makeup kit','hair dryer','straightener',
  'curler','trimmer','wax','wax strips','bleach','facial kit','hair color','henna','mehndi',
  'Lakme','Maybelline','LOreal','MAC','Nykaa','Colorbar','Revlon','Biotique','Himalaya',
  'wholesale beauty','parlour products','salon products','mustahdaraat tajmeel'
]),

-- 45. Crockery, Utensils & Kitchenware
('9ae83a8e-eb7b-41a3-8075-6fdcd264f2fd',
 'Crockery, Utensils & Kitchenware', 'crockery-kitchenware',
 'Steel utensils, cookware, dinner sets, kitchen tools & appliances',
 '🍳', true, 45,
 ARRAY[
  'crockery','utensils','bartan','bartan shop','kitchenware','cookware','steel','stainless',
  'non stick','non-stick','pressure cooker','Prestige','Hawkins','kadhai','tawa','pan',
  'pot','handi','deg','patila','plate','thali','glass','cup','mug','bowl','dinner set',
  'tea set','chinaware','bone china','melamine','flask','thermos','Milton','Cello',
  'tiffin','lunch box','water bottle','casserole','hot pot','serving','tray','ladle',
  'spatula','knife','chopping board','grater','peeler','masher','chimta','jhara','belan',
  'chakla','sil batta','mixer grinder','juicer','food processor','toaster','kettle',
  'induction','gas stove','adawaat matbakh','awani'
]),

-- 46. Toy & Kids Store
('68823061-7a04-4bcd-8b51-0ffb6c92a8db',
 'Toy & Kids Store', 'toys-kids',
 'Toys, games, baby products, cycles, strollers & kids furniture',
 '🧸', true, 46,
 ARRAY[
  'toy','toys','toy shop','toy store','kids store','baby store','baby products','games',
  'board game','puzzle','building blocks','LEGO','Barbie','Hot Wheels','action figure',
  'doll','teddy bear','soft toy','remote control','RC car','drone toy','educational toy',
  'learning toy','STEM','science kit','cycle','bicycle','tricycle','balance bike','scooter',
  'skateboard','stroller','pram','baby walker','car seat','high chair','crib','cradle',
  'baby cot','kids furniture','study table','bunk bed','toy chest','diaper','bottle',
  'sipper','teether','rattle','baby care','baby oil','baby powder','luab','atfaal'
]),

-- 47. Bag, Luggage & Travel Accessories
('269a5c13-d43e-4ef6-a7bf-ebead051d551',
 'Bag, Luggage & Travel Accessories', 'bags-luggage',
 'Suitcases, backpacks, handbags, wallets & travel gear',
 '🧳', true, 47,
 ARRAY[
  'bag','bags','luggage','suitcase','trolley bag','trolley','travel bag','duffle','duffel',
  'backpack','rucksack','school bag','college bag','laptop bag','office bag','messenger',
  'sling bag','cross body','handbag','purse','clutch','tote','wallet','ladies wallet',
  'gents wallet','belt','leather belt','formal belt','casual belt','card holder',
  'passport holder','neck pillow','travel pillow','eye mask','luggage tag','packing cube',
  'VIP','Safari','American Tourister','Samsonite','Skybags','Wildcraft','Aristocrat',
  'cabin bag','check in','hard case','soft case','wheel','strolley','haqeeba','haqaaib'
]),

-- 48. Mattress & Bedding
('98c85897-d74b-4bf0-aed1-c5a3bf9cdf9d',
 'Mattress & Bedding', 'mattress-bedding',
 'Mattresses, pillows, bed sheets, blankets, quilts & bedding accessories',
 '🛏️', true, 48,
 ARRAY[
  'mattress','gadda','toshak','foam mattress','spring mattress','coir mattress','orthopedic',
  'memory foam','latex','king size','queen size','single','double','pillow','cushion',
  'bolster','bed sheet','bedsheet','fitted sheet','flat sheet','bed cover','bedspread',
  'blanket','kambal','comforter','duvet','quilt','razai','dohar','AC blanket','fleece',
  'silk','cotton bedding','satin','mattress protector','pillow cover','cushion cover',
  'Sleepwell','Duroflex','Kurlon','Peps','Wakefit','Sunday','diwan set','sofa cover',
  'curtain set','towel','bath towel','firaash','wasaada','aghtyah'
]),

-- 49. Sports Goods & Equipment
('4686035b-7924-4287-bea4-2893d3bee670',
 'Sports Goods & Equipment', 'sports-goods',
 'Cricket, football, gym equipment, sportswear & fitness accessories',
 '⚽', true, 49,
 ARRAY[
  'sports','sports goods','sports shop','sports equipment','cricket bat','cricket ball',
  'cricket kit','pad','gloves','helmet','stump','football','soccer ball','basketball',
  'volleyball','badminton racket','shuttlecock','tennis racket','table tennis','TT',
  'carrom','chess','gym equipment','dumbbell','barbell','weight plate','bench','treadmill',
  'cycle','exercise bike','yoga mat','resistance band','skipping rope','sportswear',
  'track suit','jersey','shorts','sports shoes','running shoes','shin guard','kit bag',
  'Cosco','SG','SS','Yonex','Nivia','adawaat riyadiyya','malaabis riyadiyya'
]),

-- 50. Religious & Islamic Goods
('eb2fe99a-abdd-4482-9c03-429121a443ef',
 'Religious & Islamic Goods', 'islamic-goods',
 'Prayer items, Quran, tasbeeh, topi, calligraphy, Islamic decor & gifts',
 '🕌', true, 50,
 ARRAY[
  'islamic','religious','islamic store','islamic shop','prayer','namaz','salah','ibadah',
  'tasbeeh','tasbih','misbaha','prayer mat','janamaz','musalla','sajjada','prayer cap',
  'topi','kufi','dastar','imamah','Quran','mushaf','Quran stand','rehal','miswak','siwak',
  'surma','kohl','itar','attar','loban','bakhoor','islamic decor','calligraphy','arabic',
  'ayat','ayatul kursi','bismillah','wall frame','wall hanging','clock islamic','kaaba',
  'masjid model','dome','minaret','islamic gift','eid gift','hajj gift','umrah gift',
  'tasbeeh counter','finger counter','dua book','yaseen','surah','bookmark quran',
  'adawaat deeniyya','mustalazmaat islamiyya'
]),

-- 51. Manpower, Staffing & Domestic Help
('e28f633d-9750-4389-8340-01eff0b47d86',
 'Manpower, Staffing & Domestic Help', 'manpower-staffing',
 'Maids, cooks, drivers, office staff, labour & placement agencies',
 '👥', true, 51,
 ARRAY[
  'manpower','staffing','domestic help','domestic worker','maid','bai','kaamwali',
  'house maid','part time maid','full time maid','live in maid','cook','maharaj','bawarchi',
  'driver','personal driver','office driver','delivery boy','watchman','chowkidar','guard',
  'office boy','peon','sweeper','safai wala','gardener','mali','caretaker','nanny','ayah',
  'nurse','helper','labour','labour contractor','daily wage','skilled worker','unskilled',
  'placement agency','placement bureau','recruitment','staffing agency','HR services',
  'temporary staff','contract staff','event staff','waiter','steward','housekeeping',
  'naukri','naukrani','kaamgaar','aamaala','tawzeef'
]),

-- 52. Hotel, Lodge & Guest House
('89bdc5a5-1d79-49c1-a887-89552c019ceb',
 'Hotel, Lodge & Guest House', 'hotel-lodge',
 'Hotels, lodges, guest houses, service apartments & budget stays',
 '🏨', true, 52,
 ARRAY[
  'hotel','lodge','guest house','inn','motel','resort','service apartment','serviced',
  'budget hotel','luxury hotel','3 star','4 star','5 star','boutique hotel','heritage',
  'dharamshala','musafir khana','boarding','room','AC room','non AC room','suite',
  'deluxe','standard','dormitory','hostel stay','couple friendly','family hotel',
  'OYO','FabHotel','Treebo','Lemon Tree','Taj','Oberoi','ITC','Radisson','Marriott',
  'check in','check out','booking','online booking','walk in','reception','room service',
  'WiFi','parking','continental breakfast','complimentary','funduk','iqaama','ghurfa'
]),

-- 53. Banquet Hall & Venue
('0a4c0ce7-4d50-4adf-b503-1d3e6e611345',
 'Banquet Hall & Venue', 'banquet-venue',
 'Marriage halls, banquets, party venues, lawns & community halls',
 '🏛️', true, 53,
 ARRAY[
  'banquet','banquet hall','marriage hall','shaadi hall','party hall','function hall',
  'community hall','jamat khana','jamaat khana','venue','event venue','wedding venue',
  'reception venue','birthday venue','conference hall','seminar hall','meeting room',
  'board room','convention center','auditorium','lawn','garden venue','terrace','rooftop',
  'farm house','poolside','open air','indoor','outdoor','capacity','500 pax','1000 pax',
  'catering included','decoration included','AC hall','parking','stage','green room',
  'qaaat','qaaat afraah','makan haflaat','saloon munaasabaat'
]),

-- 54. Taxi, Cab & Local Transport
('d591dff1-66ae-4676-8383-b0cfcda47ef9',
 'Taxi, Cab & Local Transport', 'taxi-cab',
 'Taxis, auto-rickshaws, cabs, airport transfer & outstation cars',
 '🚕', true, 54,
 ARRAY[
  'taxi','cab','auto','auto-rickshaw','auto rickshaw','rickshaw','three wheeler',
  'Ola','Uber','Rapido','cab booking','taxi booking','app cab','mini','sedan','SUV',
  'prime','airport taxi','airport transfer','railway station','pickup','drop',
  'outstation','outstation cab','round trip','one way','local','hourly','package',
  'tempo traveller','traveller','12 seater','17 seater','26 seater','mini bus',
  'car hire','car with driver','self drive','Zoomcar','Revv','chauffeur','driver on call',
  'night taxi','early morning','hospital drop','emergency taxi','sawaari','sayaara ujra'
]),

-- 55. Flour Mill & Food Processing
('a76e02ee-30af-4ba0-a1ed-00794111db9f',
 'Flour Mill & Food Processing', 'flour-mill',
 'Atta chakki, masala grinding, dal mill, oil press & food processing',
 '🌾', true, 55,
 ARRAY[
  'flour mill','atta chakki','chakki','grinding','atta','wheat grinding','multigrain atta',
  'bajra','jowar','ragi','maize','corn flour','besan','gram flour','rice flour',
  'masala grinding','spice grinding','garam masala','haldi','turmeric','mirchi','chili',
  'dhaniya','coriander','jeera','cumin','sabut masala','powder','dal mill','dal processing',
  'oil press','ghani','kachi ghani','mustard oil','til oil','sesame','groundnut oil',
  'coconut oil','cold pressed','wood pressed','papad making','pickle','achar','murabba',
  'poppadom','rice mill','poha','flattened rice','sattu','taheen','matahana','tahaan'
]),

-- 56. Marriage Bureau & Matchmaking
('443b44e3-7997-405c-a850-dd815f77dc1e',
 'Marriage Bureau & Matchmaking', 'marriage-bureau',
 'Matchmaking, matrimonial services, rishta & community marriage bureaus',
 '💑', true, 56,
 ARRAY[
  'marriage bureau','matchmaking','matrimonial','rishta','rishtey','shaadi','nikah',
  'proposal','biodata','bride','groom','dulha','dulhan','boy','girl','alliance',
  'community marriage','Bohra matrimonial','Muslim matrimonial','Sunni','Shia','Dawoodi',
  'second marriage','divorcee','widow','widower','NRI','abroad','doctor','engineer',
  'business family','well settled','educated','working','homely','religious','modern',
  'Shaadi.com','Matrimony','BharatMatrimony','MuslimMatrimony','reference','family match',
  'early marriage','late marriage','age','height','qualification','maktab zawaj','tawfeeq'
]),

-- 57. Scrap Dealer & Recycling
('606452f9-38d7-4a3c-bda9-66e8b97d2749',
 'Scrap Dealer & Recycling', 'scrap-recycling',
 'Kabadiwala, raddi, paper/metal/e-waste scrap & recycling services',
 '♻️', true, 57,
 ARRAY[
  'scrap','scrap dealer','kabadi','kabadiwala','kabadi wala','raddi','raddi wala',
  'paper scrap','newspaper','old newspaper','magazine','cardboard','carton','waste paper',
  'metal scrap','iron scrap','steel','aluminium scrap','copper','brass','tin','lead',
  'e-waste','electronic waste','old computer','old phone','old TV','old AC','old fridge',
  'plastic','PET','bottle','recycling','recycle','junk','junk removal','demolition waste',
  'construction waste','old furniture','old books','old clothes','rags','bhangar',
  'purana saman','kabad','kachra','recyclable','green','environment','kharadawaat'
]),

-- 58. Solar & Renewable Energy
('0cac5e1e-8891-41a5-9e32-b36a4a47c037',
 'Solar & Renewable Energy', 'solar-energy',
 'Solar panels, inverters, EV chargers, battery storage & green energy',
 '☀️', true, 58,
 ARRAY[
  'solar','solar panel','solar energy','solar power','solar system','rooftop solar',
  'solar installation','solar EPC','photovoltaic','PV','module','solar inverter',
  'on grid','off grid','hybrid','net metering','subsidy','MNRE','solar water heater',
  'solar light','solar street light','solar pump','lithium battery','battery storage',
  'power wall','EV charger','EV charging station','electric vehicle','charging point',
  'renewable energy','green energy','wind','biogas','energy audit','energy saving',
  'LED','solar AMC','cleaning solar panel','Tata Solar','Luminous','Microtek','Waaree',
  'Adani Solar','taqa shamsiyya','taqa mutajaddida'
]),

-- 59. Locksmith & Key Maker
('e71b5443-ae5e-48d9-9e2f-68d49a392adc',
 'Locksmith & Key Maker', 'locksmith',
 'Key cutting, lock repair, digital locks, safes & emergency unlocking',
 '🔐', true, 59,
 ARRAY[
  'locksmith','lock','key','key maker','key cutting','duplicate key','spare key','chaabi',
  'chabi wala','taala','lock repair','lock change','lock installation','padlock','door lock',
  'mortise lock','cylindrical','night latch','rim lock','dead bolt','digital lock',
  'smart lock','fingerprint lock','password lock','Godrej lock','Yale','Samsung smart lock',
  'safe','locker','almirah lock','car key','bike key','remote key','transponder',
  'key programming','immobilizer','emergency unlock','lockout','break open','shutter lock',
  'rolling shutter','Navtal','Europa','Link','aqfaal','miftaah','haddaad'
]),

-- 60. Cobbler & Shoe Repair
('f1d73d46-6a0c-4259-9b65-c1f616927638',
 'Cobbler & Shoe Repair', 'cobbler-shoe-repair',
 'Shoe repair, sole replacement, polish, bag repair & leather work',
 '👞', true, 60,
 ARRAY[
  'cobbler','mochi','shoe repair','chappal repair','sandal repair','sole','sole replacement',
  'half sole','full sole','heel','heel repair','heel replacement','stitching','shoe stitch',
  'polish','shoe polish','shine','buffing','color','shoe color','dyeing','leather repair',
  'leather work','bag repair','purse repair','belt repair','wallet repair','jacket repair',
  'zip repair','zip replacement','buckle','lace','insole','arch support','shoe stretch',
  'boot repair','sports shoe repair','sneaker cleaning','suede','nubuck',
  'joota marammat','chappal theek','iskafi','musallih ahdhiya'
]),

-- 61. Cyber Café & DTP Services
('3a83ae6e-f80c-4069-b445-596d0ac2f2d8',
 'Cyber Café & DTP Services', 'cyber-cafe-dtp',
 'Internet browsing, xerox, scanning, typing, DTP & government forms',
 '🖨️', true, 61,
 ARRAY[
  'cyber cafe','internet cafe','browsing center','computer center','xerox','photocopy',
  'printout','color print','black white','scanning','scan','lamination','spiral binding',
  'typing','data entry','DTP','desktop publishing','page maker','CorelDraw','Photoshop',
  'online form','government form','Aadhaar','PAN card','passport application','visa form',
  'income certificate','caste certificate','domicile','birth certificate','affidavit typing',
  'CSC center','e-mitra','e-seva','jan seva kendra','common service','Meeseva',
  'email','resume','CV','biodata typing','project','assignment','maqha internet'
]),

-- 62. Money Transfer & Forex
('f17b9af4-93e6-4410-b98b-e712a8fef6c7',
 'Money Transfer & Forex', 'money-transfer',
 'Foreign exchange, remittance, wire transfer & currency exchange',
 '💸', true, 62,
 ARRAY[
  'money transfer','forex','foreign exchange','currency exchange','money changer',
  'Western Union','MoneyGram','Ria','Xpress Money','wire transfer','bank transfer','SWIFT',
  'remittance','send money','receive money','inward','outward','NRI','abroad','Gulf',
  'Saudi','UAE','Dubai','Qatar','Oman','Kuwait','Bahrain','dollar','USD','riyal','dirham',
  'pound','euro','yen','exchange rate','buy','sell','travellers cheque','forex card',
  'prepaid card','travel card','encash','draft','demand draft','hawala','hundi',
  'paisa bhejna','rupee','tahweel amwaal','sarf'
]),

-- 63. Gas Agency & Fuel
('c6aea6c9-76af-4278-8d4c-29770cfdf481',
 'Gas Agency & Fuel', 'gas-fuel',
 'LPG gas agencies, cylinder booking, CNG, petrol pumps & fuel delivery',
 '🔥', true, 63,
 ARRAY[
  'gas','LPG','gas agency','gas booking','cylinder','HP gas','Hindustan Petroleum',
  'Bharat gas','Bharat Petroleum','Indane','Indian Oil','IOC','BPCL','HPCL',
  'commercial cylinder','domestic cylinder','14.2 kg','19 kg','5 kg','refill','delivery',
  'gas connection','new connection','transfer','SVG','piped gas','PNG','pipeline gas',
  'Mahanagar Gas','Adani Gas','IGL','CNG','CNG station','auto gas','petrol pump',
  'petrol','diesel','fuel station','filling station','kerosene','mitti ka tel',
  'coal','charcoal','koyla','angeethi','gas stove','regulator','pipe','lighter',
  'ghaaz','waqood','istuwaana'
]);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 5 — SUBCATEGORIES FOR PREVIOUSLY-FLAT PARENTS                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────
-- Under: Photography (5cec4eb5)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('7fdca7c8-ebea-436b-84ed-57099116c8fa',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Wedding Photography', 'wedding-photography',
 'Wedding shoots, cinematic videos, pre-wedding & albums',
 '💒', true, 1,
 ARRAY['wedding photography','wedding videography','shaadi photography','nikah photography',
  'walima shoot','cinematic wedding','wedding film','wedding reel','pre wedding',
  'pre-wedding shoot','couple shoot','wedding album','photo album','candid wedding',
  'traditional wedding','engagement shoot','haldi shoot','mehndi shoot','reception shoot',
  'destination wedding photography','dulhan photo','dulha photo','tasweer zafaaf']),

('fd172a19-35e9-4022-bf1d-42d0b6564c42',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Product Photography', 'product-photography',
 'E-commerce, food, jewellery & catalogue product shoots',
 '📸', true, 2,
 ARRAY['product photography','product shoot','ecommerce photography','amazon photography',
  'food photography','jewellery photography','clothing photography','flat lay',
  'white background','lifestyle shoot','catalogue','catalog shoot','menu photography',
  'restaurant photography','real estate photography','interior photography',
  'commercial photography','advertising photography','brand shoot','tasweer muntajaat']),

('16f30be1-8efd-41c0-b684-940a2f386d86',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Event & Corporate', 'event-corporate-photography',
 'Corporate events, conferences, parties & social gatherings',
 '🎤', true, 3,
 ARRAY['event photography','event videography','corporate photography','conference',
  'seminar','workshop','birthday photography','birthday shoot','party photography',
  'anniversary shoot','baby shower','naming ceremony','aqeeqah photography',
  'milad photography','mehfil','corporate video','documentary','testimonial video',
  'corporate headshot','team photo','tasweer haflaat']),

('7cbb575b-7e26-441b-babd-db645eb981b9',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Drone & Aerial', 'drone-aerial',
 'Aerial photography, drone videography & survey mapping',
 '🚁', true, 4,
 ARRAY['drone','drone photography','drone videography','aerial photography','aerial video',
  'aerial shot','bird eye view','drone shoot','drone pilot','DJI','drone survey',
  'land survey','mapping','topography','construction progress','roof inspection',
  'real estate aerial','wedding drone','event drone','tasweer jawwiyya']),

('1dd99222-dc68-40c4-8728-ed7311d68a7a',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Studio & Portraits', 'studio-portraits',
 'Photo studio, passport photos, family portraits & headshots',
 '🖼️', true, 5,
 ARRAY['studio','photo studio','portrait','family portrait','baby portrait','newborn shoot',
  'maternity shoot','passport photo','visa photo','ID photo','headshot','professional photo',
  'model portfolio','portfolio','graduation photo','convocation','kids photography',
  'toddler shoot','cake smash','studio lighting','green screen','tasweer shakhsiyya']);

-- ─────────────────────────────────────────────
-- Under: Mehndi & Henna (81f631d4)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('ed0d5728-a19d-4292-a5fc-d11c665cba23',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Bridal Mehndi', 'bridal-mehndi',
 'Full bridal mehndi for hands, feet & elaborate designs',
 '👰', true, 1,
 ARRAY['bridal mehndi','dulhan mehndi','wedding mehndi','bridal henna','full hand mehndi',
  'full arm mehndi','feet mehndi','heavy mehndi','elaborate design','traditional bridal',
  'rajasthani bridal','portrait mehndi','dulha mehndi','groom mehndi','engagement mehndi',
  'nikah mehndi','walima mehndi','hinna aroos']),

('486fc515-a2bb-40bb-842f-22d098e6b6f4',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Party & Festive Mehndi', 'party-mehndi',
 'Quick mehndi for Eid, festivals, parties & celebrations',
 '🎉', true, 2,
 ARRAY['party mehndi','festive mehndi','eid mehndi','ramadan mehndi','diwali mehndi',
  'karva chauth','teej','rakshabandhan','sangeet mehndi','function mehndi','simple mehndi',
  'easy mehndi','quick mehndi','small design','finger mehndi','back hand mehndi',
  'trendy mehndi','modern mehndi','hinna haflaat']),

('d371304a-ff65-40f8-b233-be4a025af0ed',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Arabic Mehndi', 'arabic-mehndi',
 'Arabic style, floral trails, minimal & contemporary designs',
 '🌿', true, 3,
 ARRAY['arabic mehndi','arabic henna','arabic design','floral mehndi','trail mehndi',
  'vine mehndi','minimal mehndi','contemporary mehndi','modern arabic','gulf style',
  'khaleeji mehndi','dubai mehndi','one side mehndi','diagonal mehndi','bold mehndi',
  'thick mehndi','dark mehndi','naqsh arabi']),

('c391319e-80c6-434d-a8ec-c50426afe0fe',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Kids Mehndi', 'kids-mehndi',
 'Simple & fun mehndi designs for children',
 '🧒', true, 4,
 ARRAY['kids mehndi','children mehndi','baby mehndi','small hand mehndi','cartoon mehndi',
  'butterfly mehndi','flower mehndi simple','star mehndi','heart mehndi','easy kids',
  'safe henna','organic henna kids','mehndi for girls','cute mehndi','hinna atfaal']);

-- ─────────────────────────────────────────────
-- Under: Sweets & Bakery (f4188f3f)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('11d775dc-8a0c-4bee-b1b9-7b97bff2a368',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Traditional Sweets & Mithai', 'traditional-sweets',
 'Indian mithai, halwai specials, festive sweets & ladoo',
 '🍬', true, 1,
 ARRAY['mithai','sweet','traditional sweet','ladoo','laddoo','barfi','burfi','peda','petha',
  'jalebi','imarti','gulab jamun','rasgulla','sandesh','cham cham','kalakand','malpua',
  'halwa','sohan halwa','mohanthal','ghevar','balushahi','mysore pak','kaju katli',
  'kaju barfi','son papdi','chikki','gajak','rewdi','tilgul','modak','meethai','hulwiyyaat']),

('0fe05582-989b-4a33-92bc-04776a9e9543',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Cakes & Pastry', 'cakes-pastry',
 'Birthday cakes, wedding cakes, pastries, cupcakes & desserts',
 '🎂', true, 2,
 ARRAY['cake','birthday cake','wedding cake','anniversary cake','custom cake','designer cake',
  'fondant','buttercream','cream cake','chocolate cake','red velvet','black forest',
  'eggless cake','vegan cake','photo cake','theme cake','cupcake','muffin','pastry',
  'puff','cream roll','brownie','cookie','macaroon','macaron','donut','doughnut',
  'cheesecake','tiramisu','mousse','cake order','cake delivery','kaik']),

('1c297e94-d262-4fb0-a9f8-936ea0fc6780',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Namkeen & Snacks', 'namkeen-snacks',
 'Savoury snacks, namkeen, chips, mixture & party packs',
 '🥨', true, 3,
 ARRAY['namkeen','snack','snacks','mixture','chevda','chivda','sev','bhujia','gathiya',
  'fafda','khakhra','mathri','nimki','murukku','chakli','shakarpara','samosa','kachori',
  'pakora','bhajia','vada','farsan','chat masala','chips','wafer','papad','pickle',
  'achar','murabba','chutney','dry snack','party pack','festive pack','maqaalii']),

('708eb476-3554-41b1-b646-e676a0197e1e',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Dry Fruits & Chocolates', 'dry-fruits-chocolates',
 'Premium dry fruits, nuts, dates, chocolates & gift boxes',
 '🍫', true, 4,
 ARRAY['dry fruits','dry fruit','mewa','nuts','almond','badam','cashew','kaju','pistachio',
  'pista','walnut','akhrot','raisin','kishmish','dates','khajoor','khajur','anjeer','fig',
  'apricot','dried cranberry','trail mix','mixed nuts','chocolate','homemade chocolate',
  'handmade chocolate','truffle','praline','gift box','dry fruit box','wedding box',
  'corporate gift','festival gift','diwali gift','eid gift','tuhfa','mukassaraat']);

-- ─────────────────────────────────────────────
-- Under: Jewellery & Watches (aa000021)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('c1ad1087-7e7b-43ce-8834-7f044194a522',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Gold & Diamond', 'gold-diamond',
 'Gold, diamond, platinum, bridal sets & precious jewellery',
 '💎', true, 1,
 ARRAY['gold','gold jewellery','22 carat','24 carat','18 carat','hallmark','BIS','diamond',
  'solitaire','platinum','bridal set','wedding jewellery','necklace set','choker',
  'mangalsutra','gold chain','gold ring','engagement ring','diamond ring','gold earring',
  'jhumka gold','gold bangle','gold bracelet','gold pendant','certified diamond',
  'GIA','IGI','gold investment','gold coin','gold bar','sonar','zargaar','dhahab','almaas']),

('f95b4f52-7ed1-4e92-ba16-cf65f5d42c65',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Imitation & Fashion Jewellery', 'imitation-jewellery',
 'Artificial, oxidized, kundan, AD & trendy fashion jewellery',
 '📿', true, 2,
 ARRAY['imitation','artificial','fashion jewellery','costume jewellery','oxidized','oxidised',
  'german silver','tribal','bohemian','kundan','AD','american diamond','CZ','meenakari',
  'temple jewellery','south indian','pearl','moti','beads','thread jewellery','silk thread',
  'terracotta','clay jewellery','handmade jewellery','daily wear','office wear','casual',
  'combo set','jewellery set','matching set','wholesale jewellery','mujawharaat sinaaiyya']),

('37096b68-c299-4f3d-b65e-67e55c13ae60',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Watch Sales & Repair', 'watch-repair',
 'Watch selling, repair, battery replacement & servicing',
 '⌚', true, 3,
 ARRAY['watch','wrist watch','watch repair','clock repair','battery replacement','watch battery',
  'strap','watch strap','band','watch band','Casio','Titan','Fastrack','Fossil','Seiko',
  'Citizen','automatic','mechanical','quartz','smart watch','smartwatch','Apple Watch',
  'wall clock','pendulum','antique clock','watch polish','crystal replacement',
  'watch service','chronograph','luxury watch','islah saat']),

('efbe5dad-1c85-4432-b5a3-9d2ee16048d8',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Custom & Bespoke Jewellery', 'custom-jewellery',
 'Custom-made, personalized, engraved & redesigned jewellery',
 '✨', true, 4,
 ARRAY['custom jewellery','bespoke','personalized','personalised','made to order','custom ring',
  'name necklace','engraving','laser engraving','redesign','old gold','melting','remaking',
  'jewellery redesign','stone setting','polki setting','jadau','antique restoration',
  'heirloom','family jewellery','wedding custom','engagement custom','CAD design jewellery',
  '3D printing jewellery','wax casting','mujawharaat mukhassasa']);

-- ─────────────────────────────────────────────
-- Under: Real Estate & Property (aa000015)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('8dcbaf8d-b8a4-4142-ae90-4ee5eb029616',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Residential Sale & Purchase', 'residential-sale',
 'Flats, houses, villas & apartments for buying & selling',
 '🏠', true, 1,
 ARRAY['residential','flat sale','flat purchase','house sale','buy flat','sell flat',
  'apartment','1 BHK','2 BHK','3 BHK','4 BHK','villa','bungalow','row house','duplex',
  'penthouse','builder floor','new construction','under construction','ready possession',
  'resale','first sale','RERA registered','society flat','gated community','township',
  'makaan khareedna','makaan bechna','bay sakan']),

('9b55c11a-48f8-412f-950b-a7a3ab114f9f',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Rental & PG', 'rental-pg',
 'Flats, rooms, PG accommodations & hostels for rent',
 '🛏️', true, 2,
 ARRAY['rent','rental','flat on rent','room on rent','PG','paying guest','hostel','mess',
  'boys PG','girls PG','co-living','shared room','single room','furnished','semi furnished',
  'unfurnished','bachelor','family','deposit','agreement','lease','11 month','society',
  'apartment rent','house rent','kiraya','kirayedar','maalik','ijaar']),

('27a7590f-e9a3-4cb1-a97c-ec2924f03d4a',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Commercial Property', 'commercial-property',
 'Shops, offices, showrooms, warehouses & commercial spaces',
 '🏬', true, 3,
 ARRAY['commercial','shop','shop rent','shop sale','office','office space','co-working',
  'coworking','showroom','warehouse','godown','gala','industrial','factory','commercial complex',
  'mall','market','business center','plug and play','furnished office','virtual office',
  'meeting room','conference room','dukaan','amlaak tijariyya']),

('a7e55ecc-17ea-466e-ad23-a1d6bc670ecc',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Plot & Land', 'plot-land',
 'Residential plots, agricultural land, NA plots & farmhouses',
 '🌍', true, 4,
 ARRAY['plot','land','zameen','agricultural land','farm land','NA plot','non agricultural',
  'residential plot','commercial plot','industrial plot','layout','DTCP','RERA plot',
  'corner plot','road facing','farm house','farmhouse','weekend home','conversion',
  'mutation','7/12','property card','survey number','boundary','fencing','ard','qitaa']);

-- ─────────────────────────────────────────────
-- Under: Legal & Finance (aa000014)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('a75a0e25-6098-41a2-945d-9c577ee11d14',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'Lawyer & Legal Services', 'lawyer-legal',
 'Advocates, legal consultants, court matters & documentation',
 '⚖️', true, 1,
 ARRAY['lawyer','advocate','vakil','attorney','legal consultant','court','high court',
  'district court','family court','criminal lawyer','civil lawyer','property lawyer',
  'divorce','custody','bail','FIR','police complaint','consumer court','labour court',
  'arbitration','mediation','legal notice','affidavit','power of attorney','will',
  'succession','probate','documentation','stamp paper','muhaami','qanoon']),

('b0a0c7a0-c6b7-4591-b14f-ec48d5ad29c7',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'CA & Tax Services', 'ca-tax',
 'Chartered accountants, tax filing, GST, audit & compliance',
 '📊', true, 2,
 ARRAY['CA','chartered accountant','tax','income tax','IT return','ITR','ITR filing',
  'tax consultant','tax advisor','GST','GST registration','GST filing','GST return',
  'TDS','TCS','advance tax','refund','assessment','audit','statutory audit','internal audit',
  'bookkeeping','accounting','tally','balance sheet','P&L','profit loss','ROC','compliance',
  'company formation','partnership deed','LLP','muhaasib','dareeba']),

('23f310f3-0bad-4694-9c85-ebaa7b9c7607',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'Insurance', 'insurance',
 'Life, health, vehicle, property & business insurance',
 '🛡️', true, 3,
 ARRAY['insurance','insurance agent','LIC','life insurance','health insurance','mediclaim',
  'car insurance','vehicle insurance','bike insurance','third party','comprehensive',
  'term plan','endowment','ULIP','pension','retirement','annuity','group insurance',
  'corporate insurance','fire insurance','marine insurance','property insurance',
  'claim','claim settlement','cashless','premium','renewal','policy','bima','tameen']),

('ce40bc31-c60f-40cc-a628-ba05d3a0892a',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'Loans & Financial Planning', 'loans-finance',
 'Home loans, personal loans, mutual funds & investment advisory',
 '💰', true, 4,
 ARRAY['loan','home loan','personal loan','business loan','car loan','education loan',
  'gold loan','loan against property','LAP','EMI','interest rate','bank loan','NBFC',
  'mutual fund','SIP','investment','fixed deposit','FD','RD','stock','share market',
  'demat','portfolio','financial planner','financial advisor','wealth management',
  'NPS','PPF','sukanya','retirement planning','goal planning','qard','istithmaar']);

-- ─────────────────────────────────────────────
-- Under: Travel & Tourism (aa000022)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('d391b341-78a8-4690-ac22-f03f6eedcc4b',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Hajj & Umrah', 'hajj-umrah',
 'Hajj packages, Umrah tours, ziyarat & religious travel',
 '🕋', true, 1,
 ARRAY['hajj','haj','umrah','umra','ziyarat','ziarat','makkah','madina','madinah','medina',
  'saudi','saudi arabia','holy land','pilgrimage','hajj package','umrah package','group hajj',
  'VIP hajj','economy hajj','hajj visa','umrah visa','ihram','tawaf','safa marwa','mina',
  'arafat','muzdalifah','hajj operator','umrah operator','hajj agent','religious tour',
  'karbala','najaf','iraq ziyarat','iran ziyarat','hajj wa umrah']),

('e55bdc36-5f0c-41fb-8246-81a5aee06d42',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Domestic Tours', 'domestic-tours',
 'India tour packages, hill stations, beaches & pilgrimage',
 '🏔️', true, 2,
 ARRAY['domestic tour','india tour','family tour','group tour','hill station','beach',
  'goa','kerala','kashmir','rajasthan','himachal','manali','shimla','ooty','darjeeling',
  'andaman','lakshadweep','north east','ladakh','south india','golden triangle',
  'wildlife','safari','adventure','trekking','camping','road trip','bus tour','train tour',
  'weekend getaway','honeymoon india','school trip','corporate outing','siyaaha dakhiliyya']),

('12fc6606-c633-4b7b-89c0-a0de2419231d',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'International Tours', 'international-tours',
 'International holiday packages, honeymoon & group tours',
 '🌍', true, 3,
 ARRAY['international tour','foreign tour','abroad','overseas','dubai','singapore','thailand',
  'bali','maldives','malaysia','europe','switzerland','paris','london','turkey','egypt',
  'mauritius','sri lanka','nepal','bhutan','australia','USA','canada','cruise',
  'honeymoon international','visa assistance','travel insurance','forex','flight booking',
  'hotel booking international','world tour','siyaaha dawliyya']),

('7f72cfa1-7dac-4b06-9a92-fafb5739580c',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Visa Services', 'visa-services',
 'Visa processing, documentation, attestation & embassy assistance',
 '🛂', true, 4,
 ARRAY['visa','visa service','visa agent','visa consultant','visa processing','tourist visa',
  'business visa','work visa','student visa','PR','permanent residence','immigration',
  'embassy','consulate','VFS','appointment','biometric','documentation','attestation',
  'apostille','PCC','police clearance','invitation letter','cover letter','NOC',
  'visa stamping','visa tracking','rejection','appeal','taashira','hijra']);

-- ─────────────────────────────────────────────
-- Under: Fitness & Sports (aa000013)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('d54fed50-3e56-4023-a1ad-4279fb0708e8',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Gym & Weight Training', 'gym-weight-training',
 'Gyms, bodybuilding, strength training & personal trainers',
 '🏋️', true, 1,
 ARRAY['gym','gymnasium','fitness center','health club','weight training','bodybuilding',
  'strength training','powerlifting','CrossFit','HIIT','functional training','free weights',
  'dumbbell','barbell','squat','deadlift','bench press','personal trainer','PT',
  'fitness trainer','gym membership','monthly gym','annual gym','ladies gym','gents gym',
  'unisex gym','24 hour gym','home gym','gym equipment','kasrat','riyaada']),

('159bf4c9-afca-4fb8-ae81-56e6b467a449',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Yoga & Meditation', 'yoga-meditation',
 'Yoga classes, pranayama, meditation & wellness programs',
 '🧘', true, 2,
 ARRAY['yoga','yoga class','yoga teacher','yoga instructor','hatha yoga','vinyasa','ashtanga',
  'power yoga','hot yoga','prenatal yoga','postnatal yoga','kids yoga','senior yoga',
  'pranayama','breathing','meditation','mindfulness','stress management','wellness',
  'holistic','chakra','kundalini','yin yoga','restorative','flexibility','stretching',
  'morning batch','evening batch','online yoga','yoga at home','taamul','yuga']),

('a2cb138b-3ca7-431e-bd5c-62eef7b21429',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Sports Coaching', 'sports-coaching',
 'Cricket, football, badminton, tennis & sports academies',
 '🏏', true, 3,
 ARRAY['sports coaching','cricket coaching','cricket academy','batting','bowling','fielding',
  'football coaching','soccer','badminton coaching','tennis coaching','table tennis',
  'basketball','volleyball','hockey','athletics','running','marathon training','kabaddi',
  'martial arts','karate','taekwondo','judo','boxing','kickboxing','MMA','self defense',
  'sports academy','summer camp','sports camp','coaching center','tadreeb riyaadi']),

('a3a43790-7b29-432d-a9c4-ae814a0f95a0',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Swimming', 'swimming',
 'Swimming pools, classes, coaching for kids & adults',
 '🏊', true, 4,
 ARRAY['swimming','swimming pool','swim','swimming class','swimming coaching','learn swimming',
  'kids swimming','adult swimming','beginners','advanced swimming','competitive swimming',
  'water aerobics','aqua fitness','diving','lifeguard','water safety','indoor pool',
  'outdoor pool','heated pool','Olympic pool','private pool','ladies swimming',
  'morning batch swimming','evening batch swimming','sibaaha']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 5B — SUBCATEGORIES FOR REMAINING FLAT PARENTS                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────
-- Under: Fashion & Clothing (5e5cb6d9)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('26058fd3-deb4-4a4e-b6aa-8503e40f4075',
 '5e5cb6d9-bc0a-4750-995b-53444674fb11',
 'Men''s Wear & Ethnic', 'mens-wear',
 'Kurta, sherwani, suits, formal & casual menswear',
 '👔', true, 1,
 ARRAY['mens wear','menswear','gents wear','kurta','kurta pajama','sherwani','pathani suit',
  'achkan','Nehru jacket','waistcoat','blazer','suit','formal shirt','casual shirt','jeans',
  'trouser','pant','t-shirt','tshirt','polo','track pant','shorts','bermuda','lungi',
  'dhoti','safa','pagdi','sehra','wedding wear men','Indo western','mardana libaas']),

('38548211-c2ba-4437-b72e-89dc4b2e788e',
 '5e5cb6d9-bc0a-4750-995b-53444674fb11',
 'Women''s Wear & Ethnic', 'womens-wear',
 'Saree, salwar, rida, abaya, gown & women''s fashion',
 '👗', true, 2,
 ARRAY['womens wear','womenswear','ladies wear','saree','sari','salwar kameez','salwar suit',
  'anarkali','palazzo','sharara','gharara','lehnga','lehenga','gown','party gown','maxi',
  'kurti','tunic','rida','abaya','burkha','burqa','hijab','niqab','kaftan','modest wear',
  'ethnic wear','western wear','dress','top','jeans women','skirt','co-ord','zenana libaas']),

('a17e6548-e143-40bf-ab59-517179c5a32e',
 '5e5cb6d9-bc0a-4750-995b-53444674fb11',
 'Kids'' Wear', 'kids-wear',
 'Boys, girls & infant clothing, school uniforms & festive wear',
 '👦', true, 3,
 ARRAY['kids wear','kidswear','children','boys wear','girls wear','infant','baby clothes',
  'newborn','toddler','frock','dungaree','romper','onesie','pajama set','night suit',
  'school uniform','school dress','tie','belt','socks','inner wear','festive wear kids',
  'eid dress kids','party wear kids','winter wear','jacket','sweater','atfaal malaabis']),

('f79652bf-ebc9-4a3a-a206-eb4a583ab4d2',
 '5e5cb6d9-bc0a-4750-995b-53444674fb11',
 'Footwear', 'footwear',
 'Shoes, sandals, chappals, sports shoes & ethnic footwear',
 '👟', true, 4,
 ARRAY['footwear','shoes','shoe shop','juta','joota','sandal','sandals','chappal','slipper',
  'flip flop','sports shoes','running shoes','sneakers','formal shoes','loafer','moccasin',
  'boot','ankle boot','heel','wedge','platform','flat','ballerina','jutti','mojri','kolhapuri',
  'Bata','Liberty','Woodland','Nike','Adidas','Puma','Reebok','Sparx','Red Tape','ahdhiya']),

('c6625403-68a9-4a7f-8967-2430d19b98d3',
 '5e5cb6d9-bc0a-4750-995b-53444674fb11',
 'Fashion Accessories', 'fashion-accessories',
 'Belts, wallets, sunglasses, scarves, watches & fashion add-ons',
 '🕶️', true, 5,
 ARRAY['accessories','fashion accessories','belt','wallet','purse','clutch','sunglasses',
  'shades','watch','wrist watch','scarf','stole','shawl','dupatta','muffler','cap','hat',
  'hair band','hair clip','scrunchie','brooch','pin','cufflinks','tie pin','pocket square',
  'key chain','umbrella','handkerchief','spectacle frame','reading glasses','iksaswaaraat']);

-- ─────────────────────────────────────────────
-- Under: Grocery & Daily Needs (fe7f8471)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('0335877f-2d26-4e16-b4ea-9ccd5f892031',
 'fe7f8471-2f6c-4411-ac1f-399597c3ef4c',
 'Provision & Kirana Store', 'provision-kirana',
 'Staples, rice, dal, oil, masala, sugar & everyday essentials',
 '🏪', true, 1,
 ARRAY['provision','kirana','kirana store','general store','grocery store','ration','ration shop',
  'rice','chawal','dal','lentil','atta','flour','maida','sooji','oil','cooking oil','mustard oil',
  'groundnut oil','sunflower oil','ghee','desi ghee','sugar','cheeni','salt','namak','tea','chai',
  'coffee','spices','masala','garam masala','haldi','mirchi','dhaniya','jeera','hing',
  'baqaal','dukaan','rashan','provision store']),

('b2dedec5-a393-4710-bd83-acb6500050b2',
 'fe7f8471-2f6c-4411-ac1f-399597c3ef4c',
 'Fruits & Vegetables', 'fruits-vegetables',
 'Fresh fruits, vegetables, organic produce & sabzi mandi',
 '🥦', true, 2,
 ARRAY['fruits','vegetables','sabzi','sabzi mandi','sabzi wala','phal','fruit','fresh',
  'organic','seasonal','leafy','green vegetables','salad','onion','potato','tomato','apple',
  'banana','mango','orange','grapes','watermelon','papaya','guava','pomegranate',
  'coconut','lemon','ginger','garlic','mushroom','sprouts','khudaar','fawaakh']),

('64e654b3-81f8-42dd-a579-6c19be7e8e20',
 'fe7f8471-2f6c-4411-ac1f-399597c3ef4c',
 'Dairy & Milk Products', 'dairy-milk',
 'Milk, curd, paneer, ghee, cheese, butter & fresh dairy',
 '🥛', true, 3,
 ARRAY['dairy','milk','doodh','cow milk','buffalo milk','full cream','toned','double toned',
  'A2 milk','organic milk','curd','dahi','yogurt','lassi','buttermilk','chaas','paneer',
  'cottage cheese','cheese','mozzarella','cheddar','cream','malai','butter','makhan',
  'ghee','amul','Mother Dairy','Parag','Chitale','Gokul','fresh','home delivery milk',
  'albaan','jubna','samn']),

('ad16dbdf-0c97-43dc-97bb-2748fda0ba28',
 'fe7f8471-2f6c-4411-ac1f-399597c3ef4c',
 'Wholesale & Bulk Grocery', 'wholesale-grocery',
 'Bulk purchase, wholesale grocery, event supplies & commercial',
 '📦', true, 4,
 ARRAY['wholesale','bulk','wholesale grocery','bulk purchase','wholesale market','mandi',
  'wholesale price','commercial','hotel supply','restaurant supply','mess supply',
  'event grocery','wedding grocery','party supplies','ration bulk','rice bag','50 kg',
  '25 kg','dal bag','oil tin','15 litre','institutional','canteen supply','jumla']);

-- ─────────────────────────────────────────────
-- Under: Mobile & Telecom (cf459ed9)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('396fae94-6396-43e2-8d91-bdf6eb10860b',
 'cf459ed9-cab9-4717-a0fc-12a3bcfd565a',
 'Mobile Phone Sales', 'mobile-sales',
 'New smartphones, feature phones, EMI & exchange offers',
 '📱', true, 1,
 ARRAY['mobile sales','phone sales','new phone','smartphone','feature phone','keypad phone',
  'iPhone','Samsung','Vivo','Oppo','Realme','OnePlus','Xiaomi','Redmi','Poco','Nothing',
  'Motorola','Nokia','Google Pixel','5G','4G','EMI','no cost EMI','exchange','trade in',
  'showroom','mobile shop','authorized dealer','retail store','bay haatif']),

('49906a82-10ed-4086-882f-b685ba9bbe1f',
 'cf459ed9-cab9-4717-a0fc-12a3bcfd565a',
 'Mobile Repair', 'mobile-repair-telecom',
 'Screen repair, battery replacement, software fix & water damage',
 '🔧', true, 2,
 ARRAY['mobile repair','phone repair','screen repair','display','broken screen','touch',
  'battery replacement','charging problem','charging port','mic','speaker','camera repair',
  'software','hang','slow','virus','dead phone','water damage','motherboard','IC','chip level',
  'data recovery','back panel','IMEI','unlock','flash','islah haatif']),

('36435155-1956-484b-923e-8887c7eba77a',
 'cf459ed9-cab9-4717-a0fc-12a3bcfd565a',
 'Mobile Accessories', 'mobile-accessories',
 'Covers, chargers, earbuds, power banks & screen guards',
 '🎧', true, 3,
 ARRAY['mobile accessories','phone accessories','back cover','phone case','transparent cover',
  'tempered glass','screen guard','screen protector','charger','fast charger','wireless charger',
  'charging cable','USB C','lightning','earphone','earbuds','TWS','headphone','Bluetooth',
  'speaker','portable speaker','power bank','10000mAh','20000mAh','selfie stick','tripod',
  'ring holder','pop socket','car mount','OTG','memory card','SD card','mulhaqaat haatif']),

('ec8b2793-e7a8-4925-ac35-b698f2653735',
 'cf459ed9-cab9-4717-a0fc-12a3bcfd565a',
 'Recharge, Plans & DTH', 'recharge-plans',
 'Prepaid/postpaid plans, broadband, WiFi, dish TV & SIM services',
 '📡', true, 4,
 ARRAY['recharge','prepaid','postpaid','plan','unlimited','data','calling','SMS',
  'Jio','Airtel','Vi','Vodafone','Idea','BSNL','MTNL','port','MNP','new SIM','eSIM',
  'broadband','WiFi','fiber','Jio Fiber','Airtel Xstream','ACT','Hathway','BSNL broadband',
  'DTH','Tata Play','Airtel DTH','Dish TV','Sun Direct','d2h','set top box','channel pack',
  'shihn','internet','khadamaat ittisaal']);

-- ─────────────────────────────────────────────
-- Under: Interior Design & Decor (1e267065)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('e8d740e1-1be7-413e-ba12-ecdc41785a3d',
 '1e267065-9ae5-40cc-87af-317d7e730a6b',
 'Modular Kitchen', 'modular-kitchen',
 'Kitchen cabinets, countertops, chimney, hob & kitchen design',
 '🍳', true, 1,
 ARRAY['modular kitchen','kitchen design','kitchen cabinet','base unit','wall unit','tall unit',
  'countertop','granite top','quartz','Corian','acrylic','laminate','membrane','PU','lacquer',
  'chimney','kitchen chimney','hob','gas hob','built in','sink','basket','drawer','Hettich',
  'Hafele','Blum','Godrej','Sleek','Livspace','HomeLane','kitchen renovation','matbakh']),

('4e12a9a5-ea1b-41db-92c1-1fe980a20e91',
 '1e267065-9ae5-40cc-87af-317d7e730a6b',
 'False Ceiling & POP', 'false-ceiling',
 'Gypsum, POP, grid, wooden & stretch ceiling with lighting',
 '✨', true, 2,
 ARRAY['false ceiling','POP','plaster of paris','gypsum','gypsum board','grid ceiling',
  'T-grid','Armstrong','mineral fiber','metal ceiling','wooden ceiling','PVC ceiling',
  'stretch ceiling','designer ceiling','cove light','LED strip','profile light','spot light',
  'down light','recessed','suspended','drop ceiling','acoustic','sound proof ceiling',
  'bedroom ceiling','living room ceiling','office ceiling','saqf mustaaar']),

('af5c8311-8bef-4924-8891-4dbc0b853886',
 '1e267065-9ae5-40cc-87af-317d7e730a6b',
 'Curtains & Blinds', 'curtains-blinds',
 'Curtain shops, roller blinds, vertical blinds & window treatments',
 '🪟', true, 3,
 ARRAY['curtain','curtains','parda','blinds','window blinds','roller blind','vertical blind',
  'Roman blind','Venetian blind','zebra blind','wooden blind','bamboo','sheer','blackout',
  'curtain rod','curtain track','bracket','ring','hook','eyelet','pleated','grommet',
  'tassel','tie back','valance','pelmet','door curtain','mosquito curtain','net curtain',
  'window curtain','balcony curtain','office blind','sataar','barda']),

('94f8a5a6-9d3f-443b-87f0-89a7d1b451a2',
 '1e267065-9ae5-40cc-87af-317d7e730a6b',
 'Wallpaper & Texture Paint', 'wallpaper-texture',
 'Wallpapers, 3D panels, texture finishes & decorative walls',
 '🎨', true, 4,
 ARRAY['wallpaper','wall paper','3D wallpaper','PVC wallpaper','non woven','self adhesive',
  'peel and stick','wall panel','3D panel','WPC','PVC panel','charcoal panel','CNC',
  'texture paint','texture','metallic','stucco','marble finish','stone cladding',
  'brick cladding','exposed brick','accent wall','feature wall','mural','wall art',
  'abstract','floral','geometric','damask','striped','kids room wallpaper','waraq jadar']);

-- ─────────────────────────────────────────────
-- Under: Furniture & Woodwork (8c8cf84f)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('9e500a67-39cd-4cc8-b15b-a093a8ae837b',
 '8c8cf84f-d779-4ea6-b617-11b55475379c',
 'Home Furniture', 'home-furniture',
 'Beds, sofas, dining tables, wardrobes & living room furniture',
 '🛋️', true, 1,
 ARRAY['home furniture','bed','double bed','king size','queen size','single bed','bunk bed',
  'sofa','sofa set','L shape','recliner','divan','couch','dining table','4 seater','6 seater',
  'glass top','marble top','wardrobe','sliding wardrobe','2 door','3 door','TV unit',
  'TV stand','entertainment unit','center table','coffee table','side table','shoe rack',
  'bookshelf','display unit','crockery unit','dressing table','athath manzili']),

('f7e47bbe-7257-47fe-9d4c-44c43de148db',
 '8c8cf84f-d779-4ea6-b617-11b55475379c',
 'Office Furniture', 'office-furniture',
 'Desks, chairs, workstations, conference tables & storage',
 '🪑', true, 2,
 ARRAY['office furniture','office chair','ergonomic','mesh chair','executive chair',
  'revolving chair','visitor chair','desk','office desk','computer table','workstation',
  'cubicle','partition','modular office','conference table','meeting table','filing cabinet',
  'pedestal','storage','office sofa','reception desk','counter','Godrej','Featherlite',
  'Nilkamal','HOF','Durian','steel almirah','locker','athath maktabi']),

('a96bb9f8-b806-4d8d-bde2-2f8952be3a55',
 '8c8cf84f-d779-4ea6-b617-11b55475379c',
 'Upholstery & Furniture Repair', 'upholstery-repair',
 'Sofa repair, re-stuffing, polish, fabric change & restoration',
 '🔨', true, 3,
 ARRAY['upholstery','sofa repair','sofa refurbishing','re-stuffing','foam change','cushion',
  'fabric change','leather upholstery','rexine','leatherette','sofa cleaning','sofa cover',
  'chair repair','dining chair cushion','car seat cover','mattress repair','spring repair',
  'polish','french polish','PU polish','melamine polish','lacquer','wood polish','duco',
  'scratch repair','dent repair furniture','antique restoration','tanjeed athath']),

('c6fb1120-4b19-4b52-9dac-11b870cf7a28',
 '8c8cf84f-d779-4ea6-b617-11b55475379c',
 'Custom Woodwork', 'custom-woodwork',
 'Custom cabinets, temple, showcases, partitions & built-in furniture',
 '🪚', true, 4,
 ARRAY['custom furniture','bespoke','made to order','custom cabinet','kitchen cabinet',
  'temple','mandir','pooja unit','showcase','display unit','partition','room divider',
  'TV wall unit','study unit','walk in closet','loft','overhead storage','built in',
  'pantry','bar unit','bar counter','window seat','bay window','book nook',
  'teak','sheesham','rosewood','walnut','sagwan','sal','pine','rubber wood',
  'carpenter custom','design','3D design furniture','najjaara mukhassasa']);

-- ─────────────────────────────────────────────
-- Under: Pet Care & Veterinary (c9b0dbf2)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('673b772f-6c5e-4e82-9868-ef05b338df92',
 'c9b0dbf2-8695-45c7-bf71-45968f4a559f',
 'Vet & Animal Hospital', 'vet-hospital',
 'Veterinary clinics, vaccinations, surgery & emergency care',
 '🏥', true, 1,
 ARRAY['vet','veterinary','veterinarian','animal doctor','animal hospital','pet clinic',
  'vaccination','deworming','rabies','parvo','distemper','tick fever','surgery','spay',
  'neuter','castration','cesarean','fracture','X-ray','ultrasound pet','blood test pet',
  'emergency','24 hour vet','night vet','consultation','health checkup pet',
  'tabib baytari','mustashfa hayawaan']),

('887e5bd6-311d-4635-a04f-833ee7216385',
 'c9b0dbf2-8695-45c7-bf71-45968f4a559f',
 'Pet Grooming', 'pet-grooming',
 'Dog & cat grooming, bathing, trimming & styling',
 '🛁', true, 2,
 ARRAY['pet grooming','dog grooming','cat grooming','pet bath','dog bath','shampoo',
  'hair cut pet','trimming','styling','nail cutting','nail clipping','ear cleaning',
  'teeth brushing','de-shedding','flea treatment','tick removal','medicated bath',
  'breed cut','show grooming','puppy grooming','mobile grooming','home grooming',
  'grooming parlour','spa pet','tanzheef hayawaan']),

('5e1f98a5-9e3f-40f3-9045-d700d50eb99c',
 'c9b0dbf2-8695-45c7-bf71-45968f4a559f',
 'Pet Shop & Supplies', 'pet-shop',
 'Pet food, accessories, aquariums, cages & pet supplies',
 '🐕', true, 3,
 ARRAY['pet shop','pet store','pet food','dog food','cat food','Pedigree','Royal Canin',
  'Whiskas','Drools','Farmina','Orijen','puppy food','kitten food','treats','biscuit',
  'collar','leash','harness','bed','pet bed','kennel','cage','bird cage','parrot cage',
  'aquarium','fish tank','fish food','filter','pump','heater','gravel','plants aquarium',
  'cat litter','litter box','scratch post','toy','chew toy','ball','rope','mahall hayawaan']),

('7c1a5e7d-aafa-4bb3-86b5-838102068459',
 'c9b0dbf2-8695-45c7-bf71-45968f4a559f',
 'Pet Boarding & Training', 'pet-boarding',
 'Kennels, pet sitting, dog training & behaviour correction',
 '🐾', true, 4,
 ARRAY['pet boarding','kennel','cattery','pet hostel','pet sitting','pet day care',
  'dog walking','pet minding','holiday boarding','overnight','long term','AC boarding',
  'dog training','puppy training','obedience','basic commands','advanced','agility',
  'behaviour correction','barking','biting','leash training','socialization','therapy dog',
  'guard dog training','protection','trainer','certified trainer','tadreeb hayawaan']);

-- ─────────────────────────────────────────────
-- Under: Printing & Signage (ec2aad50)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('0ceece1b-98af-46f4-a528-d1d25512991f',
 'ec2aad50-657f-4b57-b798-3e8461d7c733',
 'Wedding & Invitation Cards', 'wedding-cards',
 'Nikah cards, wedding invitations, e-invites & custom cards',
 '💌', true, 1,
 ARRAY['wedding card','shaadi card','nikah card','walima card','invitation','invitation card',
  'e-invite','digital invitation','video invitation','WhatsApp invite','bismillah card',
  'aqeeqah card','milad card','engagement card','reception card','RSVP','custom card',
  'designer card','foil','gold foil','embossed','laser cut','box invite','scroll',
  'envelope','insert','map card','bataaqa dawah','bataaqa zafaaf']),

('627249d3-7b2f-4047-9ca9-bef6025ccdd0',
 'ec2aad50-657f-4b57-b798-3e8461d7c733',
 'Visiting & Business Cards', 'visiting-cards',
 'Business cards, letterheads, ID cards & corporate stationery',
 '🪪', true, 2,
 ARRAY['visiting card','business card','name card','corporate card','premium','matte','glossy',
  'textured','embossed','spot UV','foil stamping','letterhead','envelope','bill book',
  'invoice','receipt book','ID card','identity card','PVC card','smart card','employee card',
  'membership card','loyalty card','student ID','print design','bitaaqa amal']),

('ce41ff81-fc1c-458a-a0a0-3f2dd1929b8f',
 'ec2aad50-657f-4b57-b798-3e8461d7c733',
 'Banners, Flex & Signage', 'banners-signage',
 'Flex, hoardings, glow signs, LED boards, ACP & name plates',
 '🪧', true, 3,
 ARRAY['banner','flex','flex printing','hoarding','billboard','unipole','sign board','signage',
  'name board','glow sign','LED sign','neon sign','3D letter','acrylic letter','SS letter',
  'brass letter','ACP board','ACP cladding','channel letter','backlit','front lit',
  'name plate','door name','office name plate','shop board','vehicle branding','van wrap',
  'car branding','window graphics','frosted','laafitaat','lawha']),

('0999c47e-3686-403f-83d8-342ec4001aed',
 'ec2aad50-657f-4b57-b798-3e8461d7c733',
 'T-shirt & Merchandise Printing', 'merchandise-printing',
 'T-shirts, mugs, caps, sublimation & custom merchandise',
 '👕', true, 4,
 ARRAY['T-shirt printing','tshirt','custom T-shirt','sublimation','heat press','DTF','DTG',
  'screen printing','silk screen','mug printing','mug','coffee mug','magic mug','photo mug',
  'cap printing','cap','hat','hoodie','sweatshirt','apron','tote bag','cushion print',
  'photo frame','canvas print','acrylic print','metal print','keychain','fridge magnet',
  'badge','pin','corporate gifting','bulk order','event merchandise','tibaaa takhseesiyya']);

-- ─────────────────────────────────────────────
-- Under: Agriculture & Gardening (b54ab559)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('7b352094-e659-4570-b8f7-b00016903a09',
 'b54ab559-c9aa-419e-b0e3-e833d29854ee',
 'Plant Nursery', 'plant-nursery',
 'Indoor, outdoor, flowering, fruit & ornamental plants',
 '🌺', true, 1,
 ARRAY['nursery','plant nursery','plants','indoor plants','outdoor plants','house plant',
  'money plant','snake plant','pothos','peace lily','spider plant','rubber plant','ficus',
  'succulent','cactus','bonsai','flower','flowering plant','rose','jasmine','mogra','hibiscus',
  'marigold','fruit plant','mango','guava','lemon','curry leaf','tulsi','medicinal plant',
  'sapling','seedling','pot','planter','ceramic pot','hanging','creeper','mashtal']),

('39a4f48b-9d1c-4c59-baec-aa4ea2f5ea67',
 'b54ab559-c9aa-419e-b0e3-e833d29854ee',
 'Landscaping & Lawn Care', 'landscaping-lawn',
 'Garden design, lawn maintenance, hedge trimming & irrigation',
 '🌳', true, 2,
 ARRAY['landscaping','landscape','garden design','lawn','lawn care','lawn mowing','grass',
  'grass cutting','hedge trimming','pruning','tree cutting','tree trimming','stump removal',
  'irrigation','drip irrigation','sprinkler','automatic','timer','garden path','paver',
  'fountain','waterfall','pond','rockery','pergola','gazebo','deck','outdoor lighting',
  'garden maintenance','monthly maintenance','contract','tanseek hadaaiq']),

('9140a8b5-9f69-4a71-9789-2a7ac1314592',
 'b54ab559-c9aa-419e-b0e3-e833d29854ee',
 'Farm Supplies & Equipment', 'farm-supplies',
 'Seeds, fertilizers, pesticides, tools & agricultural equipment',
 '🚜', true, 3,
 ARRAY['farm supplies','agriculture supplies','seeds','beej','hybrid','organic seeds',
  'fertilizer','urea','DAP','NPK','potash','bio fertilizer','vermicompost','compost',
  'cow dung','pesticide','insecticide','fungicide','weedicide','herbicide','spray pump',
  'knapsack','garden tools','spade','shovel','rake','hoe','khurpi','secateur','pruner',
  'tractor','rotavator','power tiller','chaff cutter','thresher','motor pump',
  'submersible','drip kit','mulch film','shade net','lawazim ziraaiyya']),

('0e41f99d-b2c7-43b8-88f9-6085a4d342ad',
 'b54ab559-c9aa-419e-b0e3-e833d29854ee',
 'Organic & Terrace Gardening', 'organic-gardening',
 'Organic farming, terrace gardens, kitchen gardens & composting',
 '🥬', true, 4,
 ARRAY['organic','organic farming','natural farming','zero budget','chemical free',
  'terrace garden','rooftop garden','balcony garden','kitchen garden','home garden',
  'grow bag','container gardening','raised bed','vertical garden','hydroponics','aquaponics',
  'compost','composting','vermicompost','worm bin','bokashi','bio enzyme','organic manure',
  'neem cake','bone meal','seaweed','micro greens','herbs','basil','mint','coriander',
  'organic vegetable','organic fruit','farm to table','ziraa udwiyya']);

-- ─────────────────────────────────────────────
-- Under: Laundry & Dry Cleaning (2a17c19a)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('bb63a532-fce7-44ea-87c6-8de596734a36',
 '2a17c19a-cbb0-4297-bb4a-9b8c24c0bb3f',
 'Laundry & Ironing', 'laundry-ironing',
 'Clothes washing, pressing, fold & deliver services',
 '👕', true, 1,
 ARRAY['laundry','washing','clothes wash','ironing','press','iron','istri','istri wala',
  'steam press','steam iron','fold','fold and deliver','pickup delivery','door to door',
  'same day','express','next day','per piece','per kg','subscription','monthly','weekly',
  'machine wash','hand wash','delicate','cotton','synthetic','formal','kapde dhona','ghaseel']),

('6b70f41a-7f50-4857-b775-8d3574144209',
 '2a17c19a-cbb0-4297-bb4a-9b8c24c0bb3f',
 'Dry Cleaning & Premium Care', 'dry-cleaning-premium',
 'Suits, sherwanis, wedding outfits, leather & silk care',
 '🧥', true, 2,
 ARRAY['dry cleaning','dry clean','premium','suit','blazer','sherwani','tuxedo','coat',
  'wedding dress','lehnga','saree','silk','chiffon','georgette','velvet','leather',
  'suede','fur','jacket','winter wear','designer','embroidered','zari','heavy work',
  'fragile fabric','stain removal','oil stain','ink stain','wine stain','color bleeding',
  'preservation','wedding dress storage','vacuum pack','tanzeef jaaf']),

('426fba27-2774-4648-b136-09d8cd62073a',
 '2a17c19a-cbb0-4297-bb4a-9b8c24c0bb3f',
 'Carpet, Sofa & Upholstery Cleaning', 'laundry-carpet-sofa-cleaning',
 'Deep cleaning for carpets, sofas, curtains & mattresses',
 '🧽', true, 3,
 ARRAY['carpet cleaning','carpet wash','rug cleaning','sofa cleaning','sofa shampoo',
  'upholstery cleaning','steam cleaning','deep clean','hot water extraction','shampooing',
  'stain removal','odor removal','pet stain','mattress cleaning','curtain cleaning',
  'curtain wash','blind cleaning','car interior','car seat cleaning','leather cleaning',
  'fabric protection','scotchgard','sanitization','anti bacterial','dust mite',
  'at home service','doorstep','tanzeef sajjaad']);

-- ─────────────────────────────────────────────
-- Under: Packers & Movers (e0c26276)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('9c68771e-f600-4cf0-b6d7-1faef1111fef',
 'e0c26276-93d7-4352-ab19-6edf4c49b857',
 'Local House Shifting', 'local-shifting',
 'Within-city home, flat & room shifting services',
 '🏠', true, 1,
 ARRAY['local shifting','local moving','within city','same city','house shifting','flat shifting',
  'room shifting','PG shifting','apartment moving','society','floor','ground floor','high rise',
  'lift','staircase','disassembly','reassembly','packing','unpacking','loading','unloading',
  'tempo','pickup','mini truck','safe handling','fragile','naql mahalli']),

('5b139dea-fc9f-4b7a-a56d-77b388d4a790',
 'e0c26276-93d7-4352-ab19-6edf4c49b857',
 'Intercity & Long Distance', 'intercity-moving',
 'State-to-state, national relocation & outstation shifting',
 '🚛', true, 2,
 ARRAY['intercity','long distance','outstation','interstate','state to state','national',
  'relocation','city to city','Mumbai to Pune','Delhi to Mumbai','Bangalore','Chennai',
  'Hyderabad','Kolkata','container','full truck','part load','shared truck','door to door',
  'transit insurance','claim','tracking','estimated days','3 days','5 days','naql bayn mudun']),

('05b617a1-7fce-46ba-8ed7-d4c6e9f07fe2',
 'e0c26276-93d7-4352-ab19-6edf4c49b857',
 'Office & Commercial Relocation', 'office-relocation',
 'Corporate, IT equipment, industrial & lab shifting',
 '🏢', true, 3,
 ARRAY['office shifting','office relocation','corporate','commercial','IT equipment',
  'server','computer shifting','printer','heavy machinery','industrial','factory','lab',
  'hospital equipment','bank shifting','showroom','retail','modular furniture','workstation',
  'cubicle','conference table','AC','safe','locker','document','file','confidential',
  'weekend shifting','after hours','minimal downtime','naql maktab']),

('9b2faee0-b6c8-467c-bbe5-ea877d6acfe0',
 'e0c26276-93d7-4352-ab19-6edf4c49b857',
 'Vehicle Transport & Storage', 'vehicle-transport-storage',
 'Car, bike transport & warehouse storage services',
 '🚗', true, 4,
 ARRAY['vehicle transport','car transport','car carrier','bike transport','two wheeler',
  'open carrier','enclosed carrier','trailer','door to door','terminal to terminal',
  'car shipping','bike courier','insurance','damage free','secure','tracking',
  'storage','warehouse','godown','self storage','unit','monthly','yearly','climate control',
  'household storage','furniture storage','document storage','safe deposit','takhzeen']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 5C — ADDITIONAL SUBCATEGORIES FOR HEALTH & AUTOMOTIVE          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────
-- Under: Health & Medical — additional specialties (a4113cd2)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('14f72151-1ce4-4e6e-89f5-2809d9c36f4e',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Eye Care & Optician', 'eye-care-optician',
 'Ophthalmologists, optical shops, spectacles, lenses & LASIK',
 '👁️', true, 7,
 ARRAY['eye','eye care','eye doctor','ophthalmologist','optometrist','optician','optical',
  'optical shop','spectacles','glasses','chasma','frame','lens','contact lens','power',
  'progressive','bifocal','anti glare','blue cut','photochromic','transition','sunglasses',
  'prescription sunglasses','eye test','eye checkup','vision','myopia','hyperopia',
  'cataract','LASIK','laser eye','glaucoma','retina','squint','Lenskart','Titan Eye',
  'Ray-Ban','tibb uyoon','nazzaaraat']),

('3237b839-7433-4a76-9caf-0bcaba608863',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Hospital & Nursing Home', 'hospital-nursing-home',
 'Multi-specialty hospitals, nursing homes, ICU & emergency',
 '🏥', true, 8,
 ARRAY['hospital','nursing home','multi specialty','super specialty','ICU','NICU','PICU',
  'operation theatre','OT','surgery','general surgery','orthopedic','cardiac','neuro',
  'oncology','nephrology','urology','gastro','ENT','emergency','24 hour','ambulance',
  'admission','bed','private room','ward','semi private','cashless','insurance','TPA',
  'Apollo','Fortis','Max','Nanavati','Lilavati','Kokilaben','mustashfa']),

('d41fec1b-9213-474b-99a7-7098e1506d38',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Gynecologist & Women''s Health', 'gynecologist',
 'OB-GYN, maternity, fertility, IVF, PCOD & women''s wellness',
 '🤰', true, 9,
 ARRAY['gynecologist','gynaecologist','OB-GYN','obstetrician','women','ladies doctor',
  'pregnancy','maternity','delivery','normal delivery','cesarean','C-section','prenatal',
  'postnatal','antenatal','fertility','IVF','IUI','infertility','PCOD','PCOS','fibroids',
  'endometriosis','menstrual','periods','irregular','hormonal','menopause','pap smear',
  'mammography','breast','ultrasound','sonography','family planning','contraception',
  'tabib nisaa','amraad nisaaiyya']),

('52bd2f38-64e9-48a3-8854-f6729554ed1d',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Pediatrician & Child Specialist', 'pediatrician',
 'Child healthcare, vaccination, growth monitoring & neonatal care',
 '👶', true, 10,
 ARRAY['pediatrician','paediatrician','child specialist','child doctor','baby doctor','kids',
  'newborn','neonatal','NICU','infant','toddler','vaccination','immunization','DPT','MMR',
  'polio','BCG','Hepatitis','growth','weight','height','development','milestone','fever',
  'cold','cough','diarrhea','asthma kids','allergy kids','rash','skin','ear infection',
  'tonsil','adenoid','worm','nutrition child','breastfeeding','formula','tabib atfaal']),

('a38ea515-719e-4949-9fe7-34008ed7d4da',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Dermatologist & Skin Clinic', 'dermatologist',
 'Skin, hair & nail treatments, laser, cosmetic & aesthetic',
 '✨', true, 11,
 ARRAY['dermatologist','skin doctor','skin specialist','skin clinic','dermatology','acne',
  'pimple','scar','dark spots','pigmentation','melasma','tan','fairness','brightening',
  'hair fall','hair loss','alopecia','baldness','dandruff','hair transplant','PRP','FUE',
  'FUT','laser','laser hair removal','tattoo removal','wart removal','mole','skin tag',
  'botox','filler','chemical peel','microdermabrasion','HydraFacial','anti aging',
  'cosmetic','aesthetic','nail fungus','eczema','psoriasis','vitiligo','tabib jild']),

('1e16a47f-520f-4f95-af1b-70b4fcff7e5e',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Mental Health & Counseling', 'mental-health',
 'Psychologists, psychiatrists, therapy, de-addiction & counseling',
 '🧠', true, 12,
 ARRAY['mental health','psychology','psychologist','psychiatrist','therapist','counselor',
  'counseling','therapy','CBT','cognitive','behavioral','psychotherapy','stress','anxiety',
  'depression','panic','OCD','PTSD','ADHD','bipolar','schizophrenia','insomnia','sleep',
  'anger management','relationship','marriage counseling','family therapy','child psychology',
  'adolescent','career counseling','de-addiction','rehab','rehabilitation','alcohol','drug',
  'smoking','gambling','support group','helpline','sihha nafsiyya','ilaaj nafsi']);

-- ─────────────────────────────────────────────
-- Under: Automotive & Vehicles — additional (6bacddf3)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('ed925f09-c1c4-4d57-bef5-bb6d72a8c0a9',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Driving School', 'auto-driving-school',
 'Car, bike & commercial vehicle driving lessons & license assistance',
 '🚦', true, 5,
 ARRAY['driving school','driving class','driving lessons','learn driving','car driving',
  'bike driving','scooty driving','commercial driving','truck driving','bus driving',
  'learner license','permanent license','RTO','DL','driving test','theory test','road test',
  'automatic','manual','gear','clutch','parallel parking','hill start','highway driving',
  'defensive driving','refresher course','lady instructor','female instructor',
  'gadi chalana seekhna','madrasat qiyaada']),

('3dd60462-3747-4489-ab6a-0db5249883dd',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Auto Accessories & Modification', 'auto-accessories',
 'Car accessories, music systems, seat covers, alloys & modifications',
 '🎶', true, 6,
 ARRAY['car accessories','auto accessories','seat cover','steering cover','floor mat',
  'dashboard','sun shade','car perfume','air freshener','mobile holder','phone mount',
  'music system','car stereo','speaker','subwoofer','amplifier','bass tube','android player',
  'GPS','reverse camera','parking sensor','dashcam','alloy wheel','alloy','spoiler',
  'body kit','chrome','LED','fog lamp','HID','bullbar','roof rack','bike accessories',
  'handlebar','guard','tank pad','iksaswaaraat sayyaara']),

('576d9dd9-7414-4610-89bd-3d34d5638881',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Denting, Painting & Body Shop', 'denting-painting',
 'Dent removal, scratch repair, full painting & insurance claims',
 '🎨', true, 7,
 ARRAY['denting','denting painting','body shop','dent','dent removal','PDR','paintless',
  'scratch','scratch removal','touch up','bumper repair','bumper replacement','panel',
  'fender','door dent','hail damage','full body paint','repaint','color change','wrap',
  'vinyl wrap','PPF','paint protection film','clear coat','lacquer','primer','putty',
  'sanding','polishing','buffing','clear bra','insurance claim','cashless','accidental',
  'collision repair','frame straightening','denting wala','islah haykal']),

('8174306c-05cc-4391-b7e6-4c8e0b6d408d',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Used Car & Bike Dealer', 'used-vehicles',
 'Pre-owned cars & bikes, exchange, valuation & finance',
 '🚙', true, 8,
 ARRAY['used car','second hand car','pre owned','pre-owned','certified used','exchange',
  'trade in','old car','buy used car','sell used car','used bike','second hand bike',
  'old bike','car valuation','bike valuation','inspection','test drive','history','accident',
  'flood','kilometer','mileage','single owner','first owner','company maintained',
  'loan','finance','EMI','RC transfer','insurance transfer','NOC','dealer','multi brand',
  'Cars24','Spinny','OLX auto','sayyaara mustaaamala']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 6 — KEYWORD ENRICHMENT (misspellings, brands, Bohra terms)    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Add common misspellings and brand names to high-traffic categories

-- Home Services: add brand names + misspellings
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'plumer','plumbar','electrition','electrican','carpeter','painter wala','pest controll',
  'Godrej','Asian Paints','Berger','Nerolac','Pidilite','Fevicol','CPVC','Astral','Finolex',
  'Havells','Anchor','Legrand','Crompton','Orient','Usha','Bajaj','V-Guard','Stabilizer',
  'ghar ka kaam','maintenance contract','AMC home'
]) WHERE id = 'eb2263dd-87c5-421e-ac24-a3c5c754108f';

-- Beauty & Salon: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'saloon','parlor','beuty','beuty parlour','hair saloon','makup','bridal makup',
  'VLCC','Lakme','Lakmé','Naturals','Jawed Habib','Green Trends','Toni & Guy',
  'LOréal','Schwarzkopf','Matrix','Wella','OPI','Essie','Maybelline','MAC','Huda Beauty',
  'dermalogica','facial kit','home service beauty','doorstep salon'
]) WHERE id = '7d154385-52fb-443b-9954-6eb400257ad1';

-- Electronics Repair: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'repar','repare','mobile repar','phone repar','laptop repar','TV repar',
  'Apple','iPhone','Samsung','LG','Sony','Panasonic','Whirlpool','Bosch','IFB','Haier',
  'Voltas','Daikin','Blue Star','Carrier','Hitachi','Godrej','Videocon','Micromax',
  'service center near me','authorised service','authorized service'
]) WHERE id = '5fb8d16c-2720-497d-b2eb-d6899be578c7';

-- Catering & Tiffin: add Bohra-specific terms + misspellings
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'catring','catreing','tifin','tifin service','daba','daba service',
  'thaal','bohri thaal','niyaz','fateha','gyarvi','urus','miqaat','jamaat khana',
  'safra','dastarkhwan bohri','khichda','haleem','nalli nihari','paya','biryani order',
  'mutton biryani','chicken biryani','veg biryani','party order food','bulk biryani'
]) WHERE id = 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f';

-- Tailoring: add misspellings + Bohra-specific
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'tailor','tailar','darji','stiching','stithing','sewing machine',
  'rida design','rida collection','new rida','rida fabric','lace rida','net rida',
  'abaya collection','designer abaya','party wear','casual wear','daily wear rida',
  'thaali ni rida','saya','jhabla','jabla','topi stitching','dastar','pagdi',
  'burkha design','modern burkha','stylish abaya'
]) WHERE id = '81f76d1c-2dbc-4134-830f-f46e8026695f';

-- Fashion & Clothing: add more Bohra/Muslim terms
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'cloths','cloathing','fasion','dres','dreses',
  'rida shop','abaya shop','burkha shop','hijab shop','modest clothing store',
  'kurta shop','sherwani shop','pathani','safa','sehra','dupatta shop','stole',
  'palazzo','gharara','sharara','anarkali','gown','party gown','cocktail dress',
  'indo western','fusion wear','plus size','maternity wear','nursing wear',
  'Zara','H&M','Pantaloons','Westside','Max','Reliance Trends','ethnic store'
]) WHERE id = '5e5cb6d9-bc0a-4750-995b-53444674fb11';

-- Automotive: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'machanic','macanic','car macanic','bike macanic','garrage','puncter','puncher',
  'Maruti','Suzuki','Hyundai','Tata','Honda','Toyota','Mahindra','Kia','MG','Skoda',
  'Volkswagen','BMW','Mercedes','Audi','Hero','Bajaj','TVS','Royal Enfield','KTM',
  'Yamaha','Honda Activa','Splendor','Pulsar','service station','petrol pump nearby'
]) WHERE id = '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5';

-- Grocery: add brand names + Bohra terms
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'grocary','grocerey','kirana dukan','ration shop','provision dukan',
  'Amul','Mother Dairy','Haldiram','MTR','Everest','MDH','Tata Salt','Fortune','Saffola',
  'Patanjali','Dabur','Britannia','Parle','ITC','Nestle','Maggi','Surf','Tide','Vim',
  'niyaz ka saman','jamaat saman','miqaat shopping','festival grocery','ramadan grocery',
  'eid shopping','seviyan','sheer khurma ingredients','dates bulk'
]) WHERE id = 'fe7f8471-2f6c-4411-ac1f-399597c3ef4c';

-- IT & Computer: add misspellings
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'compter','computar','laaptop','leptop','CCTV camara','camra','grafic design',
  'website banwana','app banwana','online marketing','FB ads','Instagram marketing',
  'YouTube channel','WhatsApp business','digital presence','Google My Business',
  'HP printer','Canon printer','Epson','Brother','ink refill','cartridge refill',
  'toner','data cable','HDMI','USB','pendrive','hard disk external'
]) WHERE id = '6b13e516-5a6f-47ca-8898-0688f37f3d41';

-- Printing & Signage: add misspellings
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'priting','printng','baner','flex baner','visting card','weddin card','shaadi card order',
  'nikah card','walima card','bismillah card','aqeeqah card','invitation design',
  'e-invite','digital invitation','WhatsApp invitation','video invitation',
  'menu card','danglers','standee','rollup','pop up','X stand','kiosk','exhibition stall',
  'Canva printing','custom printing','sublimation','heat press','DTF','DTG'
]) WHERE id = 'ec2aad50-657f-4b57-b798-3e8461d7c733';

-- Restaurant: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'resturant','restarant','restraunt','restraurant','cafee','coffe shop','hotl',
  'Zomato','Swiggy','DineOut','EazyDiner','Dominos','McDonalds','KFC','Pizza Hut',
  'Subway','Burger King','Starbucks','CCD','Chai Point','biryani near me',
  'best restaurant','family restaurant near me','pure veg near me','halal restaurant'
]) WHERE id = 'fdf12ebb-89eb-4147-a193-05f1f0461183';

-- Halal Meat: add misspellings + community terms
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'meat near me','halaal','halal near me','chicken near me','mutton near me',
  'fresh chicken','desi chicken','country chicken','broiler near me','fish near me',
  'machli wala','murghi wala','bakra eid','qurbani','sacrifice','zabiha halal',
  'hand cut','machine cut','organic meat','farm fresh','antibiotic free'
]) WHERE id = 'a4d392a8-640f-4d36-ac55-60519098ec7c';

-- Hardware: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'hardwear','hardwer','tools near me','cement dealer','redi mix','ready mix concrete',
  'Ambuja','Ultratech','ACC','Birla','Shree','JSW','TATA Tiscon','Kamdhenu','Vizag',
  'Fevicol','Araldite','M-Seal','Dr Fixit','Sika','Roff','Finolex','Supreme','Prince',
  'Bosch','Stanley','Makita','Dewalt','Black Decker','hardware dukan','adawaat'
]) WHERE id = 'a7e1a7f1-691d-4217-bb09-398ba533bb90';

-- Hotel & Lodge: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'hotl','hotle','loge','gest house','room booking near me','ac room near me',
  'MakeMyTrip','Goibibo','Booking.com','Agoda','Trivago','Yatra','OYO rooms',
  'couple friendly hotel','hourly hotel','day use','near railway station',
  'near airport','near bus stand','near hospital','budget stay','sasta hotel'
]) WHERE id = '89bdc5a5-1d79-49c1-a887-89552c019ceb';

-- Taxi & Cab: add misspellings + brands
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'taksi','teksi','oto','rikshaw','riksha','cab near me','auto near me',
  'InDriver','BluSmart','Meru','Mega Cabs','TabCab','Jugnoo','quick ride',
  'share auto','share cab','pool','car pool','ride share','last mile',
  'school taxi','office cab','corporate cab','monthly package','sawari'
]) WHERE id = 'd591dff1-66ae-4676-8383-b0cfcda47ef9';

-- Manpower & Domestic Help: add misspellings
UPDATE categories SET keywords = array_cat(keywords, ARRAY[
  'made','maid near me','cook near me','driver near me','kaamwali near me',
  'house help','servant','naukar','naukrani','part time','full time','live in',
  'UrbanClap','Urban Company','Sulekha','BookMyBai','Helper4U','maid agency',
  'verified maid','background check','police verification','aadhar verified'
]) WHERE id = 'e28f633d-9750-4389-8340-01eff0b47d86';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 7 — NEW TOP-LEVEL CATEGORIES (64–78) — TIER 1 HIGH IMPACT     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 64. Pharmacy & Medical Store
('61c394d6-d5c9-4c37-9d0c-688a11deb191',
 'Pharmacy & Medical Store', 'pharmacy',
 'Chemist shops, drug stores, surgical supplies & medical equipment',
 '💊', true, 64,
 ARRAY['pharmacy','chemist','medical store','drug store','dawai','dawa','medicine','medicine shop',
  'medical','surgical','surgical shop','OTC','prescription','tablet','capsule','syrup','injection',
  'insulin','BP machine','glucometer','thermometer','oximeter','nebulizer','wheelchair',
  'walking stick','adult diaper','bandage','first aid','generic medicine','Jan Aushadhi',
  'Apollo Pharmacy','MedPlus','Netmeds','PharmEasy','1mg','wellness store','health store',
  'baby food','protein','supplement','vitamin','saydala','adwiya']),

-- 65. Optical & Eyewear
('f3034e18-7738-4a72-a094-d037f0f2e7d0',
 'Optical & Eyewear', 'optical-eyewear',
 'Spectacles, contact lens, sunglasses, eye testing & frames',
 '👓', true, 65,
 ARRAY['optical','optician','eyewear','spectacles','glasses','specs','chashma','frame',
  'lens','contact lens','power lens','progressive','bifocal','anti-glare','blue cut',
  'photochromic','transition','sunglasses','goggles','reading glasses','computer glasses',
  'eye test','eye testing','sight test','vision','myopia','power check','Lenskart','Titan Eye',
  'Ray-Ban','Fastrack','Oakley','Vincent Chase','John Jacobs','chashmah','nazzaaraat']),

-- 66. Pest Control
('031692d8-f3b1-479e-ad3e-d00c0d96a7be',
 'Pest Control', 'pest-control',
 'Termite, cockroach, rodent, bed bug treatment & fumigation',
 '🪳', true, 66,
 ARRAY['pest control','pest','termite','termite treatment','deemak','cockroach','cockroach gel',
  'rodent','rat','rat poison','rat trap','bed bug','bedbug','khatmal','mosquito','mosquito net',
  'fumigation','sanitization','disinfection','ant','lizard','spider','wood borer',
  'pre-construction','post-construction','herbal pest control','gel treatment',
  'Rentokil','Terminix','Pest India','HiCare','annual contract','AMC pest',
  'commercial pest','residential pest','mukaafaha aafaat']),

-- 67. Painting & Waterproofing
('9528fb0e-9e65-4a38-a7a4-f88fb79fe096',
 'Painting & Waterproofing', 'painting-waterproofing',
 'House painting, texture, waterproofing, polishing & wall finishes',
 '🖌️', true, 67,
 ARRAY['painting','painter','house painting','wall painting','interior painting','exterior painting',
  'texture painting','texture','stucco','POP design','putty','primer','emulsion','distemper',
  'oil paint','enamel','wood polish','PU polish','melamine','french polish','lacquer',
  'waterproofing','water proofing','leakage','seepage','terrace waterproofing','bathroom waterproofing',
  'Dr Fixit','Sika','Fosroc','Pidilite','Asian Paints','Berger','Nerolac','Dulux',
  'colour consultation','rangai','rang','rang wala','tila','aazl maai']),

-- 68. Cleaning Services
('03c6edd6-62ad-4bf9-a489-88652ec1df7b',
 'Cleaning Services', 'cleaning-services',
 'Home, office, carpet, sofa & water tank cleaning services',
 '🧹', true, 68,
 ARRAY['cleaning','cleaning services','house cleaning','home cleaning','deep cleaning',
  'office cleaning','commercial cleaning','carpet cleaning','sofa cleaning','upholstery cleaning',
  'bathroom cleaning','kitchen cleaning','floor cleaning','marble polishing','tile cleaning',
  'window cleaning','glass cleaning','facade cleaning','water tank cleaning','overhead tank',
  'sump cleaning','move in cleaning','move out cleaning','post construction cleaning',
  'disinfection','sanitization','steam cleaning','dry cleaning','pressure washing',
  'Urban Company','Housejoy','safaai','tanzeef']),

-- 69. Car Wash & Detailing
('fbda3c18-0037-4d06-a872-5514aef57e1e',
 'Car Wash & Detailing', 'car-wash-detailing',
 'Car/bike wash, polishing, ceramic coating, PPF & interior cleaning',
 '🚿', true, 69,
 ARRAY['car wash','car washing','bike wash','vehicle wash','auto wash','steam wash',
  'foam wash','pressure wash','waterless wash','dry wash','interior cleaning','dashboard',
  'seat cleaning','AC vent cleaning','polishing','car polishing','wax','rubbing','buffing',
  'ceramic coating','PPF','paint protection film','Teflon coating','anti-rust','underbody',
  'detailing','car detailing','bike detailing','scratch removal','dent removal','PDR',
  'headlight restoration','alloy cleaning','engine cleaning','gasl sayyara']),

-- 70. Driving School
('5f8133cd-4e6b-4f74-9c05-bde846b31dfa',
 'Driving School', 'driving-school',
 'Car, bike, truck driving lessons, license assistance & road training',
 '🚗', true, 70,
 ARRAY['driving school','driving class','learn driving','driving lesson','driving training',
  'driving instructor','car driving','bike riding','two wheeler','four wheeler','truck driving',
  'commercial license','heavy vehicle','LMV','HMV','learner license','permanent license',
  'DL','RTO','driving test','road test','parallel parking','highway driving','automatic car',
  'gear','manual','ladies special','home pickup','Maruti Driving School','gaadi chalana',
  'driving seekhna','ruhsat qiyaada','madrasat qiyaada']),

-- 71. Dairy & Milk Products
('36878a38-0d45-4328-9812-cbd59147eac9',
 'Dairy & Milk Products', 'dairy-products',
 'Milk delivery, dairy farm, paneer, curd, ghee & fresh dairy products',
 '🥛', true, 71,
 ARRAY['dairy','dairy farm','milk','doodh','cow milk','buffalo milk','A2 milk','organic milk',
  'fresh milk','raw milk','pasteurized','homogenized','full cream','toned milk','skim milk',
  'paneer','cottage cheese','curd','dahi','yogurt','probiotic','lassi','buttermilk','chaas',
  'ghee','desi ghee','butter','makhan','cream','malai','cheese','mozzarella','ricotta',
  'Amul','Mother Dairy','Parag','Gokul','Chitale','Gowardhan','Country Delight','Sid farm',
  'milk subscription','daily delivery','token','albaan','mazraa','jubna']),

-- 72. Dry Fruits, Spices & Masala
('ac604694-c11d-4405-9839-636ee8db0fad',
 'Dry Fruits, Spices & Masala', 'dry-fruits-spices',
 'Dry fruits, nuts, spices, masala grinding & wholesale condiments',
 '🌶️', true, 72,
 ARRAY['dry fruits','dry fruit shop','mewa','nuts','almond','badam','cashew','kaju',
  'pistachio','pista','walnut','akhrot','raisin','kishmish','dates','khajoor','fig','anjeer',
  'spices','masala','masala shop','garam masala','haldi','turmeric','mirchi','chilli',
  'dhaniya','coriander','jeera','cumin','hing','asafoetida','saffron','kesar','zafran',
  'cardamom','elaichi','clove','laung','cinnamon','dalchini','nutmeg','jaiphal',
  'masala grinding','chakki fresh','whole spice','powder','bhuna masala',
  'MDH','Everest','Catch','Eastern','tawabil','mukassaraat']),

-- 73. Electrical Goods & Lighting
('57b1869e-4952-4fea-8d5c-f0b1f93219db',
 'Electrical Goods & Lighting', 'electrical-goods',
 'LED lights, fans, switches, wires, cables & electrical fittings',
 '💡', true, 73,
 ARRAY['electrical','electrical shop','electrical goods','lighting','LED','LED light','LED bulb',
  'LED panel','LED strip','tube light','CFL','chandelier','wall light','ceiling light',
  'down light','spot light','flood light','street light','garden light','decorative light',
  'fan','ceiling fan','table fan','exhaust fan','BLDC','remote fan','designer fan',
  'switch','switchboard','modular switch','MCB','RCCB','DB box','wire','cable','Finolex',
  'Havells','Polycab','Anchor','Legrand','Philips','Syska','Crompton','Orient','Bajaj',
  'Usha','atomberg','bijli ka saman','kahraba','inaarah']),

-- 74. Marble, Granite & Tiles
('2b63be47-6e9a-47ce-b5a6-4997fa831f04',
 'Marble, Granite & Tiles', 'marble-granite-tiles',
 'Marble, granite, vitrified tiles, flooring & stone cladding',
 '🏛️', true, 74,
 ARRAY['marble','granite','tiles','tile','tile shop','flooring','floor tiles','wall tiles',
  'vitrified','polished vitrified','glazed','ceramic','porcelain','Italian marble','Makrana',
  'Rajnagar','Statuario','Carrara','Black Galaxy','Tan Brown','countertop','slab',
  'elevation tiles','parking tiles','outdoor tiles','bathroom tiles','kitchen tiles',
  'mosaic','stone','natural stone','Kota stone','slate','sandstone','cladding','paving',
  'Kajaria','Somany','Johnson','Nitco','Orient Bell','RAK','baldiyaat','rukhaam']),

-- 75. Diagnostic Lab & Pathology
('de0bb5b3-c79e-44b6-a5ae-27692623b88c',
 'Diagnostic Lab & Pathology', 'diagnostic-lab',
 'Blood tests, X-ray, ultrasound, MRI, CT scan & health checkup',
 '🔬', true, 75,
 ARRAY['diagnostic','diagnostics','lab','laboratory','pathology','blood test','test','CBC',
  'thyroid','sugar test','diabetes','lipid profile','liver function','kidney function','urine test',
  'X-ray','ultrasound','sonography','MRI','CT scan','ECG','EEG','2D echo','PET scan','biopsy',
  'home collection','sample collection','report','online report','health checkup','full body',
  'master health','preventive','Dr Lal Path','SRL','Thyrocare','Metropolis','iGenetic',
  'Suburban','Redcliffe','mukhtabar','tahleel','fuhusaat']),

-- 76. Insurance Agent & Broker
('bd5563ab-6a04-4073-994e-19111cd619f9',
 'Insurance Agent & Broker', 'insurance-agent',
 'Life, health, motor, property insurance agents & claim assistance',
 '🛡️', true, 76,
 ARRAY['insurance','insurance agent','insurance advisor','insurance broker','policy','premium',
  'life insurance','term insurance','term plan','endowment','money back','ULIP','pension',
  'health insurance','mediclaim','family floater','super top up','critical illness',
  'motor insurance','car insurance','bike insurance','two wheeler','third party','comprehensive',
  'fire insurance','property insurance','marine','travel insurance','group insurance',
  'LIC','Star Health','ICICI Prudential','HDFC Life','Max Life','Bajaj Allianz','New India',
  'claim','claim settlement','cashless','renewal','bima','tameen']),

-- 77. Accounting, Tax & Audit
('53538650-9d40-470e-ba53-3025a4d87170',
 'Accounting, Tax & Audit', 'accounting-tax',
 'CA, tax filing, GST, bookkeeping, audit & company registration',
 '📊', true, 77,
 ARRAY['accounting','accountant','CA','chartered accountant','CPA','tax','income tax','ITR',
  'ITR filing','tax return','tax consultant','tax planning','GST','GST registration',
  'GST return','GST filing','GSTR','TDS','TCS','advance tax','refund','audit','statutory audit',
  'internal audit','tax audit','bookkeeping','tally','accounting software','Zoho Books',
  'company registration','ROC','annual filing','partnership','LLP','Pvt Ltd','proprietorship',
  'project report','loan documentation','MSME','Udyam','FSSAI','muhaasib','dareeba']),

-- 78. Digital Marketing & Advertising
('b5654a34-9c85-47f6-b9cc-b78f4f0d71d0',
 'Digital Marketing & Advertising', 'digital-marketing',
 'SEO, social media, Google Ads, branding, web design & content',
 '📣', true, 78,
 ARRAY['digital marketing','marketing','advertising','ad agency','branding','brand','logo',
  'logo design','graphic design','social media','social media marketing','SMM','Instagram',
  'Facebook','LinkedIn','YouTube','Twitter','X','SEO','search engine optimization','Google Ads',
  'PPC','pay per click','SEM','email marketing','content marketing','blog','copywriting',
  'influencer','influencer marketing','website','web design','web development','landing page',
  'ecommerce','Shopify','WordPress','app marketing','ASO','ORM','reputation management',
  'lead generation','funnel','CRM','analytics','Google Analytics','tasweeq raqmi','ilaan']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 7B — NEW TOP-LEVEL CATEGORIES (79–93) — TIER 2 MEDIUM IMPACT  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 79. Welding, Fabrication & Metalwork
('d5defcc4-8a66-4784-bb1b-160fc91d61b8',
 'Welding, Fabrication & Metalwork', 'welding-fabrication',
 'Gates, grills, railings, steel structures, sheet metal & iron work',
 '⚙️', true, 79,
 ARRAY['welding','welder','fabrication','fabricator','metalwork','iron work','loha','lohar',
  'gate','iron gate','steel gate','MS gate','SS gate','grill','window grill','safety grill',
  'railing','staircase railing','handrail','balcony railing','SS railing','glass railing',
  'shed','industrial shed','godown','warehouse structure','truss','purlins','Z section',
  'rolling shutter','collapsible gate','MS fabrication','SS fabrication','TIG','MIG','arc',
  'plasma cutting','laser cutting','CNC','bending','sheet metal','ducting','tank','ladder',
  'canopy','pergola','gazebo','container','luhaam','hadaada']),

-- 80. Florist & Flower Shop
('c38a8c72-b1f4-4991-89f6-aa0acfb7bf4d',
 'Florist & Flower Shop', 'florist',
 'Fresh flowers, bouquets, garlands, wreaths & flower decoration',
 '💐', true, 80,
 ARRAY['florist','flower','flowers','flower shop','phool','phool wala','bouquet','bunch',
  'garland','haar','mala','varmala','sehra','gajra','rose','lily','orchid','carnation',
  'marigold','jasmine','mogra','rajnigandha','lotus','tulip','sunflower','gerbera',
  'flower arrangement','flower basket','table arrangement','stage flower','car decoration',
  'wedding flowers','funeral wreath','condolence','sympathy','artificial flowers','dry flowers',
  'imported flowers','exotic','same day delivery','midnight delivery','azzahaar','buyoot']),

-- 81. Nursery & Plant Store
('65af53ad-485e-408a-b511-1778fba68e66',
 'Nursery & Plant Store', 'nursery-plants',
 'Indoor plants, outdoor plants, pots, seeds, soil & garden supplies',
 '🌱', true, 81,
 ARRAY['nursery','plant nursery','plant shop','plant store','plants','indoor plants',
  'outdoor plants','garden','gardening','paudha','pedh','sapling','tree','fruit tree',
  'flower plant','ornamental','succulent','cactus','bonsai','money plant','snake plant',
  'spider plant','peace lily','areca palm','bamboo','fern','creeper','climber','hedge',
  'pot','planter','ceramic pot','terracotta','grow bag','soil','potting mix','cocopeat',
  'fertilizer','manure','vermicompost','seed','bulb','grass','lawn','turf',
  'vertical garden','terrace garden','kitchen garden','mashtal','hadeeqa']),

-- 82. Gift Shop & Personalized Gifts
('3eafd035-787a-4be9-84f0-82be0a68bcdc',
 'Gift Shop & Personalized Gifts', 'gift-shop',
 'Gifts, personalized items, corporate gifts, hampers & novelties',
 '🎁', true, 82,
 ARRAY['gift','gift shop','gift store','gifts','tohfa','hadiya','personalized','personalised',
  'custom','customized','engraved','name','photo','photo frame','photo mug','photo cake',
  'cushion','pillow','T-shirt printing','couple gift','birthday gift','anniversary gift',
  'wedding gift','return gift','corporate gift','corporate gifting','hamper','basket',
  'chocolate box','dry fruit box','festive gift','Diwali gift','Eid gift','trophy','memento',
  'plaque','certificate','award','crystal','resin','handicraft','handmade',
  'Ferns N Petals','IGP','Archies','Hallmark','tuhaf','hadaaya']),

-- 83. Juice Bar, Shakes & Beverages
('ae05165a-f5ba-4897-a0be-2738c001bf3e',
 'Juice Bar, Shakes & Beverages', 'juice-beverages',
 'Fresh juice, smoothies, shakes, sugarcane, coconut water & tea stalls',
 '🧃', true, 83,
 ARRAY['juice','juice bar','juice center','juice shop','fresh juice','fruit juice',
  'sugarcane','ganne ka ras','coconut water','nariyal pani','smoothie','shake','milkshake',
  'thick shake','cold press','detox','ABC juice','mixed fruit','orange juice','mosambi',
  'pomegranate','watermelon','carrot','beetroot','amla','wheatgrass','aloe vera',
  'lassi','buttermilk','chaas','jaljeera','aam panna','sherbet','thandai','falooda',
  'tea stall','chai','cutting chai','kulhad chai','tapri','tea cafe','cafe','bubble tea',
  'kombucha','aseer','mashroobaat']),

-- 84. CCTV, Surveillance & Smart Home
('138ffc32-bce2-4cd2-8792-18f5555c3062',
 'CCTV, Surveillance & Smart Home', 'cctv-smart-home',
 'CCTV cameras, access control, video door phone, smart home & alarms',
 '📹', true, 84,
 ARRAY['CCTV','CCTV camera','surveillance','security camera','IP camera','dome camera',
  'bullet camera','PTZ','NVR','DVR','hard disk','night vision','wireless camera','WiFi camera',
  'baby monitor','spy camera','hidden camera','dashcam','body cam','access control',
  'biometric','fingerprint','face recognition','attendance machine','boom barrier',
  'video door phone','intercom','smart lock','smart home','home automation','Alexa',
  'Google Home','smart switch','smart light','motion sensor','alarm','burglar alarm',
  'fire alarm','smoke detector','Hikvision','Dahua','CP Plus','Godrej','muraqaba','kaamira']),

-- 85. Architect & Structural Design
('be36e418-2527-4509-9364-6dded8081e84',
 'Architect & Structural Design', 'architect-design',
 'Architects, structural engineers, building plans, 3D design & vastu',
 '📐', true, 85,
 ARRAY['architect','architecture','structural','structural engineer','structural design',
  'building plan','house plan','floor plan','elevation','3D elevation','front elevation',
  'interior architect','landscape architect','town planning','urban design','master plan',
  'AutoCAD','Revit','SketchUp','3D design','3D rendering','walkthrough','BIM',
  'civil engineer','site engineer','estimation','BOQ','valuation','supervision','PMC',
  'vastu','vastu consultant','feng shui','green building','sustainable','LEED','GRIHA',
  'muhandis','miamaar','takhtiit']),

-- 86. Visa, Immigration & Passport
('515bb429-e293-4032-bd9f-cdd14232e939',
 'Visa, Immigration & Passport', 'visa-immigration',
 'Visa processing, immigration, passport services, attestation & PR',
 '🛂', true, 86,
 ARRAY['visa','visa agent','visa consultant','visa processing','tourist visa','business visa',
  'work visa','work permit','employment visa','student visa','dependent visa','transit visa',
  'PR','permanent residence','immigration','Canada PR','Australia PR','New Zealand PR',
  'UK visa','US visa','Schengen','Dubai visa','Singapore','passport','new passport',
  'passport renewal','tatkal passport','ECR','ECNR','apostille','attestation','HRD',
  'MEA','embassy','consulate','VFS','BLS','TLS','OCI','PIO',
  'taashira','jawaaz safar','hijra']),

-- 87. Fire Safety & Equipment
('2abe99d3-04d3-4a99-8fd5-809c2774cfa1',
 'Fire Safety & Equipment', 'fire-safety',
 'Fire extinguishers, alarms, sprinklers, NOC & fire safety training',
 '🧯', true, 87,
 ARRAY['fire safety','fire extinguisher','fire','fire fighting','fire protection',
  'ABC type','CO2','DCP','foam','water','fire alarm','smoke detector','heat detector',
  'sprinkler','sprinkler system','fire hydrant','hose reel','hose pipe','fire pump',
  'fire door','fire exit','emergency light','signage','fire NOC','fire license',
  'fire audit','fire drill','fire training','annual maintenance','refilling','recharging',
  'ISI','BIS','fire blanket','fire suit','fire retardant','itfaaiyya','hareeq']),

-- 88. Generator, UPS & Power Backup
('8a98ef3d-ab19-44fd-b5d3-43cc3f5bf8f9',
 'Generator, UPS & Power Backup', 'generator-ups',
 'Diesel generators, UPS, inverter, batteries, stabilizer & solar backup',
 '🔋', true, 88,
 ARRAY['generator','genset','diesel generator','DG set','power backup','backup power',
  'UPS','online UPS','offline UPS','line interactive','inverter','home inverter',
  'battery','tubular battery','flat plate','SMF','lithium','solar battery',
  'stabilizer','voltage stabilizer','servo','automatic voltage','AVR',
  'Kirloskar','Cummins','Mahindra','Ashok Leyland','Luminous','Microtek','Su-Kam',
  'Exide','Amaron','Livguard','rental','generator rental','AMC','silent','soundproof',
  'muwallid','tayyar kahraba']),

-- 89. Packaging & Packing Materials
('66fe8a26-e797-460b-9df2-4a4d5f340794',
 'Packaging & Packing Materials', 'packaging-materials',
 'Corrugated boxes, bubble wrap, packing tape, thermocol & packaging solutions',
 '📦', true, 89,
 ARRAY['packaging','packing','packing material','corrugated box','carton','cardboard',
  'bubble wrap','air bubble','thermocol','Styrofoam','foam sheet','EPE','stretch film',
  'shrink wrap','packing tape','brown tape','BOPP tape','strap','strapping','PP strap',
  'poly bag','LDPE','HDPE','zip lock','standup pouch','paper bag','kraft','gift wrap',
  'tissue paper','wrapping paper','box','custom box','printed box','food packaging',
  'blister','clamshell','container','jar','bottle','tin','can','label','sticker',
  'taghleef','taabia']),

-- 90. Music, Dance & Art Classes
('2360f82d-519d-4d0d-a2b6-3e1d2fc89f06',
 'Music, Dance & Art Classes', 'music-dance-art',
 'Instrument lessons, vocal training, dance academy & art workshops',
 '🎵', true, 90,
 ARRAY['music','music class','music school','music academy','instrument','guitar','piano',
  'keyboard','harmonium','tabla','drums','violin','flute','sitar','ukulele','singing',
  'vocal','classical','Hindustani','Carnatic','western','rock','pop','jazz','bollywood',
  'dance','dance class','dance academy','classical dance','Bharatnatyam','Kathak','Odissi',
  'hip hop','contemporary','salsa','Zumba','belly dance','folk','bhangra','garba',
  'art','painting class','drawing','sketch','watercolor','oil painting','canvas','pottery',
  'clay','sculpture','craft','DIY','mooseeqa','raqss','fann']),

-- 91. Footwear & Shoe Store
('07590f3b-5c86-4e13-8b3f-65d9f001a090',
 'Footwear & Shoe Store', 'footwear-store',
 'Shoes, sandals, sports shoes, ethnic footwear & shoe accessories',
 '👟', true, 91,
 ARRAY['footwear','shoe store','shoe shop','shoes','juta','joota','chappal','sandal',
  'sports shoes','running shoes','sneakers','gym shoes','casual shoes','formal shoes',
  'leather shoes','loafer','moccasin','boot','ankle boot','long boot','heel','wedge',
  'platform','flat','ballerina','jutti','mojri','kolhapuri','ethnic footwear',
  'Bata','Liberty','Woodland','Red Chief','Red Tape','Sparx','Relaxo','Action',
  'Nike','Adidas','Puma','Reebok','New Balance','Skechers','Crocs','Birkenstock',
  'insole','shoe care','polish','laces','sole','repair','ahdhiya','hadhaa']),

-- 92. Modular Kitchen & Wardrobe
('548272f8-b7a9-44d8-9983-87bd1e161874',
 'Modular Kitchen & Wardrobe', 'modular-kitchen-wardrobe',
 'Modular kitchens, wardrobes, TV units, vanity & custom cabinetry',
 '🗄️', true, 92,
 ARRAY['modular kitchen','modular wardrobe','wardrobe','sliding wardrobe','walk in closet',
  'kitchen cabinet','countertop','quartz','granite top','Corian','acrylic','laminate',
  'PU finish','glass shutter','profile shutter','membrane','MDF','HDF','HDHMR','plywood',
  'marine ply','boiling water proof','BWP','Hettich','Hafele','Blum','Ebco','soft close',
  'tandem','drawer system','basket','corner unit','tall unit','loft','TV unit','shoe rack',
  'dresser','vanity','Livspace','HomeLane','Homelane','Design Cafe','matbakh hadees']),

-- 93. Alternative Medicine
('15ca5862-409e-454d-a79e-9a4e98208827',
 'Alternative Medicine', 'alternative-medicine',
 'Ayurveda, Unani, Homeopathy, naturopathy & traditional healing',
 '🌿', true, 93,
 ARRAY['alternative medicine','ayurveda','ayurvedic','vaid','vaidya','hakim','unani',
  'unani medicine','Tibb-e-Nabawi','prophetic medicine','homeopathy','homoeopathy',
  'homeopathic','naturopathy','nature cure','acupuncture','acupressure','cupping','hijama',
  'siddha','yoga therapy','pranic healing','reiki','herbal','herbal medicine','jadi buti',
  'Patanjali','Dabur','Baidyanath','Hamdard','panchakarma','detox','Shilajit','Ashwagandha',
  'Triphala','Chyawanprash','decoction','kadha','ark','tail','tibb','ilaj tabii']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 7C — NEW TOP-LEVEL CATEGORIES (94–105) — TIER 3 NICHE         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 94. Gaming Zone & Amusement
('3eb679b6-61f7-41ca-bf9d-03fe6fd02a16',
 'Gaming Zone & Amusement', 'gaming-zone',
 'Video game parlours, VR, arcades, bowling, trampoline & play areas',
 '🎮', true, 94,
 ARRAY['gaming','gaming zone','game zone','game parlour','video game','PS5','PlayStation',
  'Xbox','PC gaming','VR','virtual reality','AR','arcade','coin game','racing game',
  'bowling','bowling alley','trampoline','trampoline park','laser tag','paintball',
  'go kart','go karting','escape room','fun zone','play area','indoor play','soft play',
  'kids play','amusement','amusement park','theme park','water park','rides','adventure',
  'billiards','pool table','snooker','foosball','air hockey','alaab','tarfeeh']),

-- 95. Gym & Sports Equipment Store
('0feee521-d089-42b1-bbc3-49548310acd2',
 'Gym & Sports Equipment Store', 'gym-equipment-store',
 'Treadmills, weights, gym machines, sports gear & fitness accessories',
 '🏋️', true, 95,
 ARRAY['gym equipment','fitness equipment','sports equipment','treadmill','elliptical',
  'cross trainer','exercise bike','spin bike','rowing machine','multi gym','home gym',
  'dumbbell','barbell','weight plate','kettlebell','resistance band','yoga mat',
  'foam roller','bench press','squat rack','Smith machine','cable machine','leg press',
  'cricket bat','cricket ball','football','basketball','badminton racket','shuttle',
  'tennis racket','table tennis','carrom','chess','skipping rope','boxing gloves',
  'Cosco','Nivia','SG','MRF','SS','Yonex','Li-Ning','Decathlon','muaadaat riyaada']),

-- 96. Book Store & Library
('c395a364-f98c-4126-a5af-1f3e28a6aeaf',
 'Book Store & Library', 'book-store',
 'Books, academic material, novels, stationery & reading library',
 '📚', true, 96,
 ARRAY['book','books','book store','book shop','kitab','library','reading','novel','fiction',
  'non fiction','self help','biography','children books','kids books','story book',
  'academic','textbook','reference','NCERT','guide','help book','question bank','solved paper',
  'competitive','UPSC','SSC','bank exam','CAT','GATE','IIT JEE','NEET','Islamic books',
  'Quran','Hadith','Sahih','Riyad us Saliheen','Dawat-e-Hadiyah','religious','spiritual',
  'second hand','used books','old books','rare books','Kindle','ebook','audiobook',
  'Crossword','Landmark','kutub','maktaba']),

-- 97. Tattoo & Body Art
('99b09847-0630-4834-add2-9694ef10c442',
 'Tattoo & Body Art', 'tattoo-body-art',
 'Permanent tattoos, temporary, piercing, removal & body modifications',
 '🎨', true, 97,
 ARRAY['tattoo','tattoo artist','tattoo shop','tattoo studio','tattoo parlour','ink',
  'permanent tattoo','temporary tattoo','custom tattoo','tribal','geometric','watercolor',
  'portrait','lettering','calligraphy','minimal','micro','finger tattoo','sleeve',
  'cover up','tattoo removal','laser removal','piercing','ear piercing','nose piercing',
  'belly button','lip','tongue','industrial','helix','tragus','septum','dermal',
  'body art','body modification','henna tattoo','airbrush tattoo','glow tattoo','washm']),

-- 98. Lift & Elevator Services
('15b0f64f-147b-4535-bf14-6fbcdd822801',
 'Lift & Elevator Services', 'lift-elevator',
 'Passenger lifts, goods lifts, escalators, installation & AMC',
 '🛗', true, 98,
 ARRAY['lift','elevator','passenger lift','goods lift','freight lift','home lift',
  'hospital lift','capsule lift','panoramic','hydraulic lift','traction','MRL',
  'machine room less','gearless','escalator','moving walkway','dumbwaiter',
  'car parking lift','stacker','installation','modernization','renovation','AMC',
  'annual maintenance','breakdown','emergency','rescue','safety','ARD','auto rescue',
  'Otis','KONE','Schindler','ThyssenKrupp','Mitsubishi','Johnson','Sigma','misaad']),

-- 99. Chemical & Raw Material Supplier
('e93e198a-ca35-47a1-b584-a0380ffe96bf',
 'Chemical & Raw Material Supplier', 'chemical-supplier',
 'Industrial chemicals, cleaning agents, raw materials & lab supplies',
 '🧪', true, 99,
 ARRAY['chemical','chemicals','chemical supplier','raw material','industrial chemical',
  'cleaning chemical','housekeeping chemical','detergent raw material','acid','caustic soda',
  'soda ash','sodium','potassium','sulphuric acid','hydrochloric','citric acid','oxalic',
  'solvent','thinner','acetone','isopropyl alcohol','IPA','glycerin','paraffin','wax',
  'resin','hardener','epoxy','polyester','silicone','adhesive','pigment','dye','ink',
  'fragrance','essential oil','base oil','surfactant','lab chemical','reagent','indicator',
  'beaker','flask','test tube','pH paper','kimiyaa','mawaad kaam']),

-- 100. Waste Management & Sanitation
('dbe78061-4380-40f2-be7b-c99b4fed31d6',
 'Waste Management & Sanitation', 'waste-management',
 'Garbage collection, septic tank, drainage, sewage & bio-waste',
 '♻️', true, 100,
 ARRAY['waste management','garbage','garbage collection','kachra','kuda','dustbin','bin',
  'waste disposal','solid waste','dry waste','wet waste','segregation','recycling',
  'composting','vermicompost','biogas','septic tank','septic','soak pit','drain',
  'drainage','sewage','manhole','gutter','nala','blockage','choke','jetting',
  'suction','vacuum truck','honey sucker','sludge','effluent','ETP','STP',
  'bio medical waste','e-waste','hazardous','industrial waste','demolition waste',
  'skip','compactor','tipper','nadhafa','idaarat nufaayaat']),

-- 101. Funeral & Burial Services
('50b2f5d8-fc67-48c5-9521-6216235301dd',
 'Funeral & Burial Services', 'funeral-burial',
 'Janaza services, burial, coffin, hearse, cremation & memorial',
 '🕊️', true, 101,
 ARRAY['funeral','burial','janaza','janazah','namaz-e-janaza','kafan','dafan','qabar',
  'cemetery','graveyard','kabristan','coffin','casket','tabut','hearse','ambulance',
  'mortuary','dead body transport','cremation','crematorium','electric cremation',
  'wood','sandal wood','last rites','antim sanskar','prayer','condolence','taziyat',
  'obituary','death certificate','succession','repatriation','embalming',
  'grave digging','headstone','marble grave','janaza service','ghusl','tayammum','mayyit']),

-- 102. Blood Bank & Ambulance
('9e333f39-9bfe-401f-9e0c-f14a55e54ace',
 'Blood Bank & Ambulance', 'blood-bank-ambulance',
 'Blood banks, ambulance services, organ donation & emergency care',
 '🚑', true, 102,
 ARRAY['blood bank','blood','blood donation','blood donor','blood group','A+','B+','O+','AB+',
  'A-','B-','O-','AB-','platelet','plasma','whole blood','packed cells','component',
  'ambulance','ambulance service','emergency','108','102','1298','private ambulance',
  'ICU ambulance','ventilator ambulance','cardiac ambulance','neonatal','air ambulance',
  'dead body ambulance','mortuary van','patient transport','non emergency',
  'oxygen','cylinder','concentrator','organ donation','eye donation','bank damm','isaaf']),

-- 103. Language & Communication Training
('ae2e332a-9cc0-4be3-b01d-777461887151',
 'Language & Communication Training', 'language-training',
 'Spoken English, foreign languages, IELTS, public speaking & soft skills',
 '🗣️', true, 103,
 ARRAY['language','language class','spoken English','English speaking','English course',
  'communication','public speaking','personality development','soft skills','interview prep',
  'presentation','corporate training','accent','pronunciation','grammar','vocabulary',
  'IELTS','TOEFL','PTE','Duolingo','OET','French','German','Spanish','Japanese','Chinese',
  'Mandarin','Korean','Arabic','Urdu','Hindi','Sanskrit','sign language','interpretation',
  'translation','voice modulation','debate','elocution','anchoring','emcee',
  'British Council','Cambridge','lugha','tawasul']),

-- 104. Vocational & Skill Training
('ca822f73-56e4-47f6-82a9-02a38bcfce07',
 'Vocational & Skill Training', 'vocational-training',
 'Computer courses, beauty training, technical skills & certification',
 '🎓', true, 104,
 ARRAY['vocational','skill','skill training','skill development','course','certificate',
  'diploma','computer course','MS Office','Excel','Tally','DTP','Photoshop','CorelDraw',
  'AutoCAD','web design','coding','programming','Python','Java','data entry','typing',
  'beauty course','makeup course','hair dressing course','mehndi course','nail art course',
  'fashion design','cutting','tailoring course','embroidery course','cooking class',
  'baking class','electrical','plumbing','welding','ITI','polytechnic','NSDC','PMKVY',
  'apprenticeship','internship','placement','job oriented','tadreeb mehni','maharaat']),

-- 105. Roofing & Shed Work
('4a6ed1f4-4f15-44f1-96b3-94b2abca18ab',
 'Roofing & Shed Work', 'roofing-shed',
 'Metal roofing, polycarbonate sheets, shed construction & waterproof roofs',
 '🏗️', true, 105,
 ARRAY['roofing','roof','metal roof','tin roof','sheet','GI sheet','color coated','profile sheet',
  'trapezoidal','standing seam','clay tile','Mangalore tile','concrete tile','shingle',
  'polycarbonate','fiberglass','FRP','skylight','transparent roof','canopy','awning',
  'car parking shed','factory shed','warehouse shed','industrial shed','godown shed',
  'farm shed','poultry shed','dairy shed','prefabricated','PEB','pre-engineered building',
  'purlins','truss','rafter','ridge','gutter','down pipe','flashing','insulation',
  'turbo ventilator','roof ventilator','waterproof roof','roof coating','saqf','muzalla']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 8 — SUBCATEGORIES FOR NEW PARENTS                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────
-- Under: Pest Control (a1b2c3d4-...66)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('d2f47e14-ed75-4480-a7f6-0889158cf2d0',
 '031692d8-f3b1-479e-ad3e-d00c0d96a7be',
 'Termite Treatment', 'termite-treatment',
 'Pre & post construction anti-termite, wood borer & white ant treatment',
 '🪵', true, 1,
 ARRAY['termite','termite treatment','anti termite','pre construction','post construction',
  'wood borer','white ant','deemak','soil treatment','drilling','chemical barrier',
  'bait system','warranty','5 year','10 year','annual','Premise','Agenda','Termidor',
  'BASF','Bayer','pipe treatment','foundation','beam','pillar','diimak ilaaj']),

('c1b68e90-7aed-4ff6-ab55-463383ae0dbb',
 '031692d8-f3b1-479e-ad3e-d00c0d96a7be',
 'Cockroach & General Pest', 'cockroach-general',
 'Cockroach gel, ant, spider, lizard & general household pest control',
 '🪳', true, 2,
 ARRAY['cockroach','cockroach treatment','gel treatment','herbal','spray','general pest',
  'ant','black ant','red ant','spider','lizard','silverfish','carpet beetle','moth',
  'household pest','kitchen pest','bathroom pest','one time','annual contract',
  'odorless','safe','child safe','pet safe','keede makode','hasharat aamm']),

('35938c3d-1664-43b0-aa4b-0959f2ab6a46',
 '031692d8-f3b1-479e-ad3e-d00c0d96a7be',
 'Rodent & Rat Control', 'rodent-control',
 'Rat traps, poison baiting, exclusion & rodent proofing',
 '🐀', true, 3,
 ARRAY['rodent','rat','mouse','mice','rat control','rat poison','rodent trap','glue trap',
  'snap trap','cage trap','bait station','tamper proof','exclusion','mesh','rat proofing',
  'burrow','colony','commercial','warehouse','factory','godown','farm','chuha','jirdaan']),

('58c955f2-8c23-41c7-abf2-683caad3a570',
 '031692d8-f3b1-479e-ad3e-d00c0d96a7be',
 'Bed Bug & Mosquito Control', 'bedbug-mosquito',
 'Bed bug treatment, mosquito fogging, net installation & fumigation',
 '🦟', true, 4,
 ARRAY['bed bug','bedbug','khatmal','mattress treatment','heat treatment','steam',
  'mosquito','mosquito control','fogging','misting','larvicide','dengue','malaria',
  'net','mosquito net','window net','door net','insect screen','repellent',
  'fumigation','fumigation certificate','warehouse','ship','container','buq']),

-- ─────────────────────────────────────────────
-- Under: Cleaning Services (a1b2c3d4-...68)
-- ─────────────────────────────────────────────
('e9787e73-965e-403d-8514-2fdef421424b',
 '03c6edd6-62ad-4bf9-a489-88652ec1df7b',
 'Home & Residential Cleaning', 'home-cleaning',
 'Regular, deep, move-in/out & bathroom/kitchen cleaning',
 '🏠', true, 1,
 ARRAY['home cleaning','house cleaning','residential cleaning','deep cleaning',
  'bathroom cleaning','kitchen cleaning','bedroom','living room','move in','move out',
  'post renovation','spring cleaning','weekly','monthly','one time','regular',
  'maid','domestic','sanitization','disinfection','safaai ghar']),

('fc62b625-1d98-4956-9dd6-99e96f70a3e4',
 '03c6edd6-62ad-4bf9-a489-88652ec1df7b',
 'Office & Commercial Cleaning', 'office-cleaning',
 'Office, shop, showroom, hospital & industrial cleaning',
 '🏢', true, 2,
 ARRAY['office cleaning','commercial cleaning','corporate','shop cleaning','showroom',
  'hospital cleaning','clinic','school','hotel housekeeping','industrial cleaning',
  'warehouse','factory','food processing','GMP','compliance','contract','outsource',
  'daily','night shift','housekeeping staff','supervisor','safaai daftar']),

('12b2c413-8dbb-4576-9dfa-ddbe476fad61',
 '03c6edd6-62ad-4bf9-a489-88652ec1df7b',
 'Carpet, Sofa & Upholstery Cleaning', 'carpet-sofa-cleaning',
 'Carpet shampooing, sofa steam clean, curtain & mattress cleaning',
 '🛋️', true, 3,
 ARRAY['carpet cleaning','sofa cleaning','upholstery cleaning','steam cleaning','shampooing',
  'dry cleaning','foam cleaning','hot water extraction','mattress cleaning','curtain',
  'chair','car seat','office chair','stain removal','odor removal','pet stain',
  'anti bacterial','dust mite','allergen','Karcher','tanzheef kanab']),

('c9b8b3f1-58aa-496a-9e3d-6c4042c226ec',
 '03c6edd6-62ad-4bf9-a489-88652ec1df7b',
 'Water Tank & Overhead Cleaning', 'tank-cleaning',
 'Overhead tank, underground sump, swimming pool & RO cleaning',
 '🚰', true, 4,
 ARRAY['water tank cleaning','tank cleaning','overhead tank','underground','sump',
  'syntax tank','PVC tank','concrete tank','SS tank','anti bacterial wash',
  'chlorination','UV treatment','desilting','swimming pool','pool cleaning',
  'RO service','water purifier','filter change','annual','quarterly','tanzheef khazzaan']),

-- ─────────────────────────────────────────────
-- Under: Digital Marketing (a1b2c3d4-...78)
-- ─────────────────────────────────────────────
('2b2787ed-bac7-4be1-9c73-230519334494',
 'b5654a34-9c85-47f6-b9cc-b78f4f0d71d0',
 'SEO & Content Marketing', 'seo-content',
 'Search engine optimization, blog writing, content strategy & link building',
 '🔍', true, 1,
 ARRAY['SEO','search engine optimization','organic','ranking','Google ranking','keyword',
  'on page','off page','technical SEO','link building','backlink','guest post','blog',
  'content marketing','content writing','copywriting','article','website content',
  'product description','schema','sitemap','analytics','search console','tahseen bahth']),

('013fb283-b96f-4649-b128-c2a395a34bbc',
 'b5654a34-9c85-47f6-b9cc-b78f4f0d71d0',
 'Social Media Marketing', 'social-media-marketing',
 'Instagram, Facebook, LinkedIn, YouTube management & growth',
 '📱', true, 2,
 ARRAY['social media','social media marketing','SMM','Instagram','Facebook','LinkedIn',
  'YouTube','Twitter','X','Threads','Pinterest','WhatsApp marketing','Telegram',
  'content creation','reel','short video','post design','caption','hashtag','engagement',
  'follower','growth','community management','paid social','boost','tasweeq ijtimaaiy']),

('cbe06d17-b53b-45a0-9496-103d7ff80f4d',
 'b5654a34-9c85-47f6-b9cc-b78f4f0d71d0',
 'PPC & Paid Advertising', 'ppc-advertising',
 'Google Ads, Meta Ads, display, remarketing & performance marketing',
 '💰', true, 3,
 ARRAY['PPC','pay per click','Google Ads','AdWords','Meta Ads','Facebook Ads','Instagram Ads',
  'display','banner','remarketing','retargeting','shopping ads','Performance Max','YouTube Ads',
  'LinkedIn Ads','programmatic','DSP','DV360','CPC','CPM','CPA','ROAS','conversion',
  'landing page','A/B test','campaign','budget','ilaan madfoo']),

('194bb7b5-fd0e-4bcc-aba9-2426116d3564',
 'b5654a34-9c85-47f6-b9cc-b78f4f0d71d0',
 'Branding & Graphic Design', 'branding-design',
 'Logo design, brand identity, packaging design & creative services',
 '🎨', true, 4,
 ARRAY['branding','brand identity','logo','logo design','brand guideline','color palette',
  'typography','business card','letterhead','envelope','brochure','catalogue','flyer',
  'poster','banner design','social media design','packaging design','label design',
  'UI','UX','UI/UX','app design','web design','Canva','Figma','Adobe','Illustrator',
  'Photoshop','InDesign','After Effects','motion graphics','video editing','tasmeem']),

-- ─────────────────────────────────────────────
-- Under: Painting & Waterproofing (a1b2c3d4-...67)
-- ─────────────────────────────────────────────
('c2101017-41ea-4293-86ce-1deb49cb083c',
 '9528fb0e-9e65-4a38-a7a4-f88fb79fe096',
 'Interior Painting', 'interior-painting',
 'Wall painting, ceiling, texture, stencil & decorative finishes',
 '🏠', true, 1,
 ARRAY['interior painting','wall painting','ceiling painting','room painting','flat painting',
  'emulsion','premium emulsion','luxury emulsion','silk','matt','sheen','eggshell',
  'texture','texture painting','stencil','metallic','ombre','gradient','stucco','venetian',
  'Asian Paints Royale','Berger Silk','Nerolac Beauty','Dulux Velvet','rang andarooni']),

('94554aa1-1bd4-4ec5-a8d6-02263c04f48d',
 '9528fb0e-9e65-4a38-a7a4-f88fb79fe096',
 'Exterior Painting', 'exterior-painting',
 'Outer wall, building facade, compound wall & weather-proof painting',
 '🏗️', true, 2,
 ARRAY['exterior painting','outer wall','outside painting','building painting','facade',
  'compound wall','boundary wall','weather coat','Apex','Ace','weather proof','UV resistant',
  'anti fungal','anti algae','primer','crack filler','putty','scaffolding','rope access',
  'high rise','texture exterior','stone finish','rang baahari']),

('82ebd284-acf7-4166-a061-20dc55cafdac',
 '9528fb0e-9e65-4a38-a7a4-f88fb79fe096',
 'Waterproofing & Coating', 'waterproofing-services',
 'Terrace, bathroom, basement waterproofing & epoxy coatings',
 '💧', true, 3,
 ARRAY['waterproofing','water proofing','terrace','roof','bathroom','basement','tank',
  'swimming pool','balcony','leakage','seepage','dampness','crack','joint','expansion joint',
  'membrane','APP','SBS','liquid membrane','cementitious','crystalline','injection grouting',
  'PU grouting','epoxy','epoxy coating','polyurethane','Dr Fixit','Fosroc','Sika','BASF',
  'MasterSeal','Pidilite','warranty','10 year','aazl maai']),

-- ─────────────────────────────────────────────
-- Under: Electrical Goods & Lighting (a1b2c3d4-...73)
-- ─────────────────────────────────────────────
('757f00f2-d6e9-4cc8-b106-927447e3a542',
 '57b1869e-4952-4fea-8d5c-f0b1f93219db',
 'LED & Decorative Lighting', 'led-decorative-lighting',
 'LED panels, chandeliers, strip lights, garden lights & smart lighting',
 '✨', true, 1,
 ARRAY['LED','LED light','LED panel','LED bulb','LED tube','LED strip','strip light',
  'profile light','cove light','chandelier','pendant','hanging','wall lamp','sconce',
  'spot light','track light','down light','surface mount','recessed','COB','flood light',
  'garden light','bollard','spike','solar light','underwater','pool light','decorative',
  'smart light','WiFi bulb','color changing','dimmable','Philips Hue','inaarah LED']),

('e8bf6ab8-5c2a-43ed-89aa-e76d76ac3c88',
 '57b1869e-4952-4fea-8d5c-f0b1f93219db',
 'Fans & Ventilation', 'fans-ventilation',
 'Ceiling fans, exhaust fans, BLDC, industrial fans & air coolers',
 '💨', true, 2,
 ARRAY['fan','ceiling fan','table fan','pedestal fan','wall fan','exhaust fan','ventilation',
  'BLDC','energy saving','remote fan','smart fan','designer fan','decorative fan',
  'industrial fan','high speed','air cooler','desert cooler','tower fan','bladeless',
  'Crompton','Orient','Havells','Bajaj','Usha','atomberg','Superfan','V-Guard',
  'marwaha','pankha','mirwaha']),

('dd19a168-7179-470b-815b-b42d27dfa452',
 '57b1869e-4952-4fea-8d5c-f0b1f93219db',
 'Wires, Cables & Conduits', 'wires-cables',
 'House wiring, industrial cables, conduits, lugs & cable trays',
 '🔌', true, 3,
 ARRAY['wire','wires','cable','cables','house wire','FR','FRLS','FRLSH','armoured cable',
  'multi core','single core','copper','aluminium','conduit','PVC conduit','GI conduit',
  'flexible','MCB','MCCB','RCCB','ELCB','changeover','DB box','distribution board',
  'earthing','grounding','earth pit','copper plate','GI plate','Finolex','Havells',
  'Polycab','RR Kabel','KEI','Anchor','aslaak','kahraba tawseelaat']),

('0d5edf54-1fbb-40ae-bbb3-33417bf7952c',
 '57b1869e-4952-4fea-8d5c-f0b1f93219db',
 'Switches & Modular Fittings', 'switches-fittings',
 'Modular switches, sockets, dimmers, panels & smart switches',
 '🔲', true, 4,
 ARRAY['switch','modular switch','socket','switchboard','plate','cover','dimmer','regulator',
  'fan regulator','step down','bell push','indicator','USB socket','USB charger',
  '5 pin','15 amp','20 amp','gang box','concealed','surface','Legrand','Schneider',
  'Havells','Anchor Roma','GM','Goldmedal','GreatWhite','C&S','smart switch','touch',
  'WiFi switch','voice control','Alexa','Google','mafaateeh','lawha']),

-- ─────────────────────────────────────────────
-- Under: Marble, Granite & Tiles (a1b2c3d4-...74)
-- ─────────────────────────────────────────────
('d37065ea-8b18-45b9-9653-2eb8ccca6222',
 '2b63be47-6e9a-47ce-b5a6-4997fa831f04',
 'Marble & Granite', 'marble-granite',
 'Italian marble, Indian marble, granite slabs, countertops & staircases',
 '🏛️', true, 1,
 ARRAY['marble','granite','slab','countertop','kitchen top','table top','staircases',
  'staircase marble','flooring marble','Italian marble','Makrana','Rajnagar','Ambaji',
  'Statuario','Carrara','Calacatta','Bianco','Botticino','Black Galaxy','Tan Brown',
  'Steel Grey','Black Pearl','P White','Jet Black','Kashmir White','Moon White',
  'edge','bullnose','ogee','beveled','polished','honed','leather finish','rukhaam']),

('b7c79328-060b-414d-972c-0615f3f462bb',
 '2b63be47-6e9a-47ce-b5a6-4997fa831f04',
 'Ceramic & Vitrified Tiles', 'ceramic-vitrified-tiles',
 'Floor tiles, wall tiles, GVT, PGVT, double charge & designer tiles',
 '🔲', true, 2,
 ARRAY['tiles','tile','ceramic','vitrified','GVT','PGVT','double charge','soluble salt',
  'glazed','matt','glossy','sugar finish','carving','wooden tile','marble look','stone look',
  'floor tile','wall tile','bathroom tile','kitchen tile','living room','bedroom','outdoor',
  'anti skid','parking tile','step riser','skirting','border','elevation','designer',
  'Kajaria','Somany','Johnson','Nitco','Orient Bell','RAK','baldiyaat kharaf']),

('ae7f72dc-87d9-4e67-bd00-673e282fb06a',
 '2b63be47-6e9a-47ce-b5a6-4997fa831f04',
 'Natural Stone & Cladding', 'natural-stone-cladding',
 'Sandstone, slate, Kota stone, cobble, pebble & wall cladding',
 '🪨', true, 3,
 ARRAY['natural stone','sandstone','slate','Kota stone','limestone','quartzite','travertine',
  'cobble','cobblestone','pebble','pebble wash','river stone','mushroom stone','ledge stone',
  'cladding','wall cladding','exterior cladding','elevation stone','compound wall',
  'garden stone','pathway','stepping stone','fountain','waterfall','landscape stone',
  'monument','memorial','temple stone','hajar tabeeiy']),

-- ─────────────────────────────────────────────
-- Under: Welding & Fabrication (a1b2c3d4-...79)
-- ─────────────────────────────────────────────
('00e5d634-663e-4b58-a402-cfcc519eadd9',
 'd5defcc4-8a66-4784-bb1b-160fc91d61b8',
 'Gates, Grills & Railings', 'gates-grills-railings',
 'MS/SS gates, window grills, safety grills, balcony & staircase railings',
 '🚪', true, 1,
 ARRAY['gate','iron gate','MS gate','SS gate','steel gate','sliding gate','swing gate',
  'automatic gate','motorized gate','main gate','garden gate','grill','window grill',
  'safety grill','MS grill','balcony grill','railing','stair railing','handrail',
  'SS railing','glass railing','balustrade','balcony railing','parapet','darwaza','jali']),

('ab158c6f-f371-40fb-b283-64cb5320f511',
 'd5defcc4-8a66-4784-bb1b-160fc91d61b8',
 'Structural Steel & Sheds', 'structural-steel-sheds',
 'Industrial sheds, warehouse structures, trusses & PEB',
 '🏭', true, 2,
 ARRAY['structural steel','structure','shed','industrial shed','factory shed','warehouse shed',
  'godown','PEB','pre-engineered','truss','purlins','column','beam','base plate','anchor bolt',
  'mezzanine','mezzanine floor','platform','walkway','ladder','fire escape','hangar',
  'canopy','car parking','bus shelter','roof structure','haikal fauladi']),

('65d86c0a-d1c1-4022-bf02-6a4fabd4f054',
 'd5defcc4-8a66-4784-bb1b-160fc91d61b8',
 'Sheet Metal & Ducting', 'sheet-metal-ducting',
 'AC ducts, kitchen hoods, chimney ducts, enclosures & tanks',
 '🔩', true, 3,
 ARRAY['sheet metal','ducting','AC duct','HVAC duct','GI duct','SS duct','kitchen duct',
  'exhaust duct','chimney duct','hood','kitchen hood','industrial hood','enclosure',
  'panel','control panel','electrical panel','feeder pillar','junction box','tray',
  'cable tray','perforated','ladder tray','tank','water tank','SS tank','pressure vessel',
  'hopper','chute','conveyor','guard','machine guard','safaaih maadiniyya']),

-- ─────────────────────────────────────────────
-- Under: Alternative Medicine (a1b2c3d4-...93)
-- ─────────────────────────────────────────────
('80b2751d-2598-4051-a1b0-0b9f282a5303',
 '15ca5862-409e-454d-a79e-9a4e98208827',
 'Ayurveda', 'ayurveda',
 'Ayurvedic clinics, panchakarma, herbal remedies & wellness',
 '🌿', true, 1,
 ARRAY['ayurveda','ayurvedic','vaid','vaidya','panchakarma','shirodhara','abhyangam',
  'nasya','basti','vamana','virechana','herbal','kadha','churna','kwath','tail','ghrit',
  'Patanjali','Dabur','Baidyanath','Himalaya','Kottakkal','AVN','Sri Sri','aayrfeedaa']),

('e2b02d77-79db-47f6-a011-970e86514e02',
 '15ca5862-409e-454d-a79e-9a4e98208827',
 'Unani & Tibb-e-Nabawi', 'unani-tibb',
 'Unani medicine, Tibb-e-Nabawi, herbal Hakim & prophetic remedies',
 '🕌', true, 2,
 ARRAY['unani','Unani medicine','hakim','Tibb-e-Nabawi','prophetic medicine','ilaj bil ghiza',
  'hijama','cupping','wet cupping','dry cupping','honey','black seed','kalonji','habbatus sauda',
  'senna','ajwa','talbina','zam zam','miswak','olive oil','Hamdard','Sadar Dawakhana',
  'majoon','habb','sharbat','arq','roghan','itrifal','jawarish','tibb nabawi']),

('d01cbd42-a54c-429e-8155-f8e699424dac',
 '15ca5862-409e-454d-a79e-9a4e98208827',
 'Homeopathy', 'homeopathy',
 'Homeopathic clinics, constitutional treatment & chronic disease',
 '💉', true, 3,
 ARRAY['homeopathy','homoeopathy','homeopathic','doctor','BHMS','MD homeo','constitutional',
  'chronic','allergies','skin','hair fall','migraine','asthma','thyroid','PCOD','diabetes',
  'arthritis','psoriasis','eczema','warts','piles','fissure','kidney stone','tonsil',
  'SBL','Schwabe','Reckeweg','Bakson','Allen','Boiron','dilution','mother tincture',
  'biochemic','tissue salt','30C','200C','1M','homeobathee']),

('32691b25-e675-40b5-bd23-87f7d5b3e89a',
 '15ca5862-409e-454d-a79e-9a4e98208827',
 'Naturopathy & Holistic', 'naturopathy-holistic',
 'Nature cure, acupuncture, acupressure, pranic healing & Reiki',
 '☯️', true, 4,
 ARRAY['naturopathy','nature cure','natural','holistic','integrative','acupuncture','acupressure',
  'sujok','reflexology','pranic healing','Reiki','energy healing','chakra','aura',
  'mud therapy','hydrotherapy','chromo therapy','magnet therapy','fasting','detox','diet',
  'raw food','juice therapy','yoga therapy','meditation','mindfulness','wellness retreat',
  'spa','therapeutic massage','tibb tabeeiy']),

-- ─────────────────────────────────────────────
-- Under: Music, Dance & Art (a1b2c3d4-...90)
-- ─────────────────────────────────────────────
('b5a1e2cb-84f5-41c8-ac47-825ddd249dfb',
 '2360f82d-519d-4d0d-a2b6-3e1d2fc89f06',
 'Music Instrument & Vocal', 'music-instrument-vocal',
 'Guitar, piano, harmonium, tabla, vocal & classical music lessons',
 '🎸', true, 1,
 ARRAY['music','instrument','guitar','guitar class','piano','keyboard','harmonium','tabla',
  'drums','drum kit','cajon','violin','flute','bansuri','sitar','veena','sarangi','santoor',
  'vocal','singing','classical','Hindustani','Carnatic','light music','ghazal','qawwali',
  'naat','nasheed','western vocal','rock','pop','jazz','blues','Trinity','ABRSM','mooseeqa']),

('d8fedd8d-168b-4571-be7f-a533943d2734',
 '2360f82d-519d-4d0d-a2b6-3e1d2fc89f06',
 'Dance Academy', 'dance-academy',
 'Classical, western, Bollywood, hip hop, Zumba & folk dance classes',
 '💃', true, 2,
 ARRAY['dance','dance class','dance academy','dance school','choreography','Bharatnatyam',
  'Kathak','Kuchipudi','Odissi','Mohiniyattam','hip hop','contemporary','jazz','ballet',
  'salsa','bachata','Zumba','aerobics','Bollywood','semi classical','folk','garba','bhangra',
  'Lavani','belly dance','freestyle','kids dance','wedding choreography','couple dance',
  'sangeet','performance','annual show','competition','raqss']),

('59d408d3-558a-42d2-9144-848cb4ccdd35',
 '2360f82d-519d-4d0d-a2b6-3e1d2fc89f06',
 'Art, Painting & Craft', 'art-painting-craft',
 'Drawing, watercolor, oil painting, pottery, sculpture & craft workshops',
 '🖼️', true, 3,
 ARRAY['art','art class','painting class','drawing','sketch','pencil sketch','charcoal',
  'watercolor','acrylic','oil painting','canvas','abstract','portrait','landscape',
  'calligraphy','Islamic calligraphy','Arabic calligraphy','mandala','zentangle','doodle',
  'pottery','ceramic','clay','terracotta','sculpture','resin art','fluid art','pour',
  'craft','DIY','paper craft','origami','quilling','decoupage','macrame','fann tashkeeli']),

-- ─────────────────────────────────────────────
-- Under: Diagnostic Lab (a1b2c3d4-...75)
-- ─────────────────────────────────────────────
('01bd670a-ec38-4bc6-b549-f13f0a32a89a',
 'de0bb5b3-c79e-44b6-a5ae-27692623b88c',
 'Pathology & Blood Tests', 'pathology-blood',
 'CBC, thyroid, diabetes, liver, kidney & routine blood investigations',
 '🩸', true, 1,
 ARRAY['pathology','blood test','CBC','hemoglobin','WBC','platelet','ESR','thyroid','TSH',
  'T3','T4','sugar','glucose','fasting','PP','HbA1c','lipid profile','cholesterol',
  'triglyceride','HDL','LDL','liver function','SGPT','SGOT','bilirubin','kidney','creatinine',
  'urea','uric acid','urine','stool','culture','sensitivity','vitamin D','B12','iron',
  'ferritin','hormone','PSA','CA125','tumor marker','tahleel damm']),

('cb2737c4-5d0d-4432-aa31-9d7165b0730b',
 'de0bb5b3-c79e-44b6-a5ae-27692623b88c',
 'Radiology & Imaging', 'radiology-imaging',
 'X-ray, ultrasound, MRI, CT scan, mammography & DEXA',
 '📷', true, 2,
 ARRAY['radiology','X-ray','x-ray','digital X-ray','ultrasound','USG','sonography',
  'Doppler','color Doppler','2D echo','echocardiography','MRI','CT scan','HRCT','PET scan',
  'PET CT','mammography','DEXA','bone density','OPG','dental X-ray','HSG','IVP',
  'barium','contrast','fluoroscopy','angiography','interventional','tasweer shuaaiyya']),

('354768a6-0e95-447a-b1fc-8f634fe66cdc',
 'de0bb5b3-c79e-44b6-a5ae-27692623b88c',
 'Health Checkup Packages', 'health-checkup',
 'Full body checkup, executive, cardiac, diabetic & preventive packages',
 '✅', true, 3,
 ARRAY['health checkup','full body checkup','master health','executive health','annual checkup',
  'preventive','cardiac checkup','diabetic package','senior citizen','women health','men health',
  'pre employment','pre marriage','corporate health','camp','health camp','wellness',
  'comprehensive','basic','advanced','premium','home collection','report online','fahs shaamil']),

-- ─────────────────────────────────────────────
-- Under: Insurance Agent (a1b2c3d4-...76)
-- ─────────────────────────────────────────────
('022408b7-c5be-45f8-b20f-93c1127f1805',
 'bd5563ab-6a04-4073-994e-19111cd619f9',
 'Life & Term Insurance', 'life-term-insurance',
 'Term plans, endowment, ULIP, pension & child plans',
 '👤', true, 1,
 ARRAY['life insurance','term insurance','term plan','endowment','money back','ULIP',
  'pension','retirement','annuity','child plan','education plan','savings','guaranteed',
  'maturity','premium','rider','accidental','critical illness','waiver','nomination',
  'LIC','ICICI Pru','HDFC Life','Max Life','SBI Life','Bajaj','Tata AIA','tameen hayaat']),

('12ffcf44-9305-47de-bb8a-91c827b9b666',
 'bd5563ab-6a04-4073-994e-19111cd619f9',
 'Health & Mediclaim', 'health-mediclaim',
 'Individual, family floater, super top-up & critical illness health insurance',
 '🏥', true, 2,
 ARRAY['health insurance','mediclaim','family floater','individual','super top up','top up',
  'critical illness','cancer','heart','daily cash','maternity','OPD','dental cover',
  'pre existing','waiting period','co-pay','deductible','sum insured','cashless','reimbursement',
  'Star Health','Care Health','Niva Bupa','ManipalCigna','Aditya Birla','tameen sihhi']),

('04cbe8f8-77f5-4050-bcc1-03f58f064f5c',
 'bd5563ab-6a04-4073-994e-19111cd619f9',
 'Motor & Vehicle Insurance', 'motor-vehicle-insurance',
 'Car, bike, commercial vehicle, third party & comprehensive motor cover',
 '🚗', true, 3,
 ARRAY['motor insurance','car insurance','bike insurance','two wheeler','four wheeler',
  'third party','TP','comprehensive','own damage','OD','IDV','NCB','no claim bonus',
  'add on','zero depreciation','engine protect','roadside assistance','towing',
  'commercial vehicle','fleet','truck','bus','taxi','New India','ICICI Lombard',
  'HDFC Ergo','Bajaj Allianz','Reliance','Tata AIG','Digit','tameen sayyara']),

('e7ad62d5-6510-46df-8447-2b7ba8ceff8f',
 'bd5563ab-6a04-4073-994e-19111cd619f9',
 'Property & Business Insurance', 'property-business-insurance',
 'Fire, burglary, shop, marine, liability & business interruption insurance',
 '🏢', true, 4,
 ARRAY['property insurance','fire insurance','burglary','theft','shop insurance','office',
  'factory','warehouse','stock','machinery','marine','transit','inland','export','import',
  'liability','professional liability','public liability','product liability','WC',
  'workmen compensation','keyman','directors','group insurance','employee','EDLI',
  'business interruption','loss of profit','natural disaster','tameen amlak']),

-- ─────────────────────────────────────────────
-- Under: Accounting & Tax (a1b2c3d4-...77)
-- ─────────────────────────────────────────────
('1f5964ed-9904-48fd-bfd0-6cdeef805fdc',
 '53538650-9d40-470e-ba53-3025a4d87170',
 'GST & Tax Filing', 'gst-tax-filing',
 'GST registration, return filing, ITR, TDS & tax planning',
 '📝', true, 1,
 ARRAY['GST','GST registration','GST return','GSTR-1','GSTR-3B','GSTR-9','annual return',
  'e-invoice','e-way bill','ITC','input tax credit','reconciliation','notice','reply',
  'ITR','income tax return','ITR-1','ITR-2','ITR-3','ITR-4','tax planning','deduction',
  '80C','80D','HRA','capital gain','TDS','TCS','advance tax','refund','taqdeem dareeba']),

('0d5996e5-1e11-4789-a39f-453fa284ceb2',
 '53538650-9d40-470e-ba53-3025a4d87170',
 'Audit & Assurance', 'audit-assurance',
 'Statutory audit, internal audit, tax audit & compliance',
 '🔍', true, 2,
 ARRAY['audit','statutory audit','tax audit','internal audit','concurrent','stock audit',
  'bank audit','co-operative','society audit','trust audit','NGO','Section 8','CARO',
  'compliance','annual compliance','ROC filing','DIR-3 KYC','DPT-3','MSME-1',
  'secretarial','CS','company secretary','AGM','board meeting','minutes','muraajaaa']),

('4f863592-f5d3-422f-a69a-eb19e039ac28',
 '53538650-9d40-470e-ba53-3025a4d87170',
 'Bookkeeping & Accounting', 'bookkeeping-accounting',
 'Tally, day-to-day accounting, reconciliation & MIS reports',
 '📒', true, 3,
 ARRAY['bookkeeping','accounting','Tally','Tally Prime','QuickBooks','Zoho Books','Busy',
  'ledger','journal','voucher','invoice','receipt','payment','bank reconciliation',
  'petty cash','TDS entry','GST entry','payroll','salary','PF','ESI','professional tax',
  'MIS','P&L','balance sheet','trial balance','cash flow','ratio','imsaak dafaatir']),

('a6413b2b-7dd2-433d-8cfa-8fe62cef7e5b',
 '53538650-9d40-470e-ba53-3025a4d87170',
 'Company Registration & Compliance', 'company-registration',
 'Pvt Ltd, LLP, partnership, trade license, FSSAI & MSME registration',
 '🏛️', true, 4,
 ARRAY['company registration','incorporate','Pvt Ltd','Private Limited','LLP','OPC',
  'partnership','proprietorship','firm registration','trade license','shop act','FSSAI',
  'food license','drug license','MSME','Udyam','startup India','DPIIT','trademark',
  'copyright','patent','GST registration','import export code','IEC','RCMC',
  'ISO','BIS','hallmark','legal entity','ROC','MCA','tasjeel sharika']);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  UPDATED SUMMARY                                                        ║
-- ║  105 top-level categories (10 existing updated, 95 new)                 ║
-- ║  184 subcategories across 42 parent categories                          ║
-- ║  289 total categories with comprehensive multilingual keywords          ║
-- ║  + keyword enrichment (misspellings, brands, Bohra terms)               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

COMMIT;
