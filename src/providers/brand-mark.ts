import { readFileSync } from 'fs';
import sharp from 'sharp';
import { parse, type Font } from 'opentype.js';

/**
 * Brand marks: a designed logo for a business that has none (most
 * bulk-imported local businesses).
 *
 * Name-led and icon-free: the business name, set in a typeface chosen for its
 * category, composed with abstract geometry in the category's palette.
 * Thirty layouts, each with its own light/dark and typeface choices, so a
 * catalogue of local businesses looks varied and designed rather than
 * templated. The same name always gives the same mark; `variant` the next.
 *
 * AI logos reuse this: the artwork goes into one of thirty frames (nine art
 * shapes × three name placements, plus full-bleed and seal), each carrying
 * the typeset name — image models garble text. The prompt draws on the whole
 * business: every category, the name's meaning, description, products and
 * location.
 *
 * Everything is vector — fonts are drawn as paths, since the production
 * image has no fonts — then rasterised to a small WebP.
 */

/** Storage folder for marks; also how a URL is recognised as generated. */
export const BRAND_MARK_FOLDER = 'providers/brand-marks';

/** True when this logo URL is a generated brand mark (safe to replace). */
export function isBrandMarkUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(`/${BRAND_MARK_FOLDER}/`);
}

const SIZE = 512;
const C = SIZE / 2;

// ─── Palettes, typefaces, categories ─────────────────────────────────────

/** bg/deep: dark grounds · brights: shapes · hero: light ground · ink: on hero. */
type Palette = {
  bg: string;
  deep: string;
  brights: [string, string, string];
  hero: string;
  ink: string;
  /** The palette in words, for AI prompts. */
  words: [string, string, string];
};

const PALETTES = {
  sweets: {
    bg: '#3B0A2A',
    deep: '#6E1846',
    brights: ['#F0507F', '#FFB4A2', '#FFD166'],
    hero: '#FFF1E8',
    ink: '#5A0F36',
    words: ['raspberry pink', 'soft peach', 'butter yellow'],
  },
  food: {
    bg: '#2E1006',
    deep: '#7A2914',
    brights: ['#E8582E', '#F6A44C', '#FFD27A'],
    hero: '#FFF5E4',
    ink: '#6B210F',
    words: ['terracotta', 'saffron orange', 'warm cream'],
  },
  beauty: {
    bg: '#2B0E35',
    deep: '#5E2470',
    brights: ['#D257BE', '#F7A8D8', '#FFD9A8'],
    hero: '#FFF0F8',
    ink: '#4E1A5E',
    words: ['orchid', 'blush pink', 'champagne'],
  },
  fashion: {
    bg: '#121040',
    deep: '#2C2A85',
    brights: ['#5B54F0', '#F7B32B', '#A9B5FF'],
    hero: '#FFF8E8',
    ink: '#1E1B6B',
    words: ['royal indigo', 'marigold', 'periwinkle'],
  },
  jewellery: {
    bg: '#1E1407',
    deep: '#5B420F',
    brights: ['#D4A72C', '#F5D98B', '#E07A5F'],
    hero: '#FFF8E2',
    ink: '#4A350B',
    words: ['antique gold', 'pale gold', 'deep bronze'],
  },
  tech: {
    bg: '#061A33',
    deep: '#123E77',
    brights: ['#2F80ED', '#56CCF2', '#FFC857'],
    hero: '#ECF7FF',
    ink: '#0D2F5E',
    words: ['electric blue', 'sky cyan', 'amber'],
  },
  services: {
    bg: '#052926',
    deep: '#0C5A51',
    brights: ['#17A88F', '#F4C34F', '#9BE7D8'],
    hero: '#EEFFFA',
    ink: '#0A433D',
    words: ['deep teal', 'mustard', 'mint'],
  },
  home: {
    bg: '#23160C',
    deep: '#64401F',
    brights: ['#C4895A', '#EAC46B', '#7FB7A4'],
    hero: '#FFF7EC',
    ink: '#4F3218',
    words: ['walnut', 'honey', 'sage green'],
  },
  health: {
    bg: '#03212B',
    deep: '#0A5466',
    brights: ['#14A9C8', '#7FE1F0', '#F48A8A'],
    hero: '#EEFCFF',
    ink: '#08414F',
    words: ['clinical teal', 'aqua', 'soft coral'],
  },
  learning: {
    bg: '#13230A',
    deep: '#3E6212',
    brights: ['#80BA1B', '#F4CB4F', '#5FB0E8'],
    hero: '#FAFFEF',
    ink: '#2F4A0D',
    words: ['leaf green', 'sunflower yellow', 'sky blue'],
  },
  grocery: {
    bg: '#072614',
    deep: '#145C34',
    brights: ['#26AA5C', '#F9C74F', '#F3722C'],
    hero: '#F2FFF5',
    ink: '#0E4627',
    words: ['fresh green', 'mango yellow', 'carrot orange'],
  },
  fragrance: {
    bg: '#190B3C',
    deep: '#3D1E8C',
    brights: ['#8150FF', '#E3B5FF', '#FFC7DE'],
    hero: '#F8F3FF',
    ink: '#2E1670',
    words: ['amethyst', 'lilac', 'rose quartz'],
  },
  travel: {
    bg: '#0A1120',
    deep: '#22356B',
    brights: ['#3E63E0', '#FFC247', '#FF6F61'],
    hero: '#FFF9EC',
    ink: '#18264E',
    words: ['midnight blue', 'sunset gold', 'coral'],
  },
  events: {
    bg: '#2A0512',
    deep: '#7D1A3A',
    brights: ['#E8264F', '#FFA8B6', '#FFD166'],
    hero: '#FFF1F3',
    ink: '#651430',
    words: ['crimson', 'rose pink', 'festive gold'],
  },
} satisfies Record<string, Palette>;

type PaletteName = keyof typeof PALETTES;

/** Open-licence Google Fonts (Fontsource). */
const FONT_FILES = {
  pacifico: '@fontsource/pacifico/files/pacifico-latin-400-normal.woff',
  fraunces: '@fontsource/fraunces/files/fraunces-latin-900-normal.woff',
  playfair:
    '@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff',
  cinzel: '@fontsource/cinzel/files/cinzel-latin-800-normal.woff',
  grotesk:
    '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff',
  archivo:
    '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff',
  baloo: '@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff',
  bebas: '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
  abril: '@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff',
} as const;
type FontName = keyof typeof FONT_FILES;

/** Typefaces that suit each category, best first. */
const PALETTE_FONTS: Record<PaletteName, FontName[]> = {
  sweets: ['pacifico', 'fraunces', 'abril'],
  food: ['fraunces', 'archivo', 'bebas'],
  beauty: ['playfair', 'cinzel', 'pacifico'],
  fashion: ['playfair', 'cinzel', 'bebas'],
  jewellery: ['cinzel', 'playfair', 'abril'],
  tech: ['grotesk', 'archivo', 'bebas'],
  services: ['archivo', 'grotesk', 'bebas'],
  home: ['fraunces', 'playfair', 'baloo'],
  health: ['baloo', 'grotesk', 'fraunces'],
  learning: ['baloo', 'fraunces', 'grotesk'],
  grocery: ['baloo', 'fraunces', 'archivo'],
  fragrance: ['cinzel', 'playfair', 'abril'],
  travel: ['bebas', 'archivo', 'grotesk'],
  events: ['abril', 'pacifico', 'playfair'],
};
/** Script faces don't work in capitals or tight spaces. */
const SCRIPT: FontName[] = ['pacifico'];
const SERIFS: FontName[] = ['playfair', 'cinzel', 'fraunces', 'abril'];
const CONDENSED: FontName[] = ['bebas', 'archivo', 'grotesk'];

/**
 * Tested against every category, then the business name, then its
 * description. The first match sets the palette; every match adds what an
 * AI logo can depict (`subjects`, one picked per try) and the small line
 * under the name (`label`, from the first).
 */
type Rule = {
  match: RegExp;
  palette: PaletteName;
  label: string;
  subjects: string[];
};
const RULES: Rule[] = [
  {
    match:
      /cake|bake|bakery|sweet|mithai|dessert|chocolate|confection|patisser/,
    palette: 'sweets',
    label: 'Bakery',
    subjects: [
      'a layered celebration cake',
      'a tray of frosted cupcakes',
      'a whisk and mixing bowl with batter',
      'a rolling pin over fresh dough',
      'an ornate tiered wedding cake',
      'a box of assorted Indian sweets',
    ],
  },
  {
    match: /cafe|coffee|tea\b|chai/,
    palette: 'food',
    label: 'Café',
    subjects: [
      'a steaming glass of cutting chai',
      'a kettle pouring tea',
      'coffee beans around a cup',
      'a cosy café counter',
      'a teapot with rising steam swirls',
    ],
  },
  {
    match:
      /food|restaurant|catering|caterer|tiffin|kitchen|snack|biryani|meal|dining|cook|thal/,
    palette: 'food',
    label: 'Kitchen',
    subjects: [
      'a handi cooking pot with rising steam',
      'a thali with small bowls of curry',
      'a biryani pot with saffron rice',
      'a chef hat and ladle',
      'a stacked tiffin carrier',
      'colourful spices in small bowls',
      'a large shared thaal platter',
    ],
  },
  {
    match:
      /grocery|kirana|provision|supermarket|dry ?fruit|spice|masala|vegetable|fruit|dairy/,
    palette: 'grocery',
    label: 'Fresh Market',
    subjects: [
      'a woven basket of fresh produce',
      'glass jars of spices and grains',
      'a paper grocery bag with vegetables',
      'a bowl of dry fruits and nuts',
      'sacks of rice and lentils',
    ],
  },
  {
    match:
      /salon|beauty|parlou?r|spa|makeup|mehndi|henna|cosmetic|skin|nail|bridal/,
    palette: 'beauty',
    label: 'Beauty Studio',
    subjects: [
      'an elegant lotus flower',
      'a hand decorated with intricate mehndi',
      'a makeup brush and compact',
      'an ornate vanity mirror with sparkles',
      'a graceful silhouette with flowing hair',
      'bottles of nail colour',
    ],
  },
  {
    match: /tailor|stitch|alteration|sew|embroider/,
    palette: 'fashion',
    label: 'Tailors',
    subjects: [
      'a vintage sewing machine',
      'a dress form mannequin',
      'a coiled measuring tape',
      'an embroidery hoop with floral stitching',
      'spools of colourful thread',
      "a tailor's chalk on pattern paper",
      'a tailored jacket on a hanger',
      'a needle and pin cushion',
    ],
  },
  {
    match:
      /rida|cloth|fashion|boutique|garment|apparel|dress|saree|kurta|textile|fabric|wear|ethnic/,
    palette: 'fashion',
    label: 'Boutique',
    subjects: [
      'flowing draped fabric with an embroidered border',
      'an elegant embroidered rida',
      'a boutique clothing rack',
      'folded fabrics with lace trim',
      'an embroidered dress on a hanger',
      'a paisley textile pattern',
    ],
  },
  {
    match: /shoe|footwear|chappal|jutti/,
    palette: 'fashion',
    label: 'Footwear',
    subjects: [
      'a stylish shoe',
      'a pair of embroidered juttis',
      'an elegant heel',
      'a pair of sneakers',
    ],
  },
  {
    match: /jewel|gold|silver|diamond|ornament|bangle/,
    palette: 'jewellery',
    label: 'Jewellers',
    subjects: [
      'a faceted gemstone ring',
      'a pearl necklace',
      'ornate gold bangles',
      'a pair of jhumka earrings',
      'an open jewellery box',
    ],
  },
  {
    match: /watch|clock/,
    palette: 'jewellery',
    label: 'Watches',
    subjects: [
      'a classic wristwatch',
      'an antique pocket watch',
      'interlocking clock gears',
    ],
  },
  {
    match: /perfume|attar|ittar|itar|fragrance|oud|bakhoor/,
    palette: 'fragrance',
    label: 'Attar & Perfumes',
    subjects: [
      'an ornate attar perfume bottle',
      'an oud burner with curling smoke',
      'glass perfume vials among flowers',
      'a crystal decanter of attar',
    ],
  },
  {
    match: /appliance|washing|fridge|refrigerator|\bac\b|air ?condition|cooler/,
    palette: 'tech',
    label: 'Appliances',
    subjects: [
      'a modern washing machine',
      'a refrigerator in a bright kitchen',
      'an air conditioner with a cool breeze',
      'a mixer grinder and microwave',
      'a ceiling fan',
    ],
  },
  {
    match: /mobile|phone/,
    palette: 'tech',
    label: 'Mobiles',
    subjects: [
      'a smartphone',
      'a phone with earbuds and a charger',
      'a phone with a glowing screen',
    ],
  },
  {
    match: /computer|laptop|software|\bit\b|digital|web|saas|tech|app\b/,
    palette: 'tech',
    label: 'Technology',
    subjects: [
      'a laptop with a glowing screen',
      'flowing circuit lines',
      'a cloud with code brackets',
      'a computer monitor and keyboard',
    ],
  },
  {
    match: /electronic|electric|wiring/,
    palette: 'tech',
    label: 'Electricals',
    subjects: [
      'a lightning bolt and a plug',
      'a glowing light bulb',
      'a switchboard with wires',
    ],
  },
  {
    match: /plumb|water|ro\b|purifier/,
    palette: 'services',
    label: 'Plumbing',
    subjects: [
      'a water droplet and a pipe',
      'a tap with flowing water',
      'pipes and a wrench',
      'a water purifier',
    ],
  },
  {
    match:
      /repair|service|maintenance|fix|mechanic|carpent|contractor|construction|civil/,
    palette: 'services',
    label: 'Home Services',
    subjects: [
      'a crossed wrench and screwdriver',
      'an open toolbox',
      'a hammer and saw',
      'a house with tools',
      'a hard hat and blueprint',
    ],
  },
  {
    match: /paint|interior|decor|design/,
    palette: 'home',
    label: 'Interiors',
    subjects: [
      'a paintbrush with colour swatches',
      'a paint roller on a wall',
      'a stylish living room corner',
      'a lamp beside an armchair',
    ],
  },
  {
    match: /furniture|sofa|home|mattress|curtain|kitchenware|utensil|crockery/,
    palette: 'home',
    label: 'Home & Living',
    subjects: [
      'a cosy armchair',
      'a wooden table and chairs',
      'a sofa with cushions',
      'a bed with soft pillows',
      'neatly stacked crockery and utensils',
    ],
  },
  {
    match: /pharma|chemist|medical store|medicine/,
    palette: 'health',
    label: 'Pharmacy',
    subjects: [
      'a medicine capsule and a leaf',
      'a mortar and pestle',
      'a pharmacy cross',
      'neat rows of pill bottles',
    ],
  },
  {
    match:
      /clinic|doctor|health|dental|hospital|physio|therap|diagnos|lab\b|homeopath/,
    palette: 'health',
    label: 'Clinic',
    subjects: [
      'a stethoscope forming a heart',
      'caring hands holding a heart',
      'a medical cross with a leaf',
      'a doctor’s bag',
    ],
  },
  {
    match: /gym|fitness|yoga|sport/,
    palette: 'health',
    label: 'Fitness',
    subjects: [
      'a dumbbell',
      'a figure in a yoga pose',
      'a kettlebell',
      'a pair of running shoes',
    ],
  },
  {
    match:
      /school|tuition|tutor|class|coaching|education|academy|madrasa|quran|learn|training/,
    palette: 'learning',
    label: 'Academy',
    subjects: [
      'an open book with a graduation cap',
      'a stack of books and an apple',
      'a pencil and notebook',
      'a globe beside books',
      'a chalkboard',
    ],
  },
  {
    match: /book|stationer/,
    palette: 'learning',
    label: 'Books',
    subjects: [
      'an open book and a pencil',
      'a stack of books',
      'a fountain pen and notebook',
    ],
  },
  {
    match: /print|xerox|press|flex|banner/,
    palette: 'learning',
    label: 'Print',
    subjects: [
      'a printer printing a page',
      'printed papers and ink drops',
      'a stack of printed flyers',
    ],
  },
  {
    match: /travel|tour|hajj|umrah|ziyarat|ticket|visa/,
    palette: 'travel',
    label: 'Travels',
    subjects: [
      'a paper plane circling a globe',
      'a suitcase with travel stickers',
      'an airplane above clouds',
      'a compass on a map',
      'a passport and boarding pass',
    ],
  },
  {
    match: /car|auto|vehicle|bike|garage|tyre/,
    palette: 'travel',
    label: 'Auto',
    subjects: ['a sleek car', 'a car wheel', 'a car with a wrench'],
  },
  {
    match: /transport|logistic|courier|packers|movers|delivery/,
    palette: 'travel',
    label: 'Logistics',
    subjects: [
      'a delivery truck',
      'stacked cardboard boxes',
      'a parcel with wings',
    ],
  },
  {
    match: /law|legal|advocate|lawyer/,
    palette: 'travel',
    label: 'Legal',
    subjects: ['balanced scales of justice', 'a gavel', 'a row of law books'],
  },
  {
    match:
      /account|\bca\b|tax|consult|insurance|finance|loan|real estate|property|agency/,
    palette: 'travel',
    label: 'Consultants',
    subjects: [
      'a briefcase and a rising chart',
      'a handshake',
      'a calculator and documents',
      'a building with a growth arrow',
    ],
  },
  {
    match: /photo|studio|video/,
    palette: 'events',
    label: 'Studio',
    subjects: [
      'a vintage camera',
      'a camera lens',
      'a strip of film',
      'a studio light',
    ],
  },
  {
    match: /event|wedding|party|decorat|celebrat/,
    palette: 'events',
    label: 'Events',
    subjects: [
      'festive garlands and lanterns',
      'a stage decorated with flowers',
      'string lights and balloons',
      'a decorated wedding mandap',
    ],
  },
  {
    match: /gift|toy|novelt/,
    palette: 'events',
    label: 'Gifts',
    subjects: [
      'a wrapped gift box with a bow',
      'a stack of gifts',
      'a teddy bear with a gift',
    ],
  },
  {
    match: /flower|florist|plant|nursery|garden/,
    palette: 'grocery',
    label: 'Florist',
    subjects: ['a blooming flower', 'a hand-tied bouquet', 'potted plants'],
  },
  {
    match: /pet|vet/,
    palette: 'grocery',
    label: 'Pets',
    subjects: ['a playful paw print', 'a happy dog and cat', 'a pet bowl'],
  },
  {
    match: /baby|kid/,
    palette: 'beauty',
    label: 'Kids',
    subjects: ['a baby rattle', 'a tiny onesie', 'soft toys'],
  },
  {
    match: /optic|spectacle|eyewear/,
    palette: 'health',
    label: 'Opticals',
    subjects: [
      'a pair of spectacles',
      'stylish sunglasses',
      'an eye framed by glasses',
    ],
  },
  {
    match: /art|craft|handmade|calligraph/,
    palette: 'fragrance',
    label: 'Art & Craft',
    subjects: [
      'an artist palette and brush',
      'a calligraphy pen with ink',
      'handmade crafts',
    ],
  },
];
const FALLBACK_SUBJECTS = [
  'a welcoming shopfront with an awning',
  'a bustling market stall',
  'a shopping bag',
];

/** Looks used when nothing matches, chosen by name so it stays stable. */
const FALLBACK: PaletteName[] = [
  'fashion',
  'services',
  'beauty',
  'travel',
  'tech',
  'home',
];

/**
 * What words in a brand name mean — English plus the Urdu, Arabic and Hindi
 * words common in local business names — used as a motif in AI artwork.
 * Keys of three letters or fewer, or marked "=", must match the whole word
 * ("car" is not "carpet"); longer keys match a word's start ("noori",
 * "saifee"), and keys of five letters or more anywhere in it ("frostique").
 */
const MEANINGS: Array<[string[], string]> = [
  [['=chandi', 'silver', 'gold', 'sona', 'kundan'], 'gold coins'],
  [
    [
      'noor',
      'nur',
      'roshni',
      'shams',
      'suraj',
      'sun',
      'sunrise',
      'sunny',
      'aftab',
    ],
    'radiant sun',
  ],
  [
    ['chand', 'qamar', 'badr', 'hilal', 'mahtab', 'moon', 'crescent'],
    'crescent moon',
  ],
  [
    [
      'najm',
      'sitara',
      'sitaara',
      '=tara',
      '=star',
      'stars',
      'starlight',
      'kawkab',
    ],
    'shining star',
  ],
  [
    [
      'gul',
      'gulab',
      'gulshan',
      'gulzar',
      'phool',
      'rose',
      'flower',
      'bahar',
      'bloom',
      'lotus',
      'kamal',
      'yasmin',
      'jasmine',
      'mogra',
    ],
    'blooming flower',
  ],
  [
    ['zamzam', 'aab', 'pani', 'water', 'aqua', 'neer', 'river', 'dariya'],
    'water droplets',
  ],
  [
    [
      'shahi',
      'royal',
      'king',
      'queen',
      '=raja',
      'rani',
      '=malik',
      'crown',
      'taj',
      'sultan',
      'nawab',
      'regal',
    ],
    'royal crown',
  ],
  [['dil', 'heart', 'love', 'mohabbat', 'pyaar', 'ishq', 'habib'], 'heart'],
  [
    ['frost', 'ice', 'snow', 'barf', 'cool', 'chill', 'arctic', 'polar'],
    'snowflake',
  ],
  [
    [
      'fire',
      'flame',
      'aag',
      'spicy',
      'tandoor',
      'tikka',
      'sizzl',
      'blaze',
      'hot',
      'garam',
    ],
    'flame',
  ],
  [
    [
      'leaf',
      'green',
      '=hara',
      'organic',
      'herbal',
      'fresh',
      'nature',
      'eco',
      'sabz',
    ],
    'fresh leaves',
  ],
  [['tree', 'shajar', 'oak', 'pine', 'jungle', 'forest'], 'tree'],
  [
    ['palm', 'khajoor', 'khajur', '=date', '=dates', 'oasis', 'nakhl'],
    'date palm',
  ],
  [
    [
      'mountain',
      'koh',
      'parbat',
      'pahad',
      'summit',
      'peak',
      'everest',
      'himalaya',
    ],
    'mountain peak',
  ],
  [['sky', 'falak', 'asmaan', 'aasmaan', 'cloud', 'badal'], 'clouds'],
  [
    [
      'feather',
      'bird',
      'parinda',
      'shaheen',
      'baaz',
      'eagle',
      'falcon',
      'hawk',
      'peacock',
      'mor',
      'bulbul',
    ],
    'graceful bird',
  ],
  [['key', 'chabi'], 'key'],
  [['ghar', 'makaan', 'house', 'home', 'aashiyana', 'basera'], 'house'],
  [
    [
      'diya',
      'deep',
      'lamp',
      'chirag',
      'chiragh',
      'fanoos',
      'lantern',
      'qandeel',
    ],
    'glowing lantern',
  ],
  [
    [
      'quick',
      'fast',
      'express',
      'rapid',
      'jaldi',
      'speed',
      'swift',
      'instant',
      'turbo',
    ],
    'lightning bolt',
  ],
  [['rocket', 'launch', 'udaan'], 'rocket'],
  [['anchor', 'ship', 'marine', 'boat', 'sail'], 'anchor'],
  [
    ['globe', 'world', 'duniya', 'international', 'global', '=alam', 'jahan'],
    'globe',
  ],
  [['gift', 'tohfa', 'hadiya', 'surprise'], 'gift box'],
  [['chai', 'coffee', 'cafe', 'kahwa', 'qahwa'], 'steaming cup'],
  [['saif', 'sword', 'talwar', 'shamsheer', 'zulfiqar'], 'curved sword'],
  [['shield', 'secure', 'hifazat', 'guard', 'raksha', 'amaan'], 'shield'],
  [['compass', 'qibla', '=disha', 'safar', 'journey', 'musafir'], 'compass'],
  [['fort', 'qila', 'castle', '=mahal', 'palace'], 'palace dome'],
  [['wave', 'lehar', 'ocean', 'sea', 'samandar', 'sagar'], 'ocean waves'],
  [
    [
      'gem',
      'diamond',
      'heera',
      'hira',
      'moti',
      'pearl',
      'jauhar',
      'johar',
      'ratan',
      'jewel',
      'yaqoot',
      'feroza',
      'zumurrud',
    ],
    'gemstone',
  ],
  [['sparkle', 'shine', 'chamak', 'glow', 'glitter', 'glam'], 'sparkles'],
  [['smile', 'khushi', 'happy', 'muskan', 'muskaan'], 'joyful smile'],
];

function keyMatches(word: string, key: string): boolean {
  if (key.startsWith('='))
    return word === key.slice(1) || word === `${key.slice(1)}s`;
  if (key.length <= 3) return word === key || word === `${key}s`;
  return word.startsWith(key) || (key.length >= 5 && word.includes(key));
}

/** Words that say little about the brand; dropped when a name runs long. */
const SKIP_WORDS = new Set([
  'the',
  'and',
  'of',
  'a',
  'an',
  'al',
  'el',
  'shop',
  'store',
  'stores',
  'mart',
  'traders',
  'trading',
  'co',
  'company',
  'sons',
  'bros',
  'brothers',
  'india',
  'by',
  'shri',
  'shree',
  'sri',
  'enterprises',
  'enterprise',
  'services',
  'service',
  'centre',
  'center',
  'house',
  'world',
  'international',
]);
const LEGAL = /\b(pvt|private|ltd|limited|llp|inc|m\/s)\b\.?/gi;

function titleCase(w: string): string {
  if (w.length <= 4 && w === w.toUpperCase() && /\p{Lu}/u.test(w)) return w; // ABC, NRI
  return w[0].toUpperCase() + w.slice(1).toLowerCase();
}

/** The name as it should read on a logo: no legal suffixes, not too long. */
function displayWords(name: string): string[] {
  let words = name
    .replace(LEGAL, ' ')
    .replace(/[^\p{L}\p{N}\s&'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.join(' ').length > 22) {
    const meaningful = words.filter((w) => !SKIP_WORDS.has(w.toLowerCase()));
    if (meaningful.length) words = meaningful;
  }
  if (words.join(' ').length > 26) words = words.slice(0, 3);
  return words.map(titleCase);
}

/** One line if short, else two balanced lines. */
function nameLines(words: string[]): string[] {
  const full = words.join(' ');
  if (words.length < 2 || full.length <= 11) return [full];
  let best = [full];
  let score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const s = Math.max(a.length, b.length);
    if (s < score) [score, best] = [s, [a, b]];
  }
  return best;
}

export type BrandStyle = {
  palette: Palette;
  fonts: FontName[];
  /** Every rule the business matched, primary first. */
  rules: Rule[];
  /** What the name means, for AI artwork ("Frostique" → snowflake). */
  motif: string | null;
  label: string | null;
};

/** Palette, typefaces, matched categories and the name's meaning. */
export function brandStyle(
  name: string,
  categories: string[],
  description = '',
): BrandStyle {
  const rules: Rule[] = [];
  for (const text of [...categories, name, description].map((s) =>
    s.toLowerCase(),
  )) {
    for (const r of RULES)
      if (r.match.test(text) && !rules.includes(r)) rules.push(r);
  }
  const primary = rules[0];
  const paletteName =
    primary?.palette ??
    FALLBACK[hash(name.trim().toLowerCase()) % FALLBACK.length];
  const words = name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const meaning = MEANINGS.find(([keys]) =>
    words.some((w) => keys.some((k) => keyMatches(w, k))),
  );
  return {
    palette: PALETTES[paletteName],
    fonts: PALETTE_FONTS[paletteName],
    rules,
    motif: meaning?.[1] ?? null,
    label:
      primary?.label ??
      (categories[0]
        ? titleCase(categories[0].split(/[&,/]/)[0].trim())
        : null),
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────

function hash(text: string): number {
  // FNV-1a, then murmur3's finaliser: FNV alone clusters on similar names.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Seeded PRNG (mulberry32): the same name always draws the same mark. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(items: readonly T[], rand: () => number): T =>
  items[Math.floor(rand() * items.length)];
const f1 = (n: number) => n.toFixed(1);

const fonts = new Map<FontName, Font>();
function loadFont(name: FontName): Font {
  let font = fonts.get(name);
  if (!font) {
    const file = readFileSync(require.resolve(FONT_FILES[name]));
    font = parse(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    );
    fonts.set(name, font);
  }
  return font;
}

/** Path data from opentype commands (its own toPathData prints NaN for some glyphs). */
function pathData(commands: Array<Record<string, number | string>>): string {
  const n = (v: number | string) =>
    (Math.round(Number(v) * 100) / 100).toString();
  return commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case 'Q':
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case 'C':
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        default:
          return 'Z';
      }
    })
    .join('');
}

type SetLine = {
  glyphs: Array<{ d: string; x: number; width: number }>;
  width: number;
  top: number;
  bottom: number;
};

/** Lay out one line at `size` (tracking in px), or null if the font can't draw it. */
function setLine(
  fontName: FontName,
  text: string,
  size: number,
  tracking = 0,
): SetLine | null {
  const font = loadFont(fontName);
  const chars = [...text];
  if (
    !chars.length ||
    chars.some((ch) => ch.trim() && font.charToGlyphIndex(ch) === 0)
  )
    return null;
  const scale = size / font.unitsPerEm;
  const glyphs: SetLine['glyphs'] = [];
  let x = 0;
  let top = 0;
  let bottom = 0;
  chars.forEach((ch, i) => {
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(0, 0, size);
    const box = path.getBoundingBox();
    if (Number.isFinite(box.y1)) top = Math.min(top, box.y1);
    if (Number.isFinite(box.y2)) bottom = Math.max(bottom, box.y2);
    const kern =
      i + 1 < chars.length
        ? font.getKerningValue(glyph, font.charToGlyph(chars[i + 1]))
        : 0;
    const width = (glyph.advanceWidth ?? 0) * scale;
    glyphs.push({ d: pathData(path.commands as never), x, width });
    x += width + (Number.isFinite(kern) ? kern * scale : 0) + tracking;
  });
  const width = x - tracking;
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    glyphs.some((g) => /NaN/.test(g.d))
  )
    return null;
  return { glyphs, width, top, bottom };
}

type Block = {
  width: number;
  height: number;
  /** Draw centred on (x, y) — or with its left edge at x when left-aligned. */
  draw: (x: number, y: number, fill: string, attrs?: string) => string;
};

/** Lines of text fitted into maxW × maxH at one size. `tracking` is in ems. */
function fitText(
  fontName: FontName,
  lines: string[],
  maxW: number,
  maxH: number,
  opts: {
    tracking?: number;
    gap?: number;
    align?: 'center' | 'left';
    maxSize?: number;
  } = {},
): Block | null {
  const { tracking = 0, gap = 0.16, align = 'center', maxSize = 190 } = opts;
  const probe = lines.map((l) => setLine(fontName, l, 100, tracking * 100));
  if (!lines.length || probe.some((p) => !p)) return null;
  const P = probe as SetLine[];
  const ascent = Math.max(...P.map((p) => -p.top));
  const descent = Math.max(...P.map((p) => p.bottom));
  const lineH = ascent + descent;
  const totalH = lineH * lines.length + lineH * gap * (lines.length - 1);
  const widest = Math.max(...P.map((p) => p.width));
  const size = Math.min((100 * maxW) / widest, (100 * maxH) / totalH, maxSize);
  const k = size / 100;
  const set = lines.map((l) => setLine(fontName, l, size, tracking * size));
  if (set.some((s) => !s)) return null;
  const S = set as SetLine[];
  const width = Math.max(...S.map((s) => s.width));
  const height = totalH * k;
  return {
    width,
    height,
    draw: (x, y, fill, attrs = '') => {
      const top = y - height / 2;
      const body = S.map((s, i) => {
        const baseline = top + i * lineH * k * (1 + gap) + ascent * k;
        const x0 = align === 'center' ? x - s.width / 2 : x;
        return s.glyphs
          .map(
            (g) =>
              `<path transform="translate(${(x0 + g.x).toFixed(2)} ${baseline.toFixed(2)})" d="${g.d}"/>`,
          )
          .join('');
      }).join('');
      return `<g fill="${fill}" ${attrs}>${body}</g>`;
    },
  };
}

/** Text along a circle: over the top (clockwise) or under the bottom. */
function arcText(
  fontName: FontName,
  text: string,
  radius: number,
  size: number,
  maxArc: number,
  fill: string,
  bottom = false,
): string | null {
  let t = setLine(fontName, text, size, size * 0.14);
  if (!t) return null;
  if (t.width / radius > maxArc) {
    const s = (size * maxArc) / (t.width / radius);
    t = setLine(fontName, text, s, s * 0.14);
    if (!t) return null;
  }
  const span = t.width / radius;
  return t.glyphs
    .map((g) => {
      const mid = (g.x + g.width / 2) / radius;
      const angle = bottom
        ? Math.PI / 2 + span / 2 - mid
        : -Math.PI / 2 - span / 2 + mid;
      const x = C + radius * Math.cos(angle);
      const y = C + radius * Math.sin(angle);
      const deg =
        ((bottom ? angle - Math.PI / 2 : angle + Math.PI / 2) * 180) / Math.PI;
      return `<path fill="${fill}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(2)}) translate(${(-g.width / 2).toFixed(2)} 0)" d="${g.d}"/>`;
    })
    .join('');
}

// ─── Shapes ──────────────────────────────────────────────────────────────

const T = SIZE / 4;
/** Bauhaus tile motifs, drawn in a T×T box and rotated by quarter turns. */
const MOTIFS: Array<{
  weight: number;
  draw: (fill: string, alt: string) => string;
}> = [
  {
    weight: 5,
    draw: (f) => `<path d="M0 0H${T}A${T} ${T} 0 0 1 0 ${T}Z" fill="${f}"/>`,
  },
  {
    weight: 4,
    draw: (f) =>
      `<path d="M0 ${T}A${T / 2} ${T / 2} 0 0 1 ${T} ${T}Z" fill="${f}"/>`,
  },
  {
    weight: 3,
    draw: (f) =>
      `<path d="M0 ${T}A${T} ${T} 0 0 1 ${T} 0A${T} ${T} 0 0 1 0 ${T}Z" fill="${f}"/>`,
  },
  { weight: 3, draw: (f) => `<path d="M0 0H${T}L0 ${T}Z" fill="${f}"/>` },
  {
    weight: 3,
    draw: (f, a) =>
      `<circle cx="${T / 2}" cy="${T / 2}" r="${T * 0.36}" fill="${f}"/><circle cx="${T / 2}" cy="${T / 2}" r="${T * 0.13}" fill="${a}"/>`,
  },
  {
    weight: 2,
    draw: (f) =>
      `<circle cx="${T / 2}" cy="${T / 2}" r="${T * 0.3}" fill="none" stroke="${f}" stroke-width="${T * 0.13}"/>`,
  },
  {
    weight: 3,
    draw: (f) =>
      `<path d="M${T * 0.18} ${T}V${T * 0.5}A${T * 0.32} ${T * 0.32} 0 0 1 ${T * 0.82} ${T * 0.5}V${T}Z" fill="${f}"/>`,
  },
  {
    weight: 2,
    draw: (f, a) =>
      `<path d="M0 0H${T}A${T} ${T} 0 0 1 0 ${T}Z" fill="${f}"/><path d="M0 0H${T * 0.55}A${T * 0.55} ${T * 0.55} 0 0 1 0 ${T * 0.55}Z" fill="${a}"/>`,
  },
];
const MOTIF_TOTAL = MOTIFS.reduce((n, m) => n + m.weight, 0);

/** Bauhaus mosaic over the given rows (4×4 grid), skipping some cells. */
function mosaic(
  p: Palette,
  rand: () => number,
  rows = [0, 1, 2, 3],
  skip: (r: number, c: number) => boolean = () => false,
): string {
  const tiles: string[] = [];
  for (const r of rows) {
    for (let c = 0; c < 4; c++) {
      if (skip(r, c)) continue;
      const roll = rand();
      const ground =
        roll < 0.18 ? pick(p.brights, rand) : roll < 0.55 ? p.deep : p.bg;
      const inks = p.brights.filter((b) => b !== ground);
      const ink = pick(inks, rand);
      const alt =
        ground === p.bg || ground === p.deep
          ? (inks.find((b) => b !== ink) ?? p.hero)
          : p.bg;
      let w = rand() * MOTIF_TOTAL;
      const motif = MOTIFS.find((m) => (w -= m.weight) < 0) ?? MOTIFS[0];
      tiles.push(
        `<g transform="translate(${c * T} ${r * T}) rotate(${Math.floor(rand() * 4) * 90} ${T / 2} ${T / 2})"><rect width="${T}" height="${T}" fill="${ground}"/>${motif.draw(ink, alt)}</g>`,
      );
    }
  }
  return tiles.join('');
}

/** A four-point sparkle centred on (x, y). */
const sparkle = (
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke = '',
  sw = 0,
) =>
  `<path d="M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`;

/** A sine wave band from y down to the bottom edge. */
function waveBand(
  y: number,
  amp: number,
  len: number,
  phase: number,
  fill: string,
): string {
  let d = `M0 ${SIZE}V${y}`;
  for (let x = 0; x <= SIZE; x += 8)
    d += `L${x} ${f1(y + amp * Math.sin(((x + phase) / len) * Math.PI * 2))}`;
  return `<path d="${d}V${SIZE}Z" fill="${fill}"/>`;
}

const roundRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** A pointed Mughal (ogee-topped) arch in the box. */
const ogeeArch = (x: number, y: number, w: number, h: number) => {
  const cx = x + w / 2;
  return `M${x} ${y + h}V${f1(y + h * 0.42)}C${x} ${f1(y + h * 0.2)} ${f1(cx - w * 0.12)} ${f1(y + h * 0.14)} ${cx} ${y}C${f1(cx + w * 0.12)} ${f1(y + h * 0.14)} ${x + w} ${f1(y + h * 0.2)} ${x + w} ${f1(y + h * 0.42)}V${y + h}Z`;
};

/** A smooth seeded blob (Catmull-Rom through jittered points). */
function blobPath(
  cx: number,
  cy: number,
  r: number,
  rand: () => number,
  wobble = 0.2,
): string {
  const n = 8;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - wobble / 2 + rand() * wobble);
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  });
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return `${d}Z`;
}

/** An eight-point star (two squares) centred on (x, y). */
function star8(x: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? r * 0.76 : r;
    pts.push(`${f1(x + rr * Math.cos(a))},${f1(y + rr * Math.sin(a))}`);
  }
  return pts.join(' ');
}

// ─── Layouts ─────────────────────────────────────────────────────────────

type Ctx = {
  words: string[];
  lines: string[];
  style: BrandStyle;
  rand: () => number;
  /** A typeface for this mark; `caps` excludes scripts. */
  font: (caps?: boolean) => FontName;
  art?: string;
};

type Mode = { ground: string; text: string; accent: string; soft: string };
/** Dark or light, picked per mark. */
function mode(p: Palette, rand: () => number): Mode {
  return rand() < 0.55
    ? { ground: p.bg, text: p.hero, accent: p.brights[0], soft: p.deep }
    : { ground: p.hero, text: p.ink, accent: p.brights[0], soft: p.brights[1] };
}

const serifOf = (ctx: Ctx) =>
  ctx.style.fonts.find((f) => SERIFS.includes(f)) ?? 'playfair';
const condensedOf = (ctx: Ctx) =>
  ctx.style.fonts.find((f) => CONDENSED.includes(f)) ?? 'bebas';
const firstWord = (ctx: Ctx) =>
  ctx.words.find((w) => !SKIP_WORDS.has(w.toLowerCase())) ?? ctx.words[0];

/** The category line under a name, small and tracked. */
function labelText(ctx: Ctx, y: number, fill: string, maxW = 260): string {
  const { label } = ctx.style;
  if (!label) return '';
  const b = fitText(ctx.font(true), [label.toUpperCase()], maxW, 20, {
    tracking: 0.28,
  });
  return b ? b.draw(C, y, fill) : '';
}

type Layout = (ctx: Ctx) => string | null;
const bgRect = (fill: string) =>
  `<rect width="${SIZE}" height="${SIZE}" fill="${fill}"/>`;

/** 1. Retro sun over the name. */
const sunrise: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const name = fitText(ctx.font(), ctx.lines, 400, 130);
  if (!name) return null;
  const bars = [0, 1, 2]
    .map(
      (i) =>
        `<rect x="${C - 90}" y="${176 + i * 22}" width="180" height="${7 + i * 3}" fill="${m.ground}"/>`,
    )
    .join('');
  return `${bgRect(m.ground)}<circle cx="${C}" cy="180" r="84" fill="${m.accent}"/>${bars}<rect x="${C - 140}" y="242" width="280" height="4" rx="2" fill="${p.brights[1]}"/>
  ${name.draw(C, 340, m.text)}${labelText(ctx, 452, p.brights[1])}`;
};

/** 2. An arch window holding a little abstract landscape. */
const arch: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 420, 118);
  if (!name) return null;
  const [b0, b1, b2] = p.brights;
  return `<defs><clipPath id="arch"><path d="M156 300V160A100 100 0 0 1 356 160V300Z"/></clipPath></defs>${bgRect(p.hero)}
  <g clip-path="url(#arch)">${bgRect(p.deep)}<circle cx="${C + 30}" cy="190" r="40" fill="${b2}"/>
    <path d="M150 300Q215 220 280 262T362 236V300Z" fill="${b0}"/><path d="M150 300Q250 250 362 290V300Z" fill="${b1}"/></g>
  <path d="M156 300V160A100 100 0 0 1 356 160V300" fill="none" stroke="${p.ink}" stroke-width="5"/>
  ${name.draw(C, 380, p.ink)}${labelText(ctx, 462, p.deep)}`;
};

/** 3. Sunburst rays behind a bold name. */
const sunburst: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 430, 150);
  if (!name) return null;
  const rays: string[] = [];
  for (let i = 0; i < 24; i += 2) {
    const a1 = Math.PI + (i * Math.PI) / 24;
    const a2 = Math.PI + ((i + 1) * Math.PI) / 24;
    rays.push(
      `<path d="M${C} 560L${f1(C + 900 * Math.cos(a1))} ${f1(560 + 900 * Math.sin(a1))}L${f1(C + 900 * Math.cos(a2))} ${f1(560 + 900 * Math.sin(a2))}Z" fill="${p.bg}" opacity="0.55"/>`,
    );
  }
  return `${bgRect(p.deep)}${rays.join('')}
  <circle cx="${C}" cy="${SIZE}" r="150" fill="${p.brights[0]}"/><circle cx="${C}" cy="${SIZE}" r="96" fill="${p.brights[2]}"/>
  <g transform="translate(5 7)">${name.draw(C, 236, p.bg)}</g>${name.draw(C, 236, p.hero)}${labelText(ctx, 96, p.brights[1])}`;
};

/** 4. A tilted band across a split field. */
const band: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 430, 150);
  if (!name) return null;
  const tilt = ctx.rand() < 0.5 ? -7 : 7;
  return `${bgRect(p.bg)}<path d="M0 0H${SIZE}V150L0 380Z" fill="${p.brights[0]}"/><circle cx="440" cy="440" r="44" fill="${p.brights[2]}"/>
  <g transform="rotate(${tilt} ${C} ${C})"><rect x="-40" y="${C - 96}" width="${SIZE + 80}" height="192" fill="${p.hero}"/>${name.draw(C, C, p.ink)}</g>`;
};

/** 5. A Bauhaus mosaic over a band carrying the name. */
const stack: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 440, 170);
  if (!name) return null;
  return `${bgRect(p.hero)}${mosaic(p, ctx.rand, [0, 1])}<rect y="${T * 2}" width="${SIZE}" height="10" fill="${p.brights[0]}"/>${name.draw(C, 388, p.ink)}`;
};

/** 6. A seal: name around the top, category around the bottom. */
const seal: Layout = (ctx) => {
  const p = ctx.style.palette;
  const top = arcText(
    ctx.font(true),
    ctx.words.join(' ').toUpperCase(),
    186,
    40,
    Math.PI * 1.05,
    p.hero,
  );
  if (!top) return null;
  const bottom = ctx.style.label
    ? arcText(
        ctx.font(true),
        ctx.style.label.toUpperCase(),
        210,
        26,
        Math.PI * 0.6,
        p.brights[1],
        true,
      )
    : '';
  const points = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 ? 92 : 122;
    const a = (i * Math.PI) / 12;
    return `${f1(C + r * Math.cos(a))},${f1(C + r * Math.sin(a))}`;
  }).join(' ');
  return `${bgRect(p.bg)}${mosaic(p, ctx.rand)}
  <circle cx="${C}" cy="${C}" r="244" fill="${p.bg}"/><circle cx="${C}" cy="${C}" r="234" fill="none" stroke="${p.brights[0]}" stroke-width="4"/>
  <circle cx="${C}" cy="${C}" r="166" fill="none" stroke="${p.brights[0]}" stroke-width="3"/>${top}${bottom ?? ''}
  <circle cx="${C - 210}" cy="${C}" r="7" fill="${p.brights[2]}"/><circle cx="${C + 210}" cy="${C}" r="7" fill="${p.brights[2]}"/>
  <polygon points="${points}" fill="${p.brights[0]}"/><circle cx="${C}" cy="${C}" r="72" fill="${p.deep}"/>
  <circle cx="${C}" cy="${C}" r="52" fill="none" stroke="${p.brights[1]}" stroke-width="3"/><circle cx="${C}" cy="${C}" r="16" fill="${p.brights[2]}"/>`;
};

/** 7. A classic double-ruled frame. */
const frame: Layout = (ctx) => {
  const p = ctx.style.palette;
  const serif = serifOf(ctx);
  const name = fitText(serif, ctx.lines, 370, 150);
  if (!name) return null;
  const diamond = (x: number, y: number) =>
    `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" fill="${p.brights[0]}" transform="rotate(45 ${x} ${y})"/>`;
  const label = ctx.style.label
    ? fitText(serif, [ctx.style.label.toUpperCase()], 230, 18, {
        tracking: 0.3,
      })
    : null;
  const ly = C + name.height / 2 + 52;
  return `${bgRect(p.hero)}<rect x="22" y="22" width="468" height="468" fill="none" stroke="${p.ink}" stroke-width="6"/>
  <rect x="40" y="40" width="432" height="432" fill="none" stroke="${p.ink}" stroke-width="2"/>
  ${diamond(C, 31)}${diamond(C, 481)}${diamond(31, C)}${diamond(481, C)}${name.draw(C, C - 10, p.ink)}
  ${label ? `${label.draw(C, ly, p.deep)}<rect x="${f1(C - label.width / 2 - 64)}" y="${f1(ly - 1)}" width="44" height="2" fill="${p.deep}"/><rect x="${f1(C + label.width / 2 + 20)}" y="${f1(ly - 1)}" width="44" height="2" fill="${p.deep}"/>` : ''}`;
};

/** 8. A crest: the name inside a bright disc ringed with dots. */
const crest: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 300, 140);
  if (!name) return null;
  const dots = Array.from({ length: 28 }, (_, i) => {
    const a = (i * Math.PI * 2) / 28;
    return `<circle cx="${f1(C + 224 * Math.cos(a))}" cy="${f1(C + 224 * Math.sin(a))}" r="5" fill="${p.brights[1]}"/>`;
  }).join('');
  return `${bgRect(p.bg)}${dots}<circle cx="${C}" cy="${C}" r="200" fill="${p.brights[0]}"/><circle cx="${C}" cy="${C}" r="184" fill="none" stroke="${p.bg}" stroke-width="2" opacity="0.5"/>
  ${name.draw(C, C - 12, p.bg)}${labelText(ctx, C + name.height / 2 + 34, p.deep, 190)}`;
};

/** 9. Layered waves under the name. */
const waves: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 440, 190);
  if (!name) return null;
  const fills = [p.brights[1], p.brights[0], p.deep, p.brights[2], p.bg];
  const phase = Math.floor(ctx.rand() * 128);
  return `${bgRect(p.hero)}${fills.map((f, i) => waveBand(300 + i * 40, 12, 170, phase + i * 30, f)).join('')}${name.draw(C, 160, p.ink)}`;
};

/** 10. Confetti shapes around a highlighted name. */
const confetti: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const name = fitText(ctx.font(), ctx.lines, 380, 130);
  if (!name) return null;
  const shapes: string[] = [];
  for (let i = 0; i < 18; i++) {
    let x = 0;
    let y = 0;
    do {
      x = 30 + ctx.rand() * 452;
      y = 30 + ctx.rand() * 452;
    } while (x > 60 && x < 452 && y > 150 && y < 362);
    const col = pick(p.brights, ctx.rand);
    const r = 8 + ctx.rand() * 9;
    const kind = Math.floor(ctx.rand() * 4);
    const rot = Math.floor(ctx.rand() * 360);
    shapes.push(
      kind === 0
        ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${col}"/>`
        : kind === 1
          ? `<path d="M${f1(x)} ${f1(y - r)}L${f1(x + r)} ${f1(y + r)}L${f1(x - r)} ${f1(y + r)}Z" fill="${col}" transform="rotate(${rot} ${f1(x)} ${f1(y)})"/>`
          : kind === 2
            ? `<path d="M${f1(x - r * 1.6)} ${f1(y)}q${f1(r * 0.8)} ${f1(-r)} ${f1(r * 1.6)} 0t${f1(r * 1.6)} 0" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" transform="rotate(${rot} ${f1(x)} ${f1(y)})"/>`
            : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="${col}" stroke-width="4"/>`,
    );
  }
  return `${bgRect(m.ground)}${shapes.join('')}
  <rect x="${f1(C - name.width / 2 - 18)}" y="${f1(C + name.height * 0.05)}" width="${f1(name.width + 36)}" height="${f1(name.height * 0.42)}" fill="${p.brights[0]}" opacity="0.55" transform="translate(${C} ${C}) skewX(-10) translate(${-C} ${-C})"/>
  ${name.draw(C, C, m.text)}`;
};

/** 11. Soft glowing orbs behind a clean name. */
const orbs: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 400, 140);
  if (!name) return null;
  const spots = [
    [80 + ctx.rand() * 80, 80 + ctx.rand() * 80],
    [360 + ctx.rand() * 80, 140 + ctx.rand() * 100],
    [140 + ctx.rand() * 200, 400 + ctx.rand() * 80],
  ];
  const grads = p.brights
    .map(
      (b, i) =>
        `<radialGradient id="o${i}"><stop offset="0" stop-color="${b}" stop-opacity="0.95"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>`,
    )
    .join('');
  return `<defs>${grads}</defs>${bgRect(p.bg)}${spots.map(([x, y], i) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="250" fill="url(#o${i})"/>`).join('')}
  <rect x="26" y="26" width="460" height="460" rx="36" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="2"/>
  ${name.draw(C, C - 14, '#fff')}${labelText(ctx, C + name.height / 2 + 30, '#fff')}`;
};

/** 12. Swiss poster: big left-aligned name, rules, one circle. */
const swiss: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const caps = condensedOf(ctx);
  const name = fitText(
    caps,
    ctx.lines.map((l) => l.toUpperCase()),
    432,
    210,
    { align: 'left', gap: 0.05 },
  );
  if (!name) return null;
  const label = ctx.style.label
    ? fitText(caps, [ctx.style.label.toUpperCase()], 200, 16, {
        tracking: 0.2,
        align: 'left',
      })
    : null;
  return `${bgRect(m.ground)}<circle cx="390" cy="150" r="96" fill="${m.accent}"/><circle cx="390" cy="150" r="40" fill="${m.ground}"/>
  <rect x="40" y="72" width="432" height="3" fill="${m.text}"/>${label ? label.draw(40, 52, m.text) : ''}${name.draw(40, 470 - name.height / 2, m.text)}`;
};

/** 13. A neo-brutalist pill sticker. */
const pill: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), [ctx.words.join(' ')], 340, 84);
  if (!name) return null;
  const w = name.width + 84;
  const h = name.height + 76;
  const x = C - w / 2;
  const y = C - h / 2 - 16;
  return `${bgRect(p.brights[1])}<rect x="${f1(x + 12)}" y="${f1(y + 12)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${p.ink}"/>
  <rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${p.brights[0]}" stroke="${p.ink}" stroke-width="6"/>
  ${name.draw(C, y + h / 2, p.ink)}${sparkle(x + 6, y - 6, 26, p.brights[2], p.ink, 4)}${sparkle(x + w - 10, y + h + 4, 20, p.hero, p.ink, 4)}
  ${labelText(ctx, y + h + 64, p.ink)}`;
};

/** 14. A Bauhaus composition with the name set below. */
const bauhaus: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const name = fitText(ctx.font(), ctx.lines, 430, 160, { align: 'left' });
  if (!name) return null;
  const [b0, b1, b2] = p.brights;
  return `${bgRect(m.ground)}<path d="M0 0H250A250 250 0 0 1 0 250Z" fill="${b0}"/><rect x="290" y="0" width="34" height="270" fill="${m.soft}"/>
  <circle cx="410" cy="150" r="70" fill="${b1}"/><path d="M340 270A70 70 0 0 1 480 270Z" fill="${b2}"/>${name.draw(40, 392, m.text)}`;
};

/** 15. Ripples behind a band. */
const ripple: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 440, 132);
  if (!name) return null;
  const rings = [330, 280, 230, 180, 130, 80]
    .map(
      (r, i) =>
        `<circle cx="${C}" cy="${C}" r="${r}" fill="${i % 2 ? p.bg : p.deep}"/>`,
    )
    .join('');
  return `${bgRect(p.bg)}${rings}<rect y="${C - 90}" width="${SIZE}" height="180" fill="${p.hero}"/>
  <rect y="${C - 90}" width="${SIZE}" height="6" fill="${p.brights[0]}"/><rect y="${C + 84}" width="${SIZE}" height="6" fill="${p.brights[0]}"/>${name.draw(C, C, p.ink)}`;
};

/** 16. A shop awning over the name. */
const awning: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 400, 130);
  if (!name) return null;
  const stripes = Array.from({ length: 8 }, (_, i) => {
    const col = i % 2 ? p.hero : p.brights[0];
    return `<rect x="${i * 64}" y="0" width="64" height="150" fill="${col}"/><circle cx="${i * 64 + 32}" cy="150" r="32" fill="${col}"/>`;
  }).join('');
  return `${bgRect(p.hero)}${stripes}<rect width="${SIZE}" height="20" fill="${p.deep}"/>
  <path d="M0 150${Array.from({ length: 8 }, (_, i) => `A32 32 0 0 0 ${(i + 1) * 64} 150`).join('')}" fill="none" stroke="${p.ink}" stroke-width="3"/>
  ${name.draw(C, 322, p.ink)}${labelText(ctx, 446, p.deep)}`;
};

/** 17. Kinetic type: the brand word echoed in outline. */
const echo: Layout = (ctx) => {
  const p = ctx.style.palette;
  const word = firstWord(ctx);
  if (!word) return null;
  const font = ctx.font(true);
  const b = fitText(
    font,
    [font === 'bebas' || font === 'archivo' ? word.toUpperCase() : word],
    440,
    104,
  );
  if (!b) return null;
  const step = b.height + 14;
  return `${bgRect(p.bg)}${b.draw(C, C - step, 'none', `stroke="${p.brights[1]}" stroke-width="2.5" opacity="0.75"`)}${b.draw(C, C, p.hero)}
  ${b.draw(C, C + step, 'none', `stroke="${p.brights[0]}" stroke-width="2.5" opacity="0.6"`)}`;
};

/** 18. A ribbon across a disc. */
const ribbon: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), [ctx.words.join(' ')], 360, 74);
  if (!name) return null;
  const y = C + 20;
  return `${bgRect(p.hero)}<circle cx="${C}" cy="${C - 10}" r="176" fill="${p.brights[0]}"/>
  <circle cx="${C}" cy="${C - 10}" r="150" fill="none" stroke="${p.hero}" stroke-width="2" opacity="0.6"/>
  ${sparkle(C, 150, 26, p.hero)}${sparkle(C - 64, 180, 13, p.brights[2])}${sparkle(C + 64, 180, 13, p.brights[2])}
  <path d="M20 ${y - 30}H80V${y + 60}H20L44 ${y + 15}Z" fill="${p.ink}"/><path d="M492 ${y - 30}H432V${y + 60}H492L468 ${y + 15}Z" fill="${p.ink}"/>
  <rect x="56" y="${y - 50}" width="400" height="100" fill="${p.deep}"/>${name.draw(C, y, p.hero)}${labelText(ctx, 452, p.ink)}`;
};

/** 19. Halftone dots sweeping into the corner. */
const halftone: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const name = fitText(ctx.font(), ctx.lines, 420, 150, { align: 'left' });
  if (!name) return null;
  const dots: string[] = [];
  for (let i = 0; i < 14; i++) {
    for (let j = 0; j < 14; j++) {
      const t = (i + j) / 26;
      if (t < 0.45) continue;
      dots.push(
        `<circle cx="${18 + i * 37}" cy="${18 + j * 37}" r="${f1(2 + 13 * (t - 0.45) * 1.8)}" fill="${m.accent}"/>`,
      );
    }
  }
  return `${bgRect(m.ground)}${dots.join('')}<rect x="40" y="62" width="70" height="8" fill="${p.brights[1]}"/>${name.draw(40, 170, m.text)}`;
};

/** 20. A postage stamp with a little postcard scene. */
const stamp: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 300, 92);
  if (!name) return null;
  const perf: string[] = [];
  for (let x = 76; x <= 436; x += 24)
    perf.push(
      `<circle cx="${x}" cy="56" r="9" fill="${p.deep}"/><circle cx="${x}" cy="456" r="9" fill="${p.deep}"/>`,
    );
  for (let y = 80; y <= 432; y += 24)
    perf.push(
      `<circle cx="76" cy="${y}" r="9" fill="${p.deep}"/><circle cx="436" cy="${y}" r="9" fill="${p.deep}"/>`,
    );
  return `${bgRect(p.deep)}<rect x="76" y="56" width="360" height="400" fill="${p.hero}"/>${perf.join('')}
  <rect x="104" y="84" width="304" height="200" fill="${p.brights[1]}"/><circle cx="${C + 60}" cy="160" r="42" fill="${p.brights[2]}"/>
  <path d="M104 284V230Q180 180 250 226T408 210V284Z" fill="${p.brights[0]}"/>
  ${name.draw(C, 352, p.ink)}${labelText(ctx, 420, p.deep, 220)}`;
};

/** 21. Split field, the name changing colour as it crosses. */
const split: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(true), ctx.lines, 440, 170);
  if (!name) return null;
  return `<defs><clipPath id="L"><rect width="${C}" height="${SIZE}"/></clipPath><clipPath id="R"><rect x="${C}" width="${C}" height="${SIZE}"/></clipPath></defs>
  <rect width="${C}" height="${SIZE}" fill="${p.brights[0]}"/><rect x="${C}" width="${C}" height="${SIZE}" fill="${p.bg}"/>
  <g clip-path="url(#L)">${name.draw(C, C, p.bg)}</g><g clip-path="url(#R)">${name.draw(C, C, p.hero)}</g>`;
};

/** 22. Minimal luxe: a fine ring, a serif name. */
const luxe: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const serif = serifOf(ctx);
  const name = fitText(serif, ctx.lines, 300, 120);
  if (!name) return null;
  const label = ctx.style.label
    ? fitText(serif, [ctx.style.label.toUpperCase()], 170, 14, {
        tracking: 0.4,
      })
    : null;
  return `${bgRect(m.ground)}<circle cx="${C}" cy="${C}" r="206" fill="none" stroke="${m.text}" stroke-width="2"/>
  <circle cx="${C}" cy="${C}" r="194" fill="none" stroke="${m.text}" stroke-width="1" opacity="0.5"/>
  <rect x="${C - 7}" y="43" width="14" height="14" fill="${m.accent}" transform="rotate(45 ${C} 50)"/><rect x="${C - 7}" y="455" width="14" height="14" fill="${m.accent}" transform="rotate(45 ${C} 462)"/>
  ${name.draw(C, C - 12, m.text)}${label ? label.draw(C, C + name.height / 2 + 30, m.accent) : ''}`;
};

/** 23. A hang tag on a string. */
const tag: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 172, 140);
  if (!name) return null;
  return `${bgRect(p.brights[1])}<path d="M380 40Q330 70 300 116" fill="none" stroke="${p.ink}" stroke-width="4"/>
  <g transform="rotate(-8 ${C} ${C})"><path d="M146 150L256 70L366 150V470H146Z" fill="${p.ink}" transform="translate(10 10)"/>
  <path d="M146 150L256 70L366 150V470H146Z" fill="${p.hero}" stroke="${p.ink}" stroke-width="5"/>
  <circle cx="${C}" cy="128" r="16" fill="${p.brights[1]}" stroke="${p.ink}" stroke-width="4"/>
  ${name.draw(C, 300, p.ink)}<rect x="${C - 40}" y="${f1(300 + name.height / 2 + 26)}" width="80" height="8" rx="4" fill="${p.brights[0]}"/></g>`;
};

/** 24. A Mughal arcade over the name. */
const arcade: Layout = (ctx) => {
  const p = ctx.style.palette;
  const m = mode(p, ctx.rand);
  const name = fitText(ctx.font(), ctx.lines, 420, 120);
  if (!name) return null;
  const arches = [0, 1, 2]
    .map((i) => {
      const x = 46 + i * 146;
      return `<path d="${ogeeArch(x, 40, 128, 220)}" fill="${i === 1 ? m.accent : p.deep}"/><path d="${ogeeArch(x + 22, 92, 84, 168)}" fill="${i === 1 ? p.brights[2] : p.brights[1]}" opacity="0.9"/>`;
    })
    .join('');
  return `${bgRect(m.ground)}${arches}<rect x="40" y="260" width="432" height="6" fill="${m.text}"/>${name.draw(C, 360, m.text)}${labelText(ctx, 458, p.brights[1])}`;
};

/** 25. Jali: an eight-point star lattice with a name plate. */
const jali: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 330, 120);
  if (!name) return null;
  const stars: string[] = [];
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 6; j++)
      stars.push(
        `<polygon points="${star8(i * 102 + (j % 2) * 51, j * 102, 40)}" fill="none" stroke="${p.brights[0]}" stroke-width="3" opacity="0.55"/>`,
      );
  const w = Math.max(name.width + 90, 300);
  const h = name.height + 90;
  return `${bgRect(p.deep)}${stars.join('')}
  <path d="M${f1(C - w / 2)} ${C}L${f1(C - w / 2 + 34)} ${f1(C - h / 2)}H${f1(C + w / 2 - 34)}L${f1(C + w / 2)} ${C}L${f1(C + w / 2 - 34)} ${f1(C + h / 2)}H${f1(C - w / 2 + 34)}Z" fill="${p.hero}" stroke="${p.brights[0]}" stroke-width="5"/>
  ${name.draw(C, C, p.ink)}`;
};

/** 26. Candy stripes behind a card. */
const stripes: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 330, 140);
  if (!name) return null;
  const bars = Array.from(
    { length: 16 },
    (_, i) =>
      `<rect x="${-300 + i * 70}" y="-200" width="35" height="1000" fill="${p.brights[0]}" transform="rotate(35 ${C} ${C})"/>`,
  ).join('');
  const w = name.width + 80;
  const h = name.height + 80;
  return `${bgRect(p.brights[1])}${bars}<rect x="${f1(C - w / 2 + 10)}" y="${f1(C - h / 2 + 10)}" width="${f1(w)}" height="${f1(h)}" rx="26" fill="${p.ink}"/>
  <rect x="${f1(C - w / 2)}" y="${f1(C - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="26" fill="${p.hero}"/>${name.draw(C, C, p.ink)}`;
};

/** 27. Stacked type, one word per line, alternating colours. */
const stacked: Layout = (ctx) => {
  const p = ctx.style.palette;
  const words = ctx.words.slice(0, 3);
  if (!words.length) return null;
  const font = condensedOf(ctx);
  const block = fitText(
    font,
    words.map((w) => w.toUpperCase()),
    430,
    400,
    { align: 'left', gap: 0.02 },
  );
  if (!block) return null;
  const cols = [p.hero, p.brights[0], p.brights[1]];
  // One block per word so each can take its own colour, aligned to the shared size.
  const per = block.height / words.length;
  const parts = words.map((w, i) => {
    const b = fitText(font, [w.toUpperCase()], 430, per * 0.98, {
      align: 'left',
    });
    return b
      ? b.draw(40, C - block.height / 2 + per * (i + 0.5), cols[i % 3])
      : '';
  });
  return `${bgRect(p.bg)}<circle cx="452" cy="60" r="22" fill="${p.brights[2]}"/>${parts.join('')}`;
};

/** 28. The name running around a ring. */
const ring: Layout = (ctx) => {
  const p = ctx.style.palette;
  const font = ctx.font(true);
  const unit = `${ctx.words.join(' ').toUpperCase()} • `;
  const probe = setLine(font, unit, 30, 30 * 0.14);
  if (!probe) return null;
  const times = Math.max(1, Math.round((2 * Math.PI * 190) / probe.width));
  const text = arcText(
    font,
    unit.repeat(times).trim(),
    190,
    30,
    Math.PI * 2 * 0.97,
    p.hero,
  );
  if (!text) return null;
  const label = ctx.style.label
    ? fitText(font, [ctx.style.label.toUpperCase()], 180, 26, { tracking: 0.2 })
    : null;
  return `${bgRect(p.bg)}<circle cx="${C}" cy="${C}" r="150" fill="${p.brights[0]}"/><circle cx="${C}" cy="${C}" r="232" fill="none" stroke="${p.deep}" stroke-width="3"/>
  ${text}${sparkle(C, C - 28, 34, p.hero)}${label ? label.draw(C, C + 40, p.bg) : ''}`;
};

/** 29. Organic blobs behind the name. */
const blobs: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 360, 150);
  if (!name) return null;
  return `${bgRect(p.hero)}<path d="${blobPath(C + 34, C + 28, 196, ctx.rand)}" fill="${p.brights[1]}"/>
  <path d="${blobPath(C - 10, C - 8, 190, ctx.rand)}" fill="${p.brights[0]}"/>
  <g transform="translate(4 6)">${name.draw(C, C - 8, p.ink)}</g>${name.draw(C, C - 8, p.hero)}`;
};

/** 30. A gradient through a viewfinder. */
const viewfinder: Layout = (ctx) => {
  const p = ctx.style.palette;
  const name = fitText(ctx.font(), ctx.lines, 380, 150);
  if (!name) return null;
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x} ${y + dy * 46}V${y}H${x + dx * 46}" fill="none" stroke="${p.hero}" stroke-width="7" stroke-linecap="round"/>`;
  return `<defs><linearGradient id="vf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.brights[0]}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#vf)"/>${corner(46, 46, 1, 1)}${corner(466, 46, -1, 1)}${corner(46, 466, 1, -1)}${corner(466, 466, -1, -1)}
  ${name.draw(C, C - 12, p.hero)}${labelText(ctx, C + name.height / 2 + 32, p.brights[1])}`;
};

const LAYOUTS: Layout[] = [
  sunrise,
  arch,
  sunburst,
  band,
  stack,
  seal,
  frame,
  crest,
  waves,
  confetti,
  orbs,
  swiss,
  pill,
  bauhaus,
  ripple,
  awning,
  echo,
  ribbon,
  halftone,
  stamp,
  split,
  luxe,
  tag,
  arcade,
  jali,
  stripes,
  stacked,
  ring,
  blobs,
  viewfinder,
];

/** For names the fonts can't draw (other scripts): pure geometry. */
const abstractMark: Layout = (ctx) =>
  `${bgRect(ctx.style.palette.bg)}${mosaic(ctx.style.palette, ctx.rand)}`;

// ─── AI frames ───────────────────────────────────────────────────────────

type ArtShape =
  | 'circle'
  | 'arch'
  | 'ogee'
  | 'rounded'
  | 'squircle'
  | 'blob'
  | 'stamp'
  | 'hex'
  | 'leaf';
type NamePos = 'below' | 'above' | 'pill';
type Ground = 'hero' | 'bg' | 'bright';
type AiFrame = {
  shape: ArtShape | 'full' | 'seal';
  pos?: NamePos;
  ground: Ground;
};

const ART_SHAPES: ArtShape[] = [
  'circle',
  'arch',
  'ogee',
  'rounded',
  'squircle',
  'blob',
  'stamp',
  'hex',
  'leaf',
];
const NAME_POS: NamePos[] = ['below', 'above', 'pill'];
const GROUNDS: Ground[] = ['hero', 'bg', 'bright'];

/** Thirty frames: every art shape with every name placement, plus full-bleed and seal. */
const AI_FRAMES: AiFrame[] = [
  ...ART_SHAPES.flatMap((shape, i) =>
    NAME_POS.map((pos, j) => ({ shape, pos, ground: GROUNDS[(i + j) % 3] })),
  ),
  { shape: 'full', ground: 'bg' },
  { shape: 'full', ground: 'bright' },
  { shape: 'seal', ground: 'bg' },
];
export const AI_FRAME_COUNT = AI_FRAMES.length;
const aiFrameFor = (variant: number): AiFrame =>
  AI_FRAMES[Math.abs(variant) % AI_FRAMES.length];

function artShapePath(
  shape: ArtShape,
  x: number,
  y: number,
  w: number,
  h: number,
  rand: () => number,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  switch (shape) {
    case 'circle':
      return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
    case 'arch':
      return `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;
    case 'ogee':
      return ogeeArch(x, y, w, h);
    case 'rounded':
    case 'stamp':
      return roundRect(x, y, w, h, shape === 'rounded' ? 30 : 0.01);
    case 'squircle':
      return roundRect(x, y, w, h, Math.min(w, h) * 0.32);
    case 'blob':
      return blobPath(cx, cy, r * 0.98, rand, 0.16);
    case 'hex': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
      });
      return `M${pts.join('L')}Z`;
    }
    case 'leaf':
      return `M${x} ${y + h}C${x} ${f1(y + h * 0.25)} ${f1(x + w * 0.25)} ${y} ${x + w} ${y}C${x + w} ${f1(y + h * 0.75)} ${f1(x + w * 0.75)} ${y + h} ${x} ${y + h}Z`;
  }
}

function aiLayout(frame: AiFrame, ctx: Ctx): string | null {
  const p = ctx.style.palette;
  const art = ctx.art as string;
  const g =
    frame.ground === 'hero'
      ? { ground: p.hero, text: p.ink, accent: p.brights[0] }
      : frame.ground === 'bg'
        ? { ground: p.bg, text: p.hero, accent: p.brights[0] }
        : { ground: p.brights[1], text: p.ink, accent: p.deep };

  if (frame.shape === 'full') {
    const name = fitText(ctx.font(), ctx.lines, 440, 92);
    if (!name) return null;
    const scrim = frame.ground === 'bg' ? p.bg : p.brights[1];
    const text = frame.ground === 'bg' ? '#fff' : p.ink;
    return `<defs><clipPath id="all"><rect width="${SIZE}" height="${SIZE}"/></clipPath>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="${scrim}" stop-opacity="0"/><stop offset="1" stop-color="${scrim}" stop-opacity="0.94"/></linearGradient></defs>
      <image href="${art}" width="${SIZE}" height="${SIZE}" preserveAspectRatio="xMidYMid slice" clip-path="url(#all)"/>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#scrim)"/>${name.draw(C, 440, text)}`;
  }
  if (frame.shape === 'seal') {
    const top = arcText(
      ctx.font(true),
      ctx.words.join(' ').toUpperCase(),
      186,
      40,
      Math.PI * 1.05,
      p.hero,
    );
    if (!top) return null;
    const bottom = ctx.style.label
      ? arcText(
          ctx.font(true),
          ctx.style.label.toUpperCase(),
          210,
          26,
          Math.PI * 0.6,
          p.brights[1],
          true,
        )
      : '';
    return `<defs><clipPath id="s"><circle cx="${C}" cy="${C}" r="160"/></clipPath></defs>${bgRect(p.bg)}${mosaic(p, ctx.rand)}
      <circle cx="${C}" cy="${C}" r="244" fill="${p.bg}"/><circle cx="${C}" cy="${C}" r="234" fill="none" stroke="${p.brights[0]}" stroke-width="4"/>
      ${top}${bottom ?? ''}<image href="${art}" x="${C - 160}" y="${C - 160}" width="320" height="320" preserveAspectRatio="xMidYMid slice" clip-path="url(#s)"/>
      <circle cx="${C}" cy="${C}" r="160" fill="none" stroke="${p.brights[0]}" stroke-width="5"/>`;
  }

  // Art box and name placement.
  const shape = frame.shape;
  const tall = shape === 'arch' || shape === 'ogee';
  let box: [number, number, number, number];
  let nameSvg = '';
  if (frame.pos === 'below') {
    const w = tall ? 260 : 290;
    box = [C - w / 2, 26, w, tall ? 314 : 290];
    const name = fitText(ctx.font(), ctx.lines, 440, 100);
    if (!name) return null;
    nameSvg = `${name.draw(C, 402, g.text)}${labelText(ctx, 482, g.accent)}`;
  } else if (frame.pos === 'above') {
    const w = tall ? 270 : 300;
    box = [C - w / 2, 160, w, tall ? 330 : 300];
    const name = fitText(ctx.font(), ctx.lines, 440, 104);
    if (!name) return null;
    nameSvg = name.draw(C, 84, g.text);
  } else {
    const w = tall ? 340 : 392;
    box = [C - w / 2, 22, w, tall ? 420 : 392];
    const name = fitText(ctx.font(), [ctx.words.join(' ')], 380, 52);
    if (!name) return null;
    const pw = name.width + 64;
    nameSvg = `<rect x="${f1(C - pw / 2)}" y="400" width="${f1(pw)}" height="80" rx="40" fill="${g.text}"/>${name.draw(C, 440, g.ground)}`;
  }
  const [x, y, w, h] = box;
  const d = artShapePath(shape, x, y, w, h, ctx.rand);
  const decor =
    frame.ground === 'hero'
      ? `${sparkle(54, 60, 18, p.brights[0])}${sparkle(462, 120, 12, p.brights[2])}`
      : frame.ground === 'bg'
        ? Array.from({ length: 12 }, (_, i) => {
            const a1 = (i * Math.PI) / 6;
            const a2 = a1 + Math.PI / 12;
            return `<path d="M${C} ${C}L${f1(C + 600 * Math.cos(a1))} ${f1(C + 600 * Math.sin(a1))}L${f1(C + 600 * Math.cos(a2))} ${f1(C + 600 * Math.sin(a2))}Z" fill="${p.deep}" opacity="0.45"/>`;
          }).join('')
        : Array.from(
            { length: 64 },
            (_, i) =>
              `<circle cx="${16 + (i % 8) * 64}" cy="${16 + Math.floor(i / 8) * 64}" r="4" fill="${p.deep}" opacity="0.25"/>`,
          ).join('');
  const perforation =
    shape === 'stamp'
      ? [
          ...Array.from(
            { length: Math.floor(w / 24) + 1 },
            (_, i) =>
              `<circle cx="${f1(x + i * 24)}" cy="${y}" r="8" fill="${g.ground}"/><circle cx="${f1(x + i * 24)}" cy="${y + h}" r="8" fill="${g.ground}"/>`,
          ),
          ...Array.from(
            { length: Math.floor(h / 24) + 1 },
            (_, i) =>
              `<circle cx="${x}" cy="${f1(y + i * 24)}" r="8" fill="${g.ground}"/><circle cx="${x + w}" cy="${f1(y + i * 24)}" r="8" fill="${g.ground}"/>`,
          ),
        ].join('')
      : '';
  return `<defs><clipPath id="art"><path d="${d}"/></clipPath></defs>${bgRect(g.ground)}${decor}
    <path d="${d}" fill="${g.accent}" transform="translate(12 12)"/>
    <image href="${art}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#art)"/>
    ${shape === 'stamp' ? perforation : `<path d="${d}" fill="none" stroke="${g.text}" stroke-width="5"/>`}
    ${nameSvg}`;
}

export type AiContext = {
  name: string;
  description?: string | null;
  categories: string[];
  city?: string | null;
  area?: string | null;
  products?: string[];
};

const clean = (s: string | null | undefined, max: number) =>
  (s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} ,.&'-]/gu, '')
    .trim()
    .slice(0, max)
    .replace(/[.,\s]+$/, '');

/**
 * A prompt for the AI artwork — a fixed template, no LLM. It draws on the
 * whole business: a subject from each of its first two categories (picked
 * afresh per try), every category, the name's meaning, the description, its
 * products and where it is; plus a style and a background that change with
 * each try. Never the name itself: image models garble text, so the frame
 * sets it.
 */
export function aiPrompt(input: AiContext, variant: number): string {
  const s = brandStyle(input.name, input.categories, input.description ?? '');
  const rand = rng(hash(`${input.name}#ai#${variant}`));
  const subjects = s.rules.length
    ? s.rules.slice(0, 2).map((r) => pick(r.subjects, rand))
    : [pick(FALLBACK_SUBJECTS, rand)];
  const subject =
    subjects.length > 1 && subjects[0] !== subjects[1]
      ? `${subjects[0]} together with ${subjects[1]}`
      : subjects[0];
  const offering = [
    ...new Set(
      input.categories.map((c) => clean(c, 40).toLowerCase()).filter(Boolean),
    ),
  ].slice(0, 6);
  const about = clean(input.description, 160);
  const products = (input.products ?? [])
    .map((p) => clean(p, 40))
    .filter(Boolean)
    .slice(0, 5);
  const place = [clean(input.area, 40), clean(input.city, 40)]
    .filter(Boolean)
    .join(', ');
  const style = pick(
    [
      'flat vector illustration',
      'geometric flat illustration',
      'paper-cut illustration',
      'bold line-art illustration',
      'mid-century modern illustration',
      'risograph-style illustration',
      'soft gradient vector illustration',
      'minimal isometric illustration',
    ],
    rand,
  );
  const [w0, w1, w2] = s.palette.words;
  const full = aiFrameFor(variant).shape === 'full';
  const backdrop = full
    ? `a complete scene filling the whole square edge to edge, rich ${w0} and ${w1} tones, calm and uncluttered lower third`
    : pick(
        [
          `on a solid ${w0} background`,
          `on a solid ${w1} background`,
          `on a ${w2} to ${w0} gradient background`,
          `on a softly textured ${w1} paper background`,
          `against a simple ${w0} sky with a ${w2} sun`,
          `on a deep ${w0} background with a subtle geometric pattern`,
          `on a ${w2} background with soft abstract shapes`,
        ],
        rand,
      );
  const prompt = [
    `${style} of ${subject}${s.motif ? `, with a ${s.motif} motif` : ''}`,
    offering.length && `for a local business offering ${offering.join(', ')}`,
    about && `about the business: ${about}`,
    products.length && `known for ${products.join(', ')}`,
    place && `based in ${place}`,
    `colour palette of ${w0}, ${w1} and ${w2}`,
    `centred subject, ${backdrop}`,
    'premium modern brand artwork, clean and uncluttered, no text, no letters, no words, no watermark, no border',
  ]
    .filter(Boolean)
    .join('. ');
  return prompt.slice(0, 2000); // the model's limit is 2,048 characters
}

// ─── Entry points ────────────────────────────────────────────────────────

/** The mark as SVG. With `art` (an image data URI) it is an AI logo. */
export function brandMarkSvg(
  name: string,
  categories: string[] = [],
  variant = 0,
  art?: string,
): string {
  const style = brandStyle(name, categories);
  const key = name.trim().toLowerCase();
  const rand = rng(hash(`${key}#${variant}`));
  const fontPick = rand();
  const words = displayWords(name);
  const ctx: Ctx = {
    words,
    lines: nameLines(words),
    style,
    rand,
    art,
    font: (caps = false) => {
      const options = caps
        ? style.fonts.filter((f) => !SCRIPT.includes(f))
        : style.fonts;
      const list = options.length ? options : (['fraunces'] as FontName[]);
      return list[Math.floor(fontPick * list.length)];
    },
  };

  let body: string | null = null;
  if (art) {
    body =
      aiLayout(aiFrameFor(variant), ctx) ??
      aiLayout({ shape: 'circle', pos: 'below', ground: 'hero' }, ctx);
    // A name the fonts can't set: the artwork alone, full bleed.
    body ??= `<defs><clipPath id="all"><rect width="${SIZE}" height="${SIZE}"/></clipPath></defs><image href="${art}" width="${SIZE}" height="${SIZE}" preserveAspectRatio="xMidYMid slice" clip-path="url(#all)"/>`;
  } else {
    const start = hash(key) % LAYOUTS.length;
    // Layouts that can't set this name (a script the fonts lack) step aside.
    for (let i = 0; i < LAYOUTS.length && !body; i++)
      body = LAYOUTS[(start + variant + i) % LAYOUTS.length](ctx);
    body ??= abstractMark(ctx);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;
}

/** How many looks "try another" cycles through. */
export const BRAND_MARK_LAYOUTS = LAYOUTS.length;

/** The mark as a small WebP, ready to upload. */
export async function renderBrandMark(
  name: string,
  categories: string[] = [],
  variant = 0,
  art?: string,
): Promise<Buffer> {
  return sharp(Buffer.from(brandMarkSvg(name, categories, variant, art)))
    .webp({ quality: art ? 86 : 90, effort: 5 })
    .toBuffer();
}
