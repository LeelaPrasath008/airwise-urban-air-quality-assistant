import type { AQICategoryMeta, AQIStandard, PollutantReadings } from './types.ts';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * Indian National Air Quality Index (CPCB) pollutant breakpoints (24-hr / 8-hr standard).
 * Reference: Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, India.
 */
const INDIA_PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
];

const INDIA_PM10_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
];

const INDIA_NO2_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 },
];

const INDIA_O3_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
  { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
  { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
  { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
];

const INDIA_SO2_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
  { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
  { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
  { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 },
];

// CPCB CO breakpoints in mg/m³ (Open-Meteo returns µg/m³, divided by 1000)
const INDIA_CO_MG_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
  { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
  { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
  { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
  { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
  { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
];

/**
 * US EPA Revised PM2.5 (2024 update) and PM10 AQI breakpoints.
 */
const US_PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

const US_PM10_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
];

export function computeSubIndex(concentration: number, breakpoints: Breakpoint[]): number {
  if (!Number.isFinite(concentration) || concentration <= 0) {
    return 0;
  }
  const rounded = Math.round(concentration * 10) / 10;

  for (const bp of breakpoints) {
    if (rounded >= bp.cLow && rounded <= bp.cHigh) {
      const ratio = (rounded - bp.cLow) / Math.max(bp.cHigh - bp.cLow, 0.0001);
      return Math.round(bp.iLow + ratio * (bp.iHigh - bp.iLow));
    }
  }

  // Handle concentrations between gap boundaries (e.g. 30.4 between 30 and 31)
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const curr = breakpoints[i];
    const next = breakpoints[i + 1];
    if (rounded > curr.cHigh && rounded < next.cLow) {
      return curr.iHigh;
    }
  }

  // Exceeds top breakpoint — cap cleanly at 500 for standard scale display
  return 500;
}

export function calculateAQI(
  pollutants: PollutantReadings,
  standard: AQIStandard
): { aqi: number; dominantPollutant: string } {
  const candidates: Array<{ name: string; value: number }> = [];

  if (standard === 'INDIA_CPCB') {
    candidates.push({ name: 'PM2.5', value: computeSubIndex(pollutants.pm25, INDIA_PM25_BREAKPOINTS) });
    candidates.push({ name: 'PM10', value: computeSubIndex(pollutants.pm10, INDIA_PM10_BREAKPOINTS) });
    if (typeof pollutants.no2 === 'number' && pollutants.no2 >= 0) {
      candidates.push({ name: 'NO2', value: computeSubIndex(pollutants.no2, INDIA_NO2_BREAKPOINTS) });
    }
    if (typeof pollutants.o3 === 'number' && pollutants.o3 >= 0) {
      candidates.push({ name: 'O3', value: computeSubIndex(pollutants.o3, INDIA_O3_BREAKPOINTS) });
    }
    if (typeof pollutants.so2 === 'number' && pollutants.so2 >= 0) {
      candidates.push({ name: 'SO2', value: computeSubIndex(pollutants.so2, INDIA_SO2_BREAKPOINTS) });
    }
    if (typeof pollutants.co === 'number' && pollutants.co >= 0) {
      candidates.push({ name: 'CO', value: computeSubIndex(pollutants.co / 1000, INDIA_CO_MG_BREAKPOINTS) });
    }
  } else {
    candidates.push({ name: 'PM2.5', value: computeSubIndex(pollutants.pm25, US_PM25_BREAKPOINTS) });
    candidates.push({ name: 'PM10', value: computeSubIndex(pollutants.pm10, US_PM10_BREAKPOINTS) });
  }

  const dominant = candidates.reduce(
    (max, item) => (item.value > max.value ? item : max),
    { name: 'PM2.5', value: 0 }
  );

  return {
    aqi: Math.min(500, Math.max(0, dominant.value)),
    dominantPollutant: dominant.name,
  };
}

interface AQICategoryBand {
  readonly maxAqi: number;
  readonly legendLabel?: string;
  readonly legendRange?: string;
  readonly meta: AQICategoryMeta;
}

export interface AQIScaleLegendBand {
  readonly label: string;
  readonly range: string;
  readonly color: string;
}

const INDIA_CPCB_BANDS: readonly AQICategoryBand[] = [
  {
    maxAqi: 50,
    meta: {
      key: 'good',
      label: 'Good',
      rangeLabel: '0–50',
      severityLevel: 1,
      textColorClass: 'text-[#14532D]',
      bgTintClass: 'bg-[#ECFDF3]',
      borderTintClass: 'border-[#BBF7D0]',
      barColorHex: '#15803D',
      healthSummary: 'Minimal impact for most households.',
      outdoorGuidance: 'Favorable conditions for walking, cycling, and outdoor family activities.',
      ventilationAdvice: 'Safe to open windows for cross-ventilation during cooler or low-traffic hours.',
    },
  },
  {
    maxAqi: 100,
    meta: {
      key: 'satisfactory',
      label: 'Satisfactory',
      rangeLabel: '51–100',
      severityLevel: 2,
      textColorClass: 'text-[#1E4620]',
      bgTintClass: 'bg-[#F0F9F1]',
      borderTintClass: 'border-[#CBE8CE]',
      barColorHex: '#4D7C0F',
      healthSummary: 'Minor breathing discomfort possible for unusually sensitive people.',
      outdoorGuidance: 'Generally acceptable for outdoor activity; sensitive individuals should monitor symptoms.',
      ventilationAdvice: 'Brief cross-ventilation is fine; avoid ventilating directly facing busy arterial roads during rush hour.',
    },
  },
  {
    maxAqi: 200,
    meta: {
      key: 'moderate',
      label: 'Moderate',
      rangeLabel: '101–200',
      severityLevel: 3,
      textColorClass: 'text-[#854D0E]',
      bgTintClass: 'bg-[#FEFCE8]',
      borderTintClass: 'border-[#FDE047]',
      barColorHex: '#CA8A04',
      healthSummary: 'Breathing discomfort possible for people with lung or heart conditions, children, and older adults.',
      outdoorGuidance: 'Reduce prolonged or vigorous outdoor exertion, especially near heavy traffic.',
      ventilationAdvice: 'Limit open windows to the lowest-pollution midday window; run kitchen exhaust while cooking.',
    },
  },
  {
    maxAqi: 300,
    meta: {
      key: 'poor',
      label: 'Poor',
      rangeLabel: '201–300',
      severityLevel: 4,
      textColorClass: 'text-[#9A3412]',
      bgTintClass: 'bg-[#FFF7ED]',
      borderTintClass: 'border-[#FDBA74]',
      barColorHex: '#EA580C',
      healthSummary: 'Breathing discomfort likely on prolonged exposure for most people, and heightened risk for sensitive groups.',
      outdoorGuidance: 'Shift exercise indoors. Consider a well-fitting N95/FFP2 respirator if prolonged outdoor commuting is unavoidable.',
      ventilationAdvice: 'Keep windows mostly closed; outdoor ventilation can raise indoor PM2.5. Use HEPA filtration if available.',
    },
  },
  {
    maxAqi: 400,
    meta: {
      key: 'very_poor',
      label: 'Very Poor',
      rangeLabel: '301–400',
      severityLevel: 5,
      textColorClass: 'text-[#991B1B]',
      bgTintClass: 'bg-[#FEF2F2]',
      borderTintClass: 'border-[#FCA5A5]',
      barColorHex: '#DC2626',
      healthSummary: 'Respiratory illness risk increases on prolonged exposure. Pronounced impact on people with lung or heart disease.',
      outdoorGuidance: 'Avoid strenuous outdoor activity. Keep children, pregnant individuals, and older adults indoors as much as practical.',
      ventilationAdvice: 'Keep windows and exterior doors closed. Run HEPA air purification continuously and avoid indoor smoke sources.',
      officialAdvisoryNote: 'Follow local municipal GRAP / CPCB advisories and consult a clinician if respiratory symptoms occur.',
    },
  },
  {
    maxAqi: Number.POSITIVE_INFINITY,
    legendRange: '401–500',
    meta: {
      key: 'severe',
      label: 'Severe',
      rangeLabel: '401–500+',
      severityLevel: 6,
      textColorClass: 'text-[#7F1D1D]',
      bgTintClass: 'bg-[#FDF2F4]',
      borderTintClass: 'border-[#F87171]',
      barColorHex: '#991B1B',
      healthSummary: 'Serious health risk even for healthy individuals; severe impact on those with existing respiratory or cardiac conditions.',
      outdoorGuidance: 'Avoid non-essential outdoor exposure. Prioritize official public-health and school/work advisories.',
      ventilationAdvice: 'Do NOT open windows for ventilation. Seal obvious door/window draft gaps and run HEPA filtration on high.',
      officialAdvisoryNote: 'Severe pollution event: Follow official CPCB, state pollution board, and public-health emergency directives immediately.',
    },
  },
];

const US_EPA_BANDS: readonly AQICategoryBand[] = [
  {
    maxAqi: 50,
    meta: {
      key: 'good',
      label: 'Good',
      rangeLabel: '0–50',
      severityLevel: 1,
      textColorClass: 'text-[#14532D]',
      bgTintClass: 'bg-[#ECFDF3]',
      borderTintClass: 'border-[#BBF7D0]',
      barColorHex: '#15803D',
      healthSummary: 'Air quality is satisfactory with little or no risk from air pollution.',
      outdoorGuidance: 'Ideal conditions for outdoor exercise, walking, and cycling.',
      ventilationAdvice: 'Favorable to open windows for fresh air circulation.',
    },
  },
  {
    maxAqi: 100,
    meta: {
      key: 'moderate',
      label: 'Moderate',
      rangeLabel: '51–100',
      severityLevel: 2,
      textColorClass: 'text-[#854D0E]',
      bgTintClass: 'bg-[#FEFCE8]',
      borderTintClass: 'border-[#FDE047]',
      barColorHex: '#CA8A04',
      healthSummary: 'Acceptable air quality; unusually sensitive individuals may experience mild symptoms.',
      outdoorGuidance: 'Outdoor activity is generally fine; unusually sensitive people may shorten intense workouts.',
      ventilationAdvice: 'Short ventilation windows are acceptable away from rush-hour traffic.',
    },
  },
  {
    maxAqi: 150,
    legendLabel: 'Sensitive',
    meta: {
      key: 'usg',
      label: 'Unhealthy for Sensitive Groups',
      rangeLabel: '101–150',
      severityLevel: 3,
      textColorClass: 'text-[#9A3412]',
      bgTintClass: 'bg-[#FFF7ED]',
      borderTintClass: 'border-[#FDBA74]',
      barColorHex: '#EA580C',
      healthSummary: 'Sensitive groups (children, older adults, asthma/heart conditions) may experience health effects.',
      outdoorGuidance: 'Sensitive groups should reduce prolonged or heavy outdoor exertion.',
      ventilationAdvice: 'Limit open windows when PM2.5 peaks; run kitchen exhaust fans while cooking.',
    },
  },
  {
    maxAqi: 200,
    meta: {
      key: 'unhealthy',
      label: 'Unhealthy',
      rangeLabel: '151–200',
      severityLevel: 4,
      textColorClass: 'text-[#991B1B]',
      bgTintClass: 'bg-[#FEF2F2]',
      borderTintClass: 'border-[#FCA5A5]',
      barColorHex: '#DC2626',
      healthSummary: 'Everyone may begin to experience health effects; sensitive groups face more serious impacts.',
      outdoorGuidance: 'Move vigorous exercise indoors and shorten outdoor time.',
      ventilationAdvice: 'Keep windows closed and use HEPA filtration indoors where available.',
    },
  },
  {
    maxAqi: 300,
    meta: {
      key: 'very_unhealthy',
      label: 'Very Unhealthy',
      rangeLabel: '201–300',
      severityLevel: 5,
      textColorClass: 'text-[#6B21A8]',
      bgTintClass: 'bg-[#FAF5FF]',
      borderTintClass: 'border-[#D8B4FE]',
      barColorHex: '#7E22CE',
      healthSummary: 'Health alert: risk of health effects is increased for everyone.',
      outdoorGuidance: 'Avoid strenuous outdoor activity; sensitive groups should remain indoors.',
      ventilationAdvice: 'Keep windows sealed closed and operate HEPA air purifiers continuously.',
      officialAdvisoryNote: 'Monitor official AirNow and local public-health agency advisories.',
    },
  },
  {
    maxAqi: Number.POSITIVE_INFINITY,
    meta: {
      key: 'hazardous',
      label: 'Hazardous',
      rangeLabel: '301–500',
      severityLevel: 6,
      textColorClass: 'text-[#7F1D1D]',
      bgTintClass: 'bg-[#FDF2F4]',
      borderTintClass: 'border-[#F87171]',
      barColorHex: '#881337',
      healthSummary: 'Health warning of emergency conditions: everyone is more likely to be affected.',
      outdoorGuidance: 'Stay indoors and avoid all outdoor physical activity.',
      ventilationAdvice: 'Do NOT open windows. Create a clean indoor room with HEPA filtration.',
      officialAdvisoryNote: 'Emergency pollution levels: Follow official local health authority instructions.',
    },
  },
];

const AQI_BANDS_BY_STANDARD: Record<AQIStandard, readonly AQICategoryBand[]> = {
  INDIA_CPCB: INDIA_CPCB_BANDS,
  US_EPA: US_EPA_BANDS,
};

function toScaleLegend(bands: readonly AQICategoryBand[]): readonly AQIScaleLegendBand[] {
  return bands.map((band) => ({
    label: band.legendLabel ?? band.meta.label,
    range: band.legendRange ?? band.meta.rangeLabel,
    color: band.meta.barColorHex,
  }));
}

const AQI_SCALE_LEGENDS: Record<AQIStandard, readonly AQIScaleLegendBand[]> = {
  INDIA_CPCB: toScaleLegend(INDIA_CPCB_BANDS),
  US_EPA: toScaleLegend(US_EPA_BANDS),
};

export function classifyAQI(aqi: number, standard: AQIStandard): AQICategoryMeta {
  const safeAqi = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  const bands = AQI_BANDS_BY_STANDARD[standard];
  const matched = bands.find((band) => safeAqi <= band.maxAqi) ?? bands[bands.length - 1];
  return { ...matched.meta };
}

export function getAQIScaleLegend(standard: AQIStandard): readonly AQIScaleLegendBand[] {
  return AQI_SCALE_LEGENDS[standard];
}

export function getDefaultStandardForCountry(countryCode: string): AQIStandard {
  return countryCode.toUpperCase() === 'IN' ? 'INDIA_CPCB' : 'US_EPA';
}

export function formatLocationLabel(location: { name: string; country: string }): string {
  return `${location.name}, ${location.country}`;
}

export function isValidAQIValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 500;
}

export function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog / Winter haze';
  if (code >= 51 && code <= 57) return 'Light drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Hazy conditions';
}

export function findBestVentilationWindow(
  hourly: Array<{ hourLabel: string; aqi: number; pm25: number; isForecast: boolean }>
): { windowLabel: string; minAqi: number; safeToVentilate: boolean } {
  const upcoming = hourly.filter((h) => h.isForecast).slice(0, 18);
  const pool = upcoming.length > 0 ? upcoming : hourly;
  if (pool.length === 0) {
    return { windowLabel: 'Midday (13:00–15:00)', minAqi: 150, safeToVentilate: false };
  }
  const best = pool.reduce((min, item) => (item.aqi < min.aqi ? item : min), pool[0]);
  return {
    windowLabel: best.hourLabel,
    minAqi: best.aqi,
    safeToVentilate: best.aqi <= 120 && best.pm25 <= 45,
  };
}
