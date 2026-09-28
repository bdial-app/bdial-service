import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { GeocodeCache, Provider, ServiceableCity } from '../entities';
import type { GeocodePrecision } from '../entities';
import { GeocodeService } from '../geocode/geocode.service';

export interface ProviderLocationResult {
  providerId: string;
  brandName: string;
  /** What we managed to pin it to, or null when even the city was unknown. */
  precision: GeocodePrecision | null;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
  /** True when the provider already had a good pin and was left alone. */
  skipped: boolean;
  note?: string;
}

export interface LocationStats {
  total: number;
  precise: number;
  approximate: number;
  missing: number;
  byPrecision: Record<string, number>;
  /** Providers that could gain a better pin from the text we already hold. */
  improvable: number;
}

interface CachedPlace {
  latitude: number | null;
  longitude: number | null;
  precision: GeocodePrecision | null;
  source: string;
}

/** Pins we treat as real; the backfill never overwrites these. */
const PRECISE: GeocodePrecision[] = ['manual', 'rooftop', 'street'];
const CONCURRENCY = 3;

@Injectable()
export class ProviderLocationService {
  private readonly logger = new Logger(ProviderLocationService.name);
  /** In-flight lookups, so parallel workers on one locality make one call. */
  private readonly inflight = new Map<string, Promise<CachedPlace | null>>();

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(ServiceableCity)
    private readonly cityRepo: Repository<ServiceableCity>,
    @InjectRepository(GeocodeCache)
    private readonly cacheRepo: Repository<GeocodeCache>,
    private readonly geocode: GeocodeService,
  ) {}

  private assertAdmin(admin: { role?: string }) {
    if ((ROLE_HIERARCHY[admin?.role ?? ''] ?? 0) < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /** Where the catalogue stands: how many businesses can actually be found. */
  async stats(admin: { role?: string }): Promise<LocationStats> {
    this.assertAdmin(admin);
    const rows = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.geocode_precision', 'precision')
      .addSelect('count(*)::int', 'count')
      .addSelect(
        "count(*) FILTER (WHERE p.address <> '' OR p.area <> '' OR p.pincode <> '')::int",
        'withText',
      )
      .where('p.deleted_at IS NULL')
      .groupBy('p.geocode_precision')
      .getRawMany<{
        precision: GeocodePrecision | null;
        count: number;
        withText: number;
      }>();

    const byPrecision: Record<string, number> = {};
    let total = 0;
    let precise = 0;
    let approximate = 0;
    let missing = 0;
    let improvable = 0;

    for (const row of rows) {
      const key = row.precision ?? 'none';
      byPrecision[key] = row.count;
      total += row.count;
      if (row.precision && PRECISE.includes(row.precision))
        precise += row.count;
      else if (row.precision) {
        approximate += row.count;
        improvable += row.withText;
      } else {
        missing += row.count;
        improvable += row.withText;
      }
    }
    return { total, precise, approximate, missing, byPrecision, improvable };
  }

  /** Providers worth running the backfill over, newest first. */
  async candidates(admin: { role?: string }, limit = 200): Promise<string[]> {
    this.assertAdmin(admin);
    const rows = await this.providerRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.deleted_at IS NULL')
      .andWhere(
        '(p.latitude IS NULL OR p.longitude IS NULL OR p.geocode_precision IS NULL OR p.geocode_precision IN (:...weak))',
        { weak: ['city', 'pincode'] },
      )
      .orderBy('p.created_at', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  /**
   * Give every provider the best pin we can justify, cheapest first:
   *
   *   1. already precise            → leave alone, costs nothing
   *   2. full address / area / pincode → one geocode per distinct place string,
   *      cached, so a locality shared by 80 shops is looked up once
   *   3. city only                  → the city centre we already store, free,
   *      marked 'city' so the app never quotes a distance for it
   */
  async backfill(
    admin: { role?: string },
    ids: string[],
    opts: { allowGoogle?: boolean; force?: boolean } = {},
  ): Promise<ProviderLocationResult[]> {
    this.assertAdmin(admin);
    const allowGoogle = opts.allowGoogle !== false;

    const providers = await this.providerRepo.find({
      where: { id: In(ids), deletedAt: IsNull() },
    });
    const byId = new Map(providers.map((p) => [p.id, p]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((p): p is Provider => !!p);

    const cities = await this.cityRepo.find();
    const cityIndex = new Map(
      cities.map((c) => [c.name.trim().toLowerCase(), c]),
    );

    const out = new Array<ProviderLocationResult>(ordered.length);
    let next = 0;
    await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENCY, ordered.length) },
        async () => {
          while (next < ordered.length) {
            const i = next++;
            out[i] = await this.pinOne(
              ordered[i],
              cityIndex,
              allowGoogle,
              opts.force === true,
            );
          }
        },
      ),
    );
    return out;
  }

  private async pinOne(
    provider: Provider,
    cityIndex: Map<string, ServiceableCity>,
    allowGoogle: boolean,
    force: boolean,
  ): Promise<ProviderLocationResult> {
    const base: ProviderLocationResult = {
      providerId: provider.id,
      brandName: provider.brandName,
      precision: provider.geocodePrecision,
      source: provider.geocodeSource,
      latitude: provider.latitude,
      longitude: provider.longitude,
      skipped: false,
    };

    const hasPin = provider.latitude != null && provider.longitude != null;
    if (
      !force &&
      hasPin &&
      provider.geocodePrecision &&
      PRECISE.includes(provider.geocodePrecision)
    ) {
      return { ...base, skipped: true, note: 'Already has a precise pin' };
    }

    // 2. Anything we can hand to a geocoder, best first. A bare city name is
    // never sent: we already hold city centres, and paying for one would buy
    // exactly the same answer.
    const city = (provider.city ?? '').trim();
    const address = (provider.address ?? '').trim();
    const area = (provider.area ?? '').trim();
    const pincode = (provider.pincode ?? '').trim();
    const queries: string[] = [];
    const push = (parts: string[]) => {
      const q = parts
        .map((part) => part.trim())
        .filter(Boolean)
        .join(', ');
      if (q && !queries.includes(q)) queries.push(q);
    };
    if (address) push([address, area, city, pincode, 'India']);
    if (area) push([area, city, pincode, 'India']);
    if (pincode) push([pincode, city, 'India']);

    if (allowGoogle) {
      for (const query of queries) {
        const hit = await this.lookup(query);
        if (hit?.latitude != null && hit.longitude != null) {
          return this.save(
            provider,
            hit.latitude,
            hit.longitude,
            hit.precision ?? 'locality',
            hit.source,
            base,
          );
        }
      }
    }

    // 3. City centre — free, already in our own table.
    const match = cityIndex.get(city.toLowerCase());
    if (match?.lat != null && match?.lng != null) {
      return this.save(
        provider,
        Number(match.lat),
        Number(match.lng),
        'city',
        'city-centre',
        base,
        'Approximate: city centre',
      );
    }

    return {
      ...base,
      note: city
        ? `No coordinates and "${city}" is not a serviceable city`
        : 'No address, area, pincode or city on this business',
    };
  }

  /** Cached place lookup — the reason a big import costs a handful of calls. */
  private async lookup(query: string): Promise<CachedPlace | null> {
    const key = query.toLowerCase().replace(/\s+/g, ' ').slice(0, 300);
    const running = this.inflight.get(key);
    if (running) return running;
    const task = this.lookupUncached(key).finally(() =>
      this.inflight.delete(key),
    );
    this.inflight.set(key, task);
    return task;
  }

  private async lookupUncached(key: string): Promise<CachedPlace | null> {
    const cached = await this.cacheRepo.findOneBy({ query: key });
    if (cached) {
      await this.cacheRepo.increment({ id: cached.id }, 'hits', 1);
      return cached.latitude == null
        ? null // a remembered miss: don't pay to ask again
        : {
            latitude: cached.latitude,
            longitude: cached.longitude,
            precision: cached.precision,
            source: `${cached.source}-cached`,
          };
    }

    let result: Awaited<ReturnType<GeocodeService['forwardGeocode']>> = null;
    try {
      result = await this.geocode.forwardGeocode(key);
    } catch (err) {
      this.logger.warn(`Geocoding "${key}" failed: ${(err as Error).message}`);
      return null; // don't cache an outage as a miss
    }

    await this.cacheRepo.save(
      this.cacheRepo.create({
        query: key,
        latitude: result?.lat ?? null,
        longitude: result?.lng ?? null,
        precision: (result?.precision as GeocodePrecision) ?? null,
        source: 'google',
        hits: 0,
      }),
    );
    if (!result) return null;
    return {
      latitude: result.lat,
      longitude: result.lng,
      precision: result.precision,
      source: 'google',
    };
  }

  private async save(
    provider: Provider,
    latitude: number,
    longitude: number,
    precision: GeocodePrecision,
    source: string,
    base: ProviderLocationResult,
    note?: string,
  ): Promise<ProviderLocationResult> {
    await this.providerRepo.update(provider.id, {
      latitude,
      longitude,
      geocodePrecision: precision,
      geocodeSource: source,
      geocodedAt: new Date(),
    });
    this.logger.log(`Pinned ${provider.id} (${precision} via ${source})`);
    return {
      ...base,
      latitude,
      longitude,
      precision,
      source,
      skipped: false,
      note,
    };
  }
}
