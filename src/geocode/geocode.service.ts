import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GeocodeService {
  private readonly apiKey: string | undefined;

  // Cache TTLs
  private static readonly REVERSE_GEOCODE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly PLACE_DETAILS_TTL = 12 * 60 * 60 * 1000; // 12 hours

  // Average speed assumptions for travel time estimation (km/h)
  private static readonly AVG_CITY_SPEED_KMH = 25;

  constructor(
    private config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
  }

  private ensureApiKey() {
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      throw new BadRequestException('Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY in .env');
    }
  }

  /** Reverse geocode lat/lng → readable address label + city (CACHED — 24h TTL) */
  async reverseGeocode(lat: number, lng: number) {
    this.ensureApiKey();

    // Round to 3 decimal places (~111m accuracy) for cache key stability
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    const cacheKey = `geocode:reverse:${roundedLat},${roundedLng}`;

    // Check cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return { label: null, city: null, fullAddress: null };
    }

    const result = data.results[0];
    const components = result.address_components as Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;

    const city =
      components.find((c) => c.types.includes('locality'))?.long_name ??
      components.find((c) => c.types.includes('administrative_area_level_2'))?.long_name ??
      null;

    const sublocality =
      components.find((c) => c.types.includes('sublocality_level_1'))?.long_name ??
      components.find((c) => c.types.includes('sublocality_level_2'))?.long_name ??
      components.find((c) => c.types.includes('sublocality'))?.long_name ??
      components.find((c) => c.types.includes('neighborhood'))?.long_name ??
      components.find((c) => c.types.includes('premise'))?.long_name ??
      components.find((c) => c.types.includes('route'))?.long_name ??
      null;

    const pincode =
      components.find((c) => c.types.includes('postal_code'))?.long_name ?? null;

    const label = sublocality ? `${sublocality}, ${city}` : city;

    const response = {
      label,
      city,
      area: sublocality,
      pincode,
      fullAddress: result.formatted_address,
      placeId: result.place_id,
    };

    // Cache the successful result for 24 hours
    await this.cacheManager.set(cacheKey, response, GeocodeService.REVERSE_GEOCODE_TTL);

    return response;
  }

  /** Forward search: text query → location suggestions (Google Places Autocomplete with session tokens) */
  async searchLocations(query: string, sessionToken?: string) {
    this.ensureApiKey();

    // Minimum 3 characters to reduce wasted API calls
    if (query.length < 3) {
      return [];
    }

    // Use session token to bundle autocomplete + place details into one billing session
    const token = sessionToken || uuidv4();
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&sessiontoken=${token}&key=${this.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.predictions?.length) {
      return [];
    }

    // Get details for each prediction to include lat/lng (uses same session token — no extra charge)
    const results = await Promise.all(
      data.predictions.slice(0, 5).map(async (pred: any) => {
        const details = await this.getPlaceDetails(pred.place_id, token);
        return {
          placeId: pred.place_id,
          description: pred.description,
          mainText: pred.structured_formatting?.main_text,
          secondaryText: pred.structured_formatting?.secondary_text,
          lat: details?.lat ?? null,
          lng: details?.lng ?? null,
        };
      }),
    );

    return results;
  }

  /** Get lat/lng for a place ID (CACHED — 12h TTL, uses session token for billing) */
  private async getPlaceDetails(placeId: string, sessionToken?: string) {
    const cacheKey = `geocode:place:${placeId}`;

    // Check cache first
    const cached = await this.cacheManager.get<{ lat: number; lng: number }>(cacheKey);
    if (cached) return cached;

    // Only request geometry field (cheapest tier: Basic - $0 when used with session token)
    let url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${this.apiKey}`;
    if (sessionToken) {
      url += `&sessiontoken=${sessionToken}`;
    }
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.result?.geometry?.location) {
      return null;
    }

    const result = {
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
    };

    // Cache place geometry for 12 hours
    await this.cacheManager.set(cacheKey, result, GeocodeService.PLACE_DETAILS_TTL);

    return result;
  }

  /**
   * Haversine-based distance calculation (FREE — replaces Distance Matrix API).
   * Returns estimated road distance (×1.3 factor) and travel time.
   */
  async getDistanceMatrix(
    origin: { lat: number; lng: number },
    destinations: Array<{ lat: number; lng: number }>,
  ) {
    if (!destinations.length) return [];

    return destinations.map((dest) => {
      const straightLineKm = this.haversineDistance(origin, dest);
      // Road distance is typically 1.3× straight-line distance in Indian cities
      const roadDistanceKm = straightLineKm * 1.3;
      const roadDistanceMeters = Math.round(roadDistanceKm * 1000);

      // Estimate travel time based on average city speed
      const travelTimeSeconds = Math.round((roadDistanceKm / GeocodeService.AVG_CITY_SPEED_KMH) * 3600);

      // Format human-readable strings
      const distanceText = roadDistanceKm >= 1
        ? `${roadDistanceKm.toFixed(1)} km`
        : `${roadDistanceMeters} m`;

      const travelTimeMinutes = Math.round(travelTimeSeconds / 60);
      const durationText = travelTimeMinutes >= 60
        ? `${Math.floor(travelTimeMinutes / 60)} hr ${travelTimeMinutes % 60} mins`
        : `${travelTimeMinutes} mins`;

      return {
        distanceText,
        distanceValue: roadDistanceMeters,
        durationText,
        durationValue: travelTimeSeconds,
      };
    });
  }

  /** Haversine formula: calculates straight-line distance between two coordinates in km */
  private haversineDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h =
      sinDLat * sinDLat +
      Math.cos(this.toRad(a.lat)) * Math.cos(this.toRad(b.lat)) * sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
