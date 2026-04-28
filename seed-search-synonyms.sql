-- ============================================================
-- Seed: Search Synonyms (Urdu transliterations + common misspellings)
-- Maps local/informal terms → canonical English category names
-- ============================================================

INSERT INTO search_synonyms (term, canonical_term, language) VALUES
-- Glass / Windows
('kaanch', 'glass', 'ur'), ('kanch', 'glass', 'ur'), ('shesha', 'glass', 'ur'),
('sheesha', 'glass', 'ur'), ('aluminium', 'aluminum', 'en'),

-- Electrician / Electrical
('bijli', 'electrician', 'ur'), ('bijli wala', 'electrician', 'ur'),
('wireman', 'electrician', 'en'), ('wiring', 'electrician', 'en'),

-- Plumber / Plumbing
('nalkay wala', 'plumber', 'ur'), ('pani wala', 'plumber', 'ur'),
('pipe fitting', 'plumber', 'en'), ('leakage', 'plumber', 'en'),

-- Carpenter / Furniture
('mistri', 'carpenter', 'ur'), ('barhai', 'carpenter', 'ur'),
('lakdi', 'wood', 'ur'), ('furniture maker', 'carpenter', 'en'),

-- Painter / Paint
('rang wala', 'painter', 'ur'), ('rangai', 'painting', 'ur'),
('wall paint', 'painter', 'en'), ('distemper', 'painter', 'en'),

-- Tailor / Fashion
('darzi', 'tailor', 'ur'), ('silai', 'stitching', 'ur'),
('kapray', 'clothing', 'ur'), ('boutique', 'fashion designer', 'en'),

-- AC / HVAC
('ac wala', 'air conditioning', 'ur'), ('ac repair', 'air conditioning', 'en'),
('split ac', 'air conditioning', 'en'), ('cooling', 'air conditioning', 'en'),

-- Mobile / Phone
('mobile wala', 'mobile repair', 'ur'), ('phone fix', 'mobile repair', 'en'),
('screen repair', 'mobile repair', 'en'), ('cell phone', 'mobile', 'en'),

-- Auto / Car
('gaari', 'car', 'ur'), ('gari', 'car', 'ur'), ('motor', 'auto', 'ur'),
('car wash', 'auto detailing', 'en'), ('mechanic', 'auto mechanic', 'en'),
('puncture', 'tire repair', 'ur'), ('denting', 'auto body repair', 'en'),

-- Salon / Beauty
('salon wala', 'salon', 'ur'), ('parlour', 'beauty salon', 'en'),
('parlor', 'beauty salon', 'en'), ('hair cut', 'barber', 'en'),
('haircut', 'barber', 'en'), ('makeup', 'beauty salon', 'en'),
('mehndi', 'henna', 'ur'), ('bridal', 'bridal makeup', 'en'),

-- Food / Restaurant
('khana', 'food', 'ur'), ('hotel', 'restaurant', 'ur'),
('dhaba', 'restaurant', 'ur'), ('biryani', 'restaurant', 'en'),
('catering', 'caterer', 'en'), ('dawat', 'catering', 'ur'),

-- Grocery / General Store
('karyana', 'grocery', 'ur'), ('kiryana', 'grocery', 'ur'),
('pansari', 'grocery', 'ur'), ('general store', 'grocery', 'en'),

-- Medical / Health
('doctor', 'clinic', 'en'), ('hakeem', 'clinic', 'ur'),
('dawakhana', 'pharmacy', 'ur'), ('medical store', 'pharmacy', 'en'),
('lab test', 'diagnostic lab', 'en'), ('pathology', 'diagnostic lab', 'en'),

-- Construction / Real Estate
('thekedar', 'contractor', 'ur'), ('mason', 'construction', 'en'),
('raj mistri', 'mason', 'ur'), ('plot', 'real estate', 'en'),
('ghar', 'home', 'ur'), ('makaan', 'real estate', 'ur'),

-- Photography
('photographer', 'photography', 'en'), ('cameraman', 'photography', 'en'),
('video wala', 'videography', 'ur'), ('studio', 'photography', 'en'),

-- Cleaning
('safai', 'cleaning', 'ur'), ('maid', 'home cleaning', 'en'),
('pest control', 'fumigation', 'en'), ('termite', 'pest control', 'en'),

-- Education / Tutor
('tuition', 'tutor', 'en'), ('teacher', 'tutor', 'en'),
('coaching', 'tutor', 'en'), ('academy', 'education', 'en'),

-- Printing / Stationery
('printing press', 'printing', 'en'), ('flex', 'signage', 'ur'),
('banner', 'printing', 'en'), ('visiting card', 'printing', 'en'),

-- Electronics
('tv repair', 'electronics repair', 'en'), ('fridge repair', 'appliance repair', 'en'),
('washing machine', 'appliance repair', 'en'), ('ups', 'electronics', 'en'),

-- Transport / Movers
('loading', 'movers', 'ur'), ('shifting', 'movers and packers', 'en'),
('truck', 'transport', 'en'), ('mazda', 'transport', 'ur'),

-- Events / Decoration
('tent service', 'event decoration', 'en'), ('shamiyana', 'tent service', 'ur'),
('wedding', 'event planner', 'en'), ('shadi', 'wedding', 'ur'),
('barat', 'wedding', 'ur'), ('decoration', 'event decoration', 'en'),

-- Gym / Fitness
('gym', 'fitness', 'en'), ('workout', 'fitness', 'en'),
('yoga', 'fitness', 'en'), ('martial arts', 'fitness', 'en'),

-- Laundry / Dry Cleaning
('dhobi', 'laundry', 'ur'), ('istri', 'ironing', 'ur'),
('dry clean', 'dry cleaning', 'en'), ('press wala', 'ironing', 'ur'),

-- Jewelry
('jeweler', 'jewelry', 'en'), ('goldsmith', 'jewelry', 'en'),
('sonar', 'goldsmith', 'ur'), ('zevar', 'jewelry', 'ur'),

-- Pet
('janwar', 'pet', 'ur'), ('vet', 'veterinary', 'en'),
('pet shop', 'pet store', 'en'), ('dog grooming', 'pet grooming', 'en'),

-- Travel
('tour', 'travel', 'en'), ('visa', 'travel agency', 'en'),
('umrah', 'travel agency', 'ur'), ('hajj', 'travel agency', 'ur'),

-- Common misspellings
('electrition', 'electrician', 'en'), ('plummer', 'plumber', 'en'),
('carpanter', 'carpenter', 'en'), ('furnichar', 'furniture', 'en'),
('saloon', 'salon', 'en'), ('resturant', 'restaurant', 'en'),
('restraunt', 'restaurant', 'en'), ('fotografer', 'photographer', 'en'),
('mechnic', 'mechanic', 'en'), ('grocary', 'grocery', 'en'),
('farmacy', 'pharmacy', 'en'), ('laundrey', 'laundry', 'en'),
('jewlery', 'jewelry', 'en'), ('cleanng', 'cleaning', 'en'),
('beaty', 'beauty', 'en'), ('beuty', 'beauty', 'en'),
('paintr', 'painter', 'en'), ('tailr', 'tailor', 'en')
ON CONFLICT DO NOTHING;
