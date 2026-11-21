import type { IndoorAuditInput, IndoorRecommendation } from '../types.ts';

export type VentilationStatus = 'close_windows' | 'brief_window' | 'open_windows';

export interface VentilationWindowInfo {
  windowLabel: string;
  minAqi: number;
  safeToVentilate: boolean;
}

export interface IndoorAirPlan {
  ventilationStatus: VentilationStatus;
  ventilationHeadline: string;
  ventilationExplanation: string;
  recommendedCadrM3h: number;
  recommendations: IndoorRecommendation[];
  safetyWarnings: string[];
}

const SQ_FT_TO_SQ_M = 0.0929;
const MIN_ROOM_AREA_SQ_M = 8;
const ASSUMED_CEILING_HEIGHT_M = 2.6;
const TARGET_AIR_CHANGES_PER_HOUR = 4.8;

const INDOOR_SAFETY_WARNINGS: readonly string[] = [
  'Do NOT use ozone generators or uncertified "air ionizers" marketed as air purifiers — ozone is a lung irritant that worsens asthma and respiratory inflammation.',
  'Do NOT burn camphor, herbs, essential oils, or charcoal indoors to "purify" air — burning any organic material adds PM2.5 and combustion gases.',
  'Do NOT spray unverified chemical disinfectants, bleach mists, or synthetic air fresheners to clear smog — they release irritating VOCs without removing particulate matter.',
  'Houseplants improve indoor comfort, but controlled scientific studies show typical home plants cannot meaningfully replace HEPA filtration or source control during severe smog.',
];

function calculateRecommendedCadr(roomAreaSqFt: number): number {
  const roomAreaSqM = Math.max(MIN_ROOM_AREA_SQ_M, roomAreaSqFt * SQ_FT_TO_SQ_M);
  return Math.round(roomAreaSqM * ASSUMED_CEILING_HEIGHT_M * TARGET_AIR_CHANGES_PER_HOUR);
}

function resolveVentilationGuidance(
  outdoorAqi: number,
  bestVentWindow: VentilationWindowInfo
): {
  ventilationStatus: VentilationStatus;
  ventilationHeadline: string;
  ventilationExplanation: string;
} {
  if (outdoorAqi > 150) {
    return {
      ventilationStatus: 'close_windows',
      ventilationHeadline: 'Keep windows closed — outdoor ventilation will worsen indoor PM2.5',
      ventilationExplanation: `At AQI ${outdoorAqi}, bringing unfiltered outdoor air inside introduces fine particulate matter faster than indoor surfaces settle it. Keep exterior windows and doors closed${
        bestVentWindow.safeToVentilate
          ? `, and limit any brief airing to ${bestVentWindow.windowLabel} (forecast AQI ~${bestVentWindow.minAqi}).`
          : ' until outdoor pollution subsides, and rely on HEPA filtration if available.'
      }`,
    };
  }

  if (outdoorAqi > 90) {
    return {
      ventilationStatus: 'brief_window',
      ventilationHeadline: 'Use timed, selective ventilation only during cleaner hours',
      ventilationExplanation: `Outdoor AQI is currently ${outdoorAqi}. Avoid opening windows facing busy roads during morning and evening rush hours. Best forecast window for brief 10–15 min airing: ${bestVentWindow.windowLabel} (AQI ~${bestVentWindow.minAqi}).`,
    };
  }

  return {
    ventilationStatus: 'open_windows',
    ventilationHeadline: 'Outdoor air is suitable for natural cross-ventilation',
    ventilationExplanation:
      'Current outdoor AQI is low enough that opening opposite windows for 15–20 minutes refreshes indoor air and lowers indoor CO2.',
  };
}

function buildKitchenRecommendation(input: IndoorAuditInput): IndoorRecommendation {
  if (input.cookingFuel === 'biomass_solid' || !input.hasKitchenExhaust || input.roomType === 'kitchen') {
    return {
      id: 'ind-kitchen',
      title: 'Capture cooking smoke & NO2 at the source',
      evidenceTier: 'evidence_based',
      evidenceSource: 'WHO Guidelines for Indoor Air Quality: Household Fuel Combustion',
      priority: 'high',
      action:
        input.cookingFuel === 'biomass_solid'
          ? 'Transition away from indoor solid fuel/biomass burning immediately and vent all cooking smoke outdoors.'
          : 'Run a ducted kitchen chimney or exhaust fan every time you fry, boil, or use gas burners, and keep the kitchen door closed.',
      rationale:
        'High-heat cooking, frying oils, and gas combustion produce rapid indoor PM2.5 and nitrogen dioxide (NO2) peaks that can exceed severe outdoor smog levels inside an unvented kitchen.',
      implementationSteps: [
        'Turn on the exhaust fan before lighting the stove and leave it on for 10 minutes after finishing.',
        'Cook on back burners where range-hood capture efficiency is highest.',
        'Use lids on pots and lower oil smoke-point temperatures.',
      ],
    };
  }

  return {
    id: 'ind-kitchen-routine',
    title: 'Maintain consistent kitchen exhaust habits',
    evidenceTier: 'evidence_based',
    evidenceSource: 'US EPA Indoor Particulate Control',
    priority: 'medium',
    action: 'Continue running your kitchen exhaust fan during and 10 minutes after every cooking session.',
    rationale: 'Even with clean LPG or induction stoves, high-temperature frying releases ultrafine cooking aerosols.',
    implementationSteps: [
      'Clean mesh grease baffles monthly so exhaust suction stays effective.',
      'Keep bedroom doors closed while frying or tempering spices.',
    ],
  };
}

/**
 * Generates evidence-based vs. general indoor air quality guidance tailored to outdoor AQI and household setup.
 * Explicitly avoids dangerous DIY purification, ozone generators, or burning substances.
 */
export function generateIndoorRecommendations(
  input: IndoorAuditInput,
  outdoorAqi: number,
  bestVentWindow: VentilationWindowInfo
): IndoorAirPlan {
  const recommendedCadrM3h = calculateRecommendedCadr(input.roomAreaSqFt);
  const { ventilationStatus, ventilationHeadline, ventilationExplanation } =
    resolveVentilationGuidance(outdoorAqi, bestVentWindow);

  const recommendations: IndoorRecommendation[] = [
    {
      id: 'ind-ventilation',
      title:
        ventilationStatus === 'close_windows'
          ? 'Pause natural window ventilation & seal draft gaps'
          : 'Time cross-ventilation around lower-pollution hours',
      evidenceTier: 'evidence_based',
      evidenceSource: 'US EPA Indoor Air Quality & WHO Household Air Guidelines',
      priority: 'high',
      action:
        ventilationStatus === 'close_windows'
          ? 'Keep exterior windows closed and seal visible door/window gaps with silicone or foam weatherstripping.'
          : `Ventilate briefly around ${bestVentWindow.windowLabel} when outdoor particulate levels dip.`,
      rationale:
        'Outdoor ventilation is only beneficial when outdoor pollutant concentrations are lower than indoor air. During winter smog episodes, infiltration through loose window frames can carry 50–70% of outdoor PM2.5 indoors.',
      implementationSteps: [
        'Check the AIRWISE hourly trend before opening windows.',
        'Place draft stoppers under exterior doors facing corridors or streets.',
        'If indoor CO2 feels stuffy during prolonged smog, crack a window away from traffic for 5 minutes while running a HEPA purifier.',
      ],
    },
    {
      id: 'ind-hepa',
      title: input.hasHepaPurifier
        ? 'Optimize your HEPA purifier placement and filter schedule'
        : `Size a True HEPA (H13/H14) purifier for your ${input.roomAreaSqFt} sq ft space`,
      evidenceTier: 'evidence_based',
      evidenceSource: 'EPA Guide to Air Cleaners in the Home & ASHRAE Filtration Guidance',
      priority: outdoorAqi > 150 ? 'high' : 'medium',
      action: input.hasHepaPurifier
        ? `Run your HEPA unit continuously on medium/auto (target CADR ~${recommendedCadrM3h} m³/h for ${input.roomAreaSqFt} sq ft) with doors closed.`
        : `If purchasing a purifier, look for True HEPA (H13/H14) mechanical filtration with CADR at least ${recommendedCadrM3h} m³/h and zero ozone generation.`,
      rationale:
        'Certified True HEPA filters mechanically capture ≥99.97% of 0.3-micron airborne particles, directly lowering indoor PM2.5 during severe winter smog without producing harmful chemical byproducts.',
      implementationSteps: [
        'Position the unit at least 30 cm away from walls and curtains so intake airflow is unobstructed.',
        'Vacuum the washable pre-filter gently every 2 weeks during winter smog season.',
        'Replace the HEPA cartridge per manufacturer hours or when visibly dark gray — never wash paper HEPA media.',
        'Disable any optional "ionizer" or "plasma/ozone" mode on the purifier.',
      ],
    },
    buildKitchenRecommendation(input),
  ];

  if (input.usesIncenseOrCandles) {
    recommendations.push({
      id: 'ind-smoke',
      title: 'Eliminate indoor incense, dhoop, mosquito coils, and scented candles',
      evidenceTier: 'evidence_based',
      evidenceSource: 'WHO & peer-reviewed indoor combustion exposure studies',
      priority: 'high',
      action: 'Pause burning incense sticks, dhoop, scented candles, and smoldering mosquito coils indoors, especially when windows are closed.',
      rationale:
        'Smoldering combustion inside a closed winter room rapidly elevates PM2.5, carbon monoxide, and volatile organic compounds right where families breathe.',
      implementationSteps: [
        'Use physical window mesh screens or electric liquid vaporizers/nets instead of smoldering coils.',
        'Replace scented candles with beeswax-free LED ambient lights during high-AQI weeks.',
        'Keep any ceremonial lamps minimal and placed near an active exhaust vent.',
      ],
    });
  }

  recommendations.push(
    {
      id: 'ind-cleaning',
      title: 'Switch from dry sweeping to damp mopping and microfiber wiping',
      evidenceTier: 'evidence_based',
      evidenceSource: 'EPA Residential Dust & Particulate Control',
      priority: input.dustyEnvironment ? 'high' : 'medium',
      action: 'Damp-mop hard floors and wipe horizontal surfaces with slightly moistened microfiber cloths instead of dry brooms or feather dusters.',
      rationale:
        'Dry sweeping kicks settled coarse PM10 and fine particles back into the breathing zone for hours.',
      implementationSteps: [
        'Leave outdoor shoes at the entrance mat to stop tracked street dust and soot.',
        'Wash bedding and curtains in warm water every 1–2 weeks to lower accumulated dust.',
        'If vacuuming carpets, use a vacuum equipped with a sealed HEPA exhaust filter.',
      ],
    },
    {
      id: 'ind-general-layout',
      title: 'Create one designated "clean-air sleep room" for winter smog nights',
      evidenceTier: 'general_practical',
      evidenceSource: 'Practical household air-quality management strategy',
      priority: 'standard',
      action: 'Focus sealing and filtration resources on the primary bedroom where family members spend 7–9 hours overnight.',
      rationale:
        'When filtering an entire home is costly, concentrating HEPA filtration and draft sealing in bedrooms maximizes daily exposure reduction per rupee/dollar spent.',
      implementationSteps: [
        'Keep the bedroom door shut at night while the purifier runs on quiet/sleep speed.',
        'Keep clutter and dusty textiles out of the bedroom to simplify damp cleaning.',
        'Avoid drying damp laundry indoors without dehumidification, as excess humidity (>60%) promotes mold.',
      ],
    }
  );

  return {
    ventilationStatus,
    ventilationHeadline,
    ventilationExplanation,
    recommendedCadrM3h,
    recommendations,
    safetyWarnings: [...INDOOR_SAFETY_WARNINGS],
  };
}
