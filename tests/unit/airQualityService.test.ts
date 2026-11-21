// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAirQualityCaches,
  getAirQualitySnapshot,
  PRESET_LOCATIONS,
  searchLocations,
} from '../../server/services/airQualityService.ts';

function mockAirAndWeatherFetch(options?: {
  pm25?: number;
  pm10?: number;
  includeOptionalPollutants?: boolean;
  includeWeather?: boolean;
  hourlyPm25?: Array<number | null>;
}) {
  const pm25 = options?.pm25 ?? 88.44;
  const pm10 = options?.pm10 ?? 164.26;
  const includeOptional = options?.includeOptionalPollutants ?? true;
  const includeWeather = options?.includeWeather ?? true;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('air-quality-api.open-meteo.com')) {
      return new Response(
        JSON.stringify({
          current: {
            time: '2026-11-20T10:00',
            pm2_5: pm25,
            pm10,
            ...(includeOptional
              ? {
                  nitrogen_dioxide: 41.26,
                  sulphur_dioxide: 12.14,
                  ozone: 36.85,
                  carbon_monoxide: 1120.4,
                }
              : {}),
          },
          hourly: {
            time: ['2026-11-20T09:00', '2026-11-20T10:00', '2026-11-20T11:00'],
            pm2_5: options?.hourlyPm25 ?? [95.0, null, 72.5],
            pm10: [170.0, null, 140.0],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(
        includeWeather
          ? {
              current: {
                temperature_2m: 17.66,
                relative_humidity_2m: 64.6,
                wind_speed_10m: 8.34,
                weather_code: 45,
              },
            }
          : {}
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
}

describe('Air Quality Service — Mapping, Caching, Refresh & Fallback', () => {
  beforeEach(() => {
    clearAirQualityCaches();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('maps Open-Meteo geocoding results, reuses geocode cache, and falls back to preset directory on failure', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1273294,
              name: 'Delhi',
              admin1: 'Delhi',
              country: 'India',
              country_code: 'in',
              latitude: 28.65195,
              longitude: 77.23149,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const first = await searchLocations('Delhi');
    expect(first.isFallback).toBe(false);
    expect(first.source).toBe('Open-Meteo Geocoding API');
    expect(first.results[0]).toEqual({
      id: 'om-1273294',
      name: 'Delhi',
      region: 'Delhi',
      country: 'India',
      countryCode: 'IN',
      latitude: 28.6519,
      longitude: 77.2315,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Case-insensitive cache reuse
    const cached = await searchLocations('  delhi  ');
    expect(cached.source).toContain('cached');
    expect(cached.results).toEqual(first.results);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Failure on uncached query falls back cleanly to built-in PRESET_LOCATIONS
    fetchSpy.mockRejectedValueOnce(new Error('Upstream geocoding timeout'));
    const fallback = await searchLocations('Mumbai');
    expect(fallback.isFallback).toBe(true);
    expect(fallback.results.some((loc) => loc.id === 'in-mumbai')).toBe(true);
    expect(PRESET_LOCATIONS.length).toBe(7);
  });

  it('normalizes live upstream payloads, defaults missing optional fields, and fills null hourly entries', async () => {
    mockAirAndWeatherFetch({
      pm25: 34.46,
      pm10: 61.24,
      includeOptionalPollutants: false,
      includeWeather: false,
      hourlyPm25: [40.1, null, 29.8],
    });

    const snapshot = await getAirQualitySnapshot({
      latitude: 34.0522,
      longitude: -118.2437,
      name: 'Los Angeles',
      country: 'United States',
      countryCode: 'US',
    });

    expect(snapshot.isLive).toBe(true);
    expect(snapshot.isDemonstrationData).toBe(false);
    expect(snapshot.standard).toBe('US_EPA');
    expect(snapshot.location.latitude).toBe(34.05);
    expect(snapshot.location.longitude).toBe(-118.24);
    expect(snapshot.location.id).toBe('coord-34.05--118.24');

    // Rounded PM values & undefined optional gases when omitted upstream
    expect(snapshot.pollutants.pm25).toBe(34.5);
    expect(snapshot.pollutants.pm10).toBe(61.2);
    expect(snapshot.pollutants.no2).toBeUndefined();
    expect(snapshot.pollutants.so2).toBeUndefined();
    expect(snapshot.pollutants.o3).toBeUndefined();
    expect(snapshot.pollutants.co).toBeUndefined();

    // Default weather fallbacks when weather current block is missing
    expect(snapshot.weather.temperatureC).toBe(20);
    expect(snapshot.weather.humidityPercent).toBe(50);
    expect(snapshot.weather.windSpeedKmh).toBe(6);
    expect(snapshot.weather.weatherCode).toBe(0);

    // Null hourly entry falls back to current rounded PM2.5 & PM10
    expect(snapshot.hourlyTrend).toHaveLength(3);
    expect(snapshot.hourlyTrend[0].isForecast).toBe(false);
    expect(snapshot.hourlyTrend[1].pm25).toBe(34.5);
    expect(snapshot.hourlyTrend[1].pm10).toBe(61.2);
    expect(snapshot.hourlyTrend[2].isForecast).toBe(true);
    expect(snapshot.disclaimer).toContain('US EPA AQI');
  });

  it('falls back to clearly labeled regional demonstration snapshots on incomplete upstream data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ current: { pm10: 120 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const delhi = await getAirQualitySnapshot({
      latitude: 28.6139,
      longitude: 77.209,
      name: 'New Delhi',
      country: 'India',
      countryCode: 'IN',
      standard: 'INDIA_CPCB',
    });
    expect(delhi.isLive).toBe(false);
    expect(delhi.isDemonstrationData).toBe(true);
    expect(delhi.location.isDemoFallback).toBe(true);
    expect(delhi.pollutants.pm25).toBe(168);
    expect(delhi.hourlyTrend).toHaveLength(24);

    const bengaluru = await getAirQualitySnapshot({
      latitude: 12.9716,
      longitude: 77.5946,
      name: 'Bengaluru',
      country: 'India',
      countryCode: 'IN',
      standard: 'INDIA_CPCB',
    });
    expect(bengaluru.isDemonstrationData).toBe(true);
    expect(bengaluru.pollutants.pm25).toBe(74);

    const london = await getAirQualitySnapshot({
      latitude: 51.5074,
      longitude: -0.1278,
      name: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
      standard: 'US_EPA',
    });
    expect(london.isDemonstrationData).toBe(true);
    expect(london.pollutants.pm25).toBe(28);
  });

  it('enforces 30s manual refresh cooldown and bypasses cache once cooldown has elapsed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T10:00:00.000Z'));

    const fetchSpy = mockAirAndWeatherFetch({ pm25: 100, pm10: 180 });
    const params = {
      latitude: 28.6139,
      longitude: 77.209,
      name: 'New Delhi',
      country: 'India',
      countryCode: 'IN',
      standard: 'INDIA_CPCB' as const,
    };

    const initial = await getAirQualitySnapshot(params);
    expect(initial.cacheHit).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 15s later: bypassCache is still blocked by 30s cooldown
    vi.advanceTimersByTime(15_000);
    const duringCooldown = await getAirQualitySnapshot({ ...params, bypassCache: true });
    expect(duringCooldown.cacheHit).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 31s total elapsed: bypassCache triggers fresh upstream fetch
    vi.advanceTimersByTime(16_000);
    const refreshed = await getAirQualitySnapshot({ ...params, bypassCache: true });
    expect(refreshed.cacheHit).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});
