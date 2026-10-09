import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Product, Provider, ProviderCategory } from '../entities';
import { StorageService } from '../storage/storage.service';
import {
  BRAND_MARK_FOLDER,
  aiPrompt,
  type AiContext,
  isBrandMarkUrl,
  renderBrandMark,
} from './brand-mark';

/** Cloudflare Workers AI text-to-image model (free daily allowance). */
const AI_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const AI_TIMEOUT_MS = 60_000;

export type BrandMarkResult =
  | { status: 'generated'; profilePhotoUrl: string }
  | { status: 'skipped'; reason: 'not-found' | 'has-logo' | 'changed' };

/**
 * Gives businesses without a logo a generated brand mark (see brand-mark.ts).
 * A real logo always wins: marks only fill an empty slot or replace another
 * mark, and the swap is conditional so a logo saved meanwhile (owner upload,
 * Instagram/website enrichment) is never overwritten.
 */
@Injectable()
export class BrandMarkService {
  private readonly logger = new Logger(BrandMarkService.name);
  private queue: Promise<void> = Promise.resolve();

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(ProviderCategory)
    private readonly providerCatRepo: Repository<ProviderCategory>,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /** True when AI logos are configured (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN). */
  get aiEnabled(): boolean {
    return !!(
      this.config.get<string>('CLOUDFLARE_ACCOUNT_ID') &&
      this.config.get<string>('CLOUDFLARE_AI_TOKEN')
    );
  }

  /**
   * Generate (or, with `force`, regenerate) one business's mark.
   * `force` replaces an existing mark — never a real logo. `ai` puts
   * AI artwork in the medallion instead of the category emblem.
   */
  async generate(
    providerId: string,
    opts: { variant?: number; force?: boolean; ai?: boolean } = {},
  ): Promise<BrandMarkResult> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId },
      select: [
        'id',
        'brandName',
        'description',
        'city',
        'area',
        'profilePhotoUrl',
        'deletedAt',
      ],
    });
    if (!provider || provider.deletedAt)
      return { status: 'skipped', reason: 'not-found' };

    const previous = provider.profilePhotoUrl;
    if (previous && !(isBrandMarkUrl(previous) && opts.force))
      return { status: 'skipped', reason: 'has-logo' };

    const links = await this.providerCatRepo.find({
      where: { providerId },
      relations: ['category'],
    });
    const categories = links
      .map((l) => l.category?.name)
      .filter((n): n is string => !!n);

    // Each AI try gets a fresh frame, style and background.
    const variant = opts.ai
      ? Math.floor(Math.random() * 1e6)
      : (opts.variant ?? 0);
    const art = opts.ai
      ? await this.aiArtwork(
          {
            name: provider.brandName,
            description: provider.description,
            categories,
            city: provider.city,
            area: provider.area,
            products: await this.productNames(providerId),
          },
          variant,
        )
      : undefined;
    const buffer = await renderBrandMark(
      provider.brandName,
      categories,
      variant,
      art,
    );
    const { url } = await this.storage.upload(BRAND_MARK_FOLDER, {
      buffer,
      size: buffer.length,
      mimetype: 'image/webp',
      originalname: 'mark.webp',
    } as Express.Multer.File);

    // Only if the logo is still what we looked at.
    const swap = await this.providerRepo
      .createQueryBuilder()
      .update(Provider)
      .set({ profilePhotoUrl: url })
      .where('id = :id', { id: providerId })
      .andWhere(
        previous
          ? 'profile_photo_url = :previous'
          : 'profile_photo_url IS NULL',
        { previous },
      )
      .execute();

    if (!swap.affected) {
      await this.removeFile(url);
      return { status: 'skipped', reason: 'changed' };
    }
    if (previous) await this.removeFile(previous);
    return { status: 'generated', profilePhotoUrl: url };
  }

  /**
   * Generate marks in the background, one at a time, without failing the
   * caller (used right after a business is created).
   */
  enqueue(providerIds: string[]): void {
    if (!providerIds.length) return;
    this.queue = this.queue.then(async () => {
      for (const id of providerIds) {
        await this.generate(id).catch((err) =>
          this.logger.warn(
            `Brand mark for ${id} failed: ${(err as Error)?.message ?? err}`,
          ),
        );
      }
    });
  }

  /** Marks for up to `limit` businesses that still have no logo. */
  async backfill(
    limit = 100,
  ): Promise<{ generated: number; failed: number; remaining: number }> {
    const where = { profilePhotoUrl: IsNull(), deletedAt: IsNull() };
    const batch = await this.providerRepo.find({
      where,
      select: ['id'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
    let generated = 0;
    let failed = 0;
    for (const { id } of batch) {
      try {
        const result = await this.generate(id);
        if (result.status === 'generated') generated++;
      } catch (err) {
        failed++;
        this.logger.warn(
          `Brand mark for ${id} failed: ${(err as Error)?.message ?? err}`,
        );
      }
    }
    const remaining = await this.providerRepo.count({ where });
    return { generated, failed, remaining };
  }

  /** How many businesses still have no logo. */
  missingCount(): Promise<number> {
    return this.providerRepo.count({
      where: { profilePhotoUrl: IsNull(), deletedAt: IsNull() },
    });
  }

  /**
   * Artwork for the medallion from Cloudflare Workers AI, as a PNG data URI.
   * The prompt is a fixed template (no LLM): the category's subject and
   * palette, plus a little of the description; never the name, since image
   * models garble text.
   */
  /** A few of the business's products, as context for AI artwork. */
  private async productNames(providerId: string): Promise<string[]> {
    const rows = await this.productRepo.find({
      where: { providerId, isActive: true },
      select: ['name'],
      order: { displayOrder: 'ASC' },
      take: 5,
    });
    return rows.map((r) => r.name);
  }

  private async aiArtwork(input: AiContext, variant: number): Promise<string> {
    const account = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const token = this.config.get<string>('CLOUDFLARE_AI_TOKEN');
    if (!account || !token) {
      throw new BadRequestException(
        'AI logos are not set up: add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN to the server env',
      );
    }
    const prompt = aiPrompt(input, variant);

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${AI_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          // FLUX schnell on Workers AI takes only prompt and steps (≤ 8);
          // anything else (e.g. seed) is rejected.
          steps: 6,
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      },
    ).catch((err: Error) => {
      throw new ServiceUnavailableException(
        `AI logo service unreachable: ${err.message}`,
      );
    });

    let image: Buffer;
    if (res.headers.get('content-type')?.startsWith('image/')) {
      image = Buffer.from(await res.arrayBuffer());
    } else {
      const body = (await res.json().catch(() => null)) as {
        success?: boolean;
        result?: { image?: string };
        errors?: Array<{ message?: string }>;
      } | null;
      if (!res.ok || !body?.result?.image) {
        const why = body?.errors?.[0]?.message ?? `HTTP ${res.status}`;
        this.logger.warn(`AI logo failed: ${why}`);
        throw new ServiceUnavailableException(
          res.status === 429
            ? "Today's free AI allowance is used up — try again tomorrow"
            : `AI logo failed: ${why}`,
        );
      }
      image = Buffer.from(body.result.image, 'base64');
    }
    const png = await sharp(image)
      .resize(360, 360, { fit: 'cover' })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  }

  private async removeFile(url: string) {
    if (!isBrandMarkUrl(url)) return;
    const key = this.storage.keyFromPublicUrl(url);
    if (key) await this.storage.delete(key).catch(() => undefined);
  }
}
