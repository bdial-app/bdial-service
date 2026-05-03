-- ============================================================================
-- Tijarah Connect â€” Comprehensive Category Seed with Keywords
-- Generated: 2026-04-28
-- Run AFTER: seed.sql + migration-search-keywords.sql
--
-- 30 top-level categories + 54 subcategories = 84 total
-- Each with comprehensive multilingual keywords (English, Hindi, Arabic)
-- ============================================================================

BEGIN;

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SCHEMA GUARDS                                                         â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_storage_key VARCHAR(300);

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SECTION 1 â€” UPDATE EXISTING 10 CATEGORIES WITH KEYWORDS               â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SECTION 2 â€” NEW TOP-LEVEL CATEGORIES (11â€“30)                          â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 11. Automotive & Vehicles
('6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Automotive & Vehicles', 'automotive',
 'Car & bike repair, servicing, car wash & driving school',
 'ðŸš—', true, 11,
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
 'ðŸ¥', true, 12,
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
 'ðŸ’ª', true, 13,
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
 'âš–ï¸', true, 14,
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
 'ðŸ¢', true, 15,
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
 'ðŸ—ï¸', true, 16,
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
 'ðŸŽ¨', true, 17,
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
 'ðŸªŸ', true, 18,
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
 'ðŸª‘', true, 19,
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
 'ðŸ–¨ï¸', true, 20,
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
 'ðŸ’', true, 21,
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
 'âœˆï¸', true, 22,
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
 'ðŸ“¦', true, 23,
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
 'ðŸ‘”', true, 24,
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
 'ðŸ›’', true, 25,
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
 'ðŸ‘—', true, 26,
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
 'ðŸ’»', true, 27,
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
 'ðŸ¾', true, 28,
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
 'ðŸŒ±', true, 29,
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
 'ðŸšš', true, 30,
 ARRAY[
  'courier','delivery','parcel','package','shipping','dispatch','express delivery',
  'express courier','same day delivery','next day delivery','overnight','document delivery',
  'document courier','letter','speed post','registered post','international courier',
  'domestic courier','tracking','track parcel','pickup','pick up','door to door','logistics',
  'e-commerce','ecommerce delivery','food delivery','medicine delivery','grocery delivery',
  'bulk courier','franking','postal','post office','last mile','hyperlocal delivery',
  'on demand delivery','instant delivery','bharosa courier','bareed','tawseel'
])
ON CONFLICT (id) DO NOTHING;

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SECTION 3 â€” SUBCATEGORIES                                             â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Tailoring & Alterations (81f76d1c)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('3dc2fa32-b84c-4e0a-8847-333fe833b61e',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Rida & Abaya Stitching', 'rida-abaya',
 'Custom Rida, Abaya & Islamic women''s wear stitching',
 'ðŸ§•', true, 1,
 ARRAY['rida','abaya','burkha','burqa','hijab stitching','pardah','islamic clothing',
  'muslim women wear','abaya design','custom rida','rida alteration','abaya tailor',
  'rida designer','abaya boutique','modest wear','modest fashion','libas','thawb nisa']),

('da21a285-fbe7-4708-bf5b-5bccb68bb7f1',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Bridal Wear', 'bridal-wear',
 'Bridal lehenga, nikah outfits & wedding collection',
 'ðŸ‘°', true, 2,
 ARRAY['bridal','bride','dulhan','wedding outfit','wedding dress','lehnga','lehenga',
  'sharara','gharara','bridal embroidery','nikah dress','walima dress','reception outfit',
  'wedding collection','designer bridal','bridal boutique','trousseau','jahez','aroos']),

('aa39bcfc-f653-4f1a-ac93-1ac49cd25a6d',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Men''s Tailoring', 'mens-tailoring',
 'Suits, sherwanis, kurta-pajama & formal menswear',
 'ðŸ¤µ', true, 3,
 ARRAY['mens tailor','gents tailor','suit stitching','shirt stitching','trouser','pant',
  'kurta pajama','sherwani','pathani suit','achkan','waistcoat','nehru jacket','blazer',
  'formal wear','mardana silai','gents darzi','safari suit','jodhpuri','bandgala']),

('0c4dd18c-05a1-41f0-9f69-809e991cbca2',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Embroidery & Zari Work', 'embroidery-zari',
 'Hand & machine embroidery, zari, zardozi & aari work',
 'âœ¨', true, 4,
 ARRAY['embroidery','zari','zardozi','aari work','thread work','mirror work','sequin',
  'bead work','hand embroidery','machine embroidery','chikankari','lucknowi','phulkari',
  'kashida','dabka','resham','applique','patch work','cutwork','tatreez','naqsh']),

('7311e65e-a423-40b6-bdaf-2fe4a8f9f39f',
 '81f76d1c-2dbc-4134-830f-f46e8026695f',
 'Alterations & Repairs', 'alterations-repairs',
 'Hemming, resizing, zip repair & garment fixes',
 'ðŸ§·', true, 5,
 ARRAY['alteration','repair','hemming','shortening','lengthening','resizing','zip repair',
  'zip replacement','button','lining','patch','darning','fitting adjustment',
  'trouser alteration','dress alteration','waist adjustment','sleeve alteration',
  'kapde ki marammat','islah malaabis'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Catering & Tiffin (a013ac6e)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('fc358d68-3935-42ad-9581-7fe5c3bdcef9',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Wedding Catering', 'wedding-catering',
 'Full-service catering for nikah, walima & receptions',
 'ðŸ’’', true, 1,
 ARRAY['wedding catering','shaadi ka khana','nikah catering','walima','reception food',
  'wedding menu','large event','banquet catering','grand feast','dawat','wedding feast',
  'marriage catering','500 plate','1000 plate','wedding buffet','wedding thali']),

('80b53a1c-fde8-46ae-9c27-0bac7c1c90d4',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Tiffin & Dabba Service', 'tiffin-dabba',
 'Daily home-cooked meal delivery & lunch boxes',
 'ðŸ±', true, 2,
 ARRAY['tiffin','dabba','lunch box','daily meals','home delivery meal','office lunch','mess',
  'PG food','student tiffin','monthly tiffin','weekly menu','daily thali','meal plan',
  'tiffin service','dabba wala','ghar ka khana delivery','home tiffin']),

('026ca80c-ab4f-49da-9c55-03592e3b205c',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Party & Bulk Food', 'party-food',
 'Catering for parties, gatherings & bulk food orders',
 'ðŸ›', true, 3,
 ARRAY['party food','party catering','birthday food','get together','family gathering',
  'bulk order','snacks platter','appetizer','starter','finger food','cocktail snacks',
  'house party','celebration food','iftaar','sehri','mehfil food','dawat ka khana']),

('cb1e926a-8c41-4704-a660-77d1e2ed712f',
 'a013ac6e-deda-4e16-9b3d-bd5ce9a1fa6f',
 'Bohri Cuisine', 'bohri-cuisine',
 'Authentic Bohri thaal, specialties & traditional dishes',
 'ðŸ¥˜', true, 4,
 ARRAY['bohri','bohri food','bohra','dawoodi bohra','thaal','naan khatai','dal chawal palida',
  'smoked mutton','raan','bohri biryani','muthiya','kharees','malida','community food',
  'bohri thaal','sabudana khichdi','chicken roast bohri','bohri dabba','lagan nu custard'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Electronics Repair (5fb8d16c)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('babb23a0-38af-4b8b-ad30-a56cd8938d0b',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Mobile & Phone Repair', 'mobile-repair',
 'Smartphone screen, battery, charging & software repair',
 'ðŸ“±', true, 1,
 ARRAY['mobile repair','phone repair','smartphone repair','cell phone','iPhone repair',
  'Samsung repair','Vivo','Oppo','Realme','OnePlus','Xiaomi','Redmi','screen repair',
  'cracked screen','battery change','charging issue','water damage','software issue',
  'hang problem','slow phone','data recovery phone','back panel','camera repair phone',
  'mobile ki marammat','phone theek']),

('d1315bf1-0dec-47eb-882f-d1e9f447e718',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Laptop & Computer Repair', 'laptop-repair',
 'Laptop hardware, software, SSD upgrade & virus removal',
 'ðŸ’»', true, 2,
 ARRAY['laptop repair','computer repair','PC repair','desktop repair','MacBook repair',
  'HP','Dell','Lenovo','Asus','Acer','keyboard repair','trackpad','SSD upgrade',
  'RAM upgrade','OS install','Windows install','formatting','virus removal','malware',
  'overheating','fan repair','hinge repair','motherboard repair laptop','screen repair laptop',
  'laptop ki marammat']),

('311e5dff-f39e-4a2c-823a-2daa66ad622c',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'TV & Display Repair', 'tv-repair',
 'LED, LCD, Smart TV repair, panel replacement & installation',
 'ðŸ“º', true, 3,
 ARRAY['TV repair','television repair','LED TV','LCD TV','OLED','smart TV','TV screen',
  'display repair','panel repair','no picture','no sound','TV installation','wall mount',
  'set top box','remote','TV remote','power issue','backlight','inverter board',
  'TV ki marammat','television theek']),

('9e18a860-fb0c-4b05-bab7-b75e5793f60f',
 '5fb8d16c-2720-497d-b2eb-d6899be578c7',
 'Appliance Repair', 'appliance-repair',
 'Washing machine, fridge, microwave, geyser & chimney repair',
 'ðŸ”Œ', true, 4,
 ARRAY['appliance repair','washing machine repair','refrigerator repair','fridge repair',
  'microwave repair','oven repair','dishwasher','geyser repair','water heater','chimney repair',
  'air cooler','mixer grinder repair','iron repair','fan repair','inverter repair',
  'stabilizer repair','RO repair','water purifier repair','induction repair',
  'gharelu upkaran ki marammat'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Home Services (eb2263dd)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('811f09de-a8d8-414f-a4c9-774b0f792687',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Plumbing', 'plumbing',
 'Pipe fitting, leak repair, taps, drains & water tanks',
 'ðŸ”§', true, 1,
 ARRAY['plumber','plumbing','pipe','pipeline','tap','faucet','nalkaa','drain','drainage',
  'blocked drain','leak','leakage','water leak','toilet repair','commode','flush','tank',
  'overhead tank','water tank','water pump','motor','pipe fitting','basin','sink',
  'bathroom fitting','pipeline repair','sewer','nali','plumber near me','nalkaa wala',
  'sabbaak','anabib']),

('eac6fd09-b515-424e-8bf9-20210350fc8c',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Electrical Work', 'electrical',
 'Wiring, switches, fan & light installation, MCB & earthing',
 'âš¡', true, 2,
 ARRAY['electrician','electrical','wiring','rewiring','wire','switch','switchboard','socket',
  'MCB','circuit breaker','fuse','short circuit','power','power cut','fan installation',
  'light','light fitting','LED','tube light','chandelier','inverter','UPS','generator',
  'earthing','meter','electrical panel','DB box','ELCB','concealed wiring','open wiring',
  'bijli ka kaam','bijli mistri','kahrabaayi']),

('44842a38-0969-46b4-bc29-c099fd0410ee',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Carpentry', 'carpentry',
 'Door, window, cabinet, shelf & wooden partition work',
 'ðŸªµ', true, 3,
 ARRAY['carpenter','carpentry','wood work','door','door repair','door installation','window',
  'window repair','cabinet','shelf','rack','partition','wooden partition','false ceiling wood',
  'furniture repair','polishing','termite treatment wood','door frame','chaukhat',
  'almari repair','khidki','darwaza','khati','mistri','najjaar']),

('34801f1d-5f1d-4869-b3ac-bf8d09ca8b53',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Deep Cleaning', 'deep-cleaning',
 'Full house, bathroom, kitchen & post-construction cleaning',
 'ðŸ§¹', true, 4,
 ARRAY['deep cleaning','house cleaning','home cleaning','apartment cleaning','flat cleaning',
  'bathroom cleaning','kitchen cleaning','floor cleaning','mopping','scrubbing',
  'sanitization','disinfection','sofa cleaning','mattress cleaning','carpet cleaning',
  'window cleaning','post construction cleaning','move in cleaning','move out cleaning',
  'spring cleaning','safai','safai wala','tanzheef']),

('9965d5f4-3579-41ad-a097-468b8ed0ab57',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Painting & Waterproofing', 'painting-waterproofing',
 'Interior & exterior painting, texture, POP & leak solutions',
 'ðŸ–Œï¸', true, 5,
 ARRAY['painting','painter','house painting','wall painting','exterior painting',
  'interior painting','texture','texture painting','POP','putty','primer','emulsion',
  'distemper','enamel','wood polish','waterproofing','leakage solution',
  'terrace waterproofing','bathroom waterproofing','damp','dampness','seepage','moisture',
  'crack repair','white wash','colour','color','rang','rangai','rang wala','dihaan','tilaay']),

('21aa221f-3043-476c-adb1-02fc76f56f6a',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'Pest Control', 'pest-control',
 'Termite, cockroach, mosquito, rodent & bed bug treatment',
 'ðŸœ', true, 6,
 ARRAY['pest control','pest','termite','deemak','cockroach','ant','mosquito','lizard','rat',
  'rodent','mice','bed bug','khatmal','spider','bee removal','wasp','snake','fumigation',
  'spray','herbal pest control','organic pest control','keeda makoda','wood borer',
  'pest control near me','mukaafaha hasharaat']),

('77814dcf-8c85-4323-9c4c-231e351954c0',
 'eb2263dd-87c5-421e-ac24-a3c5c754108f',
 'AC & Refrigeration', 'ac-refrigeration',
 'AC installation, repair, gas refill & refrigerator service',
 'â„ï¸', true, 7,
 ARRAY['AC repair','AC service','AC installation','air conditioner','split AC','window AC',
  'cassette AC','central AC','AC gas','AC gas refill','AC gas charge','refrigerant',
  'compressor','AC cleaning','AC maintenance','cooling','not cooling','ice formation',
  'water leaking AC','AC remote','thermostat','refrigerator repair','fridge repair',
  'deep freezer','water cooler','chiller','tabreed','takyyeef'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Beauty & Salon (7d154385)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('b357d920-3a9d-40c0-a6a3-c58ae59bca69',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Hair Salon', 'hair-salon',
 'Haircuts, styling, color, keratin & hair treatments',
 'ðŸ’‡â€â™€ï¸', true, 1,
 ARRAY['hair salon','hair cut','haircut','hair style','hairstyle','styling','blow dry',
  'hair wash','shampoo','hair color','hair dye','highlights','balayage','ombre',
  'global color','root touch up','keratin treatment','smoothening','straightening',
  'rebonding','hair spa','dandruff treatment','hair fall treatment','trim','layer cut',
  'bob cut','pixie','baal','nai','baal katna','hallaaq']),

('6c4009ce-3448-4a88-975e-90db6d8d4b4d',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Makeup & Bridal', 'makeup-bridal',
 'Party makeup, bridal makeup, HD & airbrush application',
 'ðŸ’„', true, 2,
 ARRAY['makeup','make up','makeup artist','MUA','bridal makeup','dulhan','party makeup',
  'engagement makeup','reception look','airbrush makeup','HD makeup','foundation','concealer',
  'eye makeup','lip','contouring','glam','wedding makeup','mehndi function makeup',
  'sangeet look','haldi look','dulhan ka makeup','tajmeel aroos']),

('50223b3e-00fa-4880-9320-bfe9cb3a808d',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Spa & Massage', 'spa-massage',
 'Body massage, aromatherapy, steam & relaxation therapies',
 'ðŸ’†', true, 3,
 ARRAY['spa','massage','body massage','head massage','foot massage','thai massage',
  'swedish massage','deep tissue','aromatherapy','hot stone','relaxation','stress relief',
  'wellness','body wrap','body scrub','sauna','steam bath','jacuzzi','hammam','oil massage',
  'ayurvedic massage','malish','champee','tadleek']),

('4971feed-3282-43fe-b5e4-6e0629d71ccc',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Skin Care', 'skin-care',
 'Facials, cleanup, bleach, de-tan & skin treatments',
 'âœ¨', true, 4,
 ARRAY['skin care','skincare','facial','clean up','cleanup','face','glow','brightness',
  'tan removal','pigmentation','acne','pimple','dark spots','anti aging','anti wrinkle',
  'gold facial','diamond facial','fruit facial','bleach','de-tan','face pack','face mask',
  'chemical peel','microdermabrasion','skin treatment','derma','twacha','inaayat al-bashra']),

('a645205b-63a8-4a6c-8f46-07bd0b6e35a9',
 '7d154385-52fb-443b-9954-6eb400257ad1',
 'Men''s Grooming', 'mens-grooming',
 'Men''s salon, beard, shaving, haircut & grooming',
 'ðŸ§”', true, 5,
 ARRAY['mens salon','gents parlour','gents salon','men grooming','beard','beard trim',
  'beard styling','shaving','clean shave','head shave','mens facial','mens hair cut','fade',
  'undercut','skin fade','pompadour','crew cut','buzz cut','mens hair color','mens spa',
  'mens pedicure','mens manicure','groom','dulha','naai','hajjaam'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Tuition & Coaching (ce88cb2d)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('79d44173-8a22-4cd3-bb92-a98e6edfc0a1',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Academic Tutoring', 'academic-tutoring',
 'School subjects: maths, science, English & board exam prep',
 'ðŸ“–', true, 1,
 ARRAY['academic','school','CBSE','ICSE','SSC','state board','maths','mathematics','science',
  'physics','chemistry','biology','english','hindi','social studies','history','geography',
  'economics','commerce','accounts','tuition class','home tuition','online class','homework',
  'assignment','class 10','class 12','primary','secondary','higher secondary',
  'padhai','taaleem']),

('ec5b0fb4-729c-45b9-be1c-9a3093a19971',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Quran & Islamic Studies', 'quran-islamic',
 'Quran reading, hifz, tajweed, deeniyat & Arabic language',
 'ðŸ“¿', true, 2,
 ARRAY['quran','quran class','hifz','hifz class','hafiz','nazira','qaida','tajweed','tajwid',
  'islamic','islamic studies','deeniyat','deen','arabic','arabic language','namaz','salah',
  'fiqh','hadees','hadith','seerah','dua','madrasa','maktab','maulana','alim','aalim',
  'diniyat','taalim','muallim','quran teacher','tahfeez','tilawat']),

('6a0586bb-2729-4c02-bcd7-f1aab1ef5335',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Language Classes', 'language-classes',
 'English speaking, IELTS, Hindi, Urdu, Arabic & foreign languages',
 'ðŸ—£ï¸', true, 3,
 ARRAY['language','english speaking','spoken english','IELTS','TOEFL','communication','hindi',
  'urdu','arabic','french','german','spanish','japanese','mandarin','foreign language',
  'language course','grammar','vocabulary','pronunciation','fluency','speaking','writing',
  'reading','language tutor','lisaniyat','lugha']),

('9f5e9bfd-19d3-4db5-8c6d-f1bd4d9194da',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Competitive Exam', 'competitive-exam',
 'IIT, NEET, UPSC, banking, SSC & entrance exam coaching',
 'ðŸŽ¯', true, 4,
 ARRAY['competitive exam','entrance exam','IIT','JEE','NEET','UPSC','MPSC','SSC CGL',
  'banking','bank exam','IBPS','SBI','railway','RRB','GATE','CAT','MBA','CLAT',
  'law entrance','NDA','CDS','defence','government exam','sarkari naukri','test series',
  'mock test','previous year','study material','imtihaan']),

('4bae3051-6c0e-481d-bca9-b409bef39485',
 'ce88cb2d-d4e8-4839-bc3e-058be0f3eab0',
 'Music & Arts', 'music-arts',
 'Music lessons, singing, instruments, dance & art classes',
 'ðŸŽµ', true, 5,
 ARRAY['music','music class','singing','vocal','instrument','guitar','piano','keyboard',
  'tabla','harmonium','sitar','violin','flute','drums','dance','dance class',
  'classical dance','western dance','hip hop','bollywood dance','kathak','bharatnatyam',
  'drawing','painting','art','art class','sketch','watercolor','oil painting','craft',
  'sculpture','pottery','mooseeqa','raqss','fann'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Event Planning (3da9c2a9)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('c1b78be0-ddea-45a4-be43-01b252b32b00',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Wedding Planning', 'wedding-planning',
 'Full wedding management, coordination & vendor booking',
 'ðŸ’’', true, 1,
 ARRAY['wedding','shaadi','nikah','walima','wedding planner','wedding coordinator',
  'wedding management','marriage','vivah','byaah','wedding venue','wedding budget',
  'wedding timeline','guest management','vendor management','destination wedding',
  'royal wedding','wedding consultant','shaadi planner','zafaaf']),

('967999fc-61aa-474d-aa3f-2f9223761c1b',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Decoration & Mandap', 'decoration-mandap',
 'Stage, flower, balloon, LED & theme decoration',
 'ðŸŽŠ', true, 2,
 ARRAY['decoration','decor','mandap','stage','stage decoration','entrance','gate decoration',
  'ceiling decoration','flower decoration','flower arrangement','floral','balloon',
  'balloon decoration','theme decoration','birthday decoration','anniversary decoration',
  'cradle ceremony','naming ceremony','aqeeqah decoration','milad decoration',
  'LED decoration','fairy lights','sajawat','zaynah']),

('23d96ce8-dca2-4c29-9325-966c171c744f',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Tent & Shamiana', 'tent-shamiana',
 'Tent house, shamiana, furniture rental & event setup',
 'â›º', true, 3,
 ARRAY['tent','shamiana','pandal','canopy','tent house','marquee','chairs','tables',
  'furniture rental','crockery','utensils','bartan','catering equipment','stage setup',
  'red carpet','durry','carpet','seating arrangement','outdoor setup','wedding tent',
  'event tent','rental','furniture on rent','khayma']),

('8dc6e96c-5a68-4818-8401-ff932678f8da',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Sound & Lighting', 'sound-lighting',
 'DJ, PA systems, LED screens, projectors & event lighting',
 'ðŸŽ§', true, 4,
 ARRAY['sound','sound system','speaker','PA system','amplifier','microphone','mic','DJ',
  'disc jockey','DJ service','lighting','LED lights','par lights','moving head','laser',
  'projector','screen','LED screen','LED wall','stage lighting','event lighting',
  'audio visual','AV','music system','karaoke','sawt','idhaaa']),

('41b3d38d-3e87-40ca-bb12-f56c761b6314',
 '3da9c2a9-0ed4-4f1a-bd4c-bf374eb93eff',
 'Florist', 'florist',
 'Bouquets, garlands, flower arrangements & event florals',
 'ðŸ’', true, 5,
 ARRAY['florist','flower','flowers','phool','bouquet','garland','mala','haar','veni','gajra',
  'flower arrangement','floral decoration','centerpiece','flower basket','wedding flowers',
  'funeral wreath','artificial flowers','fresh flowers','rose','lily','jasmine','mogra',
  'marigold','plant gift','flower delivery','phool wala','azzahaar'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Automotive & Vehicles (aa000011)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('7df7f004-69fa-40d6-9259-1bdd85dbe985',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Car Repair & Service', 'car-repair',
 'Engine, brake, suspension, AC & general car servicing',
 'ðŸ”§', true, 1,
 ARRAY['car repair','car service','car mechanic','car garage','engine repair','engine overhaul',
  'oil change','car oil','brake repair','brake pad','clutch repair','gear box','transmission',
  'suspension','shock absorber','power steering','car electrical','car AC','car AC repair',
  'tune up','car diagnostic','OBD','check engine','gadi ki repair','islah sayyara']),

('11110422-0061-4708-94bd-354c3edbc601',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Two-Wheeler Service', 'two-wheeler',
 'Bike, scooter & motorcycle repair & servicing',
 'ðŸï¸', true, 2,
 ARRAY['bike repair','bike service','motorcycle repair','scooter repair','scooty','activa',
  'two wheeler service','puncture repair','bike mechanic','chain','sprocket','battery',
  'kick start','self start','carburetor','fuel injection','silencer','exhaust',
  'tyre change bike','bike oil change','bike wash','bike ki marammat','darraaja naariyya']),

('eb730071-1020-455d-83e7-6089255c18cc',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Car Wash & Detailing', 'car-wash',
 'Car washing, detailing, ceramic coating & polishing',
 'ðŸš¿', true, 3,
 ARRAY['car wash','car cleaning','car detailing','interior cleaning','exterior wash',
  'foam wash','pressure wash','ceramic coating','teflon coating','PPF','paint protection',
  'polishing','buffing','wax','scratch removal','headlight restoration','engine wash',
  'underbody coating','anti rust','car spa','gadi dhulai','ghaseel sayyara']),

('5e762c30-0399-413d-a97d-5974c4ee18ee',
 '6bacddf3-ce43-416d-9e4d-09e2e5ca07c5',
 'Tyre & Battery', 'tyre-battery',
 'Tyre replacement, alignment, balancing & battery service',
 'ðŸ›ž', true, 4,
 ARRAY['tyre','tire','tyre shop','tyre dealer','tyre repair','tyre replacement','MRF','CEAT',
  'Apollo','Bridgestone','JK Tyre','tubeless','tube type','wheel alignment',
  'wheel balancing','battery','car battery','Exide','Amaron','inverter battery',
  'UPS battery','battery replacement','jump start','tyre pressure','nitrogen',
  'itaaraat','battaariyya'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Health & Medical (aa000012)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('03e49c1e-abd7-433e-9ab9-7051f90bcab3',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'General Physician', 'general-physician',
 'Family doctor, OPD, health checkups & general consultations',
 'ðŸ‘¨â€âš•ï¸', true, 1,
 ARRAY['general physician','GP','doctor','family doctor','clinic','OPD','consultation',
  'fever','cold','cough','flu','infection','general medicine','internal medicine','checkup',
  'health checkup','master health checkup','prescription','blood pressure','BP','diabetes',
  'sugar','thyroid','asthma','allergy','doctor near me','tabib aamm']),

('0ebed759-a0ec-41ec-a9cc-950ea3d32277',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Dentist', 'dentist',
 'Dental clinic, root canal, braces, implants & teeth cleaning',
 'ðŸ¦·', true, 2,
 ARRAY['dentist','dental','dental clinic','teeth','tooth','toothache','cavity','filling',
  'root canal','RCT','extraction','cleaning','scaling','polishing','braces','orthodontic',
  'alignment','implant','dental implant','crown','cap','bridge','denture','wisdom tooth',
  'gum','bleeding gum','whitening','bleaching','smile design','veneer',
  'pediatric dentist','dant','daant','tabib asnaan']),

('68761f35-f465-4482-b00e-2a53b50e400d',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Pharmacy', 'pharmacy',
 'Chemist, medical store, prescription medicines & health products',
 'ðŸ’Š', true, 3,
 ARRAY['pharmacy','chemist','medical store','medicine','dawai','dawakhana','drug store',
  'prescription','OTC','over the counter','tablet','capsule','syrup','injection','insulin',
  'first aid','surgical','bandage','health product','vitamin','supplement','protein',
  'ayurvedic medicine','homeopathic medicine','generic medicine','online pharmacy',
  'home delivery medicine','24 hour pharmacy','saydaliyya']),

('e6b0ce45-6398-4480-8284-d613666f6742',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Pathology & Lab', 'pathology-lab',
 'Blood tests, diagnostics, X-ray, ultrasound & health screenings',
 'ðŸ”¬', true, 4,
 ARRAY['pathology','lab','laboratory','blood test','urine test','diagnostic',
  'diagnostic center','health test','CBC','sugar test','thyroid test','lipid profile',
  'liver function','kidney function','X-ray','xray','ultrasound','sonography','ECG','echo',
  'MRI','CT scan','biopsy','culture','sensitivity','COVID test','RT-PCR',
  'home collection','sample collection','mukhtabar']),

('e7c68dcd-0a6a-4956-b437-2a61053e019c',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Physiotherapy', 'physiotherapy',
 'Pain management, rehab, sports injury & mobility therapy',
 'ðŸƒ', true, 5,
 ARRAY['physiotherapy','physio','physiotherapist','physical therapy','rehab','rehabilitation',
  'back pain','neck pain','joint pain','knee pain','shoulder pain','sports injury','fracture',
  'post surgery','stroke rehab','paralysis','cerebral palsy','exercise therapy',
  'electrotherapy','ultrasound therapy','TENS','IFT','wax therapy','traction',
  'cupping','dry needling','ilaaj tabii']),

('0e988f1e-5503-46f1-ab63-37b905b5397c',
 'a4113cd2-63f4-4939-9399-af7c99d3df2e',
 'Alternative Medicine', 'alternative-medicine',
 'Unani, Ayurveda, Homeopathy, herbal & traditional healing',
 'ðŸŒ¿', true, 6,
 ARRAY['unani','ayurveda','ayurvedic','homeopathy','homeopathic','naturopathy','hakim',
  'vaid','tabib','herbal','herbal medicine','desi dawai','alternative medicine',
  'traditional medicine','siddha','acupuncture','acupressure','yoga therapy','panchkarma',
  'panchakarma','hijama','cupping therapy','reiki','pranic healing','aromatherapy',
  'tibb badeel','tibb yunani'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Construction & Renovation (aa000016)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('e212d76e-d00b-44e0-b70d-07a6d6ad3d54',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Civil Contractor', 'civil-contractor',
 'House & commercial building construction, project management',
 'ðŸ‘·', true, 1,
 ARRAY['contractor','thekedar','civil contractor','building contractor','house construction',
  'commercial construction','industrial construction','road construction','labour contractor',
  'project management','site engineer','site supervisor','construction company','turnkey',
  'estimation','quotation','BOQ','bill of quantities','RCC work','structural work',
  'muqaawil','binaa']),

('cf7a60b3-9773-45d7-b43c-f12c2fe38d7b',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Mason & Bricklayer', 'mason',
 'Brick work, plastering, foundation, columns & slabs',
 'ðŸ§±', true, 2,
 ARRAY['mason','raj mistri','rajmistri','bricklayer','masonry','brick work','block work',
  'plastering','plaster','wall construction','boundary wall','compound wall','foundation',
  'footing','column','beam','slab','lintel','staircase','ramp','concrete','cement work',
  'mortar','pointing','repair work','bannaa']),

('e2c25f15-e6dd-46c6-91f2-5d5f8299d5f4',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Architect & Design', 'architect',
 'Building plans, 3D elevations, structural design & approvals',
 'ðŸ“', true, 3,
 ARRAY['architect','architecture','building design','house design','floor plan','elevation',
  '3D elevation','structural design','MEP','building permit','plan approval','BMC approval',
  'RERA','green building','sustainable design','vastu','vastu consultant','plot planning',
  'layout','site plan','construction drawing','working drawing','miimaar','handasa']),

('1705a947-a57e-429a-89fe-3207b7d198fd',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Fabrication & Welding', 'fabrication-welding',
 'Iron & steel gates, grills, railings, sheds & welding work',
 'âš™ï¸', true, 4,
 ARRAY['fabrication','welding','welder','lohar','iron work','steel work','SS',
  'stainless steel','MS','mild steel','gate','main gate','grill','window grill','railing',
  'handrail','staircase railing','balcony railing','shed','car parking shed',
  'industrial shed','godown','structural steel','fire escape','ladder','tank stand',
  'water tank stand','trolley','lihaam','hadeed']),

('3e769eaf-8b78-406b-a7a1-18865ff4fa26',
 '5908faf0-f076-4d25-ae80-728ed07f1ecf',
 'Tiles & Flooring', 'tiles-flooring',
 'Wall tiles, floor tiles, marble, granite & flooring installation',
 'ðŸ—ï¸', true, 5,
 ARRAY['tiles','tile','tiling','flooring','floor','wall tiles','floor tiles','bathroom tiles',
  'kitchen tiles','marble','granite','vitrified','ceramic','porcelain','Italian marble',
  'Kota stone','natural stone','mosaic','terrazzo','wooden flooring','laminate flooring',
  'vinyl flooring','epoxy','polishing','marble polishing','granite polishing','tile laying',
  'tile cutting','waterjet cutting','balaataat','rukhaam'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: IT & Computer Services (aa000027)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('f71fea84-94dc-4e32-ad21-2be79e105057',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'Web & App Development', 'web-app-dev',
 'Websites, mobile apps, e-commerce, CMS & custom software',
 'ðŸŒ', true, 1,
 ARRAY['web development','website','website design','web design','web developer',
  'landing page','e-commerce','ecommerce','online store','WordPress','Shopify','React',
  'Angular','frontend','backend','full stack','API','mobile app','Android app','iOS app',
  'Flutter','React Native','UI design','UX design','responsive design','PWA','CMS',
  'custom software','ERP','tatbeeq','mawqii']),

('73fb513b-bd86-40ef-9dd6-cca73bb6e300',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'CCTV & Security', 'cctv-security',
 'CCTV installation, security cameras, access control & alarms',
 'ðŸ“¹', true, 2,
 ARRAY['CCTV','CCTV installation','security camera','surveillance','surveillance system',
  'IP camera','dome camera','bullet camera','PTZ','NVR','DVR','monitor','night vision',
  'motion detection','access control','biometric','fingerprint','face recognition',
  'attendance system','boom barrier','video intercom','alarm','burglar alarm','fire alarm',
  'home security','office security','muraaqaba','amn']),

('1bad5d87-2c3c-44b5-99f8-bbff822b6d24',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'Computer Sales & Repair', 'computer-sales-repair',
 'Desktops, laptops, peripherals, networking & repair',
 'ðŸ–¥ï¸', true, 3,
 ARRAY['computer','PC','desktop','laptop','MacBook','iMac','computer shop','computer store',
  'computer repair','laptop repair','hardware','motherboard','processor','RAM','SSD',
  'hard disk','HDD','graphics card','GPU','power supply','SMPS','cabinet','keyboard','mouse',
  'monitor','printer','scanner','networking','router','switch','cable','LAN','CAT6','fiber',
  'haasib','ajhiza']),

('e8442d1c-442c-4b72-84bc-0345e58286ca',
 '6b13e516-5a6f-47ca-8898-0688f37f3d41',
 'Graphic Design', 'graphic-design',
 'Logo, branding, social media design, packaging & print design',
 'ðŸŽ¨', true, 4,
 ARRAY['graphic design','graphics','logo','logo design','branding','brand identity',
  'visiting card design','business card design','letterhead','brochure design','flyer design',
  'poster design','social media design','social media post','banner design',
  'packaging design','label design','catalogue design','presentation','PPT design',
  'infographic','illustration','motion graphics','video editing','animation','2D','3D',
  'tasmeem','rusoom'])
ON CONFLICT (id) DO NOTHING;

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SECTION 4 â€” ADDITIONAL TOP-LEVEL CATEGORIES (31â€“38)                   â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES

-- 31. Perfume & Attar
('d3d4ac8c-a8a7-4bea-a7d2-208ace38732b',
 'Perfume & Attar', 'perfume-attar',
 'Ittar, attar, perfume oils, bakhoor, oudh & fragrances',
 'ðŸŒ¸', true, 31,
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
 'ðŸ“', true, 32,
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
 'ðŸ“²', true, 33,
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
 'ðŸ’§', true, 34,
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
 'CrÃ¨che, daycare centers, babysitting, nanny & play schools',
 'ðŸ‘¶', true, 35,
 ARRAY[
  'daycare','day care','creche','crÃ¨che','childcare','child care','babysitting','babysitter',
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
 'ðŸ§“', true, 36,
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
 'ðŸ›¡ï¸', true, 37,
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
 'ðŸ”‘', true, 38,
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
])
ON CONFLICT (id) DO NOTHING;

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SECTION 5 â€” SUBCATEGORIES FOR PREVIOUSLY-FLAT PARENTS                 â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Photography (5cec4eb5)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('7fdca7c8-ebea-436b-84ed-57099116c8fa',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Wedding Photography', 'wedding-photography',
 'Wedding shoots, cinematic videos, pre-wedding & albums',
 'ðŸ’’', true, 1,
 ARRAY['wedding photography','wedding videography','shaadi photography','nikah photography',
  'walima shoot','cinematic wedding','wedding film','wedding reel','pre wedding',
  'pre-wedding shoot','couple shoot','wedding album','photo album','candid wedding',
  'traditional wedding','engagement shoot','haldi shoot','mehndi shoot','reception shoot',
  'destination wedding photography','dulhan photo','dulha photo','tasweer zafaaf']),

('fd172a19-35e9-4022-bf1d-42d0b6564c42',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Product Photography', 'product-photography',
 'E-commerce, food, jewellery & catalogue product shoots',
 'ðŸ“¸', true, 2,
 ARRAY['product photography','product shoot','ecommerce photography','amazon photography',
  'food photography','jewellery photography','clothing photography','flat lay',
  'white background','lifestyle shoot','catalogue','catalog shoot','menu photography',
  'restaurant photography','real estate photography','interior photography',
  'commercial photography','advertising photography','brand shoot','tasweer muntajaat']),

('16f30be1-8efd-41c0-b684-940a2f386d86',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Event & Corporate', 'event-corporate-photography',
 'Corporate events, conferences, parties & social gatherings',
 'ðŸŽ¤', true, 3,
 ARRAY['event photography','event videography','corporate photography','conference',
  'seminar','workshop','birthday photography','birthday shoot','party photography',
  'anniversary shoot','baby shower','naming ceremony','aqeeqah photography',
  'milad photography','mehfil','corporate video','documentary','testimonial video',
  'corporate headshot','team photo','tasweer haflaat']),

('7cbb575b-7e26-441b-babd-db645eb981b9',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Drone & Aerial', 'drone-aerial',
 'Aerial photography, drone videography & survey mapping',
 'ðŸš', true, 4,
 ARRAY['drone','drone photography','drone videography','aerial photography','aerial video',
  'aerial shot','bird eye view','drone shoot','drone pilot','DJI','drone survey',
  'land survey','mapping','topography','construction progress','roof inspection',
  'real estate aerial','wedding drone','event drone','tasweer jawwiyya']),

('1dd99222-dc68-40c4-8728-ed7311d68a7a',
 '5cec4eb5-edd9-4831-9ca3-5cfb04fc6d82',
 'Studio & Portraits', 'studio-portraits',
 'Photo studio, passport photos, family portraits & headshots',
 'ðŸ–¼ï¸', true, 5,
 ARRAY['studio','photo studio','portrait','family portrait','baby portrait','newborn shoot',
  'maternity shoot','passport photo','visa photo','ID photo','headshot','professional photo',
  'model portfolio','portfolio','graduation photo','convocation','kids photography',
  'toddler shoot','cake smash','studio lighting','green screen','tasweer shakhsiyya'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Mehndi & Henna (81f631d4)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('ed0d5728-a19d-4292-a5fc-d11c665cba23',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Bridal Mehndi', 'bridal-mehndi',
 'Full bridal mehndi for hands, feet & elaborate designs',
 'ðŸ‘°', true, 1,
 ARRAY['bridal mehndi','dulhan mehndi','wedding mehndi','bridal henna','full hand mehndi',
  'full arm mehndi','feet mehndi','heavy mehndi','elaborate design','traditional bridal',
  'rajasthani bridal','portrait mehndi','dulha mehndi','groom mehndi','engagement mehndi',
  'nikah mehndi','walima mehndi','hinna aroos']),

('486fc515-a2bb-40bb-842f-22d098e6b6f4',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Party & Festive Mehndi', 'party-mehndi',
 'Quick mehndi for Eid, festivals, parties & celebrations',
 'ðŸŽ‰', true, 2,
 ARRAY['party mehndi','festive mehndi','eid mehndi','ramadan mehndi','diwali mehndi',
  'karva chauth','teej','rakshabandhan','sangeet mehndi','function mehndi','simple mehndi',
  'easy mehndi','quick mehndi','small design','finger mehndi','back hand mehndi',
  'trendy mehndi','modern mehndi','hinna haflaat']),

('d371304a-ff65-40f8-b233-be4a025af0ed',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Arabic Mehndi', 'arabic-mehndi',
 'Arabic style, floral trails, minimal & contemporary designs',
 'ðŸŒ¿', true, 3,
 ARRAY['arabic mehndi','arabic henna','arabic design','floral mehndi','trail mehndi',
  'vine mehndi','minimal mehndi','contemporary mehndi','modern arabic','gulf style',
  'khaleeji mehndi','dubai mehndi','one side mehndi','diagonal mehndi','bold mehndi',
  'thick mehndi','dark mehndi','naqsh arabi']),

('c391319e-80c6-434d-a8ec-c50426afe0fe',
 '81f631d4-a392-41a7-9777-a4774c66e0a8',
 'Kids Mehndi', 'kids-mehndi',
 'Simple & fun mehndi designs for children',
 'ðŸ§’', true, 4,
 ARRAY['kids mehndi','children mehndi','baby mehndi','small hand mehndi','cartoon mehndi',
  'butterfly mehndi','flower mehndi simple','star mehndi','heart mehndi','easy kids',
  'safe henna','organic henna kids','mehndi for girls','cute mehndi','hinna atfaal'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Sweets & Bakery (f4188f3f)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('11d775dc-8a0c-4bee-b1b9-7b97bff2a368',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Traditional Sweets & Mithai', 'traditional-sweets',
 'Indian mithai, halwai specials, festive sweets & ladoo',
 'ðŸ¬', true, 1,
 ARRAY['mithai','sweet','traditional sweet','ladoo','laddoo','barfi','burfi','peda','petha',
  'jalebi','imarti','gulab jamun','rasgulla','sandesh','cham cham','kalakand','malpua',
  'halwa','sohan halwa','mohanthal','ghevar','balushahi','mysore pak','kaju katli',
  'kaju barfi','son papdi','chikki','gajak','rewdi','tilgul','modak','meethai','hulwiyyaat']),

('0fe05582-989b-4a33-92bc-04776a9e9543',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Cakes & Pastry', 'cakes-pastry',
 'Birthday cakes, wedding cakes, pastries, cupcakes & desserts',
 'ðŸŽ‚', true, 2,
 ARRAY['cake','birthday cake','wedding cake','anniversary cake','custom cake','designer cake',
  'fondant','buttercream','cream cake','chocolate cake','red velvet','black forest',
  'eggless cake','vegan cake','photo cake','theme cake','cupcake','muffin','pastry',
  'puff','cream roll','brownie','cookie','macaroon','macaron','donut','doughnut',
  'cheesecake','tiramisu','mousse','cake order','cake delivery','kaik']),

('1c297e94-d262-4fb0-a9f8-936ea0fc6780',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Namkeen & Snacks', 'namkeen-snacks',
 'Savoury snacks, namkeen, chips, mixture & party packs',
 'ðŸ¥¨', true, 3,
 ARRAY['namkeen','snack','snacks','mixture','chevda','chivda','sev','bhujia','gathiya',
  'fafda','khakhra','mathri','nimki','murukku','chakli','shakarpara','samosa','kachori',
  'pakora','bhajia','vada','farsan','chat masala','chips','wafer','papad','pickle',
  'achar','murabba','chutney','dry snack','party pack','festive pack','maqaalii']),

('708eb476-3554-41b1-b646-e676a0197e1e',
 'f4188f3f-8a14-4e62-a95b-4715c333e861',
 'Dry Fruits & Chocolates', 'dry-fruits-chocolates',
 'Premium dry fruits, nuts, dates, chocolates & gift boxes',
 'ðŸ«', true, 4,
 ARRAY['dry fruits','dry fruit','mewa','nuts','almond','badam','cashew','kaju','pistachio',
  'pista','walnut','akhrot','raisin','kishmish','dates','khajoor','khajur','anjeer','fig',
  'apricot','dried cranberry','trail mix','mixed nuts','chocolate','homemade chocolate',
  'handmade chocolate','truffle','praline','gift box','dry fruit box','wedding box',
  'corporate gift','festival gift','diwali gift','eid gift','tuhfa','mukassaraat'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Jewellery & Watches (aa000021)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('c1ad1087-7e7b-43ce-8834-7f044194a522',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Gold & Diamond', 'gold-diamond',
 'Gold, diamond, platinum, bridal sets & precious jewellery',
 'ðŸ’Ž', true, 1,
 ARRAY['gold','gold jewellery','22 carat','24 carat','18 carat','hallmark','BIS','diamond',
  'solitaire','platinum','bridal set','wedding jewellery','necklace set','choker',
  'mangalsutra','gold chain','gold ring','engagement ring','diamond ring','gold earring',
  'jhumka gold','gold bangle','gold bracelet','gold pendant','certified diamond',
  'GIA','IGI','gold investment','gold coin','gold bar','sonar','zargaar','dhahab','almaas']),

('f95b4f52-7ed1-4e92-ba16-cf65f5d42c65',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Imitation & Fashion Jewellery', 'imitation-jewellery',
 'Artificial, oxidized, kundan, AD & trendy fashion jewellery',
 'ðŸ“¿', true, 2,
 ARRAY['imitation','artificial','fashion jewellery','costume jewellery','oxidized','oxidised',
  'german silver','tribal','bohemian','kundan','AD','american diamond','CZ','meenakari',
  'temple jewellery','south indian','pearl','moti','beads','thread jewellery','silk thread',
  'terracotta','clay jewellery','handmade jewellery','daily wear','office wear','casual',
  'combo set','jewellery set','matching set','wholesale jewellery','mujawharaat sinaaiyya']),

('37096b68-c299-4f3d-b65e-67e55c13ae60',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Watch Sales & Repair', 'watch-repair',
 'Watch selling, repair, battery replacement & servicing',
 'âŒš', true, 3,
 ARRAY['watch','wrist watch','watch repair','clock repair','battery replacement','watch battery',
  'strap','watch strap','band','watch band','Casio','Titan','Fastrack','Fossil','Seiko',
  'Citizen','automatic','mechanical','quartz','smart watch','smartwatch','Apple Watch',
  'wall clock','pendulum','antique clock','watch polish','crystal replacement',
  'watch service','chronograph','luxury watch','islah saat']),

('efbe5dad-1c85-4432-b5a3-9d2ee16048d8',
 '49d7e5a6-8c0e-4cd9-9165-03fc57eab5da',
 'Custom & Bespoke Jewellery', 'custom-jewellery',
 'Custom-made, personalized, engraved & redesigned jewellery',
 'âœ¨', true, 4,
 ARRAY['custom jewellery','bespoke','personalized','personalised','made to order','custom ring',
  'name necklace','engraving','laser engraving','redesign','old gold','melting','remaking',
  'jewellery redesign','stone setting','polki setting','jadau','antique restoration',
  'heirloom','family jewellery','wedding custom','engagement custom','CAD design jewellery',
  '3D printing jewellery','wax casting','mujawharaat mukhassasa'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Real Estate & Property (aa000015)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('8dcbaf8d-b8a4-4142-ae90-4ee5eb029616',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Residential Sale & Purchase', 'residential-sale',
 'Flats, houses, villas & apartments for buying & selling',
 'ðŸ ', true, 1,
 ARRAY['residential','flat sale','flat purchase','house sale','buy flat','sell flat',
  'apartment','1 BHK','2 BHK','3 BHK','4 BHK','villa','bungalow','row house','duplex',
  'penthouse','builder floor','new construction','under construction','ready possession',
  'resale','first sale','RERA registered','society flat','gated community','township',
  'makaan khareedna','makaan bechna','bay sakan']),

('9b55c11a-48f8-412f-950b-a7a3ab114f9f',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Rental & PG', 'rental-pg',
 'Flats, rooms, PG accommodations & hostels for rent',
 'ðŸ›ï¸', true, 2,
 ARRAY['rent','rental','flat on rent','room on rent','PG','paying guest','hostel','mess',
  'boys PG','girls PG','co-living','shared room','single room','furnished','semi furnished',
  'unfurnished','bachelor','family','deposit','agreement','lease','11 month','society',
  'apartment rent','house rent','kiraya','kirayedar','maalik','ijaar']),

('27a7590f-e9a3-4cb1-a97c-ec2924f03d4a',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Commercial Property', 'commercial-property',
 'Shops, offices, showrooms, warehouses & commercial spaces',
 'ðŸ¬', true, 3,
 ARRAY['commercial','shop','shop rent','shop sale','office','office space','co-working',
  'coworking','showroom','warehouse','godown','gala','industrial','factory','commercial complex',
  'mall','market','business center','plug and play','furnished office','virtual office',
  'meeting room','conference room','dukaan','amlaak tijariyya']),

('a7e55ecc-17ea-466e-ad23-a1d6bc670ecc',
 '1dbaf9df-6f33-47e9-be52-afab29ab1238',
 'Plot & Land', 'plot-land',
 'Residential plots, agricultural land, NA plots & farmhouses',
 'ðŸŒ', true, 4,
 ARRAY['plot','land','zameen','agricultural land','farm land','NA plot','non agricultural',
  'residential plot','commercial plot','industrial plot','layout','DTCP','RERA plot',
  'corner plot','road facing','farm house','farmhouse','weekend home','conversion',
  'mutation','7/12','property card','survey number','boundary','fencing','ard','qitaa'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Legal & Finance (aa000014)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('a75a0e25-6098-41a2-945d-9c577ee11d14',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'Lawyer & Legal Services', 'lawyer-legal',
 'Advocates, legal consultants, court matters & documentation',
 'âš–ï¸', true, 1,
 ARRAY['lawyer','advocate','vakil','attorney','legal consultant','court','high court',
  'district court','family court','criminal lawyer','civil lawyer','property lawyer',
  'divorce','custody','bail','FIR','police complaint','consumer court','labour court',
  'arbitration','mediation','legal notice','affidavit','power of attorney','will',
  'succession','probate','documentation','stamp paper','muhaami','qanoon']),

('b0a0c7a0-c6b7-4591-b14f-ec48d5ad29c7',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'CA & Tax Services', 'ca-tax',
 'Chartered accountants, tax filing, GST, audit & compliance',
 'ðŸ“Š', true, 2,
 ARRAY['CA','chartered accountant','tax','income tax','IT return','ITR','ITR filing',
  'tax consultant','tax advisor','GST','GST registration','GST filing','GST return',
  'TDS','TCS','advance tax','refund','assessment','audit','statutory audit','internal audit',
  'bookkeeping','accounting','tally','balance sheet','P&L','profit loss','ROC','compliance',
  'company formation','partnership deed','LLP','muhaasib','dareeba']),

('23f310f3-0bad-4694-9c85-ebaa7b9c7607',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'Insurance', 'insurance',
 'Life, health, vehicle, property & business insurance',
 'ðŸ›¡ï¸', true, 3,
 ARRAY['insurance','insurance agent','LIC','life insurance','health insurance','mediclaim',
  'car insurance','vehicle insurance','bike insurance','third party','comprehensive',
  'term plan','endowment','ULIP','pension','retirement','annuity','group insurance',
  'corporate insurance','fire insurance','marine insurance','property insurance',
  'claim','claim settlement','cashless','premium','renewal','policy','bima','tameen']),

('ce40bc31-c60f-40cc-a628-ba05d3a0892a',
 '462dd878-12c2-431d-9781-b95701ce35dc',
 'Loans & Financial Planning', 'loans-finance',
 'Home loans, personal loans, mutual funds & investment advisory',
 'ðŸ’°', true, 4,
 ARRAY['loan','home loan','personal loan','business loan','car loan','education loan',
  'gold loan','loan against property','LAP','EMI','interest rate','bank loan','NBFC',
  'mutual fund','SIP','investment','fixed deposit','FD','RD','stock','share market',
  'demat','portfolio','financial planner','financial advisor','wealth management',
  'NPS','PPF','sukanya','retirement planning','goal planning','qard','istithmaar'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Travel & Tourism (aa000022)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('d391b341-78a8-4690-ac22-f03f6eedcc4b',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Hajj & Umrah', 'hajj-umrah',
 'Hajj packages, Umrah tours, ziyarat & religious travel',
 'ðŸ•‹', true, 1,
 ARRAY['hajj','haj','umrah','umra','ziyarat','ziarat','makkah','madina','madinah','medina',
  'saudi','saudi arabia','holy land','pilgrimage','hajj package','umrah package','group hajj',
  'VIP hajj','economy hajj','hajj visa','umrah visa','ihram','tawaf','safa marwa','mina',
  'arafat','muzdalifah','hajj operator','umrah operator','hajj agent','religious tour',
  'karbala','najaf','iraq ziyarat','iran ziyarat','hajj wa umrah']),

('e55bdc36-5f0c-41fb-8246-81a5aee06d42',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Domestic Tours', 'domestic-tours',
 'India tour packages, hill stations, beaches & pilgrimage',
 'ðŸ”ï¸', true, 2,
 ARRAY['domestic tour','india tour','family tour','group tour','hill station','beach',
  'goa','kerala','kashmir','rajasthan','himachal','manali','shimla','ooty','darjeeling',
  'andaman','lakshadweep','north east','ladakh','south india','golden triangle',
  'wildlife','safari','adventure','trekking','camping','road trip','bus tour','train tour',
  'weekend getaway','honeymoon india','school trip','corporate outing','siyaaha dakhiliyya']),

('12fc6606-c633-4b7b-89c0-a0de2419231d',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'International Tours', 'international-tours',
 'International holiday packages, honeymoon & group tours',
 'ðŸŒ', true, 3,
 ARRAY['international tour','foreign tour','abroad','overseas','dubai','singapore','thailand',
  'bali','maldives','malaysia','europe','switzerland','paris','london','turkey','egypt',
  'mauritius','sri lanka','nepal','bhutan','australia','USA','canada','cruise',
  'honeymoon international','visa assistance','travel insurance','forex','flight booking',
  'hotel booking international','world tour','siyaaha dawliyya']),

('7f72cfa1-7dac-4b06-9a92-fafb5739580c',
 '2dbe9a83-ea19-41eb-b21c-d1bbe825b8f4',
 'Visa Services', 'visa-services',
 'Visa processing, documentation, attestation & embassy assistance',
 'ðŸ›‚', true, 4,
 ARRAY['visa','visa service','visa agent','visa consultant','visa processing','tourist visa',
  'business visa','work visa','student visa','PR','permanent residence','immigration',
  'embassy','consulate','VFS','appointment','biometric','documentation','attestation',
  'apostille','PCC','police clearance','invitation letter','cover letter','NOC',
  'visa stamping','visa tracking','rejection','appeal','taashira','hijra'])
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Under: Fitness & Sports (aa000013)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO categories (id, parent_id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('d54fed50-3e56-4023-a1ad-4279fb0708e8',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Gym & Weight Training', 'gym-weight-training',
 'Gyms, bodybuilding, strength training & personal trainers',
 'ðŸ‹ï¸', true, 1,
 ARRAY['gym','gymnasium','fitness center','health club','weight training','bodybuilding',
  'strength training','powerlifting','CrossFit','HIIT','functional training','free weights',
  'dumbbell','barbell','squat','deadlift','bench press','personal trainer','PT',
  'fitness trainer','gym membership','monthly gym','annual gym','ladies gym','gents gym',
  'unisex gym','24 hour gym','home gym','gym equipment','kasrat','riyaada']),

('159bf4c9-afca-4fb8-ae81-56e6b467a449',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Yoga & Meditation', 'yoga-meditation',
 'Yoga classes, pranayama, meditation & wellness programs',
 'ðŸ§˜', true, 2,
 ARRAY['yoga','yoga class','yoga teacher','yoga instructor','hatha yoga','vinyasa','ashtanga',
  'power yoga','hot yoga','prenatal yoga','postnatal yoga','kids yoga','senior yoga',
  'pranayama','breathing','meditation','mindfulness','stress management','wellness',
  'holistic','chakra','kundalini','yin yoga','restorative','flexibility','stretching',
  'morning batch','evening batch','online yoga','yoga at home','taamul','yuga']),

('a2cb138b-3ca7-431e-bd5c-62eef7b21429',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Sports Coaching', 'sports-coaching',
 'Cricket, football, badminton, tennis & sports academies',
 'ðŸ', true, 3,
 ARRAY['sports coaching','cricket coaching','cricket academy','batting','bowling','fielding',
  'football coaching','soccer','badminton coaching','tennis coaching','table tennis',
  'basketball','volleyball','hockey','athletics','running','marathon training','kabaddi',
  'martial arts','karate','taekwondo','judo','boxing','kickboxing','MMA','self defense',
  'sports academy','summer camp','sports camp','coaching center','tadreeb riyaadi']),

('a3a43790-7b29-432d-a9c4-ae814a0f95a0',
 '5b4b1ba6-15f2-4f43-a350-6907f040d9cb',
 'Swimming', 'swimming',
 'Swimming pools, classes, coaching for kids & adults',
 'ðŸŠ', true, 4,
 ARRAY['swimming','swimming pool','swim','swimming class','swimming coaching','learn swimming',
  'kids swimming','adult swimming','beginners','advanced swimming','competitive swimming',
  'water aerobics','aqua fitness','diving','lifeguard','water safety','indoor pool',
  'outdoor pool','heated pool','Olympic pool','private pool','ladies swimming',
  'morning batch swimming','evening batch swimming','sibaaha'])
ON CONFLICT (id) DO NOTHING;

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  SECTION 6 â€” KEYWORD ENRICHMENT (misspellings, brands, Bohra terms)    â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  'VLCC','Lakme','LakmÃ©','Naturals','Jawed Habib','Green Trends','Toni & Guy',
  'LOrÃ©al','Schwarzkopf','Matrix','Wella','OPI','Essie','Maybelline','MAC','Huda Beauty',
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

-- â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
-- â•‘  UPDATED SUMMARY                                                        â•‘
-- â•‘  38 top-level categories (10 existing updated, 28 new)                  â•‘
-- â•‘  86 subcategories across 19 parent categories                           â•‘
-- â•‘  124 total categories with comprehensive multilingual keywords          â•‘
-- â•‘  + keyword enrichment (misspellings, brands, Bohra terms)               â•‘
-- â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

COMMIT;
