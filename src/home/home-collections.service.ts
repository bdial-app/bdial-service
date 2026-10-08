import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { In, Repository } from 'typeorm';
import { Category, HomeCollection } from '../entities';
import { CatalogService } from '../products/catalog.service';
import { HomeFeedDto } from './dto/home-feed.dto';
import {
  CreateHomeCollectionDto,
  UpdateHomeCollectionDto,
} from './dto/home-collection.dto';

const TTL_2MIN = 2 * 60 * 1000;
type Browse = Awaited<ReturnType<CatalogService['browse']>>;
const PREVIEW_PHOTOS = 4;

export interface HomeCollectionCard {
  id: string;
  title: string;
  subtitle: string | null;
  theme: string;
  illustration: string;
  imageUrl: string | null;
  listingType: 'all' | 'product' | 'service';
  categoryIds: string[];
  /** Real listing photos for the card's collage. */
  photos: { url: string; name: string }[];
  /** Products and services in it (anywhere; nearest are listed first). */
  itemCount: number;
  productCount: number;
  serviceCount: number;
}

/**
 * Home-screen "needs": each gathers the products and services of a set of
 * categories. The cards show real photos from those listings, so they stay
 * true to what's on Tijarah without anyone designing banners.
 */
@Injectable()
export class HomeCollectionsService {
  private readonly logger = new Logger(HomeCollectionsService.name);

  constructor(
    @InjectRepository(HomeCollection)
    private readonly repo: Repository<HomeCollection>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly catalog: CatalogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Live collections (active, in their dates, not empty), with photos and counts. */
  async list(dto: HomeFeedDto): Promise<HomeCollectionCard[]> {
    const where =
      dto.lat != null && dto.lng != null
        ? `${dto.lat.toFixed(1)},${dto.lng.toFixed(1)}`
        : (dto.city ?? '').trim().toLowerCase() || 'all';
    const key = `home:collections:${await this.cacheVersion()}:${where}`;
    const cached = await this.cache.get<HomeCollectionCard[]>(key);
    if (cached) return cached;

    const now = new Date();
    const rows = await this.repo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .andWhere('(c.startsAt IS NULL OR c.startsAt <= :now)', { now })
      .andWhere('(c.endsAt IS NULL OR c.endsAt >= :now)', { now })
      .andWhere('cardinality(c.category_ids) > 0')
      .orderBy('c.displayOrder', 'ASC')
      .addOrderBy('c.createdAt', 'ASC')
      .limit(12)
      .getMany();

    // A few at a time: each runs one or two catalog queries.
    const cards: { card: HomeCollectionCard; failed: boolean }[] = [];
    for (let i = 0; i < rows.length; i += 3) {
      cards.push(
        ...(await Promise.all(
          rows.slice(i, i + 3).map((c) => this.cardChecked(c, dto)),
        )),
      );
    }
    const result = cards.map((c) => c.card).filter((c) => c.itemCount > 0);

    // A failed lookup would hide a collection as "empty": never keep that for
    // long — fall back to the last complete answer if there is one.
    const lastKey = `home:collections:last:${where}`;
    if (cards.some((c) => c.failed)) {
      const last = await this.cache.get<HomeCollectionCard[]>(lastKey);
      await this.cache.set(key, last ?? result, 15_000);
      return last ?? result;
    }
    await this.cache.set(key, result, TTL_2MIN);
    await this.cache.set(lastKey, result, 30 * 60 * 1000);
    return result;
  }

  // ─── Admin ─────────────────────────────────────────────────────────

  async adminList() {
    const rows = await this.repo.find({
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
    const cards = await Promise.all(rows.map((c) => this.card(c, {})));
    return rows.map((c, i) => ({
      ...c,
      itemCount: cards[i].itemCount,
      photos: cards[i].photos,
    }));
  }

  async create(dto: CreateHomeCollectionDto) {
    const last = await this.repo
      .createQueryBuilder('c')
      .select('MAX(c.displayOrder)', 'max')
      .getRawOne<{ max: number | null }>();
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        subtitle: dto.subtitle ?? null,
        imageUrl: dto.imageUrl ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        displayOrder: (last?.max ?? -1) + 1,
      }),
    );
    await this.bumpCache();
    return saved;
  }

  async update(id: string, dto: UpdateHomeCollectionDto) {
    const c = await this.repo.findOneBy({ id });
    if (!c) throw new NotFoundException('Collection not found');
    Object.assign(c, {
      ...dto,
      ...(dto.startsAt !== undefined && {
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      }),
      ...(dto.endsAt !== undefined && {
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      }),
    });
    const saved = await this.repo.save(c);
    await this.bumpCache();
    return saved;
  }

  async remove(id: string) {
    const res = await this.repo.delete({ id });
    if (!res.affected) throw new NotFoundException('Collection not found');
    await this.bumpCache();
    return { deleted: true };
  }

  async reorder(ids: string[]) {
    await this.repo.manager.transaction(async (m) => {
      for (const [i, id] of ids.entries()) {
        await m.update(HomeCollection, { id }, { displayOrder: i });
      }
    });
    await this.bumpCache();
    return { ok: true };
  }

  private async cacheVersion(): Promise<number> {
    return (await this.cache.get<number>('home:collections:ver')) ?? 0;
  }

  private async bumpCache() {
    // Never expires on its own; old keys age out with their 2-minute TTL.
    await this.cache.set(
      'home:collections:ver',
      (await this.cacheVersion()) + 1,
      0,
    );
  }

  /** One collection, with its categories' names for the filter chips. */
  async get(id: string, dto: HomeFeedDto) {
    const c = await this.repo.findOneBy({ id, isActive: true });
    if (!c) throw new NotFoundException('Collection not found');
    const categories = c.categoryIds.length
      ? await this.categoryRepo.find({
          where: { id: In(c.categoryIds), isActive: true },
          select: ['id', 'name', 'parentId'],
        })
      : [];
    const card = await this.card(c, dto);
    // In the order the admin chose them, each with how much it has — so the
    // page only offers chips that lead somewhere.
    const ordered = c.categoryIds
      .map((cid) => categories.find((x) => x.id === cid))
      .filter((x): x is Category => !!x);
    const types: ('product' | 'service')[] =
      c.listingType === 'all' ? ['product', 'service'] : [c.listingType];
    const counts = await Promise.all(
      ordered.map(async (x) => {
        const totals = await Promise.all(
          types.map((type) =>
            this.catalog
              .browse({
                type,
                categoryIds: [x.id],
                lat: dto.lat,
                lng: dto.lng,
                city: dto.city,
                area: 'all',
                page: 1,
                limit: 1,
              })
              .then((r) => r.total ?? 0)
              .catch(() => 0),
          ),
        );
        return totals.reduce((a, b) => a + b, 0);
      }),
    );
    return {
      ...card,
      categories: ordered
        .map((x, i) => ({ id: x.id, name: x.name, itemCount: counts[i] }))
        .filter((x) => x.itemCount > 0),
    };
  }

  private async card(
    c: HomeCollection,
    dto: HomeFeedDto,
  ): Promise<HomeCollectionCard> {
    return (await this.cardChecked(c, dto)).card;
  }

  private async cardChecked(
    c: HomeCollection,
    dto: HomeFeedDto,
  ): Promise<{ card: HomeCollectionCard; failed: boolean }> {
    let failed = false;
    const types: ('product' | 'service')[] =
      c.listingType === 'all' ? ['product', 'service'] : [c.listingType];
    const results = await Promise.all(
      types.map((type) =>
        this.catalog
          .browse({
            type,
            categoryIds: c.categoryIds,
            lat: dto.lat,
            lng: dto.lng,
            city: dto.city,
            sort: 'popular',
            area: 'all',
            page: 1,
            limit: 12,
          })
          .catch((err: unknown): Browse => {
            failed = true;
            this.logger.warn(
              `Collection "${c.title}" (${type}) lookup failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            return { data: [], total: 0, page: 1, limit: 12, hasMore: false };
          }),
      ),
    );

    // Alternate products and services so a mixed collection shows both.
    const withPhotos = results.map((r) => r.data.filter((i) => i.photoUrl));
    const photos: { url: string; name: string }[] = [];
    for (
      let i = 0;
      photos.length < PREVIEW_PHOTOS && withPhotos.some((l) => l[i]);
      i++
    ) {
      for (const list of withPhotos) {
        const item = list[i];
        if (item?.photoUrl && photos.length < PREVIEW_PHOTOS)
          photos.push({ url: item.photoUrl, name: item.name });
      }
    }

    const card: HomeCollectionCard = {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      theme: c.theme,
      illustration: c.illustration,
      imageUrl: c.imageUrl,
      listingType: c.listingType,
      categoryIds: c.categoryIds,
      photos,
      itemCount: results.reduce((n, r) => n + (r.total ?? 0), 0),
      productCount: types.includes('product')
        ? (results[types.indexOf('product')].total ?? 0)
        : 0,
      serviceCount: types.includes('service')
        ? (results[types.indexOf('service')].total ?? 0)
        : 0,
    };
    return { card, failed };
  }
}
