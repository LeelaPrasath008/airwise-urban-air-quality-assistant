import type { ActionCategory } from '../types.ts';

export interface ActionEstimateFactor {
  readonly label: string;
  readonly defaultUnit: string;
  readonly co2KgPerUnit: number;
  readonly assumptionSummary: string;
}

/**
 * Transparent emission factor assumptions for user-entered personal action estimates.
 * Sources: UK DEFRA 2024 Conversion Factors, IEA Transport Benchmarks, CEA India Grid Emission Factor (~0.71 kg CO2/kWh).
 * Clearly presented as estimates, never verified sensor measurements.
 */
export const ACTION_ESTIMATE_FACTORS: Record<ActionCategory, ActionEstimateFactor> = {
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
