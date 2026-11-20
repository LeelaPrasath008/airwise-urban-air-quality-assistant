import { BoundedTTLCache } from '../cache.ts';
import {
  calculateAQI,
  classifyAQI,
  getDefaultStandardForCountry,
  weatherCodeToLabel,
} from '../../src/shared/aqi.ts';
import type {
  AirQualitySnapshot,
  AQIStandard,
  GeoLocation,
  HourlyAirPoint,
  PollutantReadings,
  WeatherReadings,
} from '../../src/shared/types.ts';

export const PRESET_LOCATIONS: GeoLocation[] = [
  {
    id: 'in-new-delhi',
    name: 'New Delhi',
    region: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
  },
  {
    id: 'in-mumbai',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    id: 'in-bengaluru',
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    countryCode: 'IN',
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    id: 'in-kolkata',
    name: 'Kolkata',
    region: 'West Bengal',
    country: 'India',
    countryCode: 'IN',
    latitude: 22.5726,
    longitude: 88.3639,
  },
  {
    id: 'in-lucknow',
    name: 'Lucknow',
    region: 'Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    latitude: 26.8467,
    longitude: 80.9462,
  },
  {
    id: 'gb-london',
    name: 'London',
    region: 'England',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    id: 'us-los-angeles',
    name: 'Los Angeles',
    region: 'California',
    country: 'United States',
    countryCode: 'US',
    latitude: 34.0522,
    longitude: -118.2437,
  },
];

// 10-minute cache for air quality + weather measurements (freshness balanced with API rate conservation)
const airQualityCache = new BoundedTTLCache<AirQualitySnapshot>(150);
// 24-hour cache for city geocoding lookups
const geocodeCache = new BoundedTTLCache<GeoLocation[]>(200);
// Deduplicate concurrent identical upstream requests
const inFlightSnapshots = new Map<string, Promise<AirQualitySnapshot>>();

const AQ_TTL_MS = 10 * 60 * 1000;
const GEO_TTL_MS = 24 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 7000;

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AIRWISE-Urban-Air-Assistant/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`Upstream API returned HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface OpenMeteoGeoResponse {
  results?: Array<{
    id: number;
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
  }>;
}

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
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=6&language=en&format=json`;
    const data = await fetchJsonWithTimeout<OpenMeteoGeoResponse>(url);
    const mapped: GeoLocation[] = (data.results ?? []).map((item) => ({
      id: `om-${item.id}`,
      name: item.name,
      region: item.admin1,
      country: item.country ?? 'Unknown',
      countryCode: (item.country_code ?? 'US').toUpperCase(),
      latitude: Number(item.latitude.toFixed(4)),
      longitude: Number(item.longitude.toFixed(4)),
    }));

    geocodeCache.set(normalized, mapped, GEO_TTL_MS);
    return { results: mapped, source: 'Open-Meteo Geocoding API', isFallback: false };
  } catch {
    const localMatches = PRESET_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(normalized) ||
        (loc.region && loc.region.toLowerCase().includes(normalized)) ||
        loc.country.toLowerCase().includes(normalized)
    );
    return {
      results: localMatches,
      source: 'Built-in City Directory (Geocoding service unavailable)',
      isFallback: true,
    };
  }
}

interface OpenMeteoAirResponse {
  current?: {
    time?: string;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    ozone?: number;
    carbon_monoxide?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
}

/**
 * Clearly labeled demonstration dataset used ONLY when live external APIs are unreachable.
 * Never presented as live sensor telemetry.
 */
function buildDemonstrationSnapshot(
  location: GeoLocation,
  standard: AQIStandard
): AirQualitySnapshot {
  const isNorthIndia =
    location.countryCode === 'IN' && location.latitude >= 23 && location.latitude <= 31;

  const basePm25 = isNorthIndia ? 168 : location.countryCode === 'IN' ? 74 : 28;
  const basePm10 = isNorthIndia ? 275 : location.countryCode === 'IN' ? 128 : 48;

  const pollutants: PollutantReadings = {
    pm25: basePm25,
    pm10: basePm10,
    no2: isNorthIndia ? 62 : 24,
    so2: isNorthIndia ? 19 : 8,
    o3: isNorthIndia ? 38 : 44,
    co: isNorthIndia ? 1450 : 320,
  };

  const { aqi, dominantPollutant } = calculateAQI(pollutants, standard);
  const category = classifyAQI(aqi, standard);

  const weather: WeatherReadings = {
    temperatureC: isNorthIndia ? 14.5 : 22.0,
    humidityPercent: isNorthIndia ? 76 : 58,
    windSpeedKmh: isNorthIndia ? 4.2 : 11.5,
    weatherCode: isNorthIndia ? 45 : 2,
    conditionLabel: isNorthIndia ? 'Winter haze / low wind (Demonstration)' : 'Partly cloudy (Demonstration)',
  };

  const now = new Date();
  const hourlyTrend: HourlyAirPoint[] = [];
  for (let offset = -6; offset <= 17; offset++) {
    const dt = new Date(now.getTime() + offset * 3600 * 1000);
    const hour = dt.getHours();
    // Realistic diurnal winter inversion curve: peaks early morning & late evening, dips midday
    const diurnalFactor =
      hour >= 12 && hour <= 16 ? 0.72 : hour >= 6 && hour <= 9 ? 1.15 : hour >= 20 ? 1.12 : 0.96;
    const pm25 = Math.round(basePm25 * diurnalFactor * 10) / 10;
    const pm10 = Math.round(basePm10 * diurnalFactor * 10) / 10;
    const calc = calculateAQI({ pm25, pm10 }, standard);
    hourlyTrend.push({
      timeIso: dt.toISOString(),
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      pm25,
      pm10,
      aqi: calc.aqi,
      isForecast: offset > 0,
    });
  }

  return {
    location: { ...location, isDemoFallback: true },
    standard,
    aqi,
    dominantPollutant,
    category,
    pollutants,
    weather,
    hourlyTrend,
    lastUpdatedIso: now.toISOString(),
    dataSource: 'Demonstration Winter Smog Dataset (Live API unreachable)',
    isLive: false,
    isDemonstrationData: true,
    cacheHit: false,
    disclaimer:
      'Live upstream air-quality API was unreachable. Displaying clearly labeled demonstration data so you can explore AIRWISE features — do not use this fallback for live health decisions.',
  };
}

export async function getAirQualitySnapshot(params: {
  latitude: number;
  longitude: number;
  name?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  standard?: AQIStandard;
  bypassCache?: boolean;
}): Promise<AirQualitySnapshot> {
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
    if (!params.bypassCache || ageMs < 30_000) {
      return { ...cached, cacheHit: true };
    }
  }

  const pending = inFlightSnapshots.get(cacheKey);
  if (pending) {
    return pending;
  }

  const fetchPromise = (async (): Promise<AirQualitySnapshot> => {
    try {
      const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${roundedLat}&longitude=${roundedLon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm10,pm2_5&past_hours=6&forecast_hours=18&timezone=auto`;
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

      const [aqData, wxData] = await Promise.all([
        fetchJsonWithTimeout<OpenMeteoAirResponse>(aqUrl),
        fetchJsonWithTimeout<OpenMeteoWeatherResponse>(wxUrl),
      ]);

      if (!aqData.current || typeof aqData.current.pm2_5 !== 'number') {
        throw new Error('Incomplete pollutant payload from Open-Meteo');
      }

      const pollutants: PollutantReadings = {
        pm25: Math.round((aqData.current.pm2_5 ?? 0) * 10) / 10,
        pm10: Math.round((aqData.current.pm10 ?? 0) * 10) / 10,
        no2:
          typeof aqData.current.nitrogen_dioxide === 'number'
            ? Math.round(aqData.current.nitrogen_dioxide * 10) / 10
            : undefined,
        so2:
          typeof aqData.current.sulphur_dioxide === 'number'
            ? Math.round(aqData.current.sulphur_dioxide * 10) / 10
            : undefined,
        o3:
          typeof aqData.current.ozone === 'number'
            ? Math.round(aqData.current.ozone * 10) / 10
            : undefined,
        co:
          typeof aqData.current.carbon_monoxide === 'number'
            ? Math.round(aqData.current.carbon_monoxide)
            : undefined,
      };

      const { aqi, dominantPollutant } = calculateAQI(pollutants, standard);
      const category = classifyAQI(aqi, standard);

      const weatherCode = wxData.current?.weather_code ?? 0;
      const weather: WeatherReadings = {
        temperatureC: Math.round((wxData.current?.temperature_2m ?? 20) * 10) / 10,
        humidityPercent: Math.round(wxData.current?.relative_humidity_2m ?? 50),
        windSpeedKmh: Math.round((wxData.current?.wind_speed_10m ?? 6) * 10) / 10,
        weatherCode,
        conditionLabel: weatherCodeToLabel(weatherCode),
      };

      const times = aqData.hourly?.time ?? [];
      const pm25Series = aqData.hourly?.pm2_5 ?? [];
      const pm10Series = aqData.hourly?.pm10 ?? [];
      const currentTimeStr = aqData.current.time ?? '';

      const hourlyTrend: HourlyAirPoint[] = times.slice(0, 24).map((t, idx) => {
        const pm25Val = Math.round((pm25Series[idx] ?? pollutants.pm25) * 10) / 10;
        const pm10Val = Math.round((pm10Series[idx] ?? pollutants.pm10) * 10) / 10;
        const calc = calculateAQI({ pm25: pm25Val, pm10: pm10Val }, standard);
        const hourLabel = t.includes('T') ? t.split('T')[1].slice(0, 5) : `${idx}:00`;
        const isForecast = currentTimeStr ? t > currentTimeStr : idx >= 6;
        return {
          timeIso: t,
          hourLabel,
          pm25: pm25Val,
          pm10: pm10Val,
          aqi: calc.aqi,
          isForecast,
        };
      });

      const snapshot: AirQualitySnapshot = {
        location,
        standard,
        aqi,
        dominantPollutant,
        category,
        pollutants,
        weather,
        hourlyTrend,
        lastUpdatedIso: new Date().toISOString(),
        dataSource: 'Open-Meteo Air Quality (CAMS/ECMWF) & Weather API',
        isLive: true,
        isDemonstrationData: false,
        cacheHit: false,
        disclaimer:
          standard === 'INDIA_CPCB'
            ? 'AQI computed from live Open-Meteo pollutant concentrations using Indian National AQI (CPCB) sub-index breakpoints. Model-assimilated concentrations may differ slightly from individual street-level reference stations; follow official CPCB / local health advisories.'
            : 'AQI computed from live Open-Meteo pollutant concentrations using US EPA AQI breakpoints. Follow official AirNow / local municipal health advisories during pollution episodes.',
      };

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
