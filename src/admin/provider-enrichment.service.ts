import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import sharp from 'sharp';
import { Provider } from '../entities';
import { fetchImageFromUrl, fetchPublicPage } from '../common/safe-image-fetch';
import {
  extractImageCandidates,
  normalizeWebsite,
  type BannerSource,
  type LogoSource,
  type PageCandidates,
} from './provider-enrichment.parse';

export interface EnrichImageCandidate {
  url: string;
  source: LogoSource | BannerSource;
  width: number;
  height: number;
}

export interface ProviderEnrichment {
  providerId: string;
  brandName: string;
  current: { logoUrl: string | null; bannerUrl: string | null; websiteUrl: string | null };
  match: { placeId: string; name: string; address: string; matchedBy: 'phone' | 'name' } | null;
  website: { url: string; source: 'provider' | 'google' } | null;
  /** Best first. */
  logos: EnrichImageCandidate[];
  banners: EnrichImageCandidate[];
  /** high: matched by phone or taken from the provider's own website. check: name-only match. */
  confidence: 'high' | 'check' | 'none';
  notes: string[];
}

type Size = { width: number; height: number };

const PROVIDER_CONCURRENCY = 3;
const PROBE_CONCURRENCY = 3;
const GOOGLE_TIMEOUT_MS = 10_000;
/** Google's terms allow keeping place IDs — cache only the ID, never place content. */
const PLACE_ID_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

const MIN_LOGO_SIDE = 96;
const MAX_LOGO_RATIO = 4;
const MIN_BANNER_WIDTH = 600;
const MIN_BANNER_RATIO = 1.25;
const MAX_LOGOS = 4;
const MAX_BANNERS = 3;

/** Words too generic to prove a Google result is the same business. */
const GENERIC_WORDS = new Set([
  'the', 'and', 'shop', 'store', 'stores', 'services', 'service', 'enterprises', 'enterprise',
  'pvt', 'ltd', 'private', 'limited', 'india', 'traders', 'trading', 'company', 'co', 'centre', 'center',
]);

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export function normalizeIndianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) cleaned = `+91${cleaned.slice(1)}`;
  if (!cleaned.startsWith('+')) cleaned = `+91${cleaned}`;
  return cleaned;
}

/** True when the two names share at least one distinctive word. */
export function namesLookAlike(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w)),
    );
  const left = words(a);
  for (const w of words(b)) if (left.has(w)) return true;
  return false;
}

/**
 * Suggests a website, logo and banner for providers. Nothing is saved here —
 * the admin reviews the suggestions and accepted images go through the normal
 * image-from-link import.
 */
@Injectable()
export class ProviderEnrichmentService {
  private readonly apiKey?: string;

  constructor(
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    this.apiKey = key && key !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' ? key : undefined;
  }

  async enrich(admin: { role?: string }, ids: string[]): Promise<ProviderEnrichment[]> {
    // Same bar as AdminService.assertAdmin — this calls paid Google APIs.
    if ((ROLE_HIERARCHY[admin?.role ?? ''] ?? 0) < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Admin access required');
    }
    const providers = await this.providerRepo.find({ where: { id: In(ids) }, relations: ['user'] });
    const byId = new Map(providers.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter((p): p is Provider => !!p);
    return mapPool(ordered, PROVIDER_CONCURRENCY, (p) => this.enrichOne(p));
  }

  private async enrichOne(provider: Provider): Promise<ProviderEnrichment> {
    const notes: string[] = [];
    const result: ProviderEnrichment = {
      providerId: provider.id,
      brandName: provider.brandName,
      current: {
        logoUrl: provider.profilePhotoUrl,
        bannerUrl: provider.bannerImageUrl,
        websiteUrl: provider.websiteUrl,
      },
      match: null,
      website: null,
      logos: [],
      banners: [],
      confidence: 'none',
      notes,
    };

    // 1. Website — the provider's own value wins; otherwise take it from their Google listing.
    const own = normalizeWebsite(provider.websiteUrl);
    if (own && 'url' in own) result.website = { url: own.url, source: 'provider' };
    else if (own) notes.push(`Saved website is a ${own.skipped} page, not a business site`);

    if (this.apiKey) {
      try {
        const place = await this.lookUpPlace(provider, notes);
        if (place) {
          result.match = { placeId: place.placeId, name: place.name, address: place.address, matchedBy: place.matchedBy };
          if (!result.website) {
            const site = normalizeWebsite(place.website);
            if (site && 'url' in site) result.website = { url: site.url, source: 'google' };
            else if (site) notes.push(`Google lists a ${site.skipped} page as the website`);
            else notes.push('Google listing has no website');
          }
        }
      } catch (err) {
        notes.push(`Google lookup failed: ${(err as Error).message}`);
      }
    } else {
      notes.push('Google lookup is off — GOOGLE_MAPS_API_KEY is not set');
    }

    // 2. Logo and banner candidates from the website, measured so tiny or odd-shaped images are dropped.
    if (result.website) {
      try {
        const page = await fetchPublicPage(result.website.url);
        const found = extractImageCandidates(page.html, page.finalUrl);
        const sizes = await this.measure(found);
        const picked = this.pick(found, sizes);
        result.logos = picked.logos;
        result.banners = picked.banners;
        if (!picked.logos.length && !picked.banners.length) {
          notes.push('Website has no usable logo or banner (SVG and .ico files are skipped)');
        }
      } catch (err) {
        notes.push(`Couldn't read the website: ${(err as Error).message}`);
      }
    }

    const foundSomething = result.logos.length > 0 || result.banners.length > 0 || result.website?.source === 'google';
    if (foundSomething) {
      result.confidence =
        result.website?.source === 'provider' || result.match?.matchedBy === 'phone' ? 'high' : 'check';
    }
    return result;
  }

  /** Phone match first (reliable), then name + area + city (needs a sanity check). */
  private async lookUpPlace(
    provider: Provider,
    notes: string[],
  ): Promise<{ placeId: string; matchedBy: 'phone' | 'name'; name: string; address: string; website: string | null } | null> {
    const cacheKey = `enrich:place:${provider.id}`;
    const cached = await this.cache.get<string>(cacheKey);
    let placeId: string | null = null;
    let matchedBy: 'phone' | 'name' = 'phone';

    if (cached) {
      const [by, id] = cached.split(':');
      matchedBy = by === 'name' ? 'name' : 'phone';
      placeId = id;
    } else {
      const phone = provider.contactNumber || provider.user?.mobileNumber;
      if (phone) placeId = await this.findPlaceId(normalizeIndianPhone(phone), 'phonenumber');
      if (!placeId) {
        const query = [provider.brandName, provider.area, provider.city].filter(Boolean).join(', ');
        placeId = await this.findPlaceId(query, 'textquery');
        matchedBy = 'name';
      }
      if (!placeId) return null;
    }

    const details = await this.google('details', { place_id: placeId, fields: 'name,formatted_address,website' });
    const place = (details.result ?? {}) as { name?: string; formatted_address?: string; website?: string };
    if (!place.name) return null;

    if (matchedBy === 'name' && !namesLookAlike(provider.brandName, place.name)) {
      notes.push(`Closest Google result “${place.name}” doesn't look like this business — ignored`);
      return null;
    }

    if (!cached) await this.cache.set(cacheKey, `${matchedBy}:${placeId}`, PLACE_ID_CACHE_TTL);
    return {
      placeId,
      matchedBy,
      name: place.name,
      address: place.formatted_address ?? '',
      website: place.website ?? null,
    };
  }

  private async findPlaceId(input: string, inputtype: 'phonenumber' | 'textquery'): Promise<string | null> {
    // place_id only — the cheapest Find Place request; details are fetched once for the chosen place.
    const data = await this.google('findplacefromtext', { input, inputtype, fields: 'place_id' });
    const candidates = (data.candidates ?? []) as { place_id?: string }[];
    return candidates[0]?.place_id ?? null;
  }

  private async google(endpoint: 'findplacefromtext' | 'details', params: Record<string, string>): Promise<Record<string, unknown>> {
    const url = new URL(`https://maps.googleapis.com/maps/api/place/${endpoint}/json`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('key', this.apiKey!);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = (await res.json()) as Record<string, unknown> & { status?: string; error_message?: string };
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') return data;
      // Never surface the request URL — it carries the API key.
      throw new Error(data.error_message || data.status || `HTTP ${res.status}`);
    } catch (err) {
      if (controller.signal.aborted) throw new Error('Google timed out');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Download each candidate once (through the SSRF-safe fetcher) and read its real dimensions. */
  private async measure(found: PageCandidates): Promise<Map<string, Size>> {
    const urls = [...new Set([...found.logos, ...found.banners].map((c) => c.url))];
    const sizes = new Map<string, Size>();
    await mapPool(urls, PROBE_CONCURRENCY, async (url) => {
      try {
        const file = await fetchImageFromUrl(url);
        const meta = await sharp(file.buffer, { limitInputPixels: 50_000_000 }).metadata();
        if (meta.width && meta.height) sizes.set(url, { width: meta.width, height: meta.height });
      } catch {
        /* unreachable or not an image — simply not offered */
      }
    });
    return sizes;
  }

  private pick(found: PageCandidates, sizes: Map<string, Size>): { logos: EnrichImageCandidate[]; banners: EnrichImageCandidate[] } {
    const logos: EnrichImageCandidate[] = [];
    const squareShareImages: EnrichImageCandidate[] = [];
    const banners: EnrichImageCandidate[] = [];

    for (const c of found.logos) {
      const size = sizes.get(c.url);
      if (!size) continue;
      const short = Math.min(size.width, size.height);
      if (short >= MIN_LOGO_SIDE && Math.max(size.width, size.height) / short <= MAX_LOGO_RATIO) {
        logos.push({ ...c, ...size });
      }
    }

    for (const c of found.banners) {
      const size = sizes.get(c.url);
      if (!size) continue;
      const ratio = size.width / size.height;
      if (size.width >= MIN_BANNER_WIDTH && ratio >= MIN_BANNER_RATIO) {
        banners.push({ ...c, ...size });
      } else if (ratio > 0.8 && ratio < MIN_BANNER_RATIO && Math.min(size.width, size.height) >= 200) {
        // A square share image is very often just the logo.
        squareShareImages.push({ ...c, ...size });
      }
    }

    // Header-sized images beat huge ones: a 1900px "logo" is usually a hero
    // image that merely has "logo" in its file name. Otherwise keep page order.
    const oversized = (c: EnrichImageCandidate) => (Math.max(c.width, c.height) > 1024 ? 1 : 0);
    const seen = new Set<string>();
    const uniqueLogos = [...logos, ...squareShareImages]
      .filter((c) => !seen.has(c.url) && seen.add(c.url))
      .map((c, order) => ({ c, order }))
      .sort((a, b) => oversized(a.c) - oversized(b.c) || a.order - b.order)
      .map(({ c }) => c);
    return { logos: uniqueLogos.slice(0, MAX_LOGOS), banners: banners.slice(0, MAX_BANNERS) };
  }
}
