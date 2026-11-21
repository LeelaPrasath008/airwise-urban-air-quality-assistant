import type { CommunityInitiative } from '../types.ts';

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
