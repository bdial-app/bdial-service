-- ============================================================================
-- Tijarah Connect — Comprehensive Category Seed with Keywords
-- Generated: 2026-04-28
-- Run AFTER: seed.sql + migration-search-keywords.sql
--
-- 30 top-level categories + 54 subcategories = 84 total
-- Each with comprehensive multilingual keywords (English, Hindi, Arabic)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SCHEMA GUARDS                                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_storage_key VARCHAR(300);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — UPDATE EXISTING 10 CATEGORIES WITH KEYWORDS               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Tailoring & Alterations
UPDATE categories SET keywords = ARRAY[
  'tailor','tailoring','darzi','stitching','sewing','silai','custom stitching','bespoke',
  'alteration','alterations','hemming','resizing','fitting','rida','abaya','burkha','burqa',
  'kurta','salwar','lehenga','lehnga','blouse','embroidery','zari','zardozi','thread work',
  'dress maker','seamstress','dressmaking','custom clothing','ethnic wear','saree blouse',
  'khayyat','kapde silai','boutique','fashion designer','ladies tailor','gents tailor',
  'silai wala','silai wali','darzi ki dukan','khayaat','tafsseel'
] WHERE id = '81f76d1c-2dbc-4134-830f-f46e8026695f';

-- 2. Catering & Tiffin
UPDATE categories SET keywords = ARRAY[
  'catering','caterer','tiffin','tiffin service','dabba','dabba service','home food',
  'home cooked','homemade food','lunch box','meal delivery','wedding catering','party food',
  'event catering','khana','nashta','thali','bohri food','bohri cuisine','biryani',
  'dastarkhwan','cook','bawarchi','chef','halal food','halal catering','corporate catering',
  'bulk order','function food','nikah catering','walima catering','aqeeqah food',
  'khansama','rasoi','dabba wala','tiffin wala','matbakh','taaam'
] WHERE id = 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f';

-- 3. Mehndi & Henna
UPDATE categories SET keywords = ARRAY[
  'mehndi','mehendi','mehandi','henna','bridal mehndi','dulhan mehndi','arabic mehndi',
  'indian mehndi','rajasthani mehndi','mehndi artist','henna artist','henna design',
  'party mehndi','festive mehndi','eid mehndi','wedding mehndi','finger mehndi',
  'hand design','kids mehndi','mehndi wali','temporary tattoo','mehndi cone','nail art',
  'heena','mahendi','bridal henna','organic henna','henna tattoo','mehndi designer',
  'hinna','naqsh'
] WHERE id = '81f631d4-a392-41a7-9777-a4774c66e0a8';

-- 4. Electronics Repair
UPDATE categories SET keywords = ARRAY[
  'electronics','repair','mobile repair','phone repair','cell phone','smartphone',
  'laptop repair','computer repair','PC repair','TV repair','television repair','LED repair',
  'washing machine repair','refrigerator repair','fridge repair','microwave repair',
  'oven repair','appliance repair','gadget repair','screen replacement','battery replacement',
  'motherboard repair','charging port','display repair','mistri','technician',
  'service center','AMC','annual maintenance','warranty repair','data recovery','water damage',
  'electronic shop','bijli ka saman','tamir','islah'
] WHERE id = '5fb8d16c-2720-497d-b2eb-d6899be578c7';

-- 5. Sweets & Bakery
UPDATE categories SET keywords = ARRAY[
  'sweets','sweet shop','mithai','mithai shop','bakery','cake','cake shop','pastry','cookies',
  'biscuit','namkeen','confectionery','halwai','malpua','halwa','barfi','ladoo','laddoo',
  'peda','jalebi','gulab jamun','rasgulla','sweet box','birthday cake','wedding cake',
  'custom cake','eggless cake','chocolate','dessert','meethai','kheer','firni','sheer khurma',
  'celebration cake','fondant cake','cupcake','brownie','doughnut','donut','murabba',
  'mithai wala','halwai ki dukan','hulwiyyaat','halwa'
] WHERE id = 'f4188f3f-8a14-4e62-a95b-4715c333e861';

-- 6. Home Services
UPDATE categories SET keywords = ARRAY[
  'home service','home repair','household','house repair','home maintenance','handyman',
  'plumbing','plumber','electrical','electrician','carpenter','carpentry','painting','painter',
  'wall painting','cleaning','deep cleaning','house cleaning','waterproofing','pest control',
  'AC service','air conditioner','geyser repair','RO repair','water purifier','chimney',
  'installation','mistri','karigar','kaam wala','home renovation','bathroom repair',
  'kitchen repair','leakage','seepage','ghar ki marammat','khadamaat manziliyya'
] WHERE id = 'eb2263dd-87c5-421e-ac24-a3c5c754108f';

-- 7. Beauty & Salon
UPDATE categories SET keywords = ARRAY[
  'beauty','salon','parlour','parlor','beauty parlour','ladies salon','gents salon',
  'unisex salon','hair','haircut','hairstyle','hair styling','hair color','hair dye','facial',
  'cleanup','threading','waxing','bleach','makeup','make up','bridal makeup','grooming',
  'spa','massage','body massage','skin care','skincare','keratin','smoothening','straightening',
  'rebonding','manicure','pedicure','nail art','beautician','nai','barber','hair treatment',
  'dandruff','hair fall','hair spa','head massage','beauty parlour wali','tajmeel','hammaam'
] WHERE id = '7d154385-52fb-443b-9954-6eb400257ad1';

-- 8. Photography
UPDATE categories SET keywords = ARRAY[
  'photography','photographer','videography','videographer','camera','photo','photo studio',
  'wedding photography','wedding videography','event photography','portrait','headshot',
  'drone','drone photography','aerial','album','photo album','photo editing','video editing',
  'cinematography','pre-wedding','pre wedding shoot','maternity shoot','baby shoot','newborn',
  'product photography','studio','passport photo','photoshoot','photo session','reel',
  'reels making','documentary','corporate video','ad film','tasweer','musawwir'
] WHERE id = '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82';

-- 9. Tuition & Coaching
UPDATE categories SET keywords = ARRAY[
  'tuition','coaching','tutoring','tutor','teacher','classes','academy','institute',
  'education','learning','school','homework help','maths tuition','science tuition',
  'english tuition','hindi tuition','SSC','CBSE','ICSE','IIT coaching','NEET coaching',
  'JEE coaching','competitive exam','board exam','quran','quran classes','hifz',
  'hifz classes','islamic studies','deeniyat','arabic classes','online tuition','home tuition',
  'batch classes','private tuition','subject expert','coaching center','test prep',
  'exam preparation','taalim','ustaad','muallim','madrasa','maktab'
] WHERE id = 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0';

-- 10. Event Planning
UPDATE categories SET keywords = ARRAY[
  'event','events','event planning','event planner','wedding planner','party planning',
  'celebration','birthday party','anniversary','decoration','decor','decorator','mandap',
  'shamiana','tent','tent house','pandal','stage','stage decoration','lighting','sound system',
  'DJ','disc jockey','flower decoration','florist','theme party','balloon decoration',
  'banquet','hall booking','venue','entertainment','mehfil','walima','nikah','aqeeqah',
  'milad','jashn','wedding decor','reception','sangeet','engagement','haflah','munazzim'
] WHERE id = '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — NEW TOP-LEVEL CATEGORIES (11–30)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 11. Automotive & Vehicles
('aa000011-0000-4000-a000-000000000011',
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
('aa000012-0000-4000-a000-000000000012',
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
('aa000013-0000-4000-a000-000000000013',
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
('aa000014-0000-4000-a000-000000000014',
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
('aa000015-0000-4000-a000-000000000015',
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
('aa000016-0000-4000-a000-000000000016',
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
('aa000017-0000-4000-a000-000000000017',
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
('aa000018-0000-4000-a000-000000000018',
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
('aa000019-0000-4000-a000-000000000019',
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
('aa000020-0000-4000-a000-000000000020',
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
('aa000021-0000-4000-a000-000000000021',
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
('aa000022-0000-4000-a000-000000000022',
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
('aa000023-0000-4000-a000-000000000023',
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
('aa000024-0000-4000-a000-000000000024',
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
('aa000025-0000-4000-a000-000000000025',
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
('aa000026-0000-4000-a000-000000000026',
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
('aa000027-0000-4000-a000-000000000027',
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
('aa000028-0000-4000-a000-000000000028',
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
('aa000029-0000-4000-a000-000000000029',
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
('aa000030-0000-4000-a000-000000000030',
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
('bb010100-0000-4000-a000-000001000100',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Rida & Abaya Stitching', 'rida-abaya',
 'Custom Rida, Abaya & Islamic women''s wear stitching',
 '🧕', true, 1,
 ARRAY['rida','abaya','burkha','burqa','hijab stitching','pardah','islamic clothing',
  'muslim women wear','abaya design','custom rida','rida alteration','abaya tailor',
  'rida designer','abaya boutique','modest wear','modest fashion','libas','thawb nisa']),

('bb010200-0000-4000-a000-000001000200',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Bridal Wear', 'bridal-wear',
 'Bridal lehenga, nikah outfits & wedding collection',
 '👰', true, 2,
 ARRAY['bridal','bride','dulhan','wedding outfit','wedding dress','lehnga','lehenga',
  'sharara','gharara','bridal embroidery','nikah dress','walima dress','reception outfit',
  'wedding collection','designer bridal','bridal boutique','trousseau','jahez','aroos']),

('bb010300-0000-4000-a000-000001000300',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Men''s Tailoring', 'mens-tailoring',
 'Suits, sherwanis, kurta-pajama & formal menswear',
 '🤵', true, 3,
 ARRAY['mens tailor','gents tailor','suit stitching','shirt stitching','trouser','pant',
  'kurta pajama','sherwani','pathani suit','achkan','waistcoat','nehru jacket','blazer',
  'formal wear','mardana silai','gents darzi','safari suit','jodhpuri','bandgala']),

('bb010400-0000-4000-a000-000001000400',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Embroidery & Zari Work', 'embroidery-zari',
 'Hand & machine embroidery, zari, zardozi & aari work',
 '✨', true, 4,
 ARRAY['embroidery','zari','zardozi','aari work','thread work','mirror work','sequin',
  'bead work','hand embroidery','machine embroidery','chikankari','lucknowi','phulkari',
  'kashida','dabka','resham','applique','patch work','cutwork','tatreez','naqsh']),

('bb010500-0000-4000-a000-000001000500',
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
('bb020100-0000-4000-a000-000002000100',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Wedding Catering', 'wedding-catering',
 'Full-service catering for nikah, walima & receptions',
 '💒', true, 1,
 ARRAY['wedding catering','shaadi ka khana','nikah catering','walima','reception food',
  'wedding menu','large event','banquet catering','grand feast','dawat','wedding feast',
  'marriage catering','500 plate','1000 plate','wedding buffet','wedding thali']),

('bb020200-0000-4000-a000-000002000200',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Tiffin & Dabba Service', 'tiffin-dabba',
 'Daily home-cooked meal delivery & lunch boxes',
 '🍱', true, 2,
 ARRAY['tiffin','dabba','lunch box','daily meals','home delivery meal','office lunch','mess',
  'PG food','student tiffin','monthly tiffin','weekly menu','daily thali','meal plan',
  'tiffin service','dabba wala','ghar ka khana delivery','home tiffin']),

('bb020300-0000-4000-a000-000002000300',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Party & Bulk Food', 'party-food',
 'Catering for parties, gatherings & bulk food orders',
 '🍛', true, 3,
 ARRAY['party food','party catering','birthday food','get together','family gathering',
  'bulk order','snacks platter','appetizer','starter','finger food','cocktail snacks',
  'house party','celebration food','iftaar','sehri','mehfil food','dawat ka khana']),

('bb020400-0000-4000-a000-000002000400',
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
('bb040100-0000-4000-a000-000004000100',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Mobile & Phone Repair', 'mobile-repair',
 'Smartphone screen, battery, charging & software repair',
 '📱', true, 1,
 ARRAY['mobile repair','phone repair','smartphone repair','cell phone','iPhone repair',
  'Samsung repair','Vivo','Oppo','Realme','OnePlus','Xiaomi','Redmi','screen repair',
  'cracked screen','battery change','charging issue','water damage','software issue',
  'hang problem','slow phone','data recovery phone','back panel','camera repair phone',
  'mobile ki marammat','phone theek']),

('bb040200-0000-4000-a000-000004000200',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Laptop & Computer Repair', 'laptop-repair',
 'Laptop hardware, software, SSD upgrade & virus removal',
 '💻', true, 2,
 ARRAY['laptop repair','computer repair','PC repair','desktop repair','MacBook repair',
  'HP','Dell','Lenovo','Asus','Acer','keyboard repair','trackpad','SSD upgrade',
  'RAM upgrade','OS install','Windows install','formatting','virus removal','malware',
  'overheating','fan repair','hinge repair','motherboard repair laptop','screen repair laptop',
  'laptop ki marammat']),

('bb040300-0000-4000-a000-000004000300',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'TV & Display Repair', 'tv-repair',
 'LED, LCD, Smart TV repair, panel replacement & installation',
 '📺', true, 3,
 ARRAY['TV repair','television repair','LED TV','LCD TV','OLED','smart TV','TV screen',
  'display repair','panel repair','no picture','no sound','TV installation','wall mount',
  'set top box','remote','TV remote','power issue','backlight','inverter board',
  'TV ki marammat','television theek']),

('bb040400-0000-4000-a000-000004000400',
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
('bb060100-0000-4000-a000-000006000100',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Plumbing', 'plumbing',
 'Pipe fitting, leak repair, taps, drains & water tanks',
 '🔧', true, 1,
 ARRAY['plumber','plumbing','pipe','pipeline','tap','faucet','nalkaa','drain','drainage',
  'blocked drain','leak','leakage','water leak','toilet repair','commode','flush','tank',
  'overhead tank','water tank','water pump','motor','pipe fitting','basin','sink',
  'bathroom fitting','pipeline repair','sewer','nali','plumber near me','nalkaa wala',
  'sabbaak','anabib']),

('bb060200-0000-4000-a000-000006000200',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Electrical Work', 'electrical',
 'Wiring, switches, fan & light installation, MCB & earthing',
 '⚡', true, 2,
 ARRAY['electrician','electrical','wiring','rewiring','wire','switch','switchboard','socket',
  'MCB','circuit breaker','fuse','short circuit','power','power cut','fan installation',
  'light','light fitting','LED','tube light','chandelier','inverter','UPS','generator',
  'earthing','meter','electrical panel','DB box','ELCB','concealed wiring','open wiring',
  'bijli ka kaam','bijli mistri','kahrabaayi']),

('bb060300-0000-4000-a000-000006000300',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Carpentry', 'carpentry',
 'Door, window, cabinet, shelf & wooden partition work',
 '🪵', true, 3,
 ARRAY['carpenter','carpentry','wood work','door','door repair','door installation','window',
  'window repair','cabinet','shelf','rack','partition','wooden partition','false ceiling wood',
  'furniture repair','polishing','termite treatment wood','door frame','chaukhat',
  'almari repair','khidki','darwaza','khati','mistri','najjaar']),

('bb060400-0000-4000-a000-000006000400',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Deep Cleaning', 'deep-cleaning',
 'Full house, bathroom, kitchen & post-construction cleaning',
 '🧹', true, 4,
 ARRAY['deep cleaning','house cleaning','home cleaning','apartment cleaning','flat cleaning',
  'bathroom cleaning','kitchen cleaning','floor cleaning','mopping','scrubbing',
  'sanitization','disinfection','sofa cleaning','mattress cleaning','carpet cleaning',
  'window cleaning','post construction cleaning','move in cleaning','move out cleaning',
  'spring cleaning','safai','safai wala','tanzheef']),

('bb060500-0000-4000-a000-000006000500',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Painting & Waterproofing', 'painting-waterproofing',
 'Interior & exterior painting, texture, POP & leak solutions',
 '🖌️', true, 5,
 ARRAY['painting','painter','house painting','wall painting','exterior painting',
  'interior painting','texture','texture painting','POP','putty','primer','emulsion',
  'distemper','enamel','wood polish','waterproofing','leakage solution',
  'terrace waterproofing','bathroom waterproofing','damp','dampness','seepage','moisture',
  'crack repair','white wash','colour','color','rang','rangai','rang wala','dihaan','tilaay']),

('bb060600-0000-4000-a000-000006000600',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Pest Control', 'pest-control',
 'Termite, cockroach, mosquito, rodent & bed bug treatment',
 '🐜', true, 6,
 ARRAY['pest control','pest','termite','deemak','cockroach','ant','mosquito','lizard','rat',
  'rodent','mice','bed bug','khatmal','spider','bee removal','wasp','snake','fumigation',
  'spray','herbal pest control','organic pest control','keeda makoda','wood borer',
  'pest control near me','mukaafaha hasharaat']),

('bb060700-0000-4000-a000-000006000700',
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
('bb070100-0000-4000-a000-000007000100',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Hair Salon', 'hair-salon',
 'Haircuts, styling, color, keratin & hair treatments',
 '💇‍♀️', true, 1,
 ARRAY['hair salon','hair cut','haircut','hair style','hairstyle','styling','blow dry',
  'hair wash','shampoo','hair color','hair dye','highlights','balayage','ombre',
  'global color','root touch up','keratin treatment','smoothening','straightening',
  'rebonding','hair spa','dandruff treatment','hair fall treatment','trim','layer cut',
  'bob cut','pixie','baal','nai','baal katna','hallaaq']),

('bb070200-0000-4000-a000-000007000200',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Makeup & Bridal', 'makeup-bridal',
 'Party makeup, bridal makeup, HD & airbrush application',
 '💄', true, 2,
 ARRAY['makeup','make up','makeup artist','MUA','bridal makeup','dulhan','party makeup',
  'engagement makeup','reception look','airbrush makeup','HD makeup','foundation','concealer',
  'eye makeup','lip','contouring','glam','wedding makeup','mehndi function makeup',
  'sangeet look','haldi look','dulhan ka makeup','tajmeel aroos']),

('bb070300-0000-4000-a000-000007000300',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Spa & Massage', 'spa-massage',
 'Body massage, aromatherapy, steam & relaxation therapies',
 '💆', true, 3,
 ARRAY['spa','massage','body massage','head massage','foot massage','thai massage',
  'swedish massage','deep tissue','aromatherapy','hot stone','relaxation','stress relief',
  'wellness','body wrap','body scrub','sauna','steam bath','jacuzzi','hammam','oil massage',
  'ayurvedic massage','malish','champee','tadleek']),

('bb070400-0000-4000-a000-000007000400',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Skin Care', 'skin-care',
 'Facials, cleanup, bleach, de-tan & skin treatments',
 '✨', true, 4,
 ARRAY['skin care','skincare','facial','clean up','cleanup','face','glow','brightness',
  'tan removal','pigmentation','acne','pimple','dark spots','anti aging','anti wrinkle',
  'gold facial','diamond facial','fruit facial','bleach','de-tan','face pack','face mask',
  'chemical peel','microdermabrasion','skin treatment','derma','twacha','inaayat al-bashra']),

('bb070500-0000-4000-a000-000007000500',
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
('bb090100-0000-4000-a000-000009000100',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Academic Tutoring', 'academic-tutoring',
 'School subjects: maths, science, English & board exam prep',
 '📖', true, 1,
 ARRAY['academic','school','CBSE','ICSE','SSC','state board','maths','mathematics','science',
  'physics','chemistry','biology','english','hindi','social studies','history','geography',
  'economics','commerce','accounts','tuition class','home tuition','online class','homework',
  'assignment','class 10','class 12','primary','secondary','higher secondary',
  'padhai','taaleem']),

('bb090200-0000-4000-a000-000009000200',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Quran & Islamic Studies', 'quran-islamic',
 'Quran reading, hifz, tajweed, deeniyat & Arabic language',
 '📿', true, 2,
 ARRAY['quran','quran class','hifz','hifz class','hafiz','nazira','qaida','tajweed','tajwid',
  'islamic','islamic studies','deeniyat','deen','arabic','arabic language','namaz','salah',
  'fiqh','hadees','hadith','seerah','dua','madrasa','maktab','maulana','alim','aalim',
  'diniyat','taalim','muallim','quran teacher','tahfeez','tilawat']),

('bb090300-0000-4000-a000-000009000300',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Language Classes', 'language-classes',
 'English speaking, IELTS, Hindi, Urdu, Arabic & foreign languages',
 '🗣️', true, 3,
 ARRAY['language','english speaking','spoken english','IELTS','TOEFL','communication','hindi',
  'urdu','arabic','french','german','spanish','japanese','mandarin','foreign language',
  'language course','grammar','vocabulary','pronunciation','fluency','speaking','writing',
  'reading','language tutor','lisaniyat','lugha']),

('bb090400-0000-4000-a000-000009000400',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Competitive Exam', 'competitive-exam',
 'IIT, NEET, UPSC, banking, SSC & entrance exam coaching',
 '🎯', true, 4,
 ARRAY['competitive exam','entrance exam','IIT','JEE','NEET','UPSC','MPSC','SSC CGL',
  'banking','bank exam','IBPS','SBI','railway','RRB','GATE','CAT','MBA','CLAT',
  'law entrance','NDA','CDS','defence','government exam','sarkari naukri','test series',
  'mock test','previous year','study material','imtihaan']),

('bb090500-0000-4000-a000-000009000500',
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
('bb100100-0000-4000-a000-000010000100',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Wedding Planning', 'wedding-planning',
 'Full wedding management, coordination & vendor booking',
 '💒', true, 1,
 ARRAY['wedding','shaadi','nikah','walima','wedding planner','wedding coordinator',
  'wedding management','marriage','vivah','byaah','wedding venue','wedding budget',
  'wedding timeline','guest management','vendor management','destination wedding',
  'royal wedding','wedding consultant','shaadi planner','zafaaf']),

('bb100200-0000-4000-a000-000010000200',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Decoration & Mandap', 'decoration-mandap',
 'Stage, flower, balloon, LED & theme decoration',
 '🎊', true, 2,
 ARRAY['decoration','decor','mandap','stage','stage decoration','entrance','gate decoration',
  'ceiling decoration','flower decoration','flower arrangement','floral','balloon',
  'balloon decoration','theme decoration','birthday decoration','anniversary decoration',
  'cradle ceremony','naming ceremony','aqeeqah decoration','milad decoration',
  'LED decoration','fairy lights','sajawat','zaynah']),

('bb100300-0000-4000-a000-000010000300',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Tent & Shamiana', 'tent-shamiana',
 'Tent house, shamiana, furniture rental & event setup',
 '⛺', true, 3,
 ARRAY['tent','shamiana','pandal','canopy','tent house','marquee','chairs','tables',
  'furniture rental','crockery','utensils','bartan','catering equipment','stage setup',
  'red carpet','durry','carpet','seating arrangement','outdoor setup','wedding tent',
  'event tent','rental','furniture on rent','khayma']),

('bb100400-0000-4000-a000-000010000400',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Sound & Lighting', 'sound-lighting',
 'DJ, PA systems, LED screens, projectors & event lighting',
 '🎧', true, 4,
 ARRAY['sound','sound system','speaker','PA system','amplifier','microphone','mic','DJ',
  'disc jockey','DJ service','lighting','LED lights','par lights','moving head','laser',
  'projector','screen','LED screen','LED wall','stage lighting','event lighting',
  'audio visual','AV','music system','karaoke','sawt','idhaaa']),

('bb100500-0000-4000-a000-000010000500',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Florist', 'florist',
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
('bb110100-0000-4000-a000-000011000100',
 'aa000011-0000-4000-a000-000000000011',
 'Car Repair & Service', 'car-repair',
 'Engine, brake, suspension, AC & general car servicing',
 '🔧', true, 1,
 ARRAY['car repair','car service','car mechanic','car garage','engine repair','engine overhaul',
  'oil change','car oil','brake repair','brake pad','clutch repair','gear box','transmission',
  'suspension','shock absorber','power steering','car electrical','car AC','car AC repair',
  'tune up','car diagnostic','OBD','check engine','gadi ki repair','islah sayyara']),

('bb110200-0000-4000-a000-000011000200',
 'aa000011-0000-4000-a000-000000000011',
 'Two-Wheeler Service', 'two-wheeler',
 'Bike, scooter & motorcycle repair & servicing',
 '🏍️', true, 2,
 ARRAY['bike repair','bike service','motorcycle repair','scooter repair','scooty','activa',
  'two wheeler service','puncture repair','bike mechanic','chain','sprocket','battery',
  'kick start','self start','carburetor','fuel injection','silencer','exhaust',
  'tyre change bike','bike oil change','bike wash','bike ki marammat','darraaja naariyya']),

('bb110300-0000-4000-a000-000011000300',
 'aa000011-0000-4000-a000-000000000011',
 'Car Wash & Detailing', 'car-wash',
 'Car washing, detailing, ceramic coating & polishing',
 '🚿', true, 3,
 ARRAY['car wash','car cleaning','car detailing','interior cleaning','exterior wash',
  'foam wash','pressure wash','ceramic coating','teflon coating','PPF','paint protection',
  'polishing','buffing','wax','scratch removal','headlight restoration','engine wash',
  'underbody coating','anti rust','car spa','gadi dhulai','ghaseel sayyara']),

('bb110400-0000-4000-a000-000011000400',
 'aa000011-0000-4000-a000-000000000011',
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
('bb120100-0000-4000-a000-000012000100',
 'aa000012-0000-4000-a000-000000000012',
 'General Physician', 'general-physician',
 'Family doctor, OPD, health checkups & general consultations',
 '👨‍⚕️', true, 1,
 ARRAY['general physician','GP','doctor','family doctor','clinic','OPD','consultation',
  'fever','cold','cough','flu','infection','general medicine','internal medicine','checkup',
  'health checkup','master health checkup','prescription','blood pressure','BP','diabetes',
  'sugar','thyroid','asthma','allergy','doctor near me','tabib aamm']),

('bb120200-0000-4000-a000-000012000200',
 'aa000012-0000-4000-a000-000000000012',
 'Dentist', 'dentist',
 'Dental clinic, root canal, braces, implants & teeth cleaning',
 '🦷', true, 2,
 ARRAY['dentist','dental','dental clinic','teeth','tooth','toothache','cavity','filling',
  'root canal','RCT','extraction','cleaning','scaling','polishing','braces','orthodontic',
  'alignment','implant','dental implant','crown','cap','bridge','denture','wisdom tooth',
  'gum','bleeding gum','whitening','bleaching','smile design','veneer',
  'pediatric dentist','dant','daant','tabib asnaan']),

('bb120300-0000-4000-a000-000012000300',
 'aa000012-0000-4000-a000-000000000012',
 'Pharmacy', 'pharmacy',
 'Chemist, medical store, prescription medicines & health products',
 '💊', true, 3,
 ARRAY['pharmacy','chemist','medical store','medicine','dawai','dawakhana','drug store',
  'prescription','OTC','over the counter','tablet','capsule','syrup','injection','insulin',
  'first aid','surgical','bandage','health product','vitamin','supplement','protein',
  'ayurvedic medicine','homeopathic medicine','generic medicine','online pharmacy',
  'home delivery medicine','24 hour pharmacy','saydaliyya']),

('bb120400-0000-4000-a000-000012000400',
 'aa000012-0000-4000-a000-000000000012',
 'Pathology & Lab', 'pathology-lab',
 'Blood tests, diagnostics, X-ray, ultrasound & health screenings',
 '🔬', true, 4,
 ARRAY['pathology','lab','laboratory','blood test','urine test','diagnostic',
  'diagnostic center','health test','CBC','sugar test','thyroid test','lipid profile',
  'liver function','kidney function','X-ray','xray','ultrasound','sonography','ECG','echo',
  'MRI','CT scan','biopsy','culture','sensitivity','COVID test','RT-PCR',
  'home collection','sample collection','mukhtabar']),

('bb120500-0000-4000-a000-000012000500',
 'aa000012-0000-4000-a000-000000000012',
 'Physiotherapy', 'physiotherapy',
 'Pain management, rehab, sports injury & mobility therapy',
 '🏃', true, 5,
 ARRAY['physiotherapy','physio','physiotherapist','physical therapy','rehab','rehabilitation',
  'back pain','neck pain','joint pain','knee pain','shoulder pain','sports injury','fracture',
  'post surgery','stroke rehab','paralysis','cerebral palsy','exercise therapy',
  'electrotherapy','ultrasound therapy','TENS','IFT','wax therapy','traction',
  'cupping','dry needling','ilaaj tabii']),

('bb120600-0000-4000-a000-000012000600',
 'aa000012-0000-4000-a000-000000000012',
 'Alternative Medicine', 'alternative-medicine',
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
('bb160100-0000-4000-a000-000016000100',
 'aa000016-0000-4000-a000-000000000016',
 'Civil Contractor', 'civil-contractor',
 'House & commercial building construction, project management',
 '👷', true, 1,
 ARRAY['contractor','thekedar','civil contractor','building contractor','house construction',
  'commercial construction','industrial construction','road construction','labour contractor',
  'project management','site engineer','site supervisor','construction company','turnkey',
  'estimation','quotation','BOQ','bill of quantities','RCC work','structural work',
  'muqaawil','binaa']),

('bb160200-0000-4000-a000-000016000200',
 'aa000016-0000-4000-a000-000000000016',
 'Mason & Bricklayer', 'mason',
 'Brick work, plastering, foundation, columns & slabs',
 '🧱', true, 2,
 ARRAY['mason','raj mistri','rajmistri','bricklayer','masonry','brick work','block work',
  'plastering','plaster','wall construction','boundary wall','compound wall','foundation',
  'footing','column','beam','slab','lintel','staircase','ramp','concrete','cement work',
  'mortar','pointing','repair work','bannaa']),

('bb160300-0000-4000-a000-000016000300',
 'aa000016-0000-4000-a000-000000000016',
 'Architect & Design', 'architect',
 'Building plans, 3D elevations, structural design & approvals',
 '📐', true, 3,
 ARRAY['architect','architecture','building design','house design','floor plan','elevation',
  '3D elevation','structural design','MEP','building permit','plan approval','BMC approval',
  'RERA','green building','sustainable design','vastu','vastu consultant','plot planning',
  'layout','site plan','construction drawing','working drawing','miimaar','handasa']),

('bb160400-0000-4000-a000-000016000400',
 'aa000016-0000-4000-a000-000000000016',
 'Fabrication & Welding', 'fabrication-welding',
 'Iron & steel gates, grills, railings, sheds & welding work',
 '⚙️', true, 4,
 ARRAY['fabrication','welding','welder','lohar','iron work','steel work','SS',
  'stainless steel','MS','mild steel','gate','main gate','grill','window grill','railing',
  'handrail','staircase railing','balcony railing','shed','car parking shed',
  'industrial shed','godown','structural steel','fire escape','ladder','tank stand',
  'water tank stand','trolley','lihaam','hadeed']),

('bb160500-0000-4000-a000-000016000500',
 'aa000016-0000-4000-a000-000000000016',
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
('bb270100-0000-4000-a000-000027000100',
 'aa000027-0000-4000-a000-000000000027',
 'Web & App Development', 'web-app-dev',
 'Websites, mobile apps, e-commerce, CMS & custom software',
 '🌐', true, 1,
 ARRAY['web development','website','website design','web design','web developer',
  'landing page','e-commerce','ecommerce','online store','WordPress','Shopify','React',
  'Angular','frontend','backend','full stack','API','mobile app','Android app','iOS app',
  'Flutter','React Native','UI design','UX design','responsive design','PWA','CMS',
  'custom software','ERP','tatbeeq','mawqii']),

('bb270200-0000-4000-a000-000027000200',
 'aa000027-0000-4000-a000-000000000027',
 'CCTV & Security', 'cctv-security',
 'CCTV installation, security cameras, access control & alarms',
 '📹', true, 2,
 ARRAY['CCTV','CCTV installation','security camera','surveillance','surveillance system',
  'IP camera','dome camera','bullet camera','PTZ','NVR','DVR','monitor','night vision',
  'motion detection','access control','biometric','fingerprint','face recognition',
  'attendance system','boom barrier','video intercom','alarm','burglar alarm','fire alarm',
  'home security','office security','muraaqaba','amn']),

('bb270300-0000-4000-a000-000027000300',
 'aa000027-0000-4000-a000-000000000027',
 'Computer Sales & Repair', 'computer-sales-repair',
 'Desktops, laptops, peripherals, networking & repair',
 '🖥️', true, 3,
 ARRAY['computer','PC','desktop','laptop','MacBook','iMac','computer shop','computer store',
  'computer repair','laptop repair','hardware','motherboard','processor','RAM','SSD',
  'hard disk','HDD','graphics card','GPU','power supply','SMPS','cabinet','keyboard','mouse',
  'monitor','printer','scanner','networking','router','switch','cable','LAN','CAT6','fiber',
  'haasib','ajhiza']),

('bb270400-0000-4000-a000-000027000400',
 'aa000027-0000-4000-a000-000000000027',
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
-- ║  SUMMARY                                                                ║
-- ║  30 top-level categories (10 existing updated, 20 new)                  ║
-- ║  54 subcategories across 11 parent categories                           ║
-- ║  84 total categories with comprehensive multilingual keywords           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

COMMIT;
