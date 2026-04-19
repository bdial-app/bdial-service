import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeocodeService {
  private readonly apiKey: string | undefined;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
  }

  private ensureApiKey() {
    if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      throw new BadRequestException('Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY in .env');
    }
  }

  /** Reverse geocode lat/lng → readable address label + city */
  async reverseGeocode(lat: number, lng: number) {
    this.ensureApiKey();
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
      components.find((c) => c.types.includes('sublocality'))?.long_name ??
      null;

    const label = sublocality ? `${sublocality}, ${city}` : city;

    return {
      label,
      city,
      area: sublocality,
      fullAddress: result.formatted_address,
      placeId: result.place_id,
    };
  }

  /** Forward search: text query → location suggestions (Google Places Autocomplete) */
  async searchLocations(query: string) {
    this.ensureApiKey();
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(regions)&key=${this.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.predictions?.length) {
      return [];
    }

    // Get details for each prediction to include lat/lng
    const results = await Promise.all(
      data.predictions.slice(0, 5).map(async (pred: any) => {
        const details = await this.getPlaceDetails(pred.place_id);
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

  /** Get lat/lng for a place ID */
  private async getPlaceDetails(placeId: string) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${this.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.result?.geometry?.location) {
      return null;
    }

    return {
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
    };
  }

  /**
   * Google Distance Matrix API: get road distance + travel time
   * between an origin and multiple destinations.
   * Returns an array of { distance, duration } for each destination.
   */
  async getDistanceMatrix(
    origin: { lat: number; lng: number },
    destinations: Array<{ lat: number; lng: number }>,
  ) {
    if (!destinations.length) return [];
    this.ensureApiKey();

    const origStr = `${origin.lat},${origin.lng}`;
    const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origStr}&destinations=${destStr}&key=${this.apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.rows?.[0]?.elements) {
      return destinations.map(() => ({ distanceText: null, distanceValue: null, durationText: null, durationValue: null }));
    }

    return data.rows[0].elements.map((el: any) => {
      if (el.status !== 'OK') {
        return { distanceText: null, distanceValue: null, durationText: null, durationValue: null };
      }
      return {
        distanceText: el.distance.text,     // "3.5 km"
        distanceValue: el.distance.value,    // 3500 (meters)
        durationText: el.duration.text,     // "12 mins"
        durationValue: el.duration.value,    // 720 (seconds)
      };
    });
  }
}
