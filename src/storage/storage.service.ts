import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.endpoint = this.config.getOrThrow<string>('S3_ENDPOINT');

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get<string>('S3_REGION', 'ap-southeast-1'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
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
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File extension '.${ext}' is not allowed`);
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`MIME type '${file.mimetype}' is not allowed`);
    }
    const storageKey = `${folder}/${uuidv4()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {if (err instanceof Error) {
    throw new InternalServerErrorException(`S3 upload failed: ${err.message}`);
  }
    }

    // Supabase public URL format
    const baseUrl = this.endpoint.replace('/storage/v1/s3', '/storage/v1/object/public');
    const url = `${baseUrl}/${this.bucket}/${storageKey}`;
    return { url, storageKey };
  }

  /**
   * Delete a file from S3 by its storage key.
   */
  async delete(storageKey: string): Promise<void> {
    try {
      await this.s3.send(
         new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );
    } catch (err) {
      if(err instanceof Error){
      throw new InternalServerErrorException(`S3 delete failed: ${err.message}`);
      }
    }

  }
}
