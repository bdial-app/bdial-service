import sharp from 'sharp';

/**
 * A branded card image for a business that has no photo anywhere.
 *
 * Deliberately abstract: the colours and pattern come from the business name
 * and category, but nothing on it claims to be a photo of the shop, and it
 * carries no text — the card in the app already shows the business name, and
 * server font support can't be relied on.
 */

interface Palette {
  from: string;
  to: string;
  accent: string;
}

/** Category keyword → palette. First match wins; order matters. */
const CATEGORY_PALETTES: { match: RegExp; palette: Palette }[] = [
  { match: /restaurant|food|cafe|bakery|sweet|catering|tiffin|juice|dhaba|hotel/i, palette: { from: '#f97316', to: '#b45309', accent: '#fde68a' } },
  { match: /grocer|kirana|vegetable|fruit|dairy|supermarket|provision/i, palette: { from: '#16a34a', to: '#14532d', accent: '#bbf7d0' } },
  { match: /cloth|fashion|boutique|tailor|saree|garment|apparel|footwear/i, palette: { from: '#db2777', to: '#7e22ce', accent: '#fbcfe8' } },
  { match: /salon|beauty|spa|parlour|parlor|hair|makeup|cosmetic/i, palette: { from: '#e11d48', to: '#881337', accent: '#fecdd3' } },
  { match: /electronic|mobile|computer|repair|appliance|hardware|electric/i, palette: { from: '#2563eb', to: '#1e3a8a', accent: '#bfdbfe' } },
  { match: /health|clinic|medical|pharma|chemist|doctor|dental|hospital/i, palette: { from: '#0891b2', to: '#155e75', accent: '#a5f3fc' } },
  { match: /gym|fitness|sport|yoga|training/i, palette: { from: '#65a30d', to: '#3f6212', accent: '#d9f99d' } },
  { match: /education|school|tuition|coaching|academy|institute|library/i, palette: { from: '#7c3aed', to: '#4c1d95', accent: '#ddd6fe' } },
  { match: /furniture|interior|decor|paint|construction|builder|plumb|carpent/i, palette: { from: '#b45309', to: '#78350f', accent: '#fed7aa' } },
  { match: /jewel|gold|silver|watch|gift/i, palette: { from: '#ca8a04', to: '#713f12', accent: '#fef08a' } },
  { match: /travel|taxi|transport|courier|logistic|car|auto/i, palette: { from: '#0d9488', to: '#134e4a', accent: '#99f6e4' } },
];

const DEFAULT_PALETTE: Palette = { from: '#4f46e5', to: '#312e81', accent: '#c7d2fe' };

/** Stable 32-bit hash so one business always gets the same card. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function paletteFor(categories: string[]): Palette {
  const text = categories.join(' ');
  return CATEGORY_PALETTES.find((p) => p.match.test(text))?.palette ?? DEFAULT_PALETTE;
}

/** 1600×800 PNG — the banner preset's width, and close to the card's crop. */
export async function renderBrandBanner(name: string, categories: string[]): Promise<Buffer> {
  const { from, to, accent } = paletteFor(categories);
  const seed = hash(name || 'tijarah');
  const width = 1600;
  const height = 800;
  const angle = seed % 90;

  // A few large, soft shapes placed from the hash — busy enough to look
  // designed, calm enough to sit behind the card's text.
  const shapes = Array.from({ length: 5 }, (_, i) => {
    const s = hash(`${name}:${i}`);
    const cx = 120 + (s % (width - 240));
    const cy = 80 + ((s >> 7) % (height - 160));
    const r = 120 + ((s >> 13) % 260);
    const opacity = 0.05 + ((s >> 19) % 8) / 100;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" opacity="${opacity.toFixed(3)}" />`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${from}" />
        <stop offset="100%" stop-color="${to}" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    ${shapes}
    <rect width="${width}" height="${height}" fill="${to}" opacity="0.12" />
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
