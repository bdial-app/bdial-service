import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import sharp from 'sharp';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { Provider } from '../entities';
import { StorageService } from '../storage/storage.service';
import { compressImage } from '../common/image-processor';
import { fetchImageFromUrl, fetchPublicPage } from '../common/safe-image-fetch';
import {
  extractImageCandidates,
  normalizeWebsite,
  type BannerSource,
  type LogoSource,
  type RawCandidate,
} from './provider-enrichment.parse';
import { renderBrandBanner } from './provider-placeholder';

export type CandidateSource = LogoSource | BannerSource | 'instagram';

export interface EnrichImageCandidate {
  url: string;
  source: CandidateSource;
  width: number;
  height: number;
}

export interface ProviderEnrichment {
  providerId: string;
  brandName: string;
  current: { logoUrl: string | null; bannerUrl: string | null; websiteUrl: string | null };
  match: { placeId: string; name: string; address: string; matchedBy: 'phone' | 'name' } | null;
  website: { url: string; source: 'provider' | 'instagram' | 'google' } | null;
  /** Best first — an Instagram profile picture outranks anything scraped from a page. */
  logos: EnrichImageCandidate[];
  banners: EnrichImageCandidate[];
  confidence: 'high' | 'check' | 'none';
  notes: string[];
}

/** Candidates for one sheet row being vetted, before any provider exists. */
export interface SheetRowCandidates {
  rowId: string;
  website: string | null;
  logos: EnrichImageCandidate[];
  banners: EnrichImageCandidate[];
  notes: string[];
}

export interface AutoImageResult {
  providerId: string;
  brandName: string;
  /** Where the saved logo came from, or null when none was saved. */
  logo: 'instagram' | 'website' | null;
  banner: 'website' | 'generated' | null;
  /** True when the provider already had both images. */
  skipped: boolean;
  notes: string[];
}

type Size = { width: number; height: number };

const PROVIDER_CONCURRENCY = 3;
const AUTOFILL_CONCURRENCY = 2;
const PROBE_CONCURRENCY = 3;
const GOOGLE_TIMEOUT_MS = 10_000;
const INSTAGRAM_TIMEOUT_MS = 10_000;
const DEFAULT_INSTAGRAM_API_VERSION = 'v21.0';
/** Google's terms allow keeping place IDs — cache only the ID, never place content. */
const PLACE_ID_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

const MIN_LOGO_SIDE = 96;
const MAX_LOGO_RATIO = 4;
const MIN_BANNER_WIDTH = 600;
const MIN_BANNER_RATIO = 1.25;
const MAX_LOGOS = 4;
const MAX_BANNERS = 3;

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

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

/** Accepts a handle, @handle or profile URL; returns the bare handle or null. */
export function instagramHandleOf(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const fromUrl = value.match(/instagram\.com\/@?([A-Za-z0-9._]+)/i);
  const handle = (fromUrl ? fromUrl[1] : value).replace(/^@/, '').replace(/\/+$/, '');
  return INSTAGRAM_HANDLE.test(handle) ? handle : null;
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
 * Suggests a website, logo and banner for providers, in this order: the
 * business's Instagram profile picture, then images from its own website, then
 * a generated branded card. `enrich` only suggests; `autoFillImages` saves.
 */
@Injectable()
export class ProviderEnrichmentService {
  private readonly logger = new Logger(ProviderEnrichmentService.name);
  private readonly apiKey?: string;
  /** Google Places bills per lookup, so it's opt-in; Instagram and websites are free. */
  private readonly useGoogle: boolean;
  private readonly igToken?: string;
  private readonly igAccountId?: string;
  private readonly igVersion: string;
  /** Set when the Instagram settings can't work, so we say why instead of failing per row. */
  private readonly igConfigProblem?: string;

  constructor(
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
    private readonly config: ConfigService,
    private readonly storageService: StorageService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    this.apiKey = key && key !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' ? key : undefined;
    this.useGoogle = this.config.get<string>('PROVIDER_ENRICH_USE_GOOGLE') === 'true';
    this.igToken = this.config.get<string>('INSTAGRAM_GRAPH_TOKEN') || undefined;
    this.igAccountId = this.config.get<string>('INSTAGRAM_BUSINESS_ACCOUNT_ID') || undefined;
    this.igVersion = this.config.get<string>('INSTAGRAM_API_VERSION') || DEFAULT_INSTAGRAM_API_VERSION;
    this.igConfigProblem = this.checkInstagramConfig();
    if (this.igConfigProblem) this.logger.warn(`Instagram lookups disabled — ${this.igConfigProblem}`);
  }

  /**
   * Business Discovery runs on the Facebook Graph API, so it needs a Facebook
   * Page/user token (EAA…) and the Instagram account's numeric id. An
   * Instagram-Login token (IGAA…/IGQ…) or a username can only fail, so catch
   * both here rather than once per row.
   */
  private checkInstagramConfig(): string | undefined {
    if (!this.igToken || !this.igAccountId) return undefined;
    if (/^IG(AA|Q)/.test(this.igToken)) {
      return 'INSTAGRAM_GRAPH_TOKEN is an Instagram-Login token (starts with IGAA/IGQ). Business Discovery needs a Facebook Page token (starts with EAA) from an app using "Instagram API setup with Facebook login".';
    }
    if (!/^\d+$/.test(this.igAccountId)) {
      return `INSTAGRAM_BUSINESS_ACCOUNT_ID must be the numeric Instagram business account id, not "${this.igAccountId}". Find it with <PAGE_ID>?fields=instagram_business_account.`;
    }
    return undefined;
  }

  private assertAdmin(admin: { role?: string }) {
    // Same bar as AdminService.assertAdmin — this calls paid Google APIs.
    if ((ROLE_HIERARCHY[admin?.role ?? ''] ?? 0) < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private loadProviders(ids: string[]): Promise<Provider[]> {
    return this.providerRepo.find({
      where: { id: In(ids) },
      relations: ['user', 'providerCategories', 'providerCategories.category'],
    });
  }

  /** Look up suggestions without saving anything. */
  async enrich(admin: { role?: string }, ids: string[]): Promise<ProviderEnrichment[]> {
    this.assertAdmin(admin);
    const providers = await this.loadProviders(ids);
    const byId = new Map(providers.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter((p): p is Provider => !!p);
    return mapPool(ordered, PROVIDER_CONCURRENCY, (p) => this.enrichOne(p));
  }

  /**
   * Fill in missing images: Instagram profile picture → website logo/banner →
   * generated branded banner. Existing images are never replaced.
   */
  async autoFillImages(admin: { role?: string }, ids: string[]): Promise<AutoImageResult[]> {
    this.assertAdmin(admin);
    const providers = await this.loadProviders(ids);
    const byId = new Map(providers.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter((p): p is Provider => !!p);
    return mapPool(ordered, AUTOFILL_CONCURRENCY, (p) => this.autoFillOne(p));
  }

  private async autoFillOne(provider: Provider): Promise<AutoImageResult> {
    const result: AutoImageResult = {
      providerId: provider.id,
      brandName: provider.brandName,
      logo: null,
      banner: null,
      skipped: false,
      notes: [],
    };
    const needsLogo = !provider.profilePhotoUrl;
    const needsBanner = !provider.bannerImageUrl;
    if (!needsLogo && !needsBanner) {
      result.skipped = true;
      return result;
    }

    const found = await this.enrichOne(provider);
    result.notes = found.notes;
    const update: Partial<Provider> = {};

    if (needsLogo && found.logos.length) {
      const pick = found.logos[0];
      const saved = await this.saveImage(pick.url, 'avatar');
      if (saved) {
        update.profilePhotoUrl = saved;
        result.logo = pick.source === 'instagram' ? 'instagram' : 'website';
      }
    }

    if (needsBanner) {
      const pick = found.banners[0];
      if (pick) {
        const saved = await this.saveImage(pick.url, 'banner');
        if (saved) {
          update.bannerImageUrl = saved;
          result.banner = 'website';
        }
      }
      if (!update.bannerImageUrl) {
        // Nothing real to show — a branded card beats an empty tile.
        const categories = (provider.providerCategories ?? []).map((pc) => pc.category?.name ?? '').filter(Boolean);
        try {
          const png = await renderBrandBanner(provider.brandName, categories);
          const compressed = await compressImage(this.asUpload(png, 'placeholder.png', 'image/png'), 'banner');
          const { url } = await this.storageService.upload('providers', compressed);
          update.bannerImageUrl = url;
          result.banner = 'generated';
        } catch (err) {
          result.notes.push(`Couldn't generate a banner: ${(err as Error).message}`);
        }
      }
    }

    if (Object.keys(update).length > 0) {
      await this.providerRepo.update(provider.id, update);
      this.logger.log(`Auto images for ${provider.id}: logo=${result.logo ?? '—'} banner=${result.banner ?? '—'}`);
    }
    return result;
  }

  private asUpload(buffer: Buffer, originalname: string, mimetype: string): Express.Multer.File {
    return { fieldname: 'image', originalname, encoding: '7bit', mimetype, buffer, size: buffer.length } as Express.Multer.File;
  }

  /** Download, compress and store one image. Returns its public URL, or null if it failed. */
  private async saveImage(url: string, preset: 'avatar' | 'banner'): Promise<string | null> {
    try {
      const file = await fetchImageFromUrl(url);
      const compressed = await compressImage(file, preset);
      const stored = await this.storageService.upload('providers', compressed);
      return stored.url;
    } catch (err) {
      this.logger.warn(`Auto image failed for ${url}: ${(err as Error).message}`);
      return null;
    }
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

    const rawLogos: RawCandidate<CandidateSource>[] = [];
    const rawBanners: RawCandidate<CandidateSource>[] = [];

    // 1. Instagram first — the handle came from the business itself, and the
    // profile picture is usually the logo they actually use.
    const handle = instagramHandleOf(provider.instagramHandle);
    let instagramPicture: string | null = null;
    if (handle) {
      const profile = await this.instagramLookup(handle, notes);
      if (profile?.pictureUrl) {
        instagramPicture = profile.pictureUrl;
        rawLogos.push({ url: profile.pictureUrl, source: 'instagram' });
      }
      if (profile?.website) {
        const site = normalizeWebsite(profile.website);
        if (site && 'url' in site) result.website = { url: site.url, source: 'instagram' };
      }
    }

    // 2. Website — the provider's own value wins, then Instagram's, then Google's.
    const own = normalizeWebsite(provider.websiteUrl);
    if (own && 'url' in own) result.website = { url: own.url, source: 'provider' };
    else if (own) notes.push(`Saved website is a ${own.skipped} page, not a business site`);

    // Google is the only paid step and it exists to find a website the sheet
    // didn't give us — so it runs only when switched on, and only when needed.
    if (this.useGoogle && this.apiKey && !result.website) {
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
    } else if (!result.website && this.useGoogle && !this.apiKey) {
      notes.push('Google lookup is on but GOOGLE_MAPS_API_KEY is not set');
    } else if (!result.website) {
      notes.push('No website for this business (paid Google lookup is off)');
    }

    // 3. Logo and banner candidates from the website.
    if (result.website) {
      const page = await this.websiteCandidates(result.website.url, notes);
      rawLogos.push(...page.logos);
      rawBanners.push(...page.banners);
    }

    // 4. Measure everything once, then drop anything too small or oddly shaped.
    const sizes = await this.measure([...rawLogos, ...rawBanners]);
    const picked = this.pick(rawLogos, rawBanners, sizes);
    result.logos = picked.logos;
    result.banners = picked.banners;
    if (result.website && !picked.logos.length && !picked.banners.length) {
      notes.push('Website has no usable logo or banner (SVG and .ico files are skipped)');
    }

    const foundSomething = result.logos.length > 0 || result.banners.length > 0 || result.website?.source !== 'provider';
    if (foundSomething && (result.logos.length > 0 || result.banners.length > 0 || result.website)) {
      result.confidence =
        instagramPicture || result.website?.source === 'provider' || result.match?.matchedBy === 'phone' ? 'high' : 'check';
    }
    return result;
  }

  /**
   * Candidates for a sheet row during bulk-import vetting — there's no provider
   * record yet, so this works from the row's own Instagram and Website columns.
   * Google is never used here (it needs a saved business to match against).
   */
  async imageCandidates(
    admin: { role?: string },
    rows: { rowId: string; instagram?: string | null; website?: string | null }[],
  ): Promise<SheetRowCandidates[]> {
    this.assertAdmin(admin);
    return mapPool(rows, PROVIDER_CONCURRENCY, async (row) => {
      const notes: string[] = [];
      const rawLogos: RawCandidate<CandidateSource>[] = [];
      const rawBanners: RawCandidate<CandidateSource>[] = [];
      let websiteUrl: string | null = null;

      const handle = instagramHandleOf(row.instagram);
      if (handle) {
        const profile = await this.instagramLookup(handle, notes);
        if (profile?.pictureUrl) rawLogos.push({ url: profile.pictureUrl, source: 'instagram' });
        if (profile?.website) {
          const site = normalizeWebsite(profile.website);
          if (site && 'url' in site) websiteUrl = site.url;
        }
      }

      const own = normalizeWebsite(row.website);
      if (own && 'url' in own) websiteUrl = own.url;
      else if (own) notes.push(`Website column is a ${own.skipped} page, not a business site`);

      if (websiteUrl) {
        const page = await this.websiteCandidates(websiteUrl, notes);
        rawLogos.push(...page.logos);
        rawBanners.push(...page.banners);
      } else if (!handle) {
        notes.push('Row has no Instagram handle or website to look at');
      }

      const sizes = await this.measure([...rawLogos, ...rawBanners]);
      const picked = this.pick(rawLogos, rawBanners, sizes);
      return { rowId: row.rowId, website: websiteUrl, logos: picked.logos, banners: picked.banners, notes };
    });
  }

  /** The Instagram step, shared by suggestions and sheet rows. Never throws. */
  private async instagramLookup(handle: string, notes: string[]): Promise<{ pictureUrl: string | null; website: string | null } | null> {
    if (!this.igToken || !this.igAccountId) {
      notes.push('Instagram lookup is off — set INSTAGRAM_GRAPH_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID');
      return null;
    }
    if (this.igConfigProblem) {
      notes.push(`Instagram is misconfigured: ${this.igConfigProblem}`);
      return null;
    }
    try {
      const profile = await this.instagramProfile(handle);
      if (!profile.pictureUrl) notes.push(`Instagram @${handle} has no public business profile`);
      return profile;
    } catch (err) {
      notes.push(`Instagram lookup failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Read one homepage and pull its logo/banner candidates. Never throws. */
  private async websiteCandidates(
    url: string,
    notes: string[],
  ): Promise<{ logos: RawCandidate<CandidateSource>[]; banners: RawCandidate<CandidateSource>[] }> {
    try {
      const page = await fetchPublicPage(url);
      const found = extractImageCandidates(page.html, page.finalUrl);
      return { logos: found.logos, banners: found.banners };
    } catch (err) {
      notes.push(`Couldn't read the website: ${(err as Error).message}`);
      return { logos: [], banners: [] };
    }
  }

  /**
   * Instagram Business Discovery: the official way to read another business's
   * public profile. Needs our own Instagram business account and a token.
   */
  private async instagramProfile(handle: string): Promise<{ pictureUrl: string | null; website: string | null }> {
    const url = new URL(`https://graph.facebook.com/${this.igVersion}/${this.igAccountId!}`);
    url.searchParams.set('fields', `business_discovery.username(${handle}){profile_picture_url,website}`);
    url.searchParams.set('access_token', this.igToken!);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INSTAGRAM_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = (await res.json()) as {
        error?: { message?: string; code?: number };
        business_discovery?: { profile_picture_url?: string; website?: string };
      };
      if (data.error) {
        // Not a business account, or the handle doesn't exist — normal, not a failure.
        if (data.error.code === 110 || /does not exist|cannot be found/i.test(data.error.message ?? '')) {
          return { pictureUrl: null, website: null };
        }
        // Never surface the URL — it carries the access token.
        throw new Error(data.error.message ?? `HTTP ${res.status}`);
      }
      return {
        pictureUrl: data.business_discovery?.profile_picture_url ?? null,
        website: data.business_discovery?.website ?? null,
      };
    } catch (err) {
      if (controller.signal.aborted) throw new Error('Instagram timed out');
      throw err;
    } finally {
      clearTimeout(timer);
    }
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
  private async measure(candidates: RawCandidate<CandidateSource>[]): Promise<Map<string, Size>> {
    const urls = [...new Set(candidates.map((c) => c.url))];
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

  private pick(
    rawLogos: RawCandidate<CandidateSource>[],
    rawBanners: RawCandidate<CandidateSource>[],
    sizes: Map<string, Size>,
  ): { logos: EnrichImageCandidate[]; banners: EnrichImageCandidate[] } {
    const logos: EnrichImageCandidate[] = [];
    const squareShareImages: EnrichImageCandidate[] = [];
    const banners: EnrichImageCandidate[] = [];

    for (const c of rawLogos) {
      const size = sizes.get(c.url);
      if (!size) continue;
      const short = Math.min(size.width, size.height);
      if (short >= MIN_LOGO_SIDE && Math.max(size.width, size.height) / short <= MAX_LOGO_RATIO) {
        logos.push({ ...c, ...size });
      }
    }

    for (const c of rawBanners) {
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

    // Instagram wins outright. Otherwise header-sized images beat huge ones: a
    // 1900px "logo" is usually a hero image that merely has "logo" in its name.
    const rank = (c: EnrichImageCandidate) =>
      c.source === 'instagram' ? -1 : Math.max(c.width, c.height) > 1024 ? 1 : 0;
    const seen = new Set<string>();
    const uniqueLogos = [...logos, ...squareShareImages]
      .filter((c) => !seen.has(c.url) && seen.add(c.url))
      .map((c, order) => ({ c, order }))
      .sort((a, b) => rank(a.c) - rank(b.c) || a.order - b.order)
      .map(({ c }) => c);
    return { logos: uniqueLogos.slice(0, MAX_LOGOS), banners: banners.slice(0, MAX_BANNERS) };
  }
}
