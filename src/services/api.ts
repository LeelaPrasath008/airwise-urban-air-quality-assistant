import { formatLocationLabel } from '../shared/aqi.ts';
import type {
  AirQualitySnapshot,
  AQIStandard,
  DailyRoutinePlan,
  EnvironmentalContext,
  GeoLocation,
  LifestyleProfile,
} from '../shared/types.ts';

export class ApiClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new ApiClientError(message, response.status);
  }
  return payload as T;
}

export async function fetchPresetLocations(signal?: AbortSignal): Promise<GeoLocation[]> {
  const res = await fetch('/api/locations/presets', { signal });
  const data = await parseJsonResponse<{ locations: GeoLocation[] }>(res);
  return data.locations;
}

export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<{ results: GeoLocation[]; source: string; isFallback: boolean }> {
  const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, { signal });
  return parseJsonResponse(res);
}

export async function fetchAirQuality(
  location: GeoLocation,
  standard?: AQIStandard,
  signal?: AbortSignal,
  bypassCache = false
): Promise<AirQualitySnapshot> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    city: location.name,
    country: location.country,
    countryCode: location.countryCode,
  });
  if (location.region) params.set('region', location.region);
  if (standard) params.set('standard', standard);
  if (bypassCache) params.set('refresh', 'true');

  const res = await fetch(`/api/air-quality?${params.toString()}`, { signal });
  return parseJsonResponse<AirQualitySnapshot>(res);
}

function buildEnvironmentalContext(snapshot: AirQualitySnapshot): EnvironmentalContext {
  return {
    locationName: formatLocationLabel(snapshot.location),
    standard: snapshot.standard,
    aqi: snapshot.aqi,
    categoryLabel: snapshot.category.label,
    pm25: snapshot.pollutants.pm25,
    pm10: snapshot.pollutants.pm10,
    temperatureC: snapshot.weather.temperatureC,
    humidityPercent: snapshot.weather.humidityPercent,
    weatherCondition: snapshot.weather.conditionLabel,
  };
}

export async function requestDailyRoutine(
  snapshot: AirQualitySnapshot,
  profile: LifestyleProfile,
  signal?: AbortSignal
): Promise<DailyRoutinePlan> {
  const res = await fetch('/api/routine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      ...buildEnvironmentalContext(snapshot),
      profile,
    }),
  });
  return parseJsonResponse<DailyRoutinePlan>(res);
}

export async function sendAssistantMessage(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  snapshot: AirQualitySnapshot;
  signal?: AbortSignal;
}): Promise<{
  reply: string;
  source: 'gemini_ai' | 'rule_based_fallback';
  fallbackNotice?: string;
}> {
  const { message, history, snapshot, signal } = params;
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      message,
      history,
      context: {
        ...buildEnvironmentalContext(snapshot),
        isDemonstrationData: snapshot.isDemonstrationData,
      },
    }),
  });
  return parseJsonResponse(res);
}
