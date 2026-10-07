import { BadRequestException } from '@nestjs/common';
import sharp = require('sharp');

export type ImagePreset =
  | 'thumbnail'
  | 'avatar'
  | 'standard'
  | 'banner'
  | 'full'
  | 'icon'
  | 'document';

/**
 * Largest file any upload endpoint accepts. The apps shrink photos to a few
 * hundred KB before sending, so this only matters when a phone couldn't (an
 * unusual format, too little memory) and sends the original instead.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Multer `limits` for every upload endpoint. */
export const UPLOAD_LIMITS = { fileSize: MAX_UPLOAD_BYTES };

interface PresetConfig {
  /** Longest side, in pixels. */
  maxEdge: number;
  /** What a stored image should weigh at most. */
  targetKB: number;
  /** Never go below this WebP quality, even to hit the target. */
  minQuality: number;
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
  thumbnail: { maxEdge: 400, targetKB: 40, minQuality: 55 },
  icon: { maxEdge: 256, targetKB: 40, minQuality: 70 },
  avatar: { maxEdge: 800, targetKB: 120, minQuality: 60 },
  standard: { maxEdge: 1600, targetKB: 300, minQuality: 60 },
  full: { maxEdge: 1600, targetKB: 300, minQuality: 60 },
  banner: { maxEdge: 1920, targetKB: 380, minQuality: 60 },
  // ID documents must stay readable: bigger, and never blurry.
  document: { maxEdge: 2400, targetKB: 700, minQuality: 72 },
};

/** Qualities tried in turn until the image fits its target. */
const QUALITY_STEPS = [82, 74, 66, 58];

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/**
 * Store an image small and sharp: oriented the right way up, fitted inside the
 * preset's box, metadata (incl. GPS) removed, and saved as WebP at the highest
 * quality that fits the preset's size target — a few hundred KB at most.
 *
 * Photos the apps already optimised are kept as they are, so they aren't
 * compressed twice. SVGs and GIFs (animation) pass through untouched.
 */
export async function compressImage(
  file: Express.Multer.File,
  preset: ImagePreset = 'standard',
): Promise<Express.Multer.File> {
  if (!file.mimetype.startsWith('image/')) return file;
  if (file.mimetype === 'image/svg+xml' || file.mimetype === 'image/gif')
    return file;

  const config = PRESETS[preset];
  const budget = config.targetKB * 1024;

  let meta: sharp.Metadata;
  try {
    meta = await sharp(file.buffer, { failOn: 'none' }).metadata();
  } catch {
    throw new BadRequestException(
      "We couldn't read this image. Please use a JPG, PNG or WebP photo.",
    );
  }

  // Already right-sized by the app (no EXIF means no GPS and no rotation to do).
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (
    (meta.format === 'webp' || meta.format === 'jpeg') &&
    !meta.exif &&
    longEdge > 0 &&
    longEdge <= config.maxEdge &&
    file.buffer.length <= budget * 1.15
  ) {
    return file;
  }

  const base = sharp(file.buffer, {
    failOn: 'none',
    limitInputPixels: 300_000_000,
    sequentialRead: true,
  })
    .rotate() // apply the EXIF orientation, then drop it
    .resize({
      width: config.maxEdge,
      height: config.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    });

  let best: Buffer | null = null;
  try {
    for (const q of QUALITY_STEPS.filter((s) => s >= config.minQuality)) {
      best = await base
        .clone()
        .webp({ quality: q, smartSubsample: true, effort: 5 })
        .toBuffer();
      if (best.length <= budget) break;
    }
    if (!best) {
      best = await base
        .clone()
        .webp({ quality: config.minQuality, smartSubsample: true, effort: 5 })
        .toBuffer();
    }
  } catch {
    throw new BadRequestException(
      "We couldn't read this image. Please use a JPG, PNG or WebP photo.",
    );
  }

  // A small, well-compressed original can beat the re-encode; keep the smaller.
  if (
    best.length >= file.buffer.length &&
    (meta.format === 'webp' || meta.format === 'jpeg') &&
    !meta.exif &&
    longEdge <= config.maxEdge
  ) {
    return file;
  }

  return {
    ...file,
    buffer: best,
    size: best.length,
    mimetype: 'image/webp',
    originalname:
      (file.originalname || 'image').replace(/\.[^.]+$/, '') + '.webp',
  };
}

/**
 * Compress several files one after another (in parallel, a batch of large
 * photos can exhaust the server's memory).
 */
export async function compressImages(
  files: Express.Multer.File[],
  preset: ImagePreset = 'standard',
): Promise<Express.Multer.File[]> {
  const out: Express.Multer.File[] = [];
  for (const f of files) out.push(await compressImage(f, preset));
  return out;
}

/**
 * Validate file MIME type using the declared mimetype.
 * Throws BadRequestException if invalid.
 */
export function validateImageMime(
  file: Express.Multer.File,
  allowedMimes: string[] = IMAGE_MIME_TYPES,
): void {
  if (!allowedMimes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`,
    );
  }
}

/**
 * Validate file size. Throws BadRequestException if too large.
 */
export function validateFileSize(
  file: Express.Multer.File,
  maxSizeBytes: number = MAX_UPLOAD_BYTES,
): void {
  if (file.size > maxSizeBytes) {
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new BadRequestException(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds ${maxMB}MB limit.`,
    );
  }
}
