import { BadRequestException } from '@nestjs/common';
import sharp = require('sharp');

export type ImagePreset = 'thumbnail' | 'avatar' | 'standard' | 'banner' | 'full' | 'icon';

interface PresetConfig {
  maxWidth: number;
  quality: number;
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
  thumbnail: { maxWidth: 300, quality: 70 },
  avatar: { maxWidth: 400, quality: 70 },
  standard: { maxWidth: 800, quality: 75 },
  banner: { maxWidth: 1600, quality: 75 },
  full: { maxWidth: 1200, quality: 80 },
  icon: { maxWidth: 256, quality: 80 },
};

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/**
 * Compress an image file using Sharp.
 * Converts to WebP with preset-based resize.
 * SVGs and GIFs are passed through unchanged.
 * Files already under 100KB are passed through unchanged.
 */
export async function compressImage(
  file: Express.Multer.File,
  preset: ImagePreset = 'standard',
): Promise<Express.Multer.File> {
  // Skip non-images (e.g. PDFs)
  if (!file.mimetype.startsWith('image/')) {
    return file;
  }

  // Skip SVG and GIF — can't/shouldn't be re-encoded to WebP
  if (file.mimetype === 'image/svg+xml' || file.mimetype === 'image/gif') {
    return file;
  }

  // If file is already tiny (<100KB), skip compression to avoid quality loss
  if (file.buffer.length < 100 * 1024) {
    return file;
  }

  const config = PRESETS[preset];

  const compressed = await sharp(file.buffer)
    .resize({ width: config.maxWidth, withoutEnlargement: true })
    .webp({ quality: config.quality })
    .toBuffer();

  return {
    ...file,
    buffer: compressed,
    size: compressed.length,
    mimetype: 'image/webp',
    originalname: file.originalname.replace(/\.[^.]+$/, '.webp'),
  };
}

/**
 * Compress multiple files in parallel.
 */
export async function compressImages(
  files: Express.Multer.File[],
  preset: ImagePreset = 'standard',
): Promise<Express.Multer.File[]> {
  return Promise.all(files.map((f) => compressImage(f, preset)));
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
  maxSizeBytes: number = 10 * 1024 * 1024,
): void {
  if (file.size > maxSizeBytes) {
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new BadRequestException(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds ${maxMB}MB limit.`,
    );
  }
}
