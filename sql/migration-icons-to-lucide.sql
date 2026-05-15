-- ============================================================================
-- Migration: Replace emoji icons with Lucide icon names + assign gradient colors
-- Run AFTER: seed-categories-keywords.sql
-- Also adds icon_color column if not present
-- ============================================================================

BEGIN;

-- Add icon_color column if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_color VARCHAR(50);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  TOP-LEVEL CATEGORIES — icon name + color                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

UPDATE categories SET icon = 'scissors', icon_color = 'violet' WHERE slug = 'tailoring';
UPDATE categories SET icon = 'utensils-crossed', icon_color = 'orange' WHERE slug = 'catering';
UPDATE categories SET icon = 'hand', icon_color = 'emerald' WHERE slug = 'mehndi';
UPDATE categories SET icon = 'cpu', icon_color = 'blue' WHERE slug = 'electronics-repair';
UPDATE categories SET icon = 'cake-slice', icon_color = 'pink' WHERE slug = 'sweets-bakery';
UPDATE categories SET icon = 'house', icon_color = 'teal' WHERE slug = 'home-services';
UPDATE categories SET icon = 'sparkles', icon_color = 'rose' WHERE slug = 'beauty-salon';
UPDATE categories SET icon = 'camera', icon_color = 'indigo' WHERE slug = 'photography';
UPDATE categories SET icon = 'book-open', icon_color = 'blue' WHERE slug = 'tuition-coaching';
UPDATE categories SET icon = 'party-popper', icon_color = 'amber' WHERE slug = 'event-planning';
UPDATE categories SET icon = 'car', icon_color = 'sky' WHERE slug = 'automotive';
UPDATE categories SET icon = 'heart-pulse', icon_color = 'red' WHERE slug = 'health-medical';
UPDATE categories SET icon = 'dumbbell', icon_color = 'lime' WHERE slug = 'fitness-sports';
UPDATE categories SET icon = 'scale', icon_color = 'indigo' WHERE slug = 'legal-finance';
UPDATE categories SET icon = 'building-2', icon_color = 'cyan' WHERE slug = 'real-estate';
UPDATE categories SET icon = 'hard-hat', icon_color = 'amber' WHERE slug = 'construction';
UPDATE categories SET icon = 'paintbrush', icon_color = 'fuchsia' WHERE slug = 'interior-design';
UPDATE categories SET icon = 'panel-top', icon_color = 'sky' WHERE slug = 'glass-aluminium';
UPDATE categories SET icon = 'armchair', icon_color = 'orange' WHERE slug = 'furniture-woodwork';
UPDATE categories SET icon = 'printer', icon_color = 'violet' WHERE slug = 'printing-signage';
UPDATE categories SET icon = 'gem', icon_color = 'yellow' WHERE slug = 'jewellery-watches';
UPDATE categories SET icon = 'plane', icon_color = 'sky' WHERE slug = 'travel-tourism';
UPDATE categories SET icon = 'package', icon_color = 'amber' WHERE slug = 'packers-movers';
UPDATE categories SET icon = 'shirt', icon_color = 'cyan' WHERE slug = 'laundry-dry-cleaning';
UPDATE categories SET icon = 'shopping-cart', icon_color = 'emerald' WHERE slug = 'grocery-daily-needs';
UPDATE categories SET icon = 'shirt', icon_color = 'pink' WHERE slug = 'fashion-clothing';
UPDATE categories SET icon = 'monitor', icon_color = 'blue' WHERE slug = 'it-computer-services';
UPDATE categories SET icon = 'paw-print', icon_color = 'orange' WHERE slug = 'pet-care';
UPDATE categories SET icon = 'sprout', icon_color = 'lime' WHERE slug = 'agriculture-gardening';
UPDATE categories SET icon = 'truck', icon_color = 'amber' WHERE slug = 'courier-delivery';
UPDATE categories SET icon = 'flower-2', icon_color = 'pink' WHERE slug = 'perfume-attar';
UPDATE categories SET icon = 'pencil', icon_color = 'blue' WHERE slug = 'stationery-office';
UPDATE categories SET icon = 'smartphone', icon_color = 'indigo' WHERE slug = 'mobile-telecom';
UPDATE categories SET icon = 'droplets', icon_color = 'cyan' WHERE slug = 'water-supply';
UPDATE categories SET icon = 'baby', icon_color = 'pink' WHERE slug = 'daycare-childcare';
UPDATE categories SET icon = 'heart-handshake', icon_color = 'rose' WHERE slug = 'elderly-nursing';
UPDATE categories SET icon = 'shield', icon_color = 'indigo' WHERE slug = 'security-services';
UPDATE categories SET icon = 'key', icon_color = 'amber' WHERE slug = 'rental-hire';
UPDATE categories SET icon = 'chef-hat', icon_color = 'orange' WHERE slug = 'restaurant-cafe';
UPDATE categories SET icon = 'beef', icon_color = 'red' WHERE slug = 'halal-meat';
UPDATE categories SET icon = 'wrench', icon_color = 'amber' WHERE slug = 'hardware-building';
UPDATE categories SET icon = 'bath', icon_color = 'cyan' WHERE slug = 'sanitary-bathroom';
UPDATE categories SET icon = 'ribbon', icon_color = 'violet' WHERE slug = 'textile-fabric';
UPDATE categories SET icon = 'sparkles', icon_color = 'fuchsia' WHERE slug = 'cosmetics-beauty';
UPDATE categories SET icon = 'cooking-pot', icon_color = 'orange' WHERE slug = 'crockery-kitchenware';
UPDATE categories SET icon = 'blocks', icon_color = 'yellow' WHERE slug = 'toy-kids';
UPDATE categories SET icon = 'briefcase', icon_color = 'amber' WHERE slug = 'bag-luggage';
UPDATE categories SET icon = 'bed-double', icon_color = 'violet' WHERE slug = 'mattress-bedding';
UPDATE categories SET icon = 'trophy', icon_color = 'lime' WHERE slug = 'sports-goods';
UPDATE categories SET icon = 'moon-star', icon_color = 'emerald' WHERE slug = 'religious-islamic';
UPDATE categories SET icon = 'users', icon_color = 'indigo' WHERE slug = 'manpower-staffing';
UPDATE categories SET icon = 'hotel', icon_color = 'blue' WHERE slug = 'hotel-lodge';
UPDATE categories SET icon = 'landmark', icon_color = 'amber' WHERE slug = 'banquet-venue';
UPDATE categories SET icon = 'car-taxi-front', icon_color = 'yellow' WHERE slug = 'taxi-cab';
UPDATE categories SET icon = 'wheat', icon_color = 'amber' WHERE slug = 'flour-mill';
UPDATE categories SET icon = 'heart', icon_color = 'rose' WHERE slug = 'marriage-bureau';
UPDATE categories SET icon = 'recycle', icon_color = 'emerald' WHERE slug = 'scrap-recycling';
UPDATE categories SET icon = 'sun', icon_color = 'yellow' WHERE slug = 'solar-energy';
UPDATE categories SET icon = 'lock-keyhole', icon_color = 'indigo' WHERE slug = 'locksmith';
UPDATE categories SET icon = 'footprints', icon_color = 'amber' WHERE slug = 'cobbler-shoe-repair';
UPDATE categories SET icon = 'file-text', icon_color = 'blue' WHERE slug = 'cyber-cafe-dtp';
UPDATE categories SET icon = 'banknote', icon_color = 'emerald' WHERE slug = 'money-transfer';
UPDATE categories SET icon = 'flame', icon_color = 'orange' WHERE slug = 'gas-fuel';
UPDATE categories SET icon = 'pill', icon_color = 'red' WHERE slug = 'pharmacy-medical-store';
UPDATE categories SET icon = 'glasses', icon_color = 'violet' WHERE slug = 'optical-eyewear';
UPDATE categories SET icon = 'bug', icon_color = 'lime' WHERE slug = 'pest-control';
UPDATE categories SET icon = 'paint-roller', icon_color = 'cyan' WHERE slug = 'painting-waterproofing';
UPDATE categories SET icon = 'spray-can', icon_color = 'teal' WHERE slug = 'cleaning-services';
UPDATE categories SET icon = 'droplet', icon_color = 'blue' WHERE slug = 'car-wash-detailing';
UPDATE categories SET icon = 'steering-wheel', icon_color = 'indigo' WHERE slug = 'driving-school';
UPDATE categories SET icon = 'milk', icon_color = 'amber' WHERE slug = 'dairy-milk';
UPDATE categories SET icon = 'leaf', icon_color = 'red' WHERE slug = 'dry-fruits-spices';
UPDATE categories SET icon = 'lightbulb', icon_color = 'yellow' WHERE slug = 'electrical-goods';
UPDATE categories SET icon = 'square', icon_color = 'amber' WHERE slug = 'marble-granite-tiles';
UPDATE categories SET icon = 'microscope', icon_color = 'blue' WHERE slug = 'diagnostic-lab';
UPDATE categories SET icon = 'shield-check', icon_color = 'emerald' WHERE slug = 'insurance-agent';
UPDATE categories SET icon = 'bar-chart-3', icon_color = 'indigo' WHERE slug = 'accounting-tax';
UPDATE categories SET icon = 'megaphone', icon_color = 'orange' WHERE slug = 'digital-marketing';
UPDATE categories SET icon = 'cog', icon_color = 'amber' WHERE slug = 'welding-fabrication';
UPDATE categories SET icon = 'flower', icon_color = 'pink' WHERE slug = 'florist-flower';
UPDATE categories SET icon = 'tree-pine', icon_color = 'emerald' WHERE slug = 'nursery-plant';
UPDATE categories SET icon = 'gift', icon_color = 'rose' WHERE slug = 'gift-shop';
UPDATE categories SET icon = 'cup-soda', icon_color = 'orange' WHERE slug = 'juice-bar';
UPDATE categories SET icon = 'video', icon_color = 'indigo' WHERE slug = 'cctv-surveillance';
UPDATE categories SET icon = 'drafting-compass', icon_color = 'blue' WHERE slug = 'architect-design';
UPDATE categories SET icon = 'ticket', icon_color = 'violet' WHERE slug = 'visa-immigration';
UPDATE categories SET icon = 'fire-extinguisher', icon_color = 'red' WHERE slug = 'fire-safety';
UPDATE categories SET icon = 'battery-charging', icon_color = 'emerald' WHERE slug = 'generator-ups';
UPDATE categories SET icon = 'boxes', icon_color = 'amber' WHERE slug = 'packaging-materials';
UPDATE categories SET icon = 'music', icon_color = 'fuchsia' WHERE slug = 'music-dance-art';
UPDATE categories SET icon = 'footprints', icon_color = 'pink' WHERE slug = 'footwear-store';
UPDATE categories SET icon = 'layout-grid', icon_color = 'orange' WHERE slug = 'modular-kitchen';
UPDATE categories SET icon = 'leaf', icon_color = 'emerald' WHERE slug = 'alternative-medicine';
UPDATE categories SET icon = 'gamepad-2', icon_color = 'violet' WHERE slug = 'gaming-zone';
UPDATE categories SET icon = 'dumbbell', icon_color = 'lime' WHERE slug = 'gym-equipment-store';
UPDATE categories SET icon = 'book-copy', icon_color = 'blue' WHERE slug = 'book-store';
UPDATE categories SET icon = 'pen-tool', icon_color = 'indigo' WHERE slug = 'tattoo-body-art';
UPDATE categories SET icon = 'arrow-up-from-line', icon_color = 'sky' WHERE slug = 'lift-elevator';
UPDATE categories SET icon = 'flask-conical', icon_color = 'teal' WHERE slug = 'chemical-supplier';
UPDATE categories SET icon = 'recycle', icon_color = 'lime' WHERE slug = 'waste-management';
UPDATE categories SET icon = 'bird', icon_color = 'sky' WHERE slug = 'funeral-burial';
UPDATE categories SET icon = 'ambulance', icon_color = 'red' WHERE slug = 'blood-bank-ambulance';
UPDATE categories SET icon = 'languages', icon_color = 'blue' WHERE slug = 'language-training';
UPDATE categories SET icon = 'graduation-cap', icon_color = 'indigo' WHERE slug = 'vocational-training';
UPDATE categories SET icon = 'warehouse', icon_color = 'amber' WHERE slug = 'roofing-shed';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SUBCATEGORIES — inherit parent color where appropriate                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Tailoring & Alterations subcategories
UPDATE categories SET icon = 'shirt', icon_color = 'violet' WHERE slug = 'rida-abaya-stitching';
UPDATE categories SET icon = 'crown', icon_color = 'rose' WHERE slug = 'bridal-wear';
UPDATE categories SET icon = 'user', icon_color = 'indigo' WHERE slug = 'mens-tailoring';
UPDATE categories SET icon = 'sparkles', icon_color = 'fuchsia' WHERE slug = 'embroidery-zari';
UPDATE categories SET icon = 'pin', icon_color = 'amber' WHERE slug = 'alterations-repairs';

-- Catering & Tiffin subcategories
UPDATE categories SET icon = 'heart', icon_color = 'rose' WHERE slug = 'wedding-catering';
UPDATE categories SET icon = 'box', icon_color = 'amber' WHERE slug = 'tiffin-dabba';
UPDATE categories SET icon = 'utensils', icon_color = 'orange' WHERE slug = 'party-bulk-food';
UPDATE categories SET icon = 'soup', icon_color = 'orange' WHERE slug = 'bohri-cuisine';

-- Electronics Repair subcategories
UPDATE categories SET icon = 'smartphone', icon_color = 'blue' WHERE slug = 'mobile-phone-repair';
UPDATE categories SET icon = 'laptop', icon_color = 'indigo' WHERE slug = 'laptop-computer-repair';
UPDATE categories SET icon = 'tv', icon_color = 'sky' WHERE slug = 'tv-display-repair';
UPDATE categories SET icon = 'plug', icon_color = 'cyan' WHERE slug = 'appliance-repair';

-- Home Services subcategories
UPDATE categories SET icon = 'wrench', icon_color = 'blue' WHERE slug = 'plumbing';
UPDATE categories SET icon = 'zap', icon_color = 'yellow' WHERE slug = 'electrical-work';
UPDATE categories SET icon = 'axe', icon_color = 'amber' WHERE slug = 'carpentry';
UPDATE categories SET icon = 'spray-can', icon_color = 'teal' WHERE slug = 'deep-cleaning';
UPDATE categories SET icon = 'paint-roller', icon_color = 'cyan' WHERE slug = 'painting-waterproofing-home';
UPDATE categories SET icon = 'bug', icon_color = 'lime' WHERE slug = 'pest-control-home';
UPDATE categories SET icon = 'snowflake', icon_color = 'sky' WHERE slug = 'ac-refrigeration';

-- Beauty & Salon subcategories
UPDATE categories SET icon = 'scissors', icon_color = 'rose' WHERE slug = 'hair-salon';
UPDATE categories SET icon = 'palette', icon_color = 'pink' WHERE slug = 'makeup-bridal';
UPDATE categories SET icon = 'heart', icon_color = 'fuchsia' WHERE slug = 'spa-massage';
UPDATE categories SET icon = 'star', icon_color = 'amber' WHERE slug = 'skin-care';
UPDATE categories SET icon = 'user', icon_color = 'indigo' WHERE slug = 'mens-grooming';

-- Tuition & Coaching subcategories
UPDATE categories SET icon = 'book-open', icon_color = 'blue' WHERE slug = 'academic-tutoring';
UPDATE categories SET icon = 'moon-star', icon_color = 'emerald' WHERE slug = 'quran-islamic-studies';
UPDATE categories SET icon = 'languages', icon_color = 'violet' WHERE slug = 'language-classes';
UPDATE categories SET icon = 'target', icon_color = 'red' WHERE slug = 'competitive-exam';
UPDATE categories SET icon = 'music', icon_color = 'fuchsia' WHERE slug = 'music-arts-tuition';

-- Event Planning subcategories
UPDATE categories SET icon = 'heart', icon_color = 'rose' WHERE slug = 'wedding-planning';
UPDATE categories SET icon = 'party-popper', icon_color = 'amber' WHERE slug = 'decoration-mandap';
UPDATE categories SET icon = 'tent', icon_color = 'emerald' WHERE slug = 'tent-shamiana';
UPDATE categories SET icon = 'volume-2', icon_color = 'indigo' WHERE slug = 'sound-lighting';
UPDATE categories SET icon = 'flower', icon_color = 'pink' WHERE slug = 'florist-event';

-- Automotive subcategories
UPDATE categories SET icon = 'wrench', icon_color = 'blue' WHERE slug = 'car-repair-service';
UPDATE categories SET icon = 'bike', icon_color = 'orange' WHERE slug = 'two-wheeler-service';
UPDATE categories SET icon = 'droplet', icon_color = 'cyan' WHERE slug = 'car-wash-auto';
UPDATE categories SET icon = 'circle', icon_color = 'amber' WHERE slug = 'tyre-battery';
UPDATE categories SET icon = 'car', icon_color = 'indigo' WHERE slug = 'driving-school-auto';
UPDATE categories SET icon = 'settings', icon_color = 'violet' WHERE slug = 'auto-accessories';
UPDATE categories SET icon = 'paint-bucket', icon_color = 'orange' WHERE slug = 'denting-painting';
UPDATE categories SET icon = 'car', icon_color = 'teal' WHERE slug = 'used-car-dealer';

-- Health & Medical subcategories
UPDATE categories SET icon = 'stethoscope', icon_color = 'blue' WHERE slug = 'general-physician';
UPDATE categories SET icon = 'smile', icon_color = 'sky' WHERE slug = 'dentist';
UPDATE categories SET icon = 'pill', icon_color = 'red' WHERE slug = 'pharmacy-health';
UPDATE categories SET icon = 'microscope', icon_color = 'indigo' WHERE slug = 'pathology-lab';
UPDATE categories SET icon = 'activity', icon_color = 'lime' WHERE slug = 'physiotherapy';
UPDATE categories SET icon = 'leaf', icon_color = 'emerald' WHERE slug = 'alt-medicine-health';
UPDATE categories SET icon = 'eye', icon_color = 'violet' WHERE slug = 'eye-care-optician';
UPDATE categories SET icon = 'building', icon_color = 'blue' WHERE slug = 'hospital-nursing-home';
UPDATE categories SET icon = 'baby', icon_color = 'pink' WHERE slug = 'gynecologist';
UPDATE categories SET icon = 'baby', icon_color = 'sky' WHERE slug = 'pediatrician';
UPDATE categories SET icon = 'sparkles', icon_color = 'rose' WHERE slug = 'dermatologist';
UPDATE categories SET icon = 'brain', icon_color = 'violet' WHERE slug = 'mental-health';

-- Construction & Renovation subcategories
UPDATE categories SET icon = 'hard-hat', icon_color = 'amber' WHERE slug = 'civil-contractor';
UPDATE categories SET icon = 'brick-wall', icon_color = 'orange' WHERE slug = 'mason-bricklayer';
UPDATE categories SET icon = 'drafting-compass', icon_color = 'blue' WHERE slug = 'architect-construction';
UPDATE categories SET icon = 'cog', icon_color = 'indigo' WHERE slug = 'fabrication-welding';
UPDATE categories SET icon = 'square', icon_color = 'teal' WHERE slug = 'tiles-flooring';

-- IT & Computer Services subcategories
UPDATE categories SET icon = 'globe', icon_color = 'blue' WHERE slug = 'web-app-development';
UPDATE categories SET icon = 'video', icon_color = 'indigo' WHERE slug = 'cctv-security';
UPDATE categories SET icon = 'monitor', icon_color = 'sky' WHERE slug = 'computer-sales-repair';
UPDATE categories SET icon = 'palette', icon_color = 'fuchsia' WHERE slug = 'graphic-design';

-- Photography subcategories
UPDATE categories SET icon = 'camera', icon_color = 'rose' WHERE slug = 'wedding-photography';
UPDATE categories SET icon = 'image', icon_color = 'amber' WHERE slug = 'product-photography';
UPDATE categories SET icon = 'mic', icon_color = 'indigo' WHERE slug = 'event-corporate-photo';
UPDATE categories SET icon = 'radio-tower', icon_color = 'sky' WHERE slug = 'drone-aerial';
UPDATE categories SET icon = 'frame', icon_color = 'violet' WHERE slug = 'studio-portraits';

-- Mehndi & Henna subcategories
UPDATE categories SET icon = 'crown', icon_color = 'rose' WHERE slug = 'bridal-mehndi';
UPDATE categories SET icon = 'party-popper', icon_color = 'amber' WHERE slug = 'party-mehndi';
UPDATE categories SET icon = 'feather', icon_color = 'emerald' WHERE slug = 'arabic-mehndi';
UPDATE categories SET icon = 'smile', icon_color = 'pink' WHERE slug = 'kids-mehndi';

-- Sweets & Bakery subcategories
UPDATE categories SET icon = 'candy', icon_color = 'pink' WHERE slug = 'traditional-sweets';
UPDATE categories SET icon = 'cake-slice', icon_color = 'rose' WHERE slug = 'cakes-pastry';
UPDATE categories SET icon = 'cookie', icon_color = 'amber' WHERE slug = 'namkeen-snacks';
UPDATE categories SET icon = 'gift', icon_color = 'orange' WHERE slug = 'dry-fruits-chocolates';

-- Jewellery & Watches subcategories
UPDATE categories SET icon = 'diamond', icon_color = 'yellow' WHERE slug = 'gold-diamond';
UPDATE categories SET icon = 'sparkles', icon_color = 'fuchsia' WHERE slug = 'imitation-jewellery';
UPDATE categories SET icon = 'watch', icon_color = 'indigo' WHERE slug = 'watch-sales-repair';
UPDATE categories SET icon = 'wand', icon_color = 'violet' WHERE slug = 'custom-jewellery';

-- Real Estate subcategories
UPDATE categories SET icon = 'house', icon_color = 'cyan' WHERE slug = 'residential-sale';
UPDATE categories SET icon = 'bed-double', icon_color = 'blue' WHERE slug = 'rental-pg';
UPDATE categories SET icon = 'building-2', icon_color = 'indigo' WHERE slug = 'commercial-property';
UPDATE categories SET icon = 'map-pin', icon_color = 'emerald' WHERE slug = 'plot-land';

-- Legal & Finance subcategories
UPDATE categories SET icon = 'gavel', icon_color = 'indigo' WHERE slug = 'lawyer-legal';
UPDATE categories SET icon = 'calculator', icon_color = 'blue' WHERE slug = 'ca-tax-services';
UPDATE categories SET icon = 'shield', icon_color = 'emerald' WHERE slug = 'insurance-legal';
UPDATE categories SET icon = 'wallet', icon_color = 'amber' WHERE slug = 'loans-financial';

-- Travel & Tourism subcategories
UPDATE categories SET icon = 'moon-star', icon_color = 'emerald' WHERE slug = 'hajj-umrah';
UPDATE categories SET icon = 'mountain', icon_color = 'sky' WHERE slug = 'domestic-tours';
UPDATE categories SET icon = 'globe', icon_color = 'blue' WHERE slug = 'international-tours';
UPDATE categories SET icon = 'ticket', icon_color = 'violet' WHERE slug = 'visa-services-travel';

-- Fitness & Sports subcategories
UPDATE categories SET icon = 'dumbbell', icon_color = 'lime' WHERE slug = 'gym-weight-training';
UPDATE categories SET icon = 'wind', icon_color = 'teal' WHERE slug = 'yoga-meditation';
UPDATE categories SET icon = 'trophy', icon_color = 'amber' WHERE slug = 'sports-coaching';
UPDATE categories SET icon = 'waves', icon_color = 'cyan' WHERE slug = 'swimming';

-- Fashion & Clothing subcategories
UPDATE categories SET icon = 'shirt', icon_color = 'indigo' WHERE slug = 'mens-wear';
UPDATE categories SET icon = 'shirt', icon_color = 'pink' WHERE slug = 'womens-wear';
UPDATE categories SET icon = 'baby', icon_color = 'sky' WHERE slug = 'kids-wear';
UPDATE categories SET icon = 'footprints', icon_color = 'amber' WHERE slug = 'footwear-fashion';
UPDATE categories SET icon = 'glasses', icon_color = 'violet' WHERE slug = 'fashion-accessories';

-- Grocery subcategories
UPDATE categories SET icon = 'store', icon_color = 'emerald' WHERE slug = 'provision-kirana';
UPDATE categories SET icon = 'apple', icon_color = 'lime' WHERE slug = 'fruits-vegetables';
UPDATE categories SET icon = 'milk', icon_color = 'amber' WHERE slug = 'dairy-milk-grocery';
UPDATE categories SET icon = 'boxes', icon_color = 'orange' WHERE slug = 'wholesale-grocery';

-- Mobile & Telecom subcategories
UPDATE categories SET icon = 'smartphone', icon_color = 'blue' WHERE slug = 'mobile-phone-sales';
UPDATE categories SET icon = 'wrench', icon_color = 'indigo' WHERE slug = 'mobile-repair';
UPDATE categories SET icon = 'headphones', icon_color = 'violet' WHERE slug = 'mobile-accessories';
UPDATE categories SET icon = 'radio', icon_color = 'sky' WHERE slug = 'recharge-plans-dth';

-- Interior Design subcategories
UPDATE categories SET icon = 'layout-grid', icon_color = 'orange' WHERE slug = 'modular-kitchen-interior';
UPDATE categories SET icon = 'cloud', icon_color = 'sky' WHERE slug = 'false-ceiling-pop';
UPDATE categories SET icon = 'panel-top', icon_color = 'teal' WHERE slug = 'curtains-blinds';
UPDATE categories SET icon = 'paintbrush', icon_color = 'fuchsia' WHERE slug = 'wallpaper-texture';

-- Furniture & Woodwork subcategories
UPDATE categories SET icon = 'sofa', icon_color = 'orange' WHERE slug = 'home-furniture';
UPDATE categories SET icon = 'armchair', icon_color = 'blue' WHERE slug = 'office-furniture';
UPDATE categories SET icon = 'hammer', icon_color = 'amber' WHERE slug = 'upholstery-repair';
UPDATE categories SET icon = 'axe', icon_color = 'emerald' WHERE slug = 'custom-woodwork';

-- Pet Care subcategories
UPDATE categories SET icon = 'building', icon_color = 'red' WHERE slug = 'vet-animal-hospital';
UPDATE categories SET icon = 'bath', icon_color = 'cyan' WHERE slug = 'pet-grooming';
UPDATE categories SET icon = 'paw-print', icon_color = 'orange' WHERE slug = 'pet-shop-supplies';
UPDATE categories SET icon = 'paw-print', icon_color = 'emerald' WHERE slug = 'pet-boarding-training';

-- Printing & Signage subcategories
UPDATE categories SET icon = 'mail', icon_color = 'rose' WHERE slug = 'wedding-invitation';
UPDATE categories SET icon = 'credit-card', icon_color = 'indigo' WHERE slug = 'visiting-cards';
UPDATE categories SET icon = 'flag', icon_color = 'amber' WHERE slug = 'banners-signage';

COMMIT;
