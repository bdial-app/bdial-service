-- ============================================================================
-- Tijarah Connect — UAT Seed: 02 CATEGORIES
-- 10 top-level categories with comprehensive multilingual keywords
-- ============================================================================

BEGIN;

INSERT INTO categories (id, name, slug, description, icon, is_active, display_order, keywords) VALUES
('b1a2c3d4-e5f6-4a7b-8c9d-111111111101', 'Tailoring & Alterations', 'tailoring',
 'Custom stitching, alterations & embroidery',
 '🧵', true, 1,
 ARRAY['tailor','tailoring','darzi','stitching','sewing','silai','custom stitching','bespoke','alteration','alterations','hemming','resizing','fitting','rida','abaya','burkha','burqa','kurta','salwar','lehenga','blouse','embroidery','zari','zardozi','dress maker','seamstress','boutique','fashion designer','ladies tailor','gents tailor','khayyat','kapde silai']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111102', 'Catering & Tiffin', 'catering',
 'Home-cooked meals, event catering & tiffin service',
 '🍲', true, 2,
 ARRAY['catering','caterer','tiffin','tiffin service','dabba','home food','home cooked','lunch box','meal delivery','wedding catering','party food','event catering','khana','nashta','thali','bohri food','biryani','dastarkhwan','cook','bawarchi','chef','halal food','halal catering','corporate catering','nikah catering','walima catering','dabba wala','tiffin wala']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111103', 'Mehndi & Henna', 'mehndi',
 'Bridal mehndi, party henna & nail art',
 '🌿', true, 3,
 ARRAY['mehndi','mehendi','mehandi','henna','bridal mehndi','dulhan mehndi','arabic mehndi','indian mehndi','mehndi artist','henna artist','henna design','party mehndi','festive mehndi','eid mehndi','wedding mehndi','kids mehndi','mehndi wali','temporary tattoo','nail art','heena','mahendi','organic henna','hinna','naqsh']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111104', 'Electronics Repair', 'electronics',
 'Mobile, laptop, TV & appliance repair',
 '🔧', true, 4,
 ARRAY['electronics','repair','mobile repair','phone repair','smartphone','laptop repair','computer repair','TV repair','LED repair','washing machine repair','refrigerator repair','fridge repair','microwave repair','appliance repair','screen replacement','battery replacement','technician','service center','data recovery','water damage','bijli ka saman','tamir','islah']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111105', 'Sweets & Bakery', 'sweets',
 'Traditional mithai, cakes & confectionery',
 '🍬', true, 5,
 ARRAY['sweets','sweet shop','mithai','bakery','cake','pastry','cookies','confectionery','halwai','malpua','halwa','barfi','ladoo','peda','jalebi','gulab jamun','birthday cake','wedding cake','custom cake','eggless cake','chocolate','dessert','meethai','kheer','firni','sheer khurma','cupcake','brownie','mithai wala','hulwiyyaat']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111106', 'Home Services', 'home-services',
 'Plumbing, electrical & deep cleaning',
 '🏠', true, 6,
 ARRAY['home service','home repair','plumbing','plumber','electrical','electrician','carpenter','carpentry','painting','painter','cleaning','deep cleaning','house cleaning','waterproofing','pest control','AC service','air conditioner','geyser repair','RO repair','installation','mistri','karigar','kaam wala','home renovation','ghar ki marammat']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111107', 'Beauty & Salon', 'beauty',
 'Hair styling, facials & grooming',
 '💇', true, 7,
 ARRAY['beauty','salon','parlour','parlor','beauty parlour','ladies salon','haircut','hairstyle','facial','cleanup','threading','waxing','bleach','makeup','bridal makeup','grooming','spa','massage','skin care','keratin','manicure','pedicure','nail art','beautician','barber','hair treatment','tajmeel']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111108', 'Photography', 'photography',
 'Event photography, portraits & videography',
 '📷', true, 8,
 ARRAY['photography','photographer','videography','videographer','camera','photo','photo studio','wedding photography','event photography','portrait','headshot','drone','album','photo editing','video editing','cinematography','pre-wedding','maternity shoot','baby shoot','reel','corporate video','tasweer','musawwir']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111109', 'Tuition & Coaching', 'tuition',
 'Academic coaching, Quran classes & skill training',
 '📚', true, 9,
 ARRAY['tuition','coaching','tutoring','tutor','teacher','classes','academy','education','maths tuition','science tuition','english tuition','quran','quran classes','hifz','islamic studies','deeniyat','arabic classes','online tuition','home tuition','competitive exam','board exam','taalim','ustaad','muallim']),

('b1a2c3d4-e5f6-4a7b-8c9d-111111111110', 'Event Planning', 'events',
 'Wedding decor, party planning & tent services',
 '🎉', true, 10,
 ARRAY['event','events','event planning','event planner','wedding planner','party planning','decoration','decor','decorator','shamiana','tent','stage decoration','lighting','DJ','flower decoration','theme party','balloon decoration','venue','walima','nikah','aqeeqah','milad','jashn','wedding decor','haflah','munazzim']);

COMMIT;
