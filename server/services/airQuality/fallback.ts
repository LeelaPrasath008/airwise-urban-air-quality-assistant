import { calculateAQI, classifyAQI } from '../../../src/shared/aqi.ts';
import type {
  AirQualitySnapshot,
  AQIStandard,
  GeoLocation,
  HourlyAirPoint,
  PollutantReadings,
  WeatherReadings,
} from '../../../src/shared/types.ts';

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

export function searchPresetLocations(normalizedQuery: string): GeoLocation[] {
  return PRESET_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(normalizedQuery) ||
      (loc.region && loc.region.toLowerCase().includes(normalizedQuery)) ||
      loc.country.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Clearly labeled demonstration dataset used ONLY when live external APIs are unreachable.
 * Never presented as live sensor telemetry.
 */
export function buildDemonstrationSnapshot(
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
    conditionLabel: isNorthIndia
      ? 'Winter haze / low wind (Demonstration)'
      : 'Partly cloudy (Demonstration)',
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
