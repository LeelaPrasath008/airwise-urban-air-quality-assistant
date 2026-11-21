export type AQIStandard = 'INDIA_CPCB' | 'US_EPA';

export type NavSection =
  | 'dashboard'
  | 'planner'
  | 'indoor'
  | 'alternatives'
  | 'assistant'
  | 'community'
  | 'impact';

export interface GeoLocation {
  id: string;
  name: string;
  region?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isDemoFallback?: boolean;
}

export interface PollutantReadings {
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  no2?: number; // µg/m³
  so2?: number; // µg/m³
  o3?: number;  // µg/m³
  co?: number;  // µg/m³
}

export interface WeatherReadings {
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  weatherCode: number;
  conditionLabel: string;
}

export interface HourlyAirPoint {
  timeIso: string;
  hourLabel: string;
  pm25: number;
  pm10: number;
  aqi: number;
  isForecast: boolean;
}

export interface AQICategoryMeta {
  key: string;
  label: string;
  rangeLabel: string;
  severityLevel: 1 | 2 | 3 | 4 | 5 | 6;
  textColorClass: string;
  bgTintClass: string;
  borderTintClass: string;
  barColorHex: string;
  healthSummary: string;
  outdoorGuidance: string;
  ventilationAdvice: string;
  officialAdvisoryNote?: string;
}

export interface AirQualitySnapshot {
  location: GeoLocation;
  standard: AQIStandard;
  aqi: number;
  dominantPollutant: string;
  category: AQICategoryMeta;
  pollutants: PollutantReadings;
  weather: WeatherReadings;
  hourlyTrend: HourlyAirPoint[];
  lastUpdatedIso: string;
  dataSource: string;
  isLive: boolean;
  isDemonstrationData: boolean;
  cacheHit?: boolean;
  disclaimer: string;
}

export interface EnvironmentalContext {
  locationName: string;
  standard: AQIStandard;
  aqi: number;
  categoryLabel: string;
  pm25: number;
  pm10: number;
  temperatureC: number;
  humidityPercent: number;
  weatherCondition: string;
}

export interface LifestyleProfile {
  occupation: string;
  typicalCommute: 'car_solo' | 'carpool' | 'public_transit' | 'two_wheeler' | 'walk_cycle' | 'remote';
  worksOutdoors: boolean;
  householdSize: number;
  indoorVentilation: 'natural_windows' | 'exhaust_fans' | 'hvac_filtered' | 'hepa_purifier';
  preferredTransport: 'metro_bus' | 'walk_cycle' | 'ev_shared' | 'flexible';
  householdNotes: string;
}

export interface RoutineRecommendation {
  id: string;
  title: string;
  whatToDo: string;
  whyRecommended: string;
  howToImplement: string;
  environmentalBenefit: string;
  healthConsideration: string;
  effortOrCost: string;
  impactCategory?: ActionCategory;
}

export interface DailyRoutinePlan {
  generatedAtIso: string;
  locationName: string;
  aqiAtGeneration: number;
  standard: AQIStandard;
  source: 'gemini_ai' | 'rule_based_fallback';
  fallbackReason?: string;
  summary: string;
  morning: RoutineRecommendation[];
  afternoon: RoutineRecommendation[];
  evening: RoutineRecommendation[];
  disclaimer: string;
}

export interface IndoorAuditInput {
  roomType: 'living_room' | 'bedroom' | 'kitchen' | 'home_office' | 'whole_home';
  hasHepaPurifier: boolean;
  hasKitchenExhaust: boolean;
  cookingFuel: 'lpg_gas' | 'induction_electric' | 'biomass_solid';
  usesIncenseOrCandles: boolean;
  dustyEnvironment: boolean;
  roomAreaSqFt: number;
}

export interface IndoorRecommendation {
  id: string;
  title: string;
  evidenceTier: 'evidence_based' | 'general_practical';
  evidenceSource: string;
  priority: 'high' | 'medium' | 'standard';
  action: string;
  rationale: string;
  implementationSteps: string[];
}

export type AlternativeDomain =
  | 'commuting'
  | 'energy'
  | 'waste'
  | 'deliveries'
  | 'single_use'
  | 'heating_cooking';

export interface SustainableAlternative {
  id: string;
  domain: AlternativeDomain;
  originalActivity: string;
  recommendedAlternative: string;
  whyBetter: string;
  estimatedEmissionsReduction: string;
  estimateBasisAndAssumptions: string;
  estimatedCostDifference: string;
  practicalImplementation: string[];
  suitabilityNote: string;
  defaultCo2SavedKg: number;
  impactCategory: ActionCategory;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestampIso: string;
  source?: 'gemini_ai' | 'rule_based_fallback';
  fallbackNotice?: string;
}

export const ACTION_CATEGORIES = [
  'public_transit',
  'active_travel',
  'energy_saving',
  'waste_reduction',
  'reusable_swap',
  'clean_indoor_air',
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export interface TrackedAction {
  id: string;
  category: ActionCategory;
  title: string;
  quantity: number;
  unit: string;
  dateIso: string;
  estimatedCo2SavedKg: number;
  assumptionNote: string;
  notes?: string;
}

export interface CommunityInitiative {
  id: string;
  title: string;
  category: 'commute' | 'waste' | 'schools' | 'energy' | 'greenery';
  summary: string;
  householdSteps: string[];
  neighborhoodSteps: string[];
  estimatedPerHouseholdMonthlyCo2Kg: number;
  calculationBasis: string;
}

export interface AlertPreferences {
  enabled: boolean;
  minSeverityLevel: 3 | 4 | 5; // 3=Moderate, 4=Poor, 5=Very Poor/Severe
  outdoorActivityWarnings: boolean;
  ventilationChangeAlerts: boolean;
}
