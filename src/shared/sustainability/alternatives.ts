import type { SustainableAlternative } from '../types.ts';

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
