/**
 * Pull logo and banner candidates out of a business's homepage HTML.
 *
 * Regex-based on purpose: we only need a handful of <link>/<meta>/<img> tags and
 * JSON-LD blocks, and the page is untrusted — nothing here executes or fetches
 * anything. It returns absolute URLs; the caller downloads and measures them.
 */

export type LogoSource = 'json-ld' | 'og:logo' | 'apple-touch-icon' | 'img-logo' | 'icon';
export type BannerSource = 'og:image' | 'twitter:image' | 'json-ld-image';

export interface RawCandidate<S extends string> {
  url: string;
  source: S;
}

export interface PageCandidates {
  logos: RawCandidate<LogoSource>[];
  banners: RawCandidate<BannerSource>[];
}

const MAX_LOGOS = 6;
const MAX_BANNERS = 4;
const MAX_IMG_LOGOS = 3;
/** Only the top of the page matters (head + header), and it bounds regex work. */
const MAX_SCAN_CHARS = 500_000;

/** Formats the image import can't store. */
const UNSUPPORTED_PATH = /\.(svg|ico)$/i;

/** Hosts that are profiles or directories, not the business's own site. */
const NOT_A_WEBSITE =
  /(^|\.)(instagram\.com|facebook\.com|fb\.com|wa\.me|whatsapp\.com|linktr\.ee|justdial\.com|indiamart\.com|sulekha\.com|google\.com|goo\.gl|g\.page|youtube\.com|twitter\.com|x\.com|linkedin\.com)$/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** Absolute http(s) URL for a src/href/content value, or null if unusable. */
export function resolveImageUrl(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  const value = raw.trim().split(/\s+/)[0];
  if (!value || /^(data|javascript|blob):/i.test(value)) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (UNSUPPORTED_PATH.test(url.pathname)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Normalise a website value from the provider record or Google into a URL we
 * can fetch, or null when it's missing or a social/directory profile.
 */
export function normalizeWebsite(raw: string | null | undefined): { url: string } | { skipped: string } | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (NOT_A_WEBSITE.test(url.hostname)) return { skipped: url.hostname.replace(/^www\./, '') };
    return { url: url.toString() };
  } catch {
    return null;
  }
}

function sizeFromSizesAttr(sizes: string | undefined): number {
  const m = sizes?.match(/(\d+)x(\d+)/i);
  return m ? Math.min(Number(m[1]), Number(m[2])) : 0;
}

function urlFromJsonLd(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return urlFromJsonLd(value[0]);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
    if (typeof obj.contentUrl === 'string') return obj.contentUrl;
  }
  return undefined;
}

function walkJsonLd(node: unknown, visit: (obj: Record<string, unknown>) => void, depth = 0): void {
  if (depth > 6 || !node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkJsonLd(child, visit, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  visit(obj);
  for (const child of Object.values(obj)) {
    if (child && typeof child === 'object') walkJsonLd(child, visit, depth + 1);
  }
}

export function extractImageCandidates(html: string, pageUrl: string): PageCandidates {
  const page = html.slice(0, MAX_SCAN_CHARS);
  // <base href> changes how every relative URL on the page resolves.
  const baseTag = page.match(/<base\b[^>]*>/i);
  const baseHref = baseTag ? parseAttributes(baseTag[0]).href : undefined;
  let base = pageUrl;
  if (baseHref) {
    try {
      base = new URL(baseHref, pageUrl).toString();
    } catch {
      /* keep the page URL */
    }
  }

  const logos: RawCandidate<LogoSource>[] = [];
  const banners: RawCandidate<BannerSource>[] = [];
  const icons: { url: string; size: number }[] = [];
  const seen = new Set<string>();
  let imgLogos = 0;

  const addLogo = (raw: string | undefined, source: LogoSource) => {
    const url = resolveImageUrl(raw, base);
    if (!url || seen.has(`logo:${url}`)) return;
    seen.add(`logo:${url}`);
    logos.push({ url, source });
  };
  const addBanner = (raw: string | undefined, source: BannerSource) => {
    const url = resolveImageUrl(raw, base);
    if (!url || seen.has(`banner:${url}`)) return;
    seen.add(`banner:${url}`);
    banners.push({ url, source });
  };

  // JSON-LD first: an explicit Organization/LocalBusiness logo is the best signal there is.
  const scriptRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let script: RegExpExecArray | null;
  while ((script = scriptRe.exec(page))) {
    try {
      walkJsonLd(JSON.parse(script[1].trim()), (obj) => {
        if ('logo' in obj) addLogo(urlFromJsonLd(obj.logo), 'json-ld');
        const rawType = obj['@type'];
        const type = Array.isArray(rawType) ? rawType.join(' ') : typeof rawType === 'string' ? rawType : '';
        if ('image' in obj && /Organization|Business|Store|Restaurant|Place/i.test(type)) {
          addBanner(urlFromJsonLd(obj.image), 'json-ld-image');
        }
      });
    } catch {
      /* malformed JSON-LD is common — ignore that block */
    }
  }

  const tagRe = /<(link|meta|img)\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(page))) {
    const name = tag[1].toLowerCase();
    const attrs = parseAttributes(tag[0]);

    if (name === 'link') {
      const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/);
      if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) {
        addLogo(attrs.href, 'apple-touch-icon');
      } else if (rel.includes('icon')) {
        const url = resolveImageUrl(attrs.href, base);
        if (url) icons.push({ url, size: sizeFromSizesAttr(attrs.sizes) });
      }
    } else if (name === 'meta') {
      const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? '').toLowerCase();
      if (key === 'og:logo' || key === 'logo') addLogo(attrs.content, 'og:logo');
      else if (key === 'og:image' || key === 'og:image:url' || key === 'og:image:secure_url') addBanner(attrs.content, 'og:image');
      else if (key === 'twitter:image' || key === 'twitter:image:src') addBanner(attrs.content, 'twitter:image');
    } else if (name === 'img' && imgLogos < MAX_IMG_LOGOS) {
      const hint = `${attrs.class ?? ''} ${attrs.id ?? ''} ${attrs.alt ?? ''} ${attrs.src ?? ''}`;
      if (/logo/i.test(hint)) {
        // Lazy-loaded logos keep a data: placeholder in src and the real file in data-src.
        const src = [attrs.src, attrs['data-src'], attrs['data-lazy-src']].find((v) => resolveImageUrl(v, base));
        const before = logos.length;
        addLogo(src, 'img-logo');
        if (logos.length > before) imgLogos++;
      }
    }
  }

  // Favicons last and biggest first — a 32px favicon is rarely usable, but a 192px one can be.
  icons.sort((a, b) => b.size - a.size);
  for (const icon of icons) addLogo(icon.url, 'icon');

  const logoRank: Record<LogoSource, number> = { 'json-ld': 0, 'og:logo': 0, 'apple-touch-icon': 1, 'img-logo': 2, icon: 3 };
  logos.sort((a, b) => logoRank[a.source] - logoRank[b.source]);

  return { logos: logos.slice(0, MAX_LOGOS), banners: banners.slice(0, MAX_BANNERS) };
}
