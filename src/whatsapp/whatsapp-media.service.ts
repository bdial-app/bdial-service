import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { TIJARAH_MARK_PNG } from './assets.tijarah-mark';

const W = 1200;
const H = 628; // 1.91:1, how WhatsApp frames an image header
const TILE = 340;
const RADIUS = 48;
const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const CACHE_MAX = 300;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** Card for recipients with no business, or a business with no usable logo. */
export const DEFAULT_CARD_ID = 'tijarah';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Image headers for campaigns that greet each business with its own logo.
 *
 * WhatsApp fetches a header image from a public HTTPS link and accepts only
 * JPEG or PNG, while owners may upload WebP. So each business gets a link here
 * that renders its logo beside the Tijarah mark as a JPEG card. The cards hold
 * no text: the server may lack fonts, and the message body says the words.
 */
@Injectable()
export class WhatsAppMediaService {
  private readonly logger = new Logger(WhatsAppMediaService.name);
  private readonly cache = new Map<string, { buf: Buffer; at: number }>();
  private readonly inFlight = new Map<string, Promise<Buffer>>();
  private readonly allowedHosts: Set<string>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    // Only fetch logos from our own storage: the URL comes from the database,
    // but this endpoint is public, so never let it fetch arbitrary hosts.
    this.allowedHosts = new Set(
      [this.config.get<string>('SUPABASE_URL'), process.env.S3_ENDPOINT]
        .map((u) => {
          try {
            return u ? new URL(u).host : null;
          } catch {
            return null;
          }
        })
        .filter((h): h is string => !!h),
    );
  }

  /** The API's public base, as Meta's servers reach it. */
  private publicBase(): string {
    return (
      this.config.get<string>('API_PUBLIC_URL') ??
      'https://customer-api.tijarahapp.in/api'
    )
      .trim()
      .replace(/\/+$/, '');
  }

  private cardLink(id: string, photoUrl: string | null): string {
    // The version changes with the logo, so a new logo is never served stale.
    const v = createHash('sha1')
      .update(photoUrl ?? 'none')
      .digest('hex')
      .slice(0, 10);
    return `${this.publicBase()}/whatsapp/media/logo-card/${id}.jpg?v=${v}`;
  }

  defaultCardUrl(): string {
    return this.cardLink(DEFAULT_CARD_ID, null);
  }

  /** Logo-card links for many businesses in one query. */
  async logoCardUrls(providerIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(providerIds.filter(Boolean))];
    const out = new Map<string, string>();
    if (!ids.length) return out;
    const rows = await this.dataSource.query<
      Array<{ id: string; profile_photo_url: string | null }>
    >(
      `SELECT id, profile_photo_url FROM providers WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    for (const r of rows) {
      out.set(r.id, this.cardLink(r.id, r.profile_photo_url));
    }
    return out;
  }

  /** JPEG for /whatsapp/media/logo-card/:id.jpg, or null for an unknown id. */
  async card(id: string): Promise<Buffer | null> {
    let photoUrl: string | null = null;
    if (id !== DEFAULT_CARD_ID) {
      if (!UUID_RE.test(id)) return null;
      const rows = await this.dataSource.query<
        Array<{ profile_photo_url: string | null }>
      >(
        `SELECT profile_photo_url FROM providers WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      if (!rows.length) return null;
      photoUrl = rows[0].profile_photo_url;
    }

    const key = photoUrl ?? DEFAULT_CARD_ID;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.buf;
    // A campaign sends many messages at once and Meta fetches each header.
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const job = this.render(photoUrl).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, job);
    const buf = await job;
    if (this.cache.size >= CACHE_MAX) {
      // Maps keep insertion order: the first key is the oldest.
      const [oldest] = this.cache.keys();
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { buf, at: Date.now() });
    return buf;
  }

  private async render(photoUrl: string | null): Promise<Buffer> {
    const logo = photoUrl ? await this.fetchLogo(photoUrl) : null;
    const mark = await sharp(TIJARAH_MARK_PNG)
      .resize(logo ? TILE : 400, logo ? TILE : 400)
      .png()
      .toBuffer();

    if (!logo) {
      return sharp(this.background([]))
        .composite([{ input: mark, left: (W - 400) / 2, top: (H - 400) / 2 }])
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
    }

    const gap = 80;
    const left = (W - TILE * 2 - gap) / 2;
    const right = left + TILE + gap;
    const top = (H - TILE) / 2;
    // The logo, contained on a white rounded tile so any shape or colour reads.
    const pad = 34;
    const inner = await sharp(logo)
      .resize(TILE - pad * 2, TILE - pad * 2, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();
    const tile = await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}"><rect width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="#fff"/></svg>`,
      ),
    )
      .composite([{ input: inner, left: pad, top: pad }])
      .png()
      .toBuffer();

    return sharp(this.background([left, right], top, gap))
      .composite([
        { input: tile, left, top },
        { input: mark, left: right, top },
        // A faint outline so the indigo mark stands off the indigo backdrop.
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}"><rect x="1.5" y="1.5" width="${TILE - 3}" height="${TILE - 3}" rx="${RADIUS}" fill="none" stroke="#fff" stroke-opacity="0.28" stroke-width="3"/></svg>`,
          ),
          left: right,
          top,
        },
      ])
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  }

  /** Brand-indigo backdrop; with tiles, soft shadows under them and a "+" between. */
  private background(tilesX: number[], top = 0, gap = 0): Buffer {
    const shadows = tilesX
      .map(
        (x) =>
          `<rect x="${x}" y="${top + 14}" width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="#000" opacity="0.35" filter="url(#s)"/>`,
      )
      .join('');
    const cx = tilesX.length ? tilesX[0] + TILE + gap / 2 : 0;
    const cy = H / 2;
    const plus = tilesX.length
      ? `<circle cx="${cx}" cy="${cy}" r="26" fill="#fff" opacity="0.14"/>` +
        `<rect x="${cx - 13}" y="${cy - 3}" width="26" height="6" rx="3" fill="#fff"/>` +
        `<rect x="${cx - 3}" y="${cy - 13}" width="6" height="26" rx="3" fill="#fff"/>`
      : '';
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#3a3db8"/><stop offset="1" stop-color="#15164a"/>
          </linearGradient>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#g)"/>
        <circle cx="${W - 90}" cy="70" r="190" fill="#fff" opacity="0.05"/>
        <circle cx="80" cy="${H - 40}" r="160" fill="#fff" opacity="0.04"/>
        ${shadows}${plus}
      </svg>`,
    );
  }

  /** The owner's logo as a decodable image buffer, or null (falls back to Tijarah's card). */
  private async fetchLogo(url: string): Promise<Buffer | null> {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !this.allowedHosts.has(u.host)) {
        this.logger.warn(`Logo not on our storage, using default: ${u.host}`);
        return null;
      }
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_LOGO_BYTES) return null;
      // Decode once here so a corrupt file falls back instead of failing the card.
      await sharp(buf).metadata();
      return buf;
    } catch (err) {
      this.logger.warn(
        `Logo fetch failed (${url}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
