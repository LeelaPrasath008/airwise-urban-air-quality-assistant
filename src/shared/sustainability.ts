import type {
  ActionCategory,
  CommunityInitiative,
  IndoorAuditInput,
  IndoorRecommendation,
  SustainableAlternative,
  TrackedAction,
} from './types.ts';

/**
 * Transparent emission factor assumptions for user-entered personal action estimates.
 * Sources: UK DEFRA 2024 Conversion Factors, IEA Transport Benchmarks, CEA India Grid Emission Factor (~0.71 kg CO2/kWh).
 * Clearly presented as estimates, never verified sensor measurements.
 */
export const ACTION_ESTIMATE_FACTORS: Record<
  ActionCategory,
  {
    label: string;
    defaultUnit: string;
    co2KgPerUnit: number;
    assumptionSummary: string;
  }
> = {
  public_transit: {
    label: 'Public transit trip instead of solo car',
    defaultUnit: '10 km trip',
    co2KgPerUnit: 1.3,
    assumptionSummary:
      'Estimated ~1.3 kg CO2e saved per 10 km replacing a petrol passenger car (~170 g/km) with metro/bus (~40 g/passenger-km). Actual savings depend on vehicle type and transit grid mix.',
  },
  active_travel: {
    label: 'Walking or cycling instead of motor trip',
    defaultUnit: '5 km trip',
    co2KgPerUnit: 0.85,
    assumptionSummary:
      'Estimated ~0.85 kg CO2e avoided per 5 km replacing an average petrol car (~170 g/km). Only recommended when outdoor AQI permits safe active travel.',
  },
  energy_saving: {
    label: 'Household electricity reduction (off-peak / efficiency)',
    defaultUnit: 'kWh saved',
    co2KgPerUnit: 0.71,
    assumptionSummary:
      'Estimated ~0.71 kg CO2e per kWh based on India CEA weighted average thermal/renewable grid factor; varies by regional electricity grid.',
  },
  waste_reduction: {
    label: 'Composting or avoiding open waste burning',
    defaultUnit: 'kg organic/dry waste diverted',
    co2KgPerUnit: 0.9,
    assumptionSummary:
      'Estimated ~0.9 kg CO2e avoided per kg of household waste diverted from open burning or uncontrolled landfilling, plus substantial local PM2.5 smoke reduction.',
  },
  reusable_swap: {
    label: 'Reusable bags, bottles, or containers',
    defaultUnit: 'disposables avoided',
    co2KgPerUnit: 0.08,
    assumptionSummary:
      'Estimated ~0.08 kg CO2e per single-use plastic container/bag avoided across lifecycle production and waste processing.',
  },
  clean_indoor_air: {
    label: 'Smoke-free indoor practice (exhaust / no incense)',
    defaultUnit: 'smoke-free day',
    co2KgPerUnit: 0.25,
    assumptionSummary:
      'Primary benefit is direct indoor PM2.5 exposure reduction rather than carbon savings; conservative ~0.25 kg CO2e proxy when displacing biomass/candle/incense combustion.',
  },
};

export const SUSTAINABLE_ALTERNATIVES: SustainableAlternative[] = [
  {
    id: 'alt-transit',
    domain: 'commuting',
    originalActivity: 'Solo private petrol or diesel car commute (15 km round trip)',
    recommendedAlternative: 'Metro rail, electric bus, or shared office shuttle',
    whyBetter:
      'Cuts tailpipe NOx, brake/tire particulate emissions per passenger, and urban road congestion that traps winter smog at street level.',
    estimatedEmissionsReduction: 'Estimated 65–80% lower CO2e per passenger-km (~1.8–2.1 kg CO2e per 15 km round trip)',
    estimateBasisAndAssumptions:
      'Assumes average solo petrol car (~170 g CO2e/km) replaced by urban metro/bus (~35–55 g CO2e/passenger-km, DEFRA/IEA benchmarks). Exact values vary by city grid and occupancy.',
    estimatedCostDifference: 'Often 40–65% lower daily commute cost than fuel + urban parking',
    practicalImplementation: [
      'Check metro or bus feeder timings the evening before.',
      'Pair last-mile e-rickshaw or short walk with a well-fitted N95 mask on Poor/Severe AQI days.',
      'Use a reloadable transit smart card to eliminate daily ticketing friction.',
    ],
    suitabilityNote: 'Suitable across all AQI levels; enclosed rail coaches also limit direct roadside exhaust exposure.',
    defaultCo2SavedKg: 1.9,
    impactCategory: 'public_transit',
  },
  {
    id: 'alt-active',
    domain: 'commuting',
    originalActivity: 'Short neighborhood errands under 3 km by car or scooter',
    recommendedAlternative: 'Walking or cycling during low-AQI midday windows',
    whyBetter:
      'Cold-start short engine trips emit disproportionately high unburned hydrocarbons and particulates per kilometer.',
    estimatedEmissionsReduction: 'Estimated 0.4–0.6 kg CO2e avoided per 3 km car trip replaced',
    estimateBasisAndAssumptions:
      'Assumes 3 km short urban car trip with cold-start penalty (~170–200 g CO2e/km). Does not include dietary energy.',
    estimatedCostDifference: 'Zero fuel or parking cost',
    practicalImplementation: [
      'Check the AIRWISE hourly forecast and schedule errands during the lowest-AQI midday window.',
      'Choose residential backstreets rather than high-traffic arterial roads.',
      'Switch to enclosed transit when AQI exceeds 200 (Poor) to protect respiratory health.',
    ],
    suitabilityNote: 'Recommended only when AQI is Good, Satisfactory, or low Moderate. Avoid vigorous cycling during Poor–Severe smog.',
    defaultCo2SavedKg: 0.5,
    impactCategory: 'active_travel',
  },
  {
    id: 'alt-electricity',
    domain: 'energy',
    originalActivity: 'Continuous space-heater / geyser / standby appliance load during winter evenings',
    recommendedAlternative: 'Draft sealing, timer-controlled water heating, LED lighting, and thermal layering',
    whyBetter:
      'In coal-heavy winter grids, lowering peak residential electricity demand reduces regional thermal power plant SO2, NOx, and PM emissions.',
    estimatedEmissionsReduction: 'Estimated 2.0–3.5 kg CO2e saved per day when trimming 3–5 kWh of daily load',
    estimateBasisAndAssumptions:
      'Based on India CEA grid emission factor (~0.71 kg CO2e/kWh). Savings are lower in hydropower- or solar-dominant regions (~0.2–0.4 kg/kWh).',
    estimatedCostDifference: 'Estimated 10–20% reduction on winter electricity bills; weatherstripping pays back within one season',
    practicalImplementation: [
      'Seal window and door gaps with foam weatherstripping — this simultaneously blocks outdoor winter smog infiltration.',
      'Run water heaters for 15 minutes before use instead of leaving thermostats on continuously.',
      'Turn off standby power strips overnight.',
    ],
    suitabilityNote: 'Beneficial year-round and directly improves indoor smog protection.',
    defaultCo2SavedKg: 2.1,
    impactCategory: 'energy_saving',
  },
  {
    id: 'alt-waste',
    domain: 'waste',
    originalActivity: 'Open burning of dry leaves, garden trimmings, or household trash',
    recommendedAlternative: 'Home composting, municipal green-waste collection, and segregated recycling',
    whyBetter:
      'Open biomass and plastic burning releases dense black carbon, dioxins, and PM2.5 directly at breathing height in residential neighborhoods.',
    estimatedEmissionsReduction: 'Substantial local PM2.5 avoidance + estimated 0.9 kg CO2e per kg waste diverted',
    estimateBasisAndAssumptions:
      'Emission estimate reflects avoided uncontrolled combustion and methane generation; local particulate reduction is the largest immediate public-health benefit.',
    estimatedCostDifference: 'Low or zero cost using municipal dry/wet segregation or a simple balcony compost bin',
    practicalImplementation: [
      'Separate wet organic waste and dry recyclables daily.',
      'Mulch fallen winter leaves into garden soil or community compost pits instead of burning.',
      'Report illegal neighborhood trash burning to municipal pollution helplines.',
    ],
    suitabilityNote: 'High impact during winter temperature inversions when smoke lingers near ground level.',
    defaultCo2SavedKg: 1.8,
    impactCategory: 'waste_reduction',
  },
  {
    id: 'alt-deliveries',
    domain: 'deliveries',
    originalActivity: 'Multiple daily express single-item deliveries',
    recommendedAlternative: 'Consolidated weekly grocery and parcel orders',
    whyBetter:
      'Reduces two-wheeler and van urban last-mile trips, cutting stop-and-go exhaust particulates in residential streets.',
    estimatedEmissionsReduction: 'Estimated 0.3–0.8 kg CO2e avoided per consolidated delivery trip',
    estimateBasisAndAssumptions:
      'Assumes 2–4 km avoided dedicated two-wheeler/van leg (~100–200 g CO2e/km). Varies by fleet electrification and route batching.',
    estimatedCostDifference: 'Saves delivery and handling fees (often ₹50–₹150 / $2–$5 per consolidated week)',
    practicalImplementation: [
      'Maintain a shared household shopping list through the week.',
      'Select grouped or non-rush delivery slots during checkout.',
      'Combine pharmacy and grocery pickups into one planned trip.',
    ],
    suitabilityNote: 'Easy zero-effort habit suitable for every household.',
    defaultCo2SavedKg: 0.6,
    impactCategory: 'public_transit',
  },
  {
    id: 'alt-reusable',
    domain: 'single_use',
    originalActivity: 'Single-use plastic bottles, takeaway cups, and disposable carry bags',
    recommendedAlternative: 'Insulated reusable bottle, cloth totes, and steel/glass lunch containers',
    whyBetter:
      'Prevents petrochemical manufacturing emissions and reduces plastic waste that too often ends up openly burned in urban outskirts.',
    estimatedEmissionsReduction: 'Estimated 0.08–0.15 kg CO2e per disposable item avoided (~15–30 kg/year per household)',
    estimateBasisAndAssumptions:
      'Lifecycle average across PET bottle/polypropylene container manufacturing and disposal; requires reusing durable items consistently to realize net gains.',
    estimatedCostDifference: 'Saves ongoing disposable container/bag charges after first month',
    practicalImplementation: [
      'Keep two foldable cloth totes near the front door or in your commute backpack.',
      'Carry a refillable bottle on every school or office commute.',
      'Decline disposable cutlery on food delivery orders.',
    ],
    suitabilityNote: 'Practical for all household sizes.',
    defaultCo2SavedKg: 0.4,
    impactCategory: 'reusable_swap',
  },
  {
    id: 'alt-cooking',
    domain: 'heating_cooking',
    originalActivity: 'Unvented biomass/charcoal heating or cooking without exhaust ventilation',
    recommendedAlternative: 'Induction/LPG cooking with active chimney exhaust and closed-lid cookware',
    whyBetter:
      'Eliminates heavy indoor PM2.5 and CO spikes, while lids and pressure cookers shorten cooking fuel use by 25–40%.',
    estimatedEmissionsReduction: 'Estimated 0.5–1.5 kg CO2e/day when transitioning from solid fuel or reducing gas burn time',
    estimateBasisAndAssumptions:
      'Estimate depends on baseline fuel (wood/charcoal vs LPG) and kitchen usage duration; WHO identifies clean cooking + exhaust as a primary indoor air intervention.',
    estimatedCostDifference: 'Lower monthly LPG consumption; induction requires upfront appliance investment',
    practicalImplementation: [
      'Always switch on the range hood or exhaust fan before igniting gas burners and run 10 minutes after cooking.',
      'Use pressure cookers and snug lids to cut fuel use and steam/smoke.',
      'Never burn coal, wood, or charcoal braziers indoors for winter warmth.',
    ],
    suitabilityNote: 'Critical safety and indoor air priority in winter months.',
    defaultCo2SavedKg: 0.8,
    impactCategory: 'clean_indoor_air',
  },
];

export const COMMUNITY_INITIATIVES: CommunityInitiative[] = [
  {
    id: 'comm-carpool',
    title: 'Neighborhood School & Office Carpool Circle',
    category: 'commute',
    summary: 'Coordinate 3–4 nearby families commuting along the same corridor to rotate driving or share a shuttle.',
    householdSteps: [
      'Map your weekly commute hours with neighbors in the same apartment block or street.',
      'Rotate driving duties or split an electric/CNG cab during peak smog weeks.',
    ],
    neighborhoodSteps: [
      'Create a resident bulletin board or messaging group strictly for commute matching.',
      'Request designated carpool drop-off bays at local schools to stop curbside idling.',
    ],
    estimatedPerHouseholdMonthlyCo2Kg: 38,
    calculationBasis:
      'Assumes 12 shared 20 km round trips/month removing 1 solo petrol car trip (~170 g CO2e/km). Transparent user-scalable estimate.',
  },
  {
    id: 'comm-zero-burn',
    title: 'Zero Open-Burning Block Pledge',
    category: 'waste',
    summary: 'Eliminate winter leaf burning and overnight security-guard bonfires by providing warm gear and leaf-composting bins.',
    householdSteps: [
      'Compost garden trimmings or bag dry leaves for municipal mulch collection.',
      'Contribute warm winter jackets or safe electric heaters for building security staff instead of wood/trash fires.',
    ],
    neighborhoodSteps: [
      'Install clearly labeled community leaf-compost cages in neighborhood parks.',
      'Partner with Resident Welfare Associations (RWAs) to post no-burning reminders and reporting numbers.',
    ],
    estimatedPerHouseholdMonthlyCo2Kg: 14,
    calculationBasis:
      'Assumes ~15 kg of dry biomass/waste per household/month diverted from open burning (~0.9 kg CO2e/kg) plus significant neighborhood PM2.5 smoke reduction.',
  },
  {
    id: 'comm-no-idle',
    title: 'Idle-Free School & Market Zones',
    category: 'schools',
    summary: 'Encourage drivers waiting outside schools and markets to turn off engines when parked longer than 30 seconds.',
    householdSteps: [
      'Switch off your vehicle ignition at long traffic signals and pickup lanes.',
      'Park 150 meters away and walk on low-to-moderate AQI days to disperse tailpipe congestion near school gates.',
    ],
    neighborhoodSteps: [
      'Work with school PTAs to place "Engines Off for Clean Air" signage at pickup zones.',
      'Encourage staggered pickup slots to prevent 20-minute bumper-to-bumper queues.',
    ],
    estimatedPerHouseholdMonthlyCo2Kg: 10,
    calculationBasis:
      'Assumes avoiding ~15 minutes/day of urban idling across 20 days/month (~0.03 kg CO2e/minute for a mid-size car).',
  },
  {
    id: 'comm-peak-power',
    title: 'Winter Peak-Hour Energy Conservation',
    category: 'energy',
    summary: 'Reduce collective building electricity draw during peak winter evenings (18:00–22:00) through shared common-area efficiency.',
    householdSteps: [
      'Shift laundry and dishwashing to daytime solar-rich hours.',
      'Seal window drafts to retain indoor warmth without high-wattage resistance heaters.',
    ],
    neighborhoodSteps: [
      'Audit apartment hallway lighting and convert remaining fixtures to motion-sensing LEDs.',
      'Explore rooftop solar net-metering for shared elevators and corridor lighting.',
    ],
    estimatedPerHouseholdMonthlyCo2Kg: 28,
    calculationBasis:
      'Assumes 40 kWh/month reduced per household at India CEA grid factor (~0.71 kg CO2e/kWh).',
  },
  {
    id: 'comm-dust-green',
    title: 'Street Dust Control & Native Green Buffers',
    category: 'greenery',
    summary: 'Cover bare roadside soil patches with native low-water groundcover and encourage damp sweeping of courtyards.',
    householdSteps: [
      'Use damp mopping instead of dry broom sweeping on balconies and driveways to avoid resuspending PM10 dust.',
      'Keep construction sand or renovation debris covered with tarps.',
    ],
    neighborhoodSteps: [
      'Coordinate with municipal teams for mechanical vacuum sweeping rather than dry sweeping.',
      'Plant hardy native shrubs along boundary walls bordering busy roads.',
    ],
    estimatedPerHouseholdMonthlyCo2Kg: 5,
    calculationBasis:
      'Primary measurable impact is localized PM10/coarse dust suppression rather than carbon sequestration; conservative 5 kg CO2e/month proxy for green-buffer upkeep.',
  },
];

/**
 * Generates evidence-based vs. general indoor air quality guidance tailored to outdoor AQI and household setup.
 * Explicitly avoids dangerous DIY purification, ozone generators, or burning substances.
 */
export function generateIndoorRecommendations(
  input: IndoorAuditInput,
  outdoorAqi: number,
  bestVentWindow: { windowLabel: string; minAqi: number; safeToVentilate: boolean }
): {
  ventilationStatus: 'close_windows' | 'brief_window' | 'open_windows';
  ventilationHeadline: string;
  ventilationExplanation: string;
  recommendedCadrM3h: number;
  recommendations: IndoorRecommendation[];
  safetyWarnings: string[];
} {
  // Recommended CADR rule of thumb (AHAM 2/3 rule converted to m³/h for ~2.6m ceiling height, ~4.8 ACH)
  const roomAreaSqM = Math.max(8, input.roomAreaSqFt * 0.0929);
  const recommendedCadrM3h = Math.round(roomAreaSqM * 2.6 * 4.8);

  let ventilationStatus: 'close_windows' | 'brief_window' | 'open_windows' = 'open_windows';
  let ventilationHeadline = 'Outdoor air is suitable for natural cross-ventilation';
  let ventilationExplanation =
    'Current outdoor AQI is low enough that opening opposite windows for 15–20 minutes refreshes indoor air and lowers indoor CO2.';

  if (outdoorAqi > 150) {
    ventilationStatus = 'close_windows';
    ventilationHeadline = 'Keep windows closed — outdoor ventilation will worsen indoor PM2.5';
    ventilationExplanation = `At AQI ${outdoorAqi}, bringing unfiltered outdoor air inside introduces fine particulate matter faster than indoor surfaces settle it. Keep exterior windows and doors closed${
      bestVentWindow.safeToVentilate
        ? `, and limit any brief airing to ${bestVentWindow.windowLabel} (forecast AQI ~${bestVentWindow.minAqi}).`
        : ' until outdoor pollution subsides, and rely on HEPA filtration if available.'
    }`;
  } else if (outdoorAqi > 90) {
    ventilationStatus = 'brief_window';
    ventilationHeadline = 'Use timed, selective ventilation only during cleaner hours';
    ventilationExplanation = `Outdoor AQI is currently ${outdoorAqi}. Avoid opening windows facing busy roads during morning and evening rush hours. Best forecast window for brief 10–15 min airing: ${bestVentWindow.windowLabel} (AQI ~${bestVentWindow.minAqi}).`;
  }

  const recommendations: IndoorRecommendation[] = [];

  recommendations.push({
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
  });

  recommendations.push({
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
  });

  if (input.cookingFuel === 'biomass_solid' || !input.hasKitchenExhaust || input.roomType === 'kitchen') {
    recommendations.push({
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
    });
  } else {
    recommendations.push({
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
    });
  }

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

  recommendations.push({
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
  });

  recommendations.push({
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
  });

  const safetyWarnings = [
    'Do NOT use ozone generators or uncertified "air ionizers" marketed as air purifiers — ozone is a lung irritant that worsens asthma and respiratory inflammation.',
    'Do NOT burn camphor, herbs, essential oils, or charcoal indoors to "purify" air — burning any organic material adds PM2.5 and combustion gases.',
    'Do NOT spray unverified chemical disinfectants, bleach mists, or synthetic air fresheners to clear smog — they release irritating VOCs without removing particulate matter.',
    'Houseplants improve indoor comfort, but controlled scientific studies show typical home plants cannot meaningfully replace HEPA filtration or source control during severe smog.',
  ];

  return {
    ventilationStatus,
    ventilationHeadline,
    ventilationExplanation,
    recommendedCadrM3h,
    recommendations,
    safetyWarnings,
  };
}

export interface ImpactProgressSummary {
  totalActions: number;
  weeklyActions: number;
  monthlyActions: number;
  totalEstimatedCo2Kg: number;
  weeklyEstimatedCo2Kg: number;
  monthlyEstimatedCo2Kg: number;
  categoryBreakdown: Record<ActionCategory, { count: number; co2Kg: number }>;
  weeklyBuckets: Array<{ label: string; count: number; co2Kg: number }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    progressLabel: string;
  }>;
}

export function computeImpactSummary(actions: TrackedAction[], now: Date = new Date()): ImpactProgressSummary {
  const msPerDay = 86400000;
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekCutoff = nowStart - 6 * msPerDay;
  const monthCutoff = nowStart - 29 * msPerDay;

  const categoryBreakdown: Record<ActionCategory, { count: number; co2Kg: number }> = {
    public_transit: { count: 0, co2Kg: 0 },
    active_travel: { count: 0, co2Kg: 0 },
    energy_saving: { count: 0, co2Kg: 0 },
    waste_reduction: { count: 0, co2Kg: 0 },
    reusable_swap: { count: 0, co2Kg: 0 },
    clean_indoor_air: { count: 0, co2Kg: 0 },
  };

  let weeklyActions = 0;
  let monthlyActions = 0;
  let totalEstimatedCo2Kg = 0;
  let weeklyEstimatedCo2Kg = 0;
  let monthlyEstimatedCo2Kg = 0;

  // Build last 4 weeks buckets for visual progress chart
  const weeklyBuckets = [3, 2, 1, 0].map((weeksAgo) => {
    const end = nowStart - weeksAgo * 7 * msPerDay + msPerDay;
    const start = end - 7 * msPerDay;
    const label = weeksAgo === 0 ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo}w ago`;
    return { label, start, end, count: 0, co2Kg: 0 };
  });

  for (const act of actions) {
    const t = new Date(act.dateIso).getTime();
    const co2 = Number.isFinite(act.estimatedCo2SavedKg) ? Math.max(0, act.estimatedCo2SavedKg) : 0;

    totalEstimatedCo2Kg += co2;
    if (categoryBreakdown[act.category]) {
      categoryBreakdown[act.category].count += 1;
      categoryBreakdown[act.category].co2Kg = round2(categoryBreakdown[act.category].co2Kg + co2);
    }

    if (t >= weekCutoff) {
      weeklyActions += 1;
      weeklyEstimatedCo2Kg += co2;
    }
    if (t >= monthCutoff) {
      monthlyActions += 1;
      monthlyEstimatedCo2Kg += co2;
    }

    for (const bucket of weeklyBuckets) {
      if (t >= bucket.start && t < bucket.end) {
        bucket.count += 1;
        bucket.co2Kg = round2(bucket.co2Kg + co2);
        break;
      }
    }
  }

  const distinctCategories = Object.values(categoryBreakdown).filter((v) => v.count > 0).length;

  const milestones = [
    {
      id: 'ms-first',
      title: 'First Clean-Air Action',
      description: 'Log your first sustainable or exposure-reducing habit.',
      achieved: actions.length >= 1,
      progressLabel: `${Math.min(actions.length, 1)} / 1 action`,
    },
    {
      id: 'ms-weekly-5',
      title: 'Consistent Week',
      description: 'Complete 5 sustainable actions within the last 7 days.',
      achieved: weeklyActions >= 5,
      progressLabel: `${Math.min(weeklyActions, 5)} / 5 this week`,
    },
    {
      id: 'ms-diverse',
      title: 'Well-Rounded Household',
      description: 'Log actions across at least 3 sustainability categories.',
      achieved: distinctCategories >= 3,
      progressLabel: `${Math.min(distinctCategories, 3)} / 3 categories`,
    },
    {
      id: 'ms-co2-25',
      title: '25 kg CO2e Estimated Milestone',
      description: 'Accumulate 25 kg of estimated emissions avoided.',
      achieved: totalEstimatedCo2Kg >= 25,
      progressLabel: `${round2(Math.min(totalEstimatedCo2Kg, 25))} / 25 kg CO2e`,
    },
  ];

  return {
    totalActions: actions.length,
    weeklyActions,
    monthlyActions,
    totalEstimatedCo2Kg: round2(totalEstimatedCo2Kg),
    weeklyEstimatedCo2Kg: round2(weeklyEstimatedCo2Kg),
    monthlyEstimatedCo2Kg: round2(monthlyEstimatedCo2Kg),
    categoryBreakdown,
    weeklyBuckets: weeklyBuckets.map(({ label, count, co2Kg }) => ({ label, count, co2Kg })),
    milestones,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
