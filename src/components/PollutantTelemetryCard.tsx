import { memo } from 'react';
import { Droplets, Thermometer, Wind } from 'lucide-react';
import type { PollutantReadings, WeatherReadings } from '../shared/types.ts';

interface PollutantTelemetryCardProps {
  pollutants: PollutantReadings;
  weather: WeatherReadings;
  headingLevel?: 'h2' | 'h3';
}

export const PollutantTelemetryCard = memo(function PollutantTelemetryCard({
  pollutants,
  weather,
  headingLevel: Heading = 'h3',
}: PollutantTelemetryCardProps) {
  return (
    <section
      aria-label="Pollutant concentrations and local weather"
      className="lg:col-span-5 bg-white border border-[#E2E8E5] rounded-xl p-6 flex flex-col justify-between gap-5"
    >
      <div>
        <Heading className="text-base font-semibold text-[#111C18]">Pollutant concentrations</Heading>
        <p className="text-xs text-[#5E7068] mt-0.5">
          Measured concentrations shown separately from computed AQI index
        </p>

        <dl className="mt-4 divide-y divide-[#E2E8E5] text-sm">
          <div className="py-2.5 flex items-baseline justify-between gap-4">
            <dt className="text-[#4A5B54]">PM2.5 (Fine particulate)</dt>
            <dd className="font-mono tabular-nums font-semibold text-[#111C18]">
              {pollutants.pm25} µg/m³
            </dd>
          </div>
          <div className="py-2.5 flex items-baseline justify-between gap-4">
            <dt className="text-[#4A5B54]">PM10 (Coarse particulate)</dt>
            <dd className="font-mono tabular-nums font-semibold text-[#111C18]">
              {pollutants.pm10} µg/m³
            </dd>
          </div>
          {typeof pollutants.no2 === 'number' && (
            <div className="py-2.5 flex items-baseline justify-between gap-4">
              <dt className="text-[#4A5B54]">Nitrogen Dioxide (NO₂)</dt>
              <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                {pollutants.no2} µg/m³
              </dd>
            </div>
          )}
          {typeof pollutants.o3 === 'number' && (
            <div className="py-2.5 flex items-baseline justify-between gap-4">
              <dt className="text-[#4A5B54]">Ground-level Ozone (O₃)</dt>
              <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                {pollutants.o3} µg/m³
              </dd>
            </div>
          )}
          {typeof pollutants.so2 === 'number' && (
            <div className="py-2.5 flex items-baseline justify-between gap-4">
              <dt className="text-[#4A5B54]">Sulphur Dioxide (SO₂)</dt>
              <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                {pollutants.so2} µg/m³
              </dd>
            </div>
          )}
          {typeof pollutants.co === 'number' && (
            <div className="py-2.5 flex items-baseline justify-between gap-4">
              <dt className="text-[#4A5B54]">Carbon Monoxide (CO)</dt>
              <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                {(pollutants.co / 1000).toFixed(2)} mg/m³
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="pt-4 border-t border-[#E2E8E5]">
        <Heading className="text-sm font-semibold text-[#111C18] mb-3">
          Local weather · {weather.conditionLabel}
        </Heading>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1 text-xs text-[#5E7068]">
              <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
              Temp
            </div>
            <p className="font-mono tabular-nums text-base font-semibold text-[#111C18] mt-0.5">
              {weather.temperatureC}°C
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-[#5E7068]">
              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
              Humidity
            </div>
            <p className="font-mono tabular-nums text-base font-semibold text-[#111C18] mt-0.5">
              {weather.humidityPercent}%
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-[#5E7068]">
              <Wind className="h-3.5 w-3.5" aria-hidden="true" />
              Wind
            </div>
            <p className="font-mono tabular-nums text-base font-semibold text-[#111C18] mt-0.5">
              {weather.windSpeedKmh} km/h
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});
