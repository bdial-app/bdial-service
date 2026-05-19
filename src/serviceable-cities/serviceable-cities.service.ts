import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ServiceableCity, CityRequest } from '../entities';

@Injectable()
export class ServiceableCitiesService {
  constructor(
    @InjectRepository(ServiceableCity) private cityRepo: Repository<ServiceableCity>,
    @InjectRepository(CityRequest) private requestRepo: Repository<CityRequest>,
  ) {}

  /** Get all cities (for frontend city list) */
  async getAllCities() {
    const cities = await this.cityRepo.find({ order: { name: 'ASC' } });
    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      lat: parseFloat(c.lat as any),
      lng: parseFloat(c.lng as any),
    }));
  }

  /** Get only active cities */
  async getActiveCities() {
    return this.cityRepo.find({ where: { status: 'active' }, order: { name: 'ASC' } });
  }

  /**
   * Check if a location is serviceable.
   * 1. Try case-insensitive city name match against active cities.
   * 2. If no match and lat/lng provided, do Haversine proximity check against active city centers.
   */
  async checkServiceability(city?: string, lat?: number, lng?: number): Promise<{ serviceable: boolean; matchedCity: string | null }> {
    const activeCities = await this.getActiveCities();

    if (!activeCities.length) {
      return { serviceable: false, matchedCity: null };
    }

    // 1. Name match (case-insensitive)
    if (city) {
      const nameMatch = activeCities.find(
        (c) => c.name.toLowerCase() === city.toLowerCase(),
      );
      if (nameMatch) {
        return { serviceable: true, matchedCity: nameMatch.name };
      }
    }

    // 2. Proximity fallback — Haversine distance check
    if (lat != null && lng != null) {
      for (const activeCity of activeCities) {
        const cityLat = parseFloat(activeCity.lat as any);
        const cityLng = parseFloat(activeCity.lng as any);
        const distance = this.haversineKm(lat, lng, cityLat, cityLng);
        if (distance <= activeCity.radiusKm) {
          return { serviceable: true, matchedCity: activeCity.name };
        }
      }
    }

    return { serviceable: false, matchedCity: null };
  }

  /**
   * Record a city request. Rate-limited: max 1 per city per user/device per day.
   */
  async createCityRequest(
    city: string,
    userId?: string,
    deviceId?: string,
    extra?: { platform?: string; deviceType?: string; osVersion?: string; appVersion?: string; lat?: number; lng?: number },
  ) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check for duplicate within 24h
    const existingQuery: any = {
      city,
      createdAt: MoreThan(oneDayAgo),
    };

    if (userId) {
      existingQuery.userId = userId;
    } else if (deviceId) {
      existingQuery.deviceId = deviceId;
    } else {
      // No identifier — allow but don't throttle
    }

    if (userId || deviceId) {
      const existing = await this.requestRepo.findOne({ where: existingQuery });
      if (existing) {
        throw new ConflictException('You have already requested this city today');
      }
    }

    const request = this.requestRepo.create({
      city,
      userId: userId || null,
      deviceId: deviceId || null,
      platform: extra?.platform || null,
      deviceType: extra?.deviceType || null,
      osVersion: extra?.osVersion || null,
      appVersion: extra?.appVersion || null,
      lat: extra?.lat ?? null,
      lng: extra?.lng ?? null,
    });
    return this.requestRepo.save(request);
  }

  /** Aggregated city request stats for admin dashboard */
  async getRequestStats() {
    const stats = await this.requestRepo
      .createQueryBuilder('cr')
      .select('cr.city', 'city')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('MAX(cr.created_at)', 'lastRequestAt')
      .groupBy('cr.city')
      .orderBy('count', 'DESC')
      .getRawMany();

    return stats;
  }

  /** Platform & device breakdown for admin insights */
  async getRequestInsights() {
    const [platformStats, deviceTypeStats, recentRequests] = await Promise.all([
      // Breakdown by platform
      this.requestRepo
        .createQueryBuilder('cr')
        .select('COALESCE(cr.platform, \'unknown\')', 'platform')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('cr.platform')
        .orderBy('count', 'DESC')
        .getRawMany(),
      // Breakdown by device type
      this.requestRepo
        .createQueryBuilder('cr')
        .select('COALESCE(cr.device_type, \'unknown\')', 'deviceType')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('cr.device_type')
        .orderBy('count', 'DESC')
        .getRawMany(),
      // Last 50 requests with full detail
      this.requestRepo.find({
        order: { createdAt: 'DESC' },
        take: 50,
        select: ['id', 'city', 'platform', 'deviceType', 'osVersion', 'appVersion', 'lat', 'lng', 'createdAt'],
      }),
    ]);

    return { platformStats, deviceTypeStats, recentRequests };
  }

  /** Haversine formula — returns distance in km between two lat/lng pairs */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
