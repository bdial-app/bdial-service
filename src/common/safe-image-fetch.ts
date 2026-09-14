import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Download an image from a user-supplied link for an admin import.
 *
 * The link comes from a spreadsheet, so treat it as hostile:
 *  - http(s) only, and every redirect hop is re-checked — a public URL that
 *    redirects to 169.254.169.254 or 10.x is rejected, not followed
 *  - streaming size cap, so a huge file can't exhaust memory
 *  - magic-byte check, because Content-Type headers lie
 *  - Google Drive / Dropbox share links are rewritten to direct downloads
 */

export const MAX_IMPORT_IMAGE_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const DRIVE_ID = /drive\.google\.com\/(?:file\/d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/i;

export function isDriveLink(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com/i.test(url);
}

/** Turn a share link into something that returns the file bytes. */
export function toDirectImageUrl(raw: string): string {
  const url = raw.trim();
  const drive = url.match(DRIVE_ID);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  if (/(^|\.)dropbox\.com\//i.test(url)) {
    if (/[?&]dl=0/.test(url)) return url.replace(/([?&])dl=0/, '$1dl=1');
    if (!/[?&](dl|raw)=/.test(url)) return `${url}${url.includes('?') ? '&' : '?'}raw=1`;
  }
  return url;
}

/** Private, loopback, link-local, CGNAT, multicast and IPv6 local ranges. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === '::' || v6 === '::1') return true;
  if (v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return true;
  const mapped = v6.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mapped ? isPrivateAddress(mapped[1]) : false;
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestException('Only http(s) image links are allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new BadRequestException('That link points to an internal address');
  }
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new BadRequestException(`Could not reach ${host}`);
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new BadRequestException('That link points to a private network address');
  }
}

/** Identify the real format from the first bytes, ignoring what the server claims. */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(buf.subarray(8, 12).toString('ascii'))) return 'image/heic';
  return null;
}

async function readCapped(res: Response, max: number): Promise<Buffer> {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      throw new BadRequestException(`Image is larger than ${Math.round(max / (1024 * 1024))}MB`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Download and validate one image. Throws BadRequestException with a readable reason. */
export async function fetchImageFromUrl(rawUrl: string): Promise<Express.Multer.File> {
  let current: URL;
  try {
    current = new URL(toDirectImageUrl(rawUrl));
  } catch {
    throw new BadRequestException('Not a valid link');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      let res: Response;
      try {
        res = await fetch(current, {
          redirect: 'manual',
          signal: controller.signal,
          headers: { 'User-Agent': 'TijarahAdmin/1.0 (bulk image import)', Accept: 'image/*' },
        });
      } catch (err) {
        throw new BadRequestException(controller.signal.aborted ? 'Timed out downloading the image' : `Download failed: ${(err as Error).message}`);
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new BadRequestException('Link redirected without a destination');
        current = new URL(location, current);
        continue;
      }

      if (!res.ok) {
        throw new BadRequestException(
          (res.status === 401 || res.status === 403) && isDriveLink(rawUrl)
            ? 'Google Drive file is private — share it as "Anyone with the link"'
            : `Link returned HTTP ${res.status}`,
        );
      }

      const declared = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (declared === 'text/html') {
        throw new BadRequestException(
          isDriveLink(rawUrl)
            ? 'Google Drive file is private — share it as "Anyone with the link"'
            : 'Link opens a web page, not an image',
        );
      }
      const length = Number(res.headers.get('content-length') ?? 0);
      if (length > MAX_IMPORT_IMAGE_BYTES) {
        throw new BadRequestException(`Image is larger than ${MAX_IMPORT_IMAGE_BYTES / (1024 * 1024)}MB`);
      }

      const buffer = await readCapped(res, MAX_IMPORT_IMAGE_BYTES);
      const mime = sniffImageMime(buffer);
      if (mime === 'image/heic') throw new BadRequestException('HEIC photos aren\'t supported — export it as JPG or PNG');
      if (!mime || !EXT_BY_MIME[mime]) throw new BadRequestException('File is not a JPG, PNG, WebP or GIF image');

      return {
        fieldname: 'image',
        originalname: `import.${EXT_BY_MIME[mime]}`,
        encoding: '7bit',
        mimetype: mime,
        buffer,
        size: buffer.length,
      } as Express.Multer.File;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new BadRequestException('Link redirected too many times');
}
