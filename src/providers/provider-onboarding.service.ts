import {
  BadRequestException,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderOnboardingDraft } from '../entities/provider-onboarding-draft.entity';
import { StorageService } from '../storage/storage.service';
import { compressImage, ImagePreset } from '../common/image-processor';

export type OnboardingMediaKind =
  | 'banner'
  | 'profile'
  | 'product'
  | 'verification';
export const ONBOARDING_MEDIA_KINDS: OnboardingMediaKind[] = [
  'banner',
  'profile',
  'product',
  'verification',
];

const MEDIA: Record<
  OnboardingMediaKind,
  { folder: string; preset: ImagePreset; pdf: boolean }
> = {
  banner: { folder: 'providers', preset: 'banner', pdf: false },
  profile: { folder: 'providers', preset: 'avatar', pdf: false },
  product: { folder: 'products', preset: 'full', pdf: false },
  verification: { folder: 'verifications', preset: 'document', pdf: true },
};

const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
/** A draft is form text plus photo URLs; anything bigger is not a draft. */
const MAX_DRAFT_BYTES = 256 * 1024;

/**
 * "List your business", built to survive real phones: progress is saved as a
 * draft per user, and photos upload one at a time as they're picked, so the
 * final submit is a small request that is safe to retry.
 */
@Injectable()
export class ProviderOnboardingService {
  private readonly logger = new Logger(ProviderOnboardingService.name);

  constructor(
    @InjectRepository(ProviderOnboardingDraft)
    private readonly drafts: Repository<ProviderOnboardingDraft>,
    private readonly storage: StorageService,
  ) {}

  async getDraft(userId: string) {
    const d = await this.drafts.findOneBy({ userId });
    return d
      ? { data: d.data, step: d.step, updatedAt: d.updatedAt.toISOString() }
      : null;
  }

  async saveDraft(userId: string, data: Record<string, unknown>, step: number) {
    if (JSON.stringify(data ?? {}).length > MAX_DRAFT_BYTES) {
      throw new PayloadTooLargeException('Draft is too large');
    }
    const safeStep = Math.min(Math.max(Math.trunc(step) || 1, 1), 10);
    await this.drafts.save(
      this.drafts.create({ userId, data: data ?? {}, step: safeStep }),
    );
    const saved = await this.drafts.findOneByOrFail({ userId });
    return { updatedAt: saved.updatedAt.toISOString() };
  }

  async deleteDraft(userId: string) {
    await this.drafts.delete({ userId });
    return { deleted: true };
  }

  /** One photo or document, compressed like the all-in-one submit did. */
  async uploadMedia(
    kind: OnboardingMediaKind,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file received');
    const spec = MEDIA[kind];
    const isPdf = file.mimetype === 'application/pdf';
    if (!(IMAGE_TYPES.includes(file.mimetype) || (spec.pdf && isPdf))) {
      throw new BadRequestException(
        spec.pdf
          ? 'Use a JPG, PNG or PDF file'
          : 'Use a JPG, PNG or WebP photo',
      );
    }
    let toStore = file;
    if (!isPdf) {
      try {
        toStore = await compressImage(file, spec.preset);
      } catch (err) {
        // e.g. an iPhone HEIC the server can't decode: keep the original.
        this.logger.warn(
          `Onboarding ${kind} compression failed, storing original: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    const { url, storageKey } = await this.storage.upload(spec.folder, toStore);
    return { url, storageKey, kind };
  }
}
