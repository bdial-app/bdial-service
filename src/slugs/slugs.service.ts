import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLog, Product, Provider } from '../entities';
import { AutomationsService } from '../automations/automations.service';
import {
  businessSlugProblem,
  normalizeSlug,
  SLUG_MAX,
  UUID_RE,
} from './slug-rules';

const TAKEN = 'Another business already has this link';

export interface ResolvedBusiness {
  id: string;
  /** The current slug: when it differs from the one asked for, the page redirects to it. */
  slug: string;
}

export interface ResolvedProduct {
  providerId: string;
  providerSlug: string;
  productId: string;
  productSlug: string;
}

/** What a business page may show to the public: the same rule as the listing screens. */
const isPublic = (p: Pick<Provider, 'status' | 'deletedAt'>) =>
  !p.deletedAt && (p.status === 'active' || p.status === 'unverified');

/** Most URLs one sitemap file may hold is 50,000; this leaves room. */
const SITEMAP_LIMIT = 45_000;

/**
 * Turns the readable addresses on the website (/business/<slug>/<product
 * slug>) into the ids the rest of the API works with, and lets a business's
 * slug be changed without breaking the links already shared.
 */
@Injectable()
export class SlugsService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly automations: AutomationsService,
  ) {}

  private async redirectTarget(
    kind: 'provider' | 'product',
    slug: string,
    scopeId: string | null,
  ): Promise<string | null> {
    const rows: { target_id: string }[] = await this.dataSource.query(
      `SELECT target_id FROM slug_redirects
       WHERE kind = $1 AND old_slug = $2 AND scope_id IS NOT DISTINCT FROM $3
       LIMIT 1`,
      [kind, slug, scopeId],
    );
    return rows[0]?.target_id ?? null;
  }

  /** A business by its slug, an old slug of its, or its id. Hidden businesses are not found. */
  async resolveBusiness(slugOrId: string): Promise<ResolvedBusiness> {
    const key = decodeURIComponent(slugOrId).trim().toLowerCase();
    const select = {
      id: true,
      slug: true,
      status: true,
      deletedAt: true,
    } as const;
    let provider = UUID_RE.test(key)
      ? await this.providers.findOne({ where: { id: key }, select })
      : await this.providers.findOne({ where: { slug: key }, select });
    if (!provider && !UUID_RE.test(key)) {
      const target = await this.redirectTarget('provider', key, null);
      if (target)
        provider = await this.providers.findOne({
          where: { id: target },
          select,
        });
    }
    if (!provider || !isPublic(provider))
      throw new NotFoundException('Business not found');
    return { id: provider.id, slug: provider.slug };
  }

  /** A product or service by its business and its own slug (or ids). Hidden items are not found. */
  async resolveProduct(
    businessSlugOrId: string,
    productSlugOrId: string,
  ): Promise<ResolvedProduct> {
    const business = await this.resolveBusiness(businessSlugOrId);
    const key = decodeURIComponent(productSlugOrId).trim().toLowerCase();
    const select = {
      id: true,
      slug: true,
      providerId: true,
      isActive: true,
    } as const;
    let product = UUID_RE.test(key)
      ? await this.products.findOne({
          where: { id: key, providerId: business.id },
          select,
        })
      : await this.products.findOne({
          where: { slug: key, providerId: business.id },
          select,
        });
    if (!product && !UUID_RE.test(key)) {
      const target = await this.redirectTarget('product', key, business.id);
      if (target)
        product = await this.products.findOne({
          where: { id: target, providerId: business.id },
          select,
        });
    }
    if (!product || !product.isActive)
      throw new NotFoundException('Item not found');
    return {
      providerId: business.id,
      providerSlug: business.slug,
      productId: product.id,
      productSlug: product.slug,
    };
  }

  /** The addresses to list in the website's sitemap: every public business and visible item. */
  async sitemap() {
    const [businesses, items] = await Promise.all([
      this.dataSource.query<{ slug: string; updatedAt: Date }[]>(
        `SELECT p.slug, p.updated_at AS "updatedAt"
         FROM providers p
         WHERE p.deleted_at IS NULL AND p.status IN ('active', 'unverified')
         ORDER BY p.created_at
         LIMIT $1`,
        [SITEMAP_LIMIT],
      ),
      this.dataSource.query<
        { businessSlug: string; slug: string; createdAt: Date }[]
      >(
        `SELECT p.slug AS "businessSlug", pr.slug, pr.created_at AS "createdAt"
         FROM products pr
         JOIN providers p ON p.id = pr.provider_id
         WHERE pr.is_active = true
           AND p.deleted_at IS NULL AND p.status IN ('active', 'unverified')
         ORDER BY p.created_at, pr.display_order, pr.created_at
         LIMIT $1`,
        [SITEMAP_LIMIT],
      ),
    ]);
    return { businesses, items };
  }

  /** Which of these slugs a business other than `providerId` holds now, or held before. */
  private async takenOf(slugs: string[], providerId: string | null) {
    if (!slugs.length) return new Set<string>();
    const rows = await this.dataSource.query<{ slug: string }[]>(
      `SELECT s AS slug FROM unnest($1::text[]) AS s
       WHERE EXISTS (SELECT 1 FROM providers WHERE slug = s AND id IS DISTINCT FROM $2)
          OR EXISTS (SELECT 1 FROM slug_redirects
                     WHERE kind = 'provider' AND scope_id IS NULL AND old_slug = s
                       AND target_id IS DISTINCT FROM $2)`,
      [slugs, providerId],
    );
    return new Set(rows.map((r) => r.slug));
  }

  /**
   * Whether a business could use this slug. Its own current slug, and its own
   * old ones, count as available to it. When it can't, and the business is
   * known, a few free alternatives come back too.
   */
  async check(input: string, providerId?: string) {
    const slug = normalizeSlug(input ?? '');
    const problem = businessSlugProblem(slug);
    const taken =
      !problem && (await this.takenOf([slug], providerId ?? null)).has(slug);
    if (!problem && !taken) {
      return { slug, available: true, reason: null, suggestions: [] };
    }
    return {
      slug,
      available: false,
      reason: problem ?? TAKEN,
      suggestions: providerId ? await this.suggest(providerId, slug) : [],
    };
  }

  /**
   * Up to three free slugs close to the one wanted: it with the area or the
   * city, the brand name in the same ways, then a number.
   */
  private async suggest(providerId: string, wanted: string): Promise<string[]> {
    const p = await this.providers.findOne({
      where: { id: providerId },
      select: { id: true, slug: true, brandName: true, area: true, city: true },
    });
    if (!p) return [];
    const area = normalizeSlug(p.area ?? '');
    const city = normalizeSlug(p.city ?? '');
    const brand = normalizeSlug(p.brandName ?? '');
    const roots = [...new Set([wanted, brand].filter((r) => r.length >= 2))];
    // "camp" onto "pronttera-camp" would say it twice, so a place is only
    // added when none of its words is already in the slug.
    const withPlace = (root: string) => {
      const words = new Set(root.split('-'));
      return [
        area,
        city,
        area && city && area !== city ? `${area}-${city}` : '',
      ]
        .filter(
          (place) => place && place.split('-').every((w) => !words.has(w)),
        )
        .map((place) => `${root}-${place}`);
    };
    const candidates = [
      ...roots.flatMap((r) => [r, ...withPlace(r)]),
      ...[2, 3, 4, 5].map((n) => `${roots[0] ?? 'business'}-${n}`),
    ]
      .map((c) => c.slice(0, SLUG_MAX).replace(/-+$/, ''))
      // Not what was asked for, and not the link it already has.
      .filter(
        (c, i, all) => c !== wanted && c !== p.slug && all.indexOf(c) === i,
      )
      .filter((c) => !businessSlugProblem(c));
    const taken = await this.takenOf(candidates, providerId);
    return candidates.filter((c) => !taken.has(c)).slice(0, 3);
  }

  /** A business's link for the admin app: the current slug and every one it had before. */
  async linkInfo(providerId: string) {
    const provider = await this.providers.findOne({
      where: { id: providerId },
      select: { id: true, slug: true, status: true, deletedAt: true },
    });
    if (!provider) throw new NotFoundException('Business not found');
    const previous = await this.dataSource.query<
      { slug: string; changedAt: Date }[]
    >(
      `SELECT old_slug AS slug, created_at AS "changedAt" FROM slug_redirects
       WHERE kind = 'provider' AND target_id = $1
       ORDER BY created_at DESC`,
      [providerId],
    );
    return {
      slug: provider.slug,
      /** Whether the public page shows: hidden listings answer "not found". */
      isPublic: isPublic(provider),
      previous,
    };
  }

  /**
   * Gives a business a new slug. The old one keeps leading to it (the
   * database records it), so links already shared still work.
   */
  async setBusinessSlug(
    providerId: string,
    input: string,
    /** Set when an admin makes the change, for the audit log. */
    adminId?: string,
  ): Promise<{ slug: string }> {
    const provider = await this.providers.findOne({
      where: { id: providerId },
      select: { id: true, slug: true, deletedAt: true },
    });
    if (!provider || provider.deletedAt)
      throw new NotFoundException('Business not found');
    const result = await this.check(input, providerId);
    if (!result.available) {
      throw result.reason === TAKEN
        ? new ConflictException(result.reason)
        : new BadRequestException(result.reason);
    }
    if (result.slug === provider.slug) return { slug: provider.slug };
    try {
      await this.providers.update(providerId, { slug: result.slug });
    } catch (err) {
      // Taken between the check and the update.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(TAKEN);
      }
      throw err;
    }
    // WhatsApp the owner their new link (when switched on; skipped if they
    // just changed it themselves in the app).
    void this.automations
      .onLinkChanged(providerId, provider.slug, result.slug)
      .catch(() => {});
    if (adminId) {
      await this.auditLogs.save(
        this.auditLogs.create({
          adminId,
          action: 'change_business_slug',
          entityType: 'provider',
          entityId: providerId,
          previousState: { slug: provider.slug },
          newState: { slug: result.slug },
          description: 'Admin changed the business link',
        }),
      );
    }
    return { slug: result.slug };
  }
}
