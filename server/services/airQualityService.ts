import { BoundedTTLCache } from '../cache.ts';
import { getDefaultStandardForCountry } from '../../src/shared/aqi.ts';
import type {
  AirQualitySnapshot,
  AQIStandard,
  GeoLocation,
} from '../../src/shared/types.ts';
import {
  buildDemonstrationSnapshot,
  searchPresetLocations,
} from './airQuality/fallback.ts';
import {
  buildLiveAirQualitySnapshot,
  mapGeocodingResults,
} from './airQuality/snapshotMapper.ts';
import {
  fetchOpenMeteoAirAndWeather,
  fetchOpenMeteoGeocoding,
} from './airQuality/upstreamClient.ts';

export { PRESET_LOCATIONS } from './airQuality/fallback.ts';

export interface AirQualitySnapshotParams {
  latitude: number;
  longitude: number;
  name?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  standard?: AQIStandard;
  bypassCache?: boolean;
}

// 10-minute cache for air quality + weather measurements (freshness balanced with API rate conservation)
const airQualityCache = new BoundedTTLCache<AirQualitySnapshot>(150);
// 24-hour cache for city geocoding lookups
const geocodeCache = new BoundedTTLCache<GeoLocation[]>(200);
// Deduplicate concurrent identical upstream requests
const inFlightSnapshots = new Map<string, Promise<AirQualitySnapshot>>();

const AQ_TTL_MS = 10 * 60 * 1000;
const GEO_TTL_MS = 24 * 60 * 60 * 1000;
const MANUAL_REFRESH_COOLDOWN_MS = 30_000;

export async function searchLocations(query: string): Promise<{
  results: GeoLocation[];
  source: string;
  isFallback: boolean;
}> {
  const normalized = query.trim().toLowerCase();
  const cached = geocodeCache.get(normalized);
  if (cached) {
    return { results: cached, source: 'Open-Meteo Geocoding API (cached)', isFallback: false };
  }

  try {
    const data = await fetchOpenMeteoGeocoding(query);
    const mapped = mapGeocodingResults(data);

    geocodeCache.set(normalized, mapped, GEO_TTL_MS);
    return { results: mapped, source: 'Open-Meteo Geocoding API', isFallback: false };
  } catch {
    return {
      results: searchPresetLocations(normalized),
      source: 'Built-in City Directory (Geocoding service unavailable)',
      isFallback: true,
    };
  }
}

export async function getAirQualitySnapshot(
  params: AirQualitySnapshotParams
): Promise<AirQualitySnapshot> {
  // Round coordinates to 2 decimal places (~1.1 km) to protect privacy & improve cache hit ratio
  const roundedLat = Math.round(params.latitude * 100) / 100;
  const roundedLon = Math.round(params.longitude * 100) / 100;

  const countryCode = (params.countryCode || 'IN').toUpperCase();
  const standard: AQIStandard = params.standard ?? getDefaultStandardForCountry(countryCode);

  const location: GeoLocation = {
    id: `coord-${roundedLat}-${roundedLon}`,
    name: params.name || `Location (${roundedLat.toFixed(2)}, ${roundedLon.toFixed(2)})`,
    region: params.region,
    country: params.country || (countryCode === 'IN' ? 'India' : 'Global'),
    countryCode,
    latitude: roundedLat,
    longitude: roundedLon,
  };

  const cacheKey = `${roundedLat}:${roundedLon}:${standard}:${location.name}`;
  const cached = airQualityCache.get(cacheKey);
  if (cached) {
    const ageMs = Date.now() - Date.parse(cached.lastUpdatedIso);
    // Allow explicit manual refresh once cached data is at least 30 seconds old
    if (!params.bypassCache || ageMs < MANUAL_REFRESH_COOLDOWN_MS) {
      return { ...cached, cacheHit: true };
    }
  }

  const pending = inFlightSnapshots.get(cacheKey);
  if (pending) {
    return pending;
  }

  const fetchPromise = (async (): Promise<AirQualitySnapshot> => {
    try {
      const [aqData, wxData] = await fetchOpenMeteoAirAndWeather(roundedLat, roundedLon);
      const snapshot = buildLiveAirQualitySnapshot(location, standard, aqData, wxData);
      airQualityCache.set(cacheKey, snapshot, AQ_TTL_MS);
      return snapshot;
    } catch {
      return buildDemonstrationSnapshot(location, standard);
    } finally {
      inFlightSnapshots.delete(cacheKey);
    }
  })();

  inFlightSnapshots.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function clearAirQualityCaches(): void {
  airQualityCache.clear();
  geocodeCache.clear();
}
