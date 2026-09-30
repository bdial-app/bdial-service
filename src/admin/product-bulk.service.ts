import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Provider } from '../entities/provider.entity';
import { Category } from '../entities/category.entity';

const ROLE_HIERARCHY: Record<string, number> = { user: 0, provider: 1, moderator: 2, admin: 3, super_admin: 4 };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROWS = 500;

export type ProviderMatch = 'matched' | 'ambiguous' | 'missing' | 'none';

export interface ProductRowInput {
  rowId: string;
  /** Whatever the sheet said: an id, a business name, or a phone number. */
  providerRef?: string | null;
  /** Chosen in the UI — always wins over providerRef. */
  providerId?: string | null;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  productType?: string | null;
  categoryId?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface ProductRowVerdict {
  rowId: string;
  /** How the provider was found, so the sheet can be fixed before importing. */
  providerMatch: ProviderMatch;
  providerId: string | null;
  providerName: string | null;
  /** Other businesses that answer to the same name — why it is ambiguous. */
  candidates?: { id: string; brandName: string; city: string | null }[];
  /** This provider already sells something by this name. */
  duplicate: boolean;
  /** Blocking problems. An empty list means the row will import. */
  errors: string[];
  warnings: string[];
}

const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Bulk create products and services for existing businesses.
 *
 * The hard part is not the products, it is saying *which business* each row
 * belongs to: a sheet from a supplier names the shop, not its id. A row is
 * matched on its id, then its exact brand name, then its phone number, and a
 * name shared by two businesses is reported rather than guessed at.
 */
@Injectable()
export class ProductBulkService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Provider) private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
  ) {}

  private assertAdmin(admin: { role?: string }) {
    if ((ROLE_HIERARCHY[admin?.role ?? ''] ?? 0) < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /** Writes nothing. Reports what each row would do. */
  async validate(admin: any, rows: ProductRowInput[]): Promise<{ results: ProductRowVerdict[] }> {
    this.assertAdmin(admin);
    if (rows.length === 0) return { results: [] };
    if (rows.length > MAX_ROWS) throw new BadRequestException(`At most ${MAX_ROWS} rows per batch`);

    const resolved = await this.resolveProviders(rows);
    const categoryIds = Array.from(
      new Set(rows.map((r) => r.categoryId).filter((c): c is string => !!c && UUID_RE.test(c))),
    );
    const knownCategories = categoryIds.length
      ? new Set((await this.categoryRepo.find({ where: { id: In(categoryIds) }, select: ['id'] })).map((c) => c.id))
      : new Set<string>();

    // One query for every product name already on the touched providers, so a
    // 500-row sheet costs one lookup rather than 500.
    const providerIds = Array.from(
      new Set(Array.from(resolved.values()).map((m) => m.providerId).filter((id): id is string => !!id)),
    );
    const existing = providerIds.length
      ? await this.productRepo.find({ where: { providerId: In(providerIds) }, select: ['providerId', 'name'] })
      : [];
    const existingKeys = new Set(existing.map((p) => `${p.providerId}::${p.name.trim().toLowerCase()}`));

    // A sheet that lists the same product twice would create it twice.
    const seenInSheet = new Set<string>();

    return {
      results: rows.map((row) => {
        const match = resolved.get(row.rowId)!;
        const errors: string[] = [];
        const warnings: string[] = [];

        const name = (row.name ?? '').trim();
        if (!name) errors.push('Name is required');
        else if (name.length > 150) errors.push('Name must be 150 characters or fewer');

        if (match.providerMatch === 'missing') errors.push(`No business matches "${row.providerRef ?? ''}"`);
        if (match.providerMatch === 'ambiguous') errors.push(`"${row.providerRef}" matches more than one business — pick one`);
        if (match.providerMatch === 'none') errors.push('No business given for this row');

        const price = this.parsePrice(row.price);
        if (price.problem === 'invalid') errors.push('Price must be a number, or blank');
        else if (price.problem === 'unreadable') warnings.push(`Couldn't read a price from "${String(row.price).trim()}" — importing with no price`);
        else if (price.value !== null && price.value > 10_000_000) warnings.push('That price looks unusually high');

        const type = (row.productType ?? '').trim().toLowerCase();
        if (type && type !== 'product' && type !== 'service') {
          warnings.push(`"${row.productType}" is not product or service — importing as product`);
        }

        if (row.categoryId && !knownCategories.has(row.categoryId)) warnings.push('Category not found — leaving it unset');
        if (row.photoUrl && !/^https?:\/\//i.test(row.photoUrl)) warnings.push('Photo link is not a web address — leaving it out');

        let duplicate = false;
        if (match.providerId && name) {
          const key = `${match.providerId}::${name.toLowerCase()}`;
          if (existingKeys.has(key)) {
            duplicate = true;
            warnings.push('This business already has something by this name');
          }
          if (seenInSheet.has(key)) {
            duplicate = true;
            warnings.push('The same item appears earlier in this sheet');
          }
          seenInSheet.add(key);
        }

        return {
          rowId: row.rowId,
          providerMatch: match.providerMatch,
          providerId: match.providerId,
          providerName: match.providerName,
          candidates: match.candidates,
          duplicate,
          errors,
          warnings,
        };
      }),
    };
  }

  /** Creates the products. Rows are independent: one failure never stops the rest. */
  async import(
    admin: any,
    rows: ProductRowInput[],
  ): Promise<{ results: { rowId: string; ok: boolean; productId?: string; name?: string; error?: string }[] }> {
    this.assertAdmin(admin);
    if (rows.length === 0) return { results: [] };
    if (rows.length > MAX_ROWS) throw new BadRequestException(`At most ${MAX_ROWS} rows per batch`);

    const resolved = await this.resolveProviders(rows);
    const results: { rowId: string; ok: boolean; productId?: string; name?: string; error?: string }[] = [];

    for (const row of rows) {
      const name = (row.name ?? '').trim();
      const match = resolved.get(row.rowId)!;
      try {
        if (!name) throw new BadRequestException('Name is required');
        if (!match.providerId) throw new BadRequestException('No business matched this row');

        const price = this.parsePrice(row.price);
        if (price.problem === 'invalid') throw new BadRequestException('Price must be a number, or blank');

        const saved = await this.productRepo.save(
          this.productRepo.create({
            providerId: match.providerId,
            name,
            description: row.description ? String(row.description).trim() : null,
            price: price.value,
            currency: (row.currency || 'INR').toUpperCase().slice(0, 3),
            productType: (row.productType ?? '').trim().toLowerCase() === 'service' ? 'service' : 'product',
            categoryId: row.categoryId && UUID_RE.test(row.categoryId) ? row.categoryId : null,
            photoUrl: row.photoUrl && /^https?:\/\//i.test(row.photoUrl) ? row.photoUrl : null,
            photoUrls: row.photoUrl && /^https?:\/\//i.test(row.photoUrl) ? [row.photoUrl] : [],
            isActive: row.isActive === undefined ? true : !!row.isActive,
            displayOrder: Number.isFinite(row.displayOrder) ? Number(row.displayOrder) : 0,
          }),
        );
        results.push({ rowId: row.rowId, ok: true, productId: saved.id, name: saved.name });
      } catch (err: any) {
        const message = err?.response?.message ?? err?.message ?? 'Failed';
        results.push({
          rowId: row.rowId,
          ok: false,
          name: name || undefined,
          error: Array.isArray(message) ? message.join('; ') : String(message),
        });
      }
    }

    return { results };
  }

  /**
   * Sheets arrive with "₹1,200" or "1200/-" as often as 1200, and with "free"
   * or "N/A" where a price is unknown. Text we cannot read is reported rather
   * than quietly dropped, but it does not block the row: the item still goes
   * in, priced on request.
   */
  private parsePrice(raw: ProductRowInput['price']): { value: number | null; problem?: 'invalid' | 'unreadable' } {
    if (raw === undefined || raw === null || raw === '') return { value: null };
    if (typeof raw === 'string' && raw.trim() === '') return { value: null };

    const cleaned = typeof raw === 'string' ? raw.replace(/[^\d.-]/g, '') : raw;
    if (cleaned === '' || cleaned === null) {
      // Something was written, but not a number — say so.
      return { value: null, problem: 'unreadable' };
    }
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return { value: null, problem: 'invalid' };
    return { value: Math.round(n * 100) / 100 };
  }

  /**
   * id → exact brand name → phone number, in that order, in as few queries as
   * the batch allows.
   */
  private async resolveProviders(rows: ProductRowInput[]): Promise<
    Map<string, { providerMatch: ProviderMatch; providerId: string | null; providerName: string | null; candidates?: { id: string; brandName: string; city: string | null }[] }>
  > {
    const out = new Map<string, { providerMatch: ProviderMatch; providerId: string | null; providerName: string | null; candidates?: { id: string; brandName: string; city: string | null }[] }>();

    const chosenIds = rows.map((r) => r.providerId).filter((id): id is string => !!id && UUID_RE.test(id));
    const refs = rows
      .filter((r) => !r.providerId)
      .map((r) => (r.providerRef ?? '').trim())
      .filter(Boolean);

    const refIds = refs.filter((r) => UUID_RE.test(r));
    const refNames = refs.filter((r) => !UUID_RE.test(r) && digits(r).length < 7);
    const refPhones = refs.filter((r) => !UUID_RE.test(r) && digits(r).length >= 7).map(digits);

    const [byId, byName, byPhone] = await Promise.all([
      chosenIds.length || refIds.length
        ? this.providerRepo.find({
            where: { id: In(Array.from(new Set([...chosenIds, ...refIds]))) },
            select: ['id', 'brandName', 'city'],
          })
        : Promise.resolve([]),
      refNames.length
        ? this.providerRepo
            .createQueryBuilder('p')
            .select(['p.id AS id', 'p.brand_name AS "brandName"', 'p.city AS city'])
            .where('LOWER(TRIM(p.brand_name)) IN (:...names)', { names: Array.from(new Set(refNames.map((n) => n.toLowerCase()))) })
            .getRawMany<{ id: string; brandName: string; city: string | null }>()
        : Promise.resolve([]),
      refPhones.length
        ? this.providerRepo
            .createQueryBuilder('p')
            .select(['p.id AS id', 'p.brand_name AS "brandName"', 'p.city AS city', 'p.contact_number AS "contactNumber"'])
            .where("regexp_replace(COALESCE(p.contact_number, ''), '\\D', '', 'g') IN (:...phones)", {
              phones: Array.from(new Set(refPhones)),
            })
            .getRawMany<{ id: string; brandName: string; city: string | null; contactNumber: string | null }>()
        : Promise.resolve([]),
    ]);

    const idMap = new Map(byId.map((p) => [p.id, p]));
    const nameMap = new Map<string, { id: string; brandName: string; city: string | null }[]>();
    for (const p of byName) {
      const key = p.brandName.trim().toLowerCase();
      nameMap.set(key, [...(nameMap.get(key) ?? []), p]);
    }
    const phoneMap = new Map<string, { id: string; brandName: string; city: string | null }[]>();
    for (const p of byPhone) {
      const key = digits(p.contactNumber ?? '');
      phoneMap.set(key, [...(phoneMap.get(key) ?? []), { id: p.id, brandName: p.brandName, city: p.city }]);
    }

    for (const row of rows) {
      if (row.providerId && UUID_RE.test(row.providerId)) {
        const hit = idMap.get(row.providerId);
        out.set(row.rowId, hit
          ? { providerMatch: 'matched', providerId: hit.id, providerName: hit.brandName }
          : { providerMatch: 'missing', providerId: null, providerName: null });
        continue;
      }

      const ref = (row.providerRef ?? '').trim();
      if (!ref) {
        out.set(row.rowId, { providerMatch: 'none', providerId: null, providerName: null });
        continue;
      }

      if (UUID_RE.test(ref)) {
        const hit = idMap.get(ref);
        out.set(row.rowId, hit
          ? { providerMatch: 'matched', providerId: hit.id, providerName: hit.brandName }
          : { providerMatch: 'missing', providerId: null, providerName: null });
        continue;
      }

      const hits = digits(ref).length >= 7 ? phoneMap.get(digits(ref)) : nameMap.get(ref.toLowerCase());
      if (!hits || hits.length === 0) {
        out.set(row.rowId, { providerMatch: 'missing', providerId: null, providerName: null });
      } else if (hits.length > 1) {
        out.set(row.rowId, { providerMatch: 'ambiguous', providerId: null, providerName: null, candidates: hits });
      } else {
        out.set(row.rowId, { providerMatch: 'matched', providerId: hits[0].id, providerName: hits[0].brandName });
      }
    }

    return out;
  }
}
