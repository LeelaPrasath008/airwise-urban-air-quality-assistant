// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  calculateAQI,
  classifyAQI,
  findBestVentilationWindow,
  formatLocationLabel,
  getAQIScaleLegend,
  getDefaultStandardForCountry,
  isValidAQIValue,
  weatherCodeToLabel,
} from '../../src/shared/aqi.ts';
import {
  ACTION_ESTIMATE_FACTORS,
  COMMUNITY_INITIATIVES,
  computeImpactSummary,
  generateIndoorRecommendations,
  SUSTAINABLE_ALTERNATIVES,
} from '../../src/shared/sustainability.ts';
import { ACTION_ESTIMATE_FACTORS as DIRECT_FACTORS } from '../../src/shared/sustainability/factors.ts';
import { SUSTAINABLE_ALTERNATIVES as DIRECT_ALTERNATIVES } from '../../src/shared/sustainability/alternatives.ts';
import { COMMUNITY_INITIATIVES as DIRECT_COMMUNITY } from '../../src/shared/sustainability/community.ts';
import { generateIndoorRecommendations as directGenerateIndoor } from '../../src/shared/sustainability/indoor.ts';
import { computeImpactSummary as directComputeImpact } from '../../src/shared/sustainability/impact.ts';
import {
  AirQualityQuerySchema,
  ChatRequestSchema,
  LifestyleProfileSchema,
  sanitizePlainText,
  TrackedActionInputSchema,
} from '../../src/shared/validation.ts';
import { BoundedTTLCache } from '../../server/cache.ts';
import type { TrackedAction } from '../../src/shared/types.ts';

describe('AQI Calculation & Classification (Indian CPCB & US EPA)', () => {
  it('computes Indian CPCB PM2.5 sub-index accurately across all 6 bands', () => {
    expect(calculateAQI({ pm25: 15, pm10: 20 }, 'INDIA_CPCB').aqi).toBe(25);
    expect(calculateAQI({ pm25: 45, pm10: 50 }, 'INDIA_CPCB').aqi).toBe(75);
    expect(calculateAQI({ pm25: 75, pm10: 80 }, 'INDIA_CPCB').aqi).toBe(149);
    expect(calculateAQI({ pm25: 105, pm10: 120 }, 'INDIA_CPCB').aqi).toBe(249);
    expect(calculateAQI({ pm25: 185, pm10: 200 }, 'INDIA_CPCB').aqi).toBe(350);
    expect(calculateAQI({ pm25: 320, pm10: 350 }, 'INDIA_CPCB').aqi).toBe(428);
  });

  it('computes Indian CPCB SO2 and CO (mg/m3) sub-indices and identifies dominant pollutant', () => {
    const so2Dominant = calculateAQI({ pm25: 20, pm10: 30, so2: 900 }, 'INDIA_CPCB');
    expect(so2Dominant.dominantPollutant).toBe('SO2');
    expect(so2Dominant.aqi).toBeGreaterThanOrEqual(301);

    // Open-Meteo provides CO in µg/m³ (18,000 µg/m³ = 18 mg/m³, Very Poor band in CPCB)
    const coDominant = calculateAQI({ pm25: 15, pm10: 25, co: 18000 }, 'INDIA_CPCB');
    expect(coDominant.dominantPollutant).toBe('CO');
    expect(coDominant.aqi).toBeGreaterThanOrEqual(301);
  });

  it('handles gap, zero, negative, NaN, and extreme AQI concentrations safely', () => {
    expect(calculateAQI({ pm25: 0, pm10: 0 }, 'INDIA_CPCB').aqi).toBe(0);
    expect(calculateAQI({ pm25: 30, pm10: 20 }, 'INDIA_CPCB').aqi).toBe(50);
    // Gap between 30 and 31 resolves cleanly without falling through to 500
    expect(calculateAQI({ pm25: 30.4, pm10: 20 }, 'INDIA_CPCB').aqi).toBe(50);
    expect(calculateAQI({ pm25: 31, pm10: 20 }, 'INDIA_CPCB').aqi).toBe(51);
    // Extreme and invalid numbers remain clamped inside [0, 500]
    expect(calculateAQI({ pm25: 999, pm10: 999 }, 'INDIA_CPCB').aqi).toBe(500);
    expect(calculateAQI({ pm25: -5, pm10: Number.NaN }, 'INDIA_CPCB').aqi).toBe(0);
    expect(classifyAQI(Number.NaN, 'INDIA_CPCB').label).toBe('Good');
  });

  it('classifies all six Indian National AQI categories correctly', () => {
    expect(classifyAQI(35, 'INDIA_CPCB').label).toBe('Good');
    expect(classifyAQI(80, 'INDIA_CPCB').label).toBe('Satisfactory');
    expect(classifyAQI(150, 'INDIA_CPCB').label).toBe('Moderate');
    expect(classifyAQI(250, 'INDIA_CPCB').label).toBe('Poor');
    expect(classifyAQI(350, 'INDIA_CPCB').label).toBe('Very Poor');
    expect(classifyAQI(450, 'INDIA_CPCB').label).toBe('Severe');
    expect(classifyAQI(450, 'INDIA_CPCB').officialAdvisoryNote).toContain('CPCB');
  });

  it('classifies US EPA AQI categories and selects default standard by country', () => {
    expect(getDefaultStandardForCountry('IN')).toBe('INDIA_CPCB');
    expect(getDefaultStandardForCountry('US')).toBe('US_EPA');
    expect(formatLocationLabel({ name: 'New Delhi', country: 'India' })).toBe('New Delhi, India');
    expect(classifyAQI(42, 'US_EPA').label).toBe('Good');
    expect(classifyAQI(125, 'US_EPA').label).toBe('Unhealthy for Sensitive Groups');
    expect(classifyAQI(340, 'US_EPA').label).toBe('Hazardous');
  });

  it('enforces exact Indian CPCB and US EPA classification boundaries and invalid value fallbacks', () => {
    const cpcbBoundaries: Array<[number, string, number]> = [
      [-10, 'Good', 1],
      [0, 'Good', 1],
      [50, 'Good', 1],
      [51, 'Satisfactory', 2],
      [100, 'Satisfactory', 2],
      [101, 'Moderate', 3],
      [200, 'Moderate', 3],
      [201, 'Poor', 4],
      [300, 'Poor', 4],
      [301, 'Very Poor', 5],
      [400, 'Very Poor', 5],
      [401, 'Severe', 6],
      [500, 'Severe', 6],
      [750, 'Severe', 6],
    ];
    for (const [aqi, expectedLabel, expectedSeverity] of cpcbBoundaries) {
      const cat = classifyAQI(aqi, 'INDIA_CPCB');
      expect(cat.label, `CPCB AQI ${aqi}`).toBe(expectedLabel);
      expect(cat.severityLevel, `CPCB severity ${aqi}`).toBe(expectedSeverity);
    }

    const usEpaBoundaries: Array<[number, string, number]> = [
      [-5, 'Good', 1],
      [0, 'Good', 1],
      [50, 'Good', 1],
      [51, 'Moderate', 2],
      [100, 'Moderate', 2],
      [101, 'Unhealthy for Sensitive Groups', 3],
      [150, 'Unhealthy for Sensitive Groups', 3],
      [151, 'Unhealthy', 4],
      [200, 'Unhealthy', 4],
      [201, 'Very Unhealthy', 5],
      [300, 'Very Unhealthy', 5],
      [301, 'Hazardous', 6],
      [500, 'Hazardous', 6],
      [750, 'Hazardous', 6],
    ];
    for (const [aqi, expectedLabel, expectedSeverity] of usEpaBoundaries) {
      const cat = classifyAQI(aqi, 'US_EPA');
      expect(cat.label, `US EPA AQI ${aqi}`).toBe(expectedLabel);
      expect(cat.severityLevel, `US EPA severity ${aqi}`).toBe(expectedSeverity);
    }

    expect(classifyAQI(Number.NaN, 'US_EPA').label).toBe('Good');
    expect(classifyAQI(Number.POSITIVE_INFINITY, 'INDIA_CPCB').label).toBe('Good');
  });

  it('derives 6-band AQI scale legends for CPCB and US EPA directly from shared band definitions', () => {
    const cpcbLegend = getAQIScaleLegend('INDIA_CPCB');
    expect(cpcbLegend).toEqual([
      { label: 'Good', range: '0–50', color: '#15803D' },
      { label: 'Satisfactory', range: '51–100', color: '#4D7C0F' },
      { label: 'Moderate', range: '101–200', color: '#CA8A04' },
      { label: 'Poor', range: '201–300', color: '#EA580C' },
      { label: 'Very Poor', range: '301–400', color: '#DC2626' },
      { label: 'Severe', range: '401–500', color: '#991B1B' },
    ]);

    const usEpaLegend = getAQIScaleLegend('US_EPA');
    expect(usEpaLegend).toEqual([
      { label: 'Good', range: '0–50', color: '#15803D' },
      { label: 'Moderate', range: '51–100', color: '#CA8A04' },
      { label: 'Sensitive', range: '101–150', color: '#EA580C' },
      { label: 'Unhealthy', range: '151–200', color: '#DC2626' },
      { label: 'Very Unhealthy', range: '201–300', color: '#7E22CE' },
      { label: 'Hazardous', range: '301–500', color: '#881337' },
    ]);
  });

  it('validates AQI numeric boundaries cleanly', () => {
    expect(isValidAQIValue(0)).toBe(true);
    expect(isValidAQIValue(500)).toBe(true);
    expect(isValidAQIValue(-1)).toBe(false);
    expect(isValidAQIValue(501)).toBe(false);
    expect(isValidAQIValue(Number.NaN)).toBe(false);
    expect(isValidAQIValue('200')).toBe(false);
  });

  it('maps WMO weather codes and resolves ventilation window edge cases', () => {
    expect(weatherCodeToLabel(0)).toBe('Clear sky');
    expect(weatherCodeToLabel(45)).toBe('Fog / Winter haze');
    expect(weatherCodeToLabel(63)).toBe('Rain');
    expect(weatherCodeToLabel(95)).toBe('Thunderstorm');
    expect(weatherCodeToLabel(999)).toBe('Thunderstorm');
    expect(weatherCodeToLabel(20)).toBe('Hazy conditions');

    const emptyWindow = findBestVentilationWindow([]);
    expect(emptyWindow.safeToVentilate).toBe(false);
    expect(emptyWindow.windowLabel).toContain('Midday');

    const forecastWindow = findBestVentilationWindow([
      { hourLabel: '07:00', aqi: 40, pm25: 15, isForecast: false },
      { hourLabel: '13:00', aqi: 85, pm25: 32, isForecast: true },
      { hourLabel: '16:00', aqi: 140, pm25: 55, isForecast: true },
    ]);
    expect(forecastWindow.windowLabel).toBe('13:00');
    expect(forecastWindow.safeToVentilate).toBe(true);
  });
});

describe('BoundedTTLCache Memory & Expiration Controls', () => {
  it('evicts oldest entry at capacity and expires stale entries after TTL', () => {
    vi.useFakeTimers();
    try {
      const cache = new BoundedTTLCache<string>(2);
      cache.set('k1', 'v1', 1000);
      cache.set('k2', 'v2', 1000);
      expect(cache.size()).toBe(2);

      // Adding 3rd entry evicts oldest (k1)
      cache.set('k3', 'v3', 1000);
      expect(cache.size()).toBe(2);
      expect(cache.get('k1')).toBeUndefined();
      expect(cache.get('k2')).toBe('v2');
      expect(cache.get('k3')).toBe('v3');

      // Advance past TTL
      vi.advanceTimersByTime(1500);
      expect(cache.get('k2')).toBeUndefined();
      expect(cache.get('k3')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Indoor Air Quality Optimizer & Safety Guardrails', () => {
  it('advises closing windows during high outdoor pollution and provides safety warnings', () => {
    const bestVent = findBestVentilationWindow([
      { hourLabel: '08:00', aqi: 310, pm25: 140, isForecast: false },
      { hourLabel: '14:00', aqi: 240, pm25: 105, isForecast: true },
    ]);

    const result = generateIndoorRecommendations(
      {
        roomType: 'bedroom',
        hasHepaPurifier: false,
        hasKitchenExhaust: false,
        cookingFuel: 'lpg_gas',
        usesIncenseOrCandles: true,
        dustyEnvironment: true,
        roomAreaSqFt: 200,
      },
      290,
      bestVent
    );

    expect(result.ventilationStatus).toBe('close_windows');
    expect(result.recommendedCadrM3h).toBeGreaterThan(200);
    expect(result.recommendations.some((r) => r.evidenceTier === 'evidence_based')).toBe(true);
    expect(result.recommendations.some((r) => r.evidenceTier === 'general_practical')).toBe(true);
    expect(result.safetyWarnings.join(' ').toLowerCase()).toContain('ozone');
    expect(result.safetyWarnings.join(' ').toLowerCase()).toContain('camphor');
  });

  it('allows natural cross-ventilation when outdoor AQI is Good', () => {
    const result = generateIndoorRecommendations(
      {
        roomType: 'living_room',
        hasHepaPurifier: true,
        hasKitchenExhaust: true,
        cookingFuel: 'induction_electric',
        usesIncenseOrCandles: false,
        dustyEnvironment: false,
        roomAreaSqFt: 180,
      },
      40,
      { windowLabel: '13:00', minAqi: 35, safeToVentilate: true }
    );
    expect(result.ventilationStatus).toBe('open_windows');
  });
});

describe('Sustainability Calculations & Alternatives Transparency', () => {
  it('discloses estimate basis and assumptions on every sustainable alternative', () => {
    expect(SUSTAINABLE_ALTERNATIVES.length).toBeGreaterThanOrEqual(6);
    for (const alt of SUSTAINABLE_ALTERNATIVES) {
      expect(alt.estimateBasisAndAssumptions.length).toBeGreaterThan(20);
      expect(alt.practicalImplementation.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('computes weekly, monthly, cumulative CO2e and milestone achievements accurately', () => {
    const fixedNow = new Date('2026-11-20T12:00:00Z');
    const actions: TrackedAction[] = [
      {
        id: '1',
        category: 'public_transit',
        title: 'Metro commute',
        quantity: 2,
        unit: '10 km trip',
        dateIso: '2026-11-19',
        estimatedCo2SavedKg: 2.6,
        assumptionNote: 'Estimate',
      },
      {
        id: '2',
        category: 'energy_saving',
        title: 'Off-peak laundry',
        quantity: 3,
        unit: 'kWh saved',
        dateIso: '2026-11-18',
        estimatedCo2SavedKg: 2.13,
        assumptionNote: 'Estimate',
      },
      {
        id: '3',
        category: 'waste_reduction',
        title: 'Composted garden leaves',
        quantity: 4,
        unit: 'kg diverted',
        dateIso: '2026-11-01',
        estimatedCo2SavedKg: 3.6,
        assumptionNote: 'Estimate',
      },
    ];

    const summary = computeImpactSummary(actions, fixedNow);
    expect(summary.totalActions).toBe(3);
    expect(summary.weeklyActions).toBe(2);
    expect(summary.monthlyActions).toBe(3);
    expect(summary.totalEstimatedCo2Kg).toBeCloseTo(8.33, 2);
    expect(summary.weeklyEstimatedCo2Kg).toBeCloseTo(4.73, 2);
    expect(summary.milestones.find((m) => m.id === 'ms-first')?.achieved).toBe(true);
    expect(summary.milestones.find((m) => m.id === 'ms-diverse')?.achieved).toBe(true);
    expect(summary.milestones.find((m) => m.id === 'ms-co2-25')?.achieved).toBe(false);
  });

  it('preserves backward-compatible barrel exports across all split sustainability modules', () => {
    expect(ACTION_ESTIMATE_FACTORS).toBe(DIRECT_FACTORS);
    expect(SUSTAINABLE_ALTERNATIVES).toBe(DIRECT_ALTERNATIVES);
    expect(COMMUNITY_INITIATIVES).toBe(DIRECT_COMMUNITY);
    expect(generateIndoorRecommendations).toBe(directGenerateIndoor);
    expect(computeImpactSummary).toBe(directComputeImpact);
  });
});

describe('Input Validation & Sanitization', () => {
  it('strips HTML angle brackets and control characters from plain text', () => {
    const dirty = '<script>alert(1)</script>\u0000 Hello\u0007 world ';
    const clean = sanitizePlainText(dirty);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).toContain('Hello world');
  });

  it('rejects out-of-range coordinates and malformed profiles', () => {
    expect(AirQualityQuerySchema.safeParse({ lat: 95, lon: 77 }).success).toBe(false);
    expect(AirQualityQuerySchema.safeParse({ lat: 28.61, lon: 77.2 }).success).toBe(true);
    expect(
      LifestyleProfileSchema.safeParse({
        occupation: 'A',
        typicalCommute: 'car_solo',
        worksOutdoors: false,
        householdSize: 4,
        indoorVentilation: 'exhaust_fans',
        preferredTransport: 'metro_bus',
      }).success
    ).toBe(false);
  });

  it('rejects oversized chat prompts and negative tracked action quantities', () => {
    expect(
      ChatRequestSchema.safeParse({
        message: 'x'.repeat(900),
        context: {
          locationName: 'New Delhi',
          standard: 'INDIA_CPCB',
          aqi: 300,
          categoryLabel: 'Poor',
          pm25: 120,
          pm10: 210,
          temperatureC: 16,
          humidityPercent: 70,
          weatherCondition: 'Hazy',
        },
      }).success
    ).toBe(false);

    expect(
      TrackedActionInputSchema.safeParse({
        category: 'public_transit',
        title: 'Bus',
        quantity: -3,
        dateIso: '2026-11-20',
      }).success
    ).toBe(false);
  });
});

