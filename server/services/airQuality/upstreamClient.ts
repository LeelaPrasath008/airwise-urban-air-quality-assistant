export const UPSTREAM_TIMEOUT_MS = 7000;

export interface OpenMeteoGeoResponse {
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

export interface OpenMeteoAirResponse {
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

export interface OpenMeteoWeatherResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
}

export async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs = UPSTREAM_TIMEOUT_MS
): Promise<T> {
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

export async function fetchOpenMeteoGeocoding(query: string): Promise<OpenMeteoGeoResponse> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query.trim()
  )}&count=6&language=en&format=json`;
  return fetchJsonWithTimeout<OpenMeteoGeoResponse>(url);
}

export async function fetchOpenMeteoAirAndWeather(
  roundedLat: number,
  roundedLon: number
): Promise<[OpenMeteoAirResponse, OpenMeteoWeatherResponse]> {
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${roundedLat}&longitude=${roundedLon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm10,pm2_5&past_hours=6&forecast_hours=18&timezone=auto`;
  const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

  return Promise.all([
    fetchJsonWithTimeout<OpenMeteoAirResponse>(aqUrl),
    fetchJsonWithTimeout<OpenMeteoWeatherResponse>(wxUrl),
  ]);
}
