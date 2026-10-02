import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ROLE_HIERARCHY } from '../common/enums/admin-role.enum';
import { GeocodeCache, Provider, ServiceableCity } from '../entities';
import type { GeocodePrecision } from '../entities';
import { GeocodeService } from '../geocode/geocode.service';
import {
  namesLookAlike,
  normalizeIndianPhone,
} from './provider-enrichment.service';

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

/**
 * How findable the catalogue is. Tiers, from best to worst:
 *   precise       owner-set, rooftop or street — a real pin, distance and directions work
 *   neighbourhood locality-level — within a kilometre or two, distance still shown
 *   approximate   city centre (or pincode) — the app shows "In Pune", no distance
 *   missing       no coordinates at all — never appears in nearby results
 */
export interface LocationStats {
  total: number;
  precise: number;
  neighbourhood: number;
  approximate: number;
  missing: number;
  byPrecision: Record<string, number>;
  /** Weak pins with an address/area/pincode that no geocoder has been asked about yet. */
  improvable: number;
  /** Weak pins that Google Places could still find by business name or phone. */
  nameSearchable: number;
}

export type CandidateKind = 'text' | 'name';

interface CachedPlace {
  latitude: number | null;
  longitude: number | null;
  precision: GeocodePrecision | null;
  source: string;
}

/** Pins we treat as real; the backfill never overwrites these. */
const PRECISE: GeocodePrecision[] = ['manual', 'rooftop', 'street'];
const NEIGHBOURHOOD: GeocodePrecision[] = ['locality'];
const WEAK: GeocodePrecision[] = ['city', 'pincode'];
const CONCURRENCY = 3;
const GOOGLE_TIMEOUT_MS = 10_000;
/** A Places hit further than this from the city centre is some other town's business. */
const MAX_KM_FROM_CITY = 40;

@Injectable()
export class ProviderLocationService {
  private readonly logger = new Logger(ProviderLocationService.name);
  /** In-flight lookups, so parallel workers on one locality make one call. */
  private readonly inflight = new Map<string, Promise<CachedPlace | null>>();
  private readonly apiKey: string | undefined;

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(ServiceableCity)
    private readonly cityRepo: Repository<ServiceableCity>,
    @InjectRepository(GeocodeCache)
    private readonly cacheRepo: Repository<GeocodeCache>,
    private readonly geocode: GeocodeService,
    config: ConfigService,
  ) {
    this.apiKey = config.get<string>('GOOGLE_MAPS_API_KEY');
  }

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
        `count(*) FILTER (WHERE (coalesce(p.address,'') <> '' OR coalesce(p.area,'') <> '' OR coalesce(p.pincode,'') <> '')
                             AND coalesce(p.geocode_source,'') NOT LIKE 'google%')::int`,
        'untriedText',
      )
      .addSelect(
        `count(*) FILTER (WHERE coalesce(p.geocode_source,'') NOT LIKE 'places%')::int`,
        'untriedName',
      )
      .where('p.deleted_at IS NULL')
      .groupBy('p.geocode_precision')
      .getRawMany<{
        precision: GeocodePrecision | null;
        count: number;
        untriedText: number;
        untriedName: number;
      }>();

    const stats: LocationStats = {
      total: 0,
      precise: 0,
      neighbourhood: 0,
      approximate: 0,
      missing: 0,
      byPrecision: {},
      improvable: 0,
      nameSearchable: 0,
    };
    for (const row of rows) {
      stats.byPrecision[row.precision ?? 'none'] = row.count;
      stats.total += row.count;
      if (row.precision && PRECISE.includes(row.precision))
        stats.precise += row.count;
      else if (row.precision && NEIGHBOURHOOD.includes(row.precision))
        stats.neighbourhood += row.count;
      else {
        if (row.precision) stats.approximate += row.count;
        else stats.missing += row.count;
        stats.improvable += row.untriedText;
        stats.nameSearchable += row.untriedName;
      }
    }
    return stats;
  }

  /**
   * Providers worth running a sweep over, newest first.
   *   text: weak or missing pin, has address text, geocoder not yet asked
   *   name: weak or missing pin, Places not yet asked
   */
  async candidates(
    admin: { role?: string },
    limit = 200,
    kind: CandidateKind = 'text',
  ): Promise<string[]> {
    this.assertAdmin(admin);
    const qb = this.providerRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.deleted_at IS NULL')
      .andWhere(
        '(p.latitude IS NULL OR p.longitude IS NULL OR p.geocode_precision IS NULL OR p.geocode_precision IN (:...weak))',
        { weak: WEAK },
      );
    if (kind === 'name') {
      qb.andWhere(`coalesce(p.geocode_source,'') NOT LIKE 'places%'`);
    } else {
      qb.andWhere(
        `(coalesce(p.address,'') <> '' OR coalesce(p.area,'') <> '' OR coalesce(p.pincode,'') <> '')`,
      ).andWhere(`coalesce(p.geocode_source,'') NOT LIKE 'google%'`);
    }
    const rows = await qb
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
    const { ordered, cityIndex } = await this.load(ids);
    return this.eachInParallel(ordered, (p) =>
      this.pinOne(p, cityIndex, allowGoogle, opts.force === true),
    );
  }

  /**
   * For businesses with no address at all: ask Google Places for the business
   * itself, by phone number first (unambiguous) and then by name within the
   * city. A name hit must look like the business and sit inside the city, or
   * it is ignored — a wrong pin is worse than "In Pune".
   */
  async pinByName(
    admin: { role?: string },
    ids: string[],
    opts: { force?: boolean } = {},
  ): Promise<ProviderLocationResult[]> {
    this.assertAdmin(admin);
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      throw new BadRequestException(
        'Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY in .env',
      );
    }
    const { ordered, cityIndex } = await this.load(ids, true);
    return this.eachInParallel(ordered, (p) =>
      this.pinOneByName(p, cityIndex, opts.force === true),
    );
  }

  private async load(ids: string[], withUser = false) {
    const providers = await this.providerRepo.find({
      where: { id: In(ids), deletedAt: IsNull() },
      relations: withUser ? ['user'] : [],
    });
    const byId = new Map(providers.map((p) => [p.id, p]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((p): p is Provider => !!p);
    const cities = await this.cityRepo.find();
    const cityIndex = new Map(
      cities.map((c) => [c.name.trim().toLowerCase(), c]),
    );
    return { ordered, cityIndex };
  }

  private async eachInParallel(
    ordered: Provider[],
    fn: (p: Provider) => Promise<ProviderLocationResult>,
  ): Promise<ProviderLocationResult[]> {
    const out = new Array<ProviderLocationResult>(ordered.length);
    let next = 0;
    await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENCY, ordered.length) },
        async () => {
          while (next < ordered.length) {
            const i = next++;
            out[i] = await fn(ordered[i]);
          }
        },
      ),
    );
    return out;
  }

  private baseOf(provider: Provider): ProviderLocationResult {
    return {
      providerId: provider.id,
      brandName: provider.brandName,
      precision: provider.geocodePrecision,
      source: provider.geocodeSource,
      latitude: provider.latitude,
      longitude: provider.longitude,
      skipped: false,
    };
  }

  private hasRealPin(provider: Provider): boolean {
    return (
      provider.latitude != null &&
      provider.longitude != null &&
      !!provider.geocodePrecision &&
      PRECISE.includes(provider.geocodePrecision)
    );
  }

  private async pinOne(
    provider: Provider,
    cityIndex: Map<string, ServiceableCity>,
    allowGoogle: boolean,
    force: boolean,
  ): Promise<ProviderLocationResult> {
    const base = this.baseOf(provider);
    if (!force && this.hasRealPin(provider)) {
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

    // 3. City centre — free, already in our own table. Never downgrade a
    // neighbourhood pin to it.
    if (
      provider.geocodePrecision &&
      NEIGHBOURHOOD.includes(provider.geocodePrecision) &&
      !force
    ) {
      return {
        ...base,
        skipped: true,
        note: 'Already pinned to its neighbourhood',
      };
    }
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

  private async pinOneByName(
    provider: Provider,
    cityIndex: Map<string, ServiceableCity>,
    force: boolean,
  ): Promise<ProviderLocationResult> {
    const base = this.baseOf(provider);
    if (!force && this.hasRealPin(provider)) {
      return { ...base, skipped: true, note: 'Already has a precise pin' };
    }
    const city = (provider.city ?? '').trim();
    const centre = cityIndex.get(city.toLowerCase());
    const bias =
      centre?.lat != null && centre?.lng != null
        ? { lat: Number(centre.lat), lng: Number(centre.lng) }
        : null;

    const phone =
      provider.contactNumber ||
      provider.whatsappNumber ||
      provider.user?.mobileNumber;
    const attempts: {
      input: string;
      inputtype: 'phonenumber' | 'textquery';
      by: 'phone' | 'name';
    }[] = [];
    if (phone)
      attempts.push({
        input: normalizeIndianPhone(phone),
        inputtype: 'phonenumber',
        by: 'phone',
      });
    const nameQuery = [provider.brandName, provider.area, city]
      .map((s) => (s ?? '').trim())
      .filter(Boolean)
      .join(', ');
    if (provider.brandName?.trim())
      attempts.push({ input: nameQuery, inputtype: 'textquery', by: 'name' });
    if (attempts.length === 0)
      return { ...base, note: 'No name or phone to search for' };

    const notes: string[] = [];
    for (const attempt of attempts) {
      let place: {
        name: string;
        lat: number;
        lng: number;
        address: string;
      } | null;
      try {
        place = await this.findPlace(attempt.input, attempt.inputtype, bias);
      } catch (err) {
        this.logger.warn(
          `Places lookup for ${provider.id} failed: ${(err as Error).message}`,
        );
        return {
          ...base,
          note: `Google Places error: ${(err as Error).message}`,
        };
      }
      if (!place) continue;

      if (
        attempt.by === 'name' &&
        !namesLookAlike(provider.brandName, place.name)
      ) {
        notes.push(
          `Closest Google result “${place.name}” doesn't look like this business`,
        );
        continue;
      }
      if (bias && haversineKm(bias, place) > MAX_KM_FROM_CITY) {
        notes.push(
          `“${place.name}” is ${Math.round(haversineKm(bias, place))} km from ${city} — not the same business`,
        );
        continue;
      }

      // Keep the address Google printed when we had none; the next text sweep
      // then has something to work with too.
      if (!(provider.address ?? '').trim() && place.address) {
        await this.providerRepo.update(provider.id, {
          address: place.address.slice(0, 500),
        });
      }
      return this.save(
        provider,
        place.lat,
        place.lng,
        'rooftop',
        `places-${attempt.by}`,
        base,
        attempt.by === 'phone'
          ? `Matched by phone: ${place.name}`
          : `Matched by name: ${place.name}`,
      );
    }
    // Remember the miss so the sweep does not pay for it again.
    await this.providerRepo.update(provider.id, {
      geocodeSource: 'places-miss',
    });
    return {
      ...base,
      source: 'places-miss',
      note: notes[0] ?? 'Google has no listing for this business',
    };
  }

  /** Find Place from Text, geometry included; one call per business. */
  private async findPlace(
    input: string,
    inputtype: 'phonenumber' | 'textquery',
    bias: { lat: number; lng: number } | null,
  ): Promise<{
    name: string;
    lat: number;
    lng: number;
    address: string;
  } | null> {
    const url = new URL(
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
    );
    url.searchParams.set('input', input);
    url.searchParams.set('inputtype', inputtype);
    url.searchParams.set('fields', 'place_id,name,geometry,formatted_address');
    if (bias)
      url.searchParams.set(
        'locationbias',
        `circle:${MAX_KM_FROM_CITY * 1000}@${bias.lat},${bias.lng}`,
      );
    url.searchParams.set('key', this.apiKey!);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = (await res.json()) as {
        status?: string;
        error_message?: string;
        candidates?: {
          name?: string;
          formatted_address?: string;
          geometry?: { location?: { lat: number; lng: number } };
        }[];
      };
      // Never surface the request URL — it carries the API key.
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(
          data.error_message || data.status || `HTTP ${res.status}`,
        );
      }
      const c = data.candidates?.[0];
      if (!c?.name || c.geometry?.location?.lat == null) return null;
      return {
        name: c.name,
        lat: c.geometry.location.lat,
        lng: c.geometry.location.lng,
        address: c.formatted_address ?? '',
      };
    } catch (err) {
      if (controller.signal.aborted) throw new Error('Google timed out');
      throw err;
    } finally {
      clearTimeout(timer);
    }
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

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}
