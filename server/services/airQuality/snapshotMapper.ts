import {
  calculateAQI,
  classifyAQI,
  weatherCodeToLabel,
} from '../../../src/shared/aqi.ts';
import type {
  AirQualitySnapshot,
  AQIStandard,
  GeoLocation,
  HourlyAirPoint,
  PollutantReadings,
  WeatherReadings,
} from '../../../src/shared/types.ts';
import type {
  OpenMeteoAirResponse,
  OpenMeteoGeoResponse,
  OpenMeteoWeatherResponse,
} from './upstreamClient.ts';

export function mapGeocodingResults(data: OpenMeteoGeoResponse): GeoLocation[] {
  return (data.results ?? []).map((item) => ({
    id: `om-${item.id}`,
    name: item.name,
    region: item.admin1,
    country: item.country ?? 'Unknown',
    countryCode: (item.country_code ?? 'US').toUpperCase(),
    latitude: Number(item.latitude.toFixed(4)),
    longitude: Number(item.longitude.toFixed(4)),
  }));
}

function mapPollutantReadings(
  current: NonNullable<OpenMeteoAirResponse['current']>
): PollutantReadings {
  return {
    pm25: Math.round((current.pm2_5 ?? 0) * 10) / 10,
    pm10: Math.round((current.pm10 ?? 0) * 10) / 10,
    no2:
      typeof current.nitrogen_dioxide === 'number'
        ? Math.round(current.nitrogen_dioxide * 10) / 10
        : undefined,
    so2:
      typeof current.sulphur_dioxide === 'number'
        ? Math.round(current.sulphur_dioxide * 10) / 10
        : undefined,
    o3:
      typeof current.ozone === 'number'
        ? Math.round(current.ozone * 10) / 10
        : undefined,
    co:
      typeof current.carbon_monoxide === 'number'
        ? Math.round(current.carbon_monoxide)
        : undefined,
  };
}

function mapWeatherReadings(wxData: OpenMeteoWeatherResponse): WeatherReadings {
  const weatherCode = wxData.current?.weather_code ?? 0;
  return {
    temperatureC: Math.round((wxData.current?.temperature_2m ?? 20) * 10) / 10,
    humidityPercent: Math.round(wxData.current?.relative_humidity_2m ?? 50),
    windSpeedKmh: Math.round((wxData.current?.wind_speed_10m ?? 6) * 10) / 10,
    weatherCode,
    conditionLabel: weatherCodeToLabel(weatherCode),
  };
}

function mapHourlyTrend(
  aqData: OpenMeteoAirResponse,
  fallbackPollutants: PollutantReadings,
  standard: AQIStandard
): HourlyAirPoint[] {
  const times = aqData.hourly?.time ?? [];
  const pm25Series = aqData.hourly?.pm2_5 ?? [];
  const pm10Series = aqData.hourly?.pm10 ?? [];
  const currentTimeStr = aqData.current?.time ?? '';

  return times.slice(0, 24).map((t, idx) => {
    const pm25Val = Math.round((pm25Series[idx] ?? fallbackPollutants.pm25) * 10) / 10;
    const pm10Val = Math.round((pm10Series[idx] ?? fallbackPollutants.pm10) * 10) / 10;
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
}

export function buildLiveAirQualitySnapshot(
  location: GeoLocation,
  standard: AQIStandard,
  aqData: OpenMeteoAirResponse,
  wxData: OpenMeteoWeatherResponse
): AirQualitySnapshot {
  if (!aqData.current || typeof aqData.current.pm2_5 !== 'number') {
    throw new Error('Incomplete pollutant payload from Open-Meteo');
  }

  const pollutants = mapPollutantReadings(aqData.current);
  const { aqi, dominantPollutant } = calculateAQI(pollutants, standard);
  const category = classifyAQI(aqi, standard);
  const weather = mapWeatherReadings(wxData);
  const hourlyTrend = mapHourlyTrend(aqData, pollutants, standard);

  return {
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
}
