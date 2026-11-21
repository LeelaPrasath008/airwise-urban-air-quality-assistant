import type { DailyRoutinePlan, RoutineRecommendation } from '../../../src/shared/types.ts';
import type { AssistantChatInput, RoutineGenerationInput } from './schemas.ts';

function buildMorningRecommendations(
  input: RoutineGenerationInput,
  highPollution: boolean
): RoutineRecommendation[] {
  const hasHepa = input.profile.indoorVentilation === 'hepa_purifier';
  const soloDriver =
    input.profile.typicalCommute === 'car_solo' || input.profile.typicalCommute === 'two_wheeler';
  const isRemote = input.profile.typicalCommute === 'remote';

  return [
    {
      id: 'm-vent',
      title: highPollution
        ? 'Keep morning windows sealed during thermal inversion'
        : 'Brief low-traffic morning airing',
      whatToDo: highPollution
        ? 'Keep exterior windows and balcony doors closed through early morning peak smog hours.'
        : 'Open cross-ventilating windows away from main roads for 15 minutes before rush hour.',
      whyRecommended: highPollution
        ? `At AQI ${input.aqi} (${input.categoryLabel}) and PM2.5 ${input.pm25} µg/m³, cold morning air traps emissions close to the ground; opening windows raises indoor PM2.5.`
        : `AQI ${input.aqi} (${input.categoryLabel}) allows safe indoor CO2 refresh before traffic builds.`,
      howToImplement: highPollution
        ? hasHepa
          ? 'Close bedroom and living-room windows, place door draft stoppers, and run your HEPA purifier on medium.'
          : 'Close exterior windows, damp-wipe sills, and avoid indoor incense or unvented cooking smoke.'
        : 'Open two opposite windows for 15 minutes, then close before peak commuter traffic.',
      environmentalBenefit:
        'Reduces unnecessary heating/cooling energy loss while avoiding indoor combustion sources.',
      healthConsideration: highPollution
        ? 'Helps lower overnight and early-morning fine particulate exposure for children and older adults.'
        : 'Refreshes stale indoor air without introducing heavy roadside particulate loads.',
      effortOrCost: 'Zero cost · 2 minutes',
      impactCategory: 'clean_indoor_air',
    },
    {
      id: 'm-commute',
      title: isRemote
        ? 'Plan consolidated low-emission errands'
        : soloDriver
          ? 'Shift to metro, bus, or shared shuttle commute'
          : 'Protect your low-emission commute from roadside exhaust',
      whatToDo: isRemote
        ? 'Group any needed household errands into a single midday trip rather than multiple short journeys.'
        : soloDriver
          ? 'Replace today’s solo motor commute with metro, electric bus, or a 2–3 person carpool.'
          : highPollution
            ? 'Use enclosed public transit instead of open cycling/walking while AQI stays above 200.'
            : 'Continue using public transit or active walking/cycling along lower-traffic residential routes.',
      whyRecommended:
        'Transport tailpipe exhaust and road dust are major contributors to urban winter PM2.5 and NO2 peaks.',
      howToImplement: isRemote
        ? 'Write a shared family list before 11:00 and combine grocery and pharmacy stops.'
        : 'Check transit feeder schedules, carry a reusable water bottle, and wear a well-fitted N95/FFP2 respirator outdoors if AQI is Poor or worse.',
      environmentalBenefit:
        'Estimated 60–80% reduction in per-person commute CO2e and local NOx when shifting from a solo petrol car to public transit (DEFRA/IEA benchmarks).',
      healthConsideration: highPollution
        ? 'Enclosed transit reduces direct inhalation of street-level exhaust; follow local municipal advisories.'
        : 'Reduces exposure to cold-start traffic plumes along arterial corridors.',
      effortOrCost: 'Low effort · Often saves 40–60% vs fuel & parking',
      impactCategory: 'public_transit',
    },
  ];
}

function buildAfternoonRecommendations(
  input: RoutineGenerationInput,
  highPollution: boolean,
  moderatePollution: boolean
): RoutineRecommendation[] {
  return [
    {
      id: 'a-outdoor',
      title: highPollution
        ? 'Keep vigorous exercise indoors; schedule essential outdoor steps midday'
        : 'Use the midday dispersion window for outdoor movement',
      whatToDo: highPollution
        ? 'Move workouts indoors and limit outdoor work/errands to short essential trips between 13:00 and 15:30.'
        : moderatePollution
          ? 'Keep outdoor walks moderate and away from arterial intersections during midday hours.'
          : 'Take a 20–30 minute brisk walk or outdoor break during peak afternoon dispersion.',
      whyRecommended:
        'Afternoon sunlight usually warms surface air and lifts the mixing layer slightly, creating the day’s lowest particulate window compared to dawn and night.',
      howToImplement: input.profile.worksOutdoors
        ? 'Since your routine includes outdoor exposure, take scheduled indoor breaks, hydrate well, and use a properly sealed N95/FFP2 respirator during Poor–Severe hours.'
        : 'Check the AIRWISE hourly forecast chart before stepping out and choose shaded park paths away from idling traffic.',
      environmentalBenefit:
        'Encourages low-emission active errands only when air quality makes it safe.',
      healthConsideration:
        'No outdoor activity is completely risk-free during severe smog; individuals with asthma or cardiac conditions should consult their doctor for personal thresholds.',
      effortOrCost: 'Zero cost · Routine schedule adjustment',
      impactCategory: 'active_travel',
    },
    {
      id: 'a-energy',
      title: 'Shift heavy household appliances to daytime hours & trim phantom load',
      whatToDo:
        'Run washing machines and water heating during midday rather than peak winter evening demand (18:00–22:00).',
      whyRecommended:
        'Daytime grids often carry a higher solar share, whereas winter evening peaks rely heavily on coal/thermal power plants emitting SO2 and particulates.',
      howToImplement:
        'Batch full laundry loads in cold water, unplug idle chargers, and draw curtains at dusk to trap daytime warmth.',
      environmentalBenefit:
        'Estimated 1.5–2.5 kg CO2e saved per day for a typical household trimming 2–3.5 kWh (India CEA grid factor ~0.71 kg/kWh).',
      healthConsideration:
        'Lowering regional thermal power demand helps reduce secondary sulfate and nitrate PM2.5 formation.',
      effortOrCost: 'Zero cost · Saves on monthly electricity bills',
      impactCategory: 'energy_saving',
    },
  ];
}

function buildEveningRecommendations(input: RoutineGenerationInput): RoutineRecommendation[] {
  return [
    {
      id: 'e-kitchen',
      title: 'Vent kitchen smoke & skip indoor incense/candles',
      whatToDo:
        'Run your kitchen exhaust fan before cooking and for 10 minutes afterward, and avoid burning incense, dhoop, or scented candles.',
      whyRecommended:
        'High-heat cooking and indoor smoldering combustion create immediate indoor PM2.5 spikes that linger all night when winter windows are closed.',
      howToImplement:
        'Close bedroom doors while cooking, use snug lids or a pressure cooker to cut cooking time, and damp-mop kitchen floors rather than dry sweeping.',
      environmentalBenefit:
        'Reduces household LPG/electricity cooking fuel use by an estimated 20–30% while preventing indoor soot.',
      healthConsideration: `Especially important for a ${input.profile.householdSize}-person household${
        input.profile.householdNotes ? ` (${input.profile.householdNotes})` : ''
      } sleeping indoors overnight.`,
      effortOrCost: 'Zero cost · Immediate daily habit',
      impactCategory: 'clean_indoor_air',
    },
    {
      id: 'e-waste',
      title: 'Segregate evening household waste & prevent open leaf/trash burning',
      whatToDo:
        'Separate organic kitchen scraps from dry recyclables and ensure no household or garden waste is burned outdoors.',
      whyRecommended:
        'Evening winter inversions trap smoke from small neighborhood fires at street level throughout the night.',
      howToImplement:
        'Keep two covered bins under the sink (wet/dry), pack reusable bags for tomorrow’s commute, and consolidate any online grocery orders into one weekly slot.',
      environmentalBenefit:
        'Diverting ~1 kg of waste from open burning avoids an estimated ~0.9 kg CO2e plus acute local black-carbon PM2.5.',
      healthConsideration:
        'Directly reduces toxic smoke plumes in your own neighborhood courtyard and bedroom windows.',
      effortOrCost: 'Low effort · Minimal cost',
      impactCategory: 'waste_reduction',
    },
  ];
}

export function buildRuleBasedRoutine(
  input: RoutineGenerationInput,
  fallbackReason: string
): DailyRoutinePlan {
  const highPollution = input.aqi > 200;
  const moderatePollution = input.aqi > 100 && input.aqi <= 200;

  return {
    generatedAtIso: new Date().toISOString(),
    locationName: input.locationName,
    aqiAtGeneration: input.aqi,
    standard: input.standard,
    source: 'rule_based_fallback',
    fallbackReason,
    summary: `Tailored ${input.categoryLabel} air-quality routine for ${input.locationName} (AQI ${input.aqi}, PM2.5 ${input.pm25} µg/m³, ${input.temperatureC}°C) for a ${input.profile.householdSize}-person household (${input.profile.occupation}).`,
    morning: buildMorningRecommendations(input, highPollution),
    afternoon: buildAfternoonRecommendations(input, highPollution, moderatePollution),
    evening: buildEveningRecommendations(input),
    disclaimer:
      'Recommendations provide practical environmental and exposure-reduction guidance, not medical advice. During Very Poor or Severe pollution events, follow official local public-health advisories.',
  };
}

function resolveChatTopicReply(input: AssistantChatInput): string {
  const q = input.message.toLowerCase();
  const { locationName, aqi, categoryLabel, pm25, pm10, standard } = input.context;
  const standardName = standard === 'INDIA_CPCB' ? 'Indian National AQI (CPCB)' : 'US EPA AQI';
  const severe = aqi > 300;
  const poor = aqi > 200;
  const moderate = aqi > 100;

  if (
    q.includes('exercise') ||
    q.includes('run') ||
    q.includes('jog') ||
    q.includes('walk') ||
    q.includes('outdoor')
  ) {
    if (poor) {
      return `With ${locationName} currently at AQI ${aqi} (${categoryLabel}, PM2.5 ${pm25} µg/m³ on ${standardName}), strenuous outdoor exercise is NOT advisable today.\n\nWhy: Heavy breathing during exercise pulls fine particulate matter deeper into the lungs.\n\nPractical steps:\n• Shift cardio and strength workouts indoors away from unsealed windows.\n• If you must step outside briefly, aim for the midday dispersion window and consider a well-fitted N95/FFP2 respirator.\n• Avoid exercising alongside busy traffic corridors.\n\nNote: No outdoor activity is risk-free during high pollution; follow official local health advisories and consult a healthcare professional if you have asthma or heart conditions.`;
    }
    if (moderate) {
      return `In ${locationName}, AQI is currently ${aqi} (${categoryLabel}, PM2.5 ${pm25} µg/m³). Light-to-moderate outdoor walking is generally manageable for healthy adults, while sensitive groups (children, older adults, or people with respiratory conditions) should shorten vigorous workouts.\n\nPractical steps:\n• Choose parks or quiet residential streets away from rush-hour traffic.\n• Watch the hourly forecast and pick the lowest-AQI midday slot.\n• Stop and head indoors if you notice coughing, throat irritation, or shortness of breath.`;
    }
    return `Conditions in ${locationName} are currently favorable for outdoor exercise at AQI ${aqi} (${categoryLabel}, PM2.5 ${pm25} µg/m³).\n\nPractical steps:\n• Enjoy walking, cycling, or jogging while avoiding idling traffic intersections.\n• Recheck the hourly trend later in the evening, as winter inversions can raise particulate levels after sunset.`;
  }

  if (
    q.includes('bedroom') ||
    q.includes('indoor') ||
    q.includes('home') ||
    q.includes('purifier') ||
    q.includes('window')
  ) {
    return `To improve indoor and bedroom air quality in ${locationName} (current outdoor AQI ${aqi}, PM2.5 ${pm25} µg/m³):\n\n1. Ventilation timing: ${
      aqi > 150
        ? 'Keep exterior windows CLOSED right now—bringing in polluted outdoor air raises indoor PM2.5.'
        : 'Brief cross-ventilation away from traffic is acceptable during cleaner midday hours.'
    }\n2. Mechanical filtration: Run a True HEPA (H13/H14) purifier sized for the room with doors shut overnight. Avoid ozone generators or ionizer modes.\n3. Source control: Never burn incense, dhoop, scented candles, or mosquito coils indoors, and always run a kitchen exhaust fan during cooking.\n4. Cleaning: Damp-mop floors and wipe surfaces with moist microfiber cloths instead of dry sweeping to keep settled PM10 dust out of the air.`;
  }

  if (
    q.includes('commute') ||
    q.includes('travel') ||
    q.includes('car') ||
    q.includes('metro') ||
    q.includes('bus')
  ) {
    return `Safest lower-emission commuting strategy for ${locationName} at AQI ${aqi} (${categoryLabel}):\n\n• Prefer enclosed public transit (metro rail or electric/AC bus) over open two-wheelers or solo petrol cars—this cuts both personal exhaust inhalation and citywide emissions.\n• If travelling by car or cab during Poor–Severe smog, set cabin ventilation to Recirculate rather than pulling outside exhaust in (briefly refresh air on longer rides to prevent CO2 drowsiness).\n• For last-mile walks on Poor–Severe days, use a well-sealed N95/FFP2 respirator (cloth masks do not filter PM2.5 effectively).\n• On Good/Satisfactory days, walking or cycling short trips under 3 km eliminates high-emission cold-start car trips.`;
  }

  if (q.includes('community') || q.includes('neighborhood') || q.includes('society')) {
    return `Practical community actions that meaningfully curb urban smog:\n\n• Zero open burning: Partner with your RWA or neighborhood group to stop leaf/trash burning and provide safe winter warmth options for outdoor security staff.\n• Shared school & office carpools: Organize 3–4 family commute pools and idle-free school drop-off zones.\n• Damp street cleaning & soil cover: Replace dry sweeping of parking lots with damp sweeping and cover bare construction sand.\n• Collective peak-energy savings: Shift heavy appliances away from winter evening coal-peak hours and convert shared hallways to LEDs.`;
  }

  if (q.includes('severe') || severe || q.includes('emergency')) {
    return `Guidance for Severe air pollution conditions (current ${locationName} AQI: ${aqi} — ${categoryLabel}, PM2.5 ${pm25} µg/m³, PM10 ${pm10} µg/m³):\n\n• Follow official public-health, school, and municipal emergency directives (such as GRAP stages in India) first.\n• Stay indoors as much as practical, especially children, older adults, pregnant individuals, and anyone with lung or heart conditions.\n• Keep all exterior windows and doors closed; seal obvious draft gaps and create one clean-air sleep room with a True HEPA purifier if available.\n• Eliminate every indoor smoke source (no incense, candles, tobacco, or unvented frying).\n• If essential outdoor travel cannot be avoided, wear a properly fitted N95/FFP2 mask.\n• Seek qualified medical attention promptly if anyone experiences wheezing, chest tightness, or difficulty breathing.`;
  }

  return `Here is contextual guidance for ${locationName} (AQI ${aqi} — ${categoryLabel}, PM2.5 ${pm25} µg/m³, PM10 ${pm10} µg/m³ under ${standardName}):\n\n• Exposure guidance: ${
    poor
      ? 'Limit prolonged outdoor exposure, keep windows closed, and prioritize indoor activities.'
      : moderate
        ? 'Reduce strenuous outdoor exertion near traffic; sensitive household members should monitor symptoms.'
        : 'Air quality is relatively favorable for outdoor routines and brief cross-ventilation.'
  }\n• Low-emission habit today: Choose metro/bus or consolidate errands, run kitchen exhaust while cooking, and avoid open waste burning.\n\nYou can also ask me specifically about outdoor exercise, bedroom HEPA setup, commuting safely in smog, or community actions.`;
}

export function buildRuleBasedChatReply(
  input: AssistantChatInput,
  reason: string
): { reply: string; source: 'rule_based_fallback'; fallbackNotice: string } {
  let body = resolveChatTopicReply(input);
  if (input.context.isDemonstrationData) {
    body += `\n\nData note: You are currently viewing clearly labeled demonstration AQI data because the live upstream feed was unreachable.`;
  }

  return {
    reply: body,
    source: 'rule_based_fallback',
    fallbackNotice: reason,
  };
}
