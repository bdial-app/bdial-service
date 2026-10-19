import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageBackupService } from '../storage-backup/storage-backup.service';

/**
 * Folders the app never deletes from: identity documents and private
 * conversations. Removing one of these is a manual, deliberate job.
 */
export const PROTECTED_PREFIXES = [
  'verifications/',
  'chat-media/',
  'whatsapp-media/',
];

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(@Optional() private readonly backup?: StorageBackupService) {
    this.bucket = process.env.S3_BUCKET!;
    this.endpoint = process.env.S3_ENDPOINT!;

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: process.env.S3_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // required for Supabase S3-compatible storage
    });
  }

  /**
   * Upload a file buffer to S3.
   * @param folder  e.g. 'listings', 'reviews', 'verifications'
   * @param file    Multer file object
   * @returns       { url, storageKey }
   */
  async upload(
    folder: string,
    file: Express.Multer.File,
  ): Promise<{ url: string; storageKey: string }> {
    const ext = file.originalname.split('.').pop();
    const { v4: uuidv4 } = await import('uuid'); // Dynamic import for ESM compatibility
    const storageKey = `${folder}/${uuidv4()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `S3 upload failed: ${err.message}`,
      );
    }

    // Supabase public URL format
    const baseUrl = this.endpoint.replace(
      '/storage/v1/s3',
      '/storage/v1/object/public',
    );
    const url = `${baseUrl}/${this.bucket}/${storageKey}`;
    return { url, storageKey };
  }

  /** Base of this bucket's public URLs: `<endpoint>/object/public/<bucket>/`. */
  private publicBase(): string {
    return `${this.endpoint.replace('/storage/v1/s3', '/storage/v1/object/public')}/${this.bucket}/`;
  }

  /**
   * The storage key of a public URL from this bucket, or null when the URL is
   * not ours — so a client can only hand back files it uploaded through us.
   */
  keyFromPublicUrl(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    const base = this.publicBase();
    if (!url.startsWith(base)) return null;
    const key = url.slice(base.length);
    return key && !key.includes('..') ? key : null;
  }

  /**
   * Store bytes that are not a public upload (e.g. WhatsApp media). The key is
   * random and never handed out: the API serves these to signed-in admins.
   */
  async putPrivate(
    folder: string,
    data: Buffer,
    contentType: string,
    ext: string,
  ): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');
    const storageKey = `${folder}/${uuidv4()}.${ext}`;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: data,
          ContentType: contentType,
          CacheControl: 'private, no-store',
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `S3 upload failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return storageKey;
  }

  /** Read a stored object's bytes. */
  async get(storageKey: string): Promise<Buffer> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    if (!res.Body) throw new InternalServerErrorException('Empty object');
    return Buffer.from(await res.Body.transformToByteArray());
  }

  /**
   * Delete a file from S3 by its storage key. Files in protected folders are
   * never deleted, and when backup is set up the file is copied to the
   * backup first — if that copy fails, the file is kept.
   */
  async delete(storageKey: string): Promise<void> {
    if (
      !storageKey ||
      storageKey.includes('..') ||
      PROTECTED_PREFIXES.some((p) => storageKey.startsWith(p))
    ) {
      this.logger.warn(`Refused to delete protected file ${storageKey}`);
      throw new ForbiddenException(
        'This file is protected and cannot be deleted',
      );
    }
    if (this.backup) {
      try {
        await this.backup.ensureBackedUp(storageKey);
      } catch (err) {
        this.logger.error(
          `Kept ${storageKey}: could not back it up before deleting (${err instanceof Error ? err.message : String(err)})`,
        );
        throw new InternalServerErrorException(
          'Could not back up the file, so it was kept',
        );
      }
    }
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `S3 delete failed: ${err.message}`,
      );
    }
  }

  /**
   * Extract the S3 storage key from a public Supabase URL.
   * Returns null if the URL doesn't match the expected format.
   */
  extractKeyFromUrl(url: string): string | null {
    const marker = `/${this.bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }
}
