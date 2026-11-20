import {
  ArrowRight,
  CalendarCheck,
  Droplets,
  Home,
  Leaf,
  MapPin,
  MessageSquare,
  RefreshCw,
  Thermometer,
  Wind,
} from 'lucide-react';
import { AQIChart } from '../AQIChart.tsx';
import { ResilientImage } from '../BrandMark.tsx';
import { findBestVentilationWindow } from '../../shared/aqi.ts';
import type { AirQualitySnapshot, AQIStandard, NavSection } from '../../shared/types.ts';

interface DashboardViewProps {
  snapshot: AirQualitySnapshot | null;
  loading: boolean;
  error: string | null;
  standard: AQIStandard;
  onChangeStandard: (std: AQIStandard) => void;
  onOpenLocationModal: () => void;
  onRefresh: () => void;
  onNavigate: (section: NavSection) => void;
  showOnboarding: boolean;
  onDismissOnboarding: () => void;
}

const CPCB_SCALE_LEGEND = [
  { label: 'Good', range: '0–50', color: '#15803D' },
  { label: 'Satisfactory', range: '51–100', color: '#4D7C0F' },
  { label: 'Moderate', range: '101–200', color: '#CA8A04' },
  { label: 'Poor', range: '201–300', color: '#EA580C' },
  { label: 'Very Poor', range: '301–400', color: '#DC2626' },
  { label: 'Severe', range: '401–500', color: '#991B1B' },
];

const US_EPA_SCALE_LEGEND = [
  { label: 'Good', range: '0–50', color: '#15803D' },
  { label: 'Moderate', range: '51–100', color: '#CA8A04' },
  { label: 'Sensitive', range: '101–150', color: '#EA580C' },
  { label: 'Unhealthy', range: '151–200', color: '#DC2626' },
  { label: 'Very Unhealthy', range: '201–300', color: '#7E22CE' },
  { label: 'Hazardous', range: '301–500', color: '#881337' },
];

export function DashboardView({
  snapshot,
  loading,
  error,
  standard,
  onChangeStandard,
  onOpenLocationModal,
  onRefresh,
  onNavigate,
  showOnboarding,
  onDismissOnboarding,
}: DashboardViewProps) {
  if (loading && !snapshot) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading air quality dashboard">
        <div className="h-44 rounded-xl bg-white border border-[#E2E8E5] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 rounded-xl bg-white border border-[#E2E8E5] animate-pulse" />
          <div className="h-64 rounded-xl bg-white border border-[#E2E8E5] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div
        role="alert"
        className="rounded-xl bg-white border border-[#FCA5A5] p-8 text-center space-y-4"
      >
        <h2 className="text-xl font-semibold text-[#991B1B]">Unable to load air quality data</h2>
        <p className="text-sm text-[#4A5B54] max-w-md mx-auto">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-white bg-[#11382B] rounded-lg hover:bg-[#174C3A]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="px-4 py-2 text-sm font-medium text-[#11382B] bg-white border border-[#CBD5D0] rounded-lg hover:bg-[#F2FAF6]"
          >
            Change location
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const bestVent = findBestVentilationWindow(snapshot.hourlyTrend);
  const scaleLegend = standard === 'INDIA_CPCB' ? CPCB_SCALE_LEGEND : US_EPA_SCALE_LEGEND;
  const formattedUpdated = new Date(snapshot.lastUpdatedIso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* First-time Onboarding Hero Experience (dismissible, non-blocking) */}
      {showOnboarding && (
        <section
          aria-label="Welcome to AIRWISE"
          className="rounded-xl bg-[#11382B] text-white overflow-hidden border border-[#174C3A] grid grid-cols-1 lg:grid-cols-12 items-stretch"
        >
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#A7F3D0]">
                AIRWISE · Breathe Smarter. Live Greener.
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Turn live urban air quality into practical daily family decisions.
              </h1>
              <p className="text-sm text-[#D1FAE5] leading-relaxed max-w-xl">
                Monitor local PM2.5 and AQI, generate an AI-personalized low-emission daily routine,
                optimize indoor air safely, and track your household&rsquo;s estimated emissions avoided.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B261D] bg-[#6EE7B7] rounded-lg hover:bg-[#A7F3D0] transition-colors whitespace-nowrap"
              >
                Build my daily routine
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenLocationModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white border border-white/25 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Change city
              </button>
              <button
                type="button"
                onClick={onDismissOnboarding}
                className="px-3 py-2 text-xs font-medium text-[#A7F3D0] hover:text-white underline-offset-4 hover:underline"
              >
                Hide intro
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[200px] lg:min-h-full">
            <ResilientImage
              src="/src/assets/images/hero_clean_urban_morning_1795173802794.jpg"
              alt="Tree-lined urban residential street at clear winter dawn"
              fallbackTitle="Cleaner urban mornings with AIRWISE"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0B261D]/60 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </section>
      )}

      {/* Demonstration Data Disclosure (if live API unreachable) */}
      {snapshot.isDemonstrationData && (
        <div
          role="status"
          className="rounded-xl bg-[#FEFCE8] border border-[#FDE047] px-5 py-3.5 text-sm text-[#854D0E]"
        >
          <span className="font-semibold">Demonstration data mode:</span> {snapshot.disclaimer}
        </div>
      )}

      {/* Top Controls Row: Location Context + Standard Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5E7068]">
            <span>{snapshot.isDemonstrationData ? 'Demonstration dataset' : 'Live air monitoring'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Updated {formattedUpdated}
              {snapshot.cacheHit ? ' (cached)' : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span>{snapshot.dataSource}</span>
          </div>
          {showOnboarding ? (
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111C18] mt-1">
              {snapshot.location.name}
              {snapshot.location.region ? `, ${snapshot.location.region}` : ''}
            </h2>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18] mt-1">
              {snapshot.location.name}
              {snapshot.location.region ? `, ${snapshot.location.region}` : ''}
            </h1>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Standard Segmented Control */}
          <div
            role="group"
            aria-label="AQI calculation standard"
            className="inline-flex items-center p-1 bg-[#E9EFEC] rounded-lg"
          >
            <button
              type="button"
              onClick={() => onChangeStandard('INDIA_CPCB')}
              aria-pressed={standard === 'INDIA_CPCB'}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                standard === 'INDIA_CPCB'
                  ? 'bg-white text-[#11382B] shadow-xs'
                  : 'text-[#4A5B54] hover:text-[#111C18]'
              }`}
            >
              India AQI (CPCB)
            </button>
            <button
              type="button"
              onClick={() => onChangeStandard('US_EPA')}
              aria-pressed={standard === 'US_EPA'}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                standard === 'US_EPA'
                  ? 'bg-white text-[#11382B] shadow-xs'
                  : 'text-[#4A5B54] hover:text-[#111C18]'
              }`}
            >
              US EPA AQI
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh air quality readings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#11382B] bg-white border border-[#CBD5D0] rounded-lg hover:bg-[#F2FAF6] transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Focal Anchor: AQI Hero Panel + Weather & Pollutants */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Main AQI Reading Card */}
        <section
          aria-label="Current Air Quality Index"
          className="lg:col-span-7 bg-white border border-[#E2E8E5] rounded-xl p-6 flex flex-col justify-between gap-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[#5E7068]">
                {standard === 'INDIA_CPCB' ? 'Indian National AQI (CPCB)' : 'US EPA Air Quality Index'} · Dominant pollutant: {snapshot.dominantPollutant}
              </p>
              <div className="flex items-baseline gap-4 mt-2">
                <span className="text-5xl sm:text-6xl font-bold font-mono tabular-nums tracking-tight text-[#111C18]">
                  {snapshot.aqi}
                </span>
                <div>
                  <span className={`text-xl font-semibold block ${snapshot.category.textColorClass}`}>
                    {snapshot.category.label}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#5E7068]">
                    Band {snapshot.category.rangeLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:text-right space-y-1 text-sm text-[#4A5B54]">
              <p className="font-medium text-[#111C18]">Window ventilation guidance</p>
              <p className="text-xs max-w-xs sm:ml-auto">
                {bestVent.safeToVentilate
                  ? `Cleanest forecast window around ${bestVent.windowLabel} (AQI ~${bestVent.minAqi}).`
                  : `High particulate levels expected; keep exterior windows closed and filter indoor air.`}
              </p>
            </div>
          </div>

          {/* AQI Scale Spectrum Bar (visual + text labels, WCAG accessible) */}
          <div className="space-y-2">
            <div className="relative h-2.5 w-full rounded-full overflow-hidden flex" aria-hidden="true">
              {scaleLegend.map((band) => (
                <div key={band.label} className="flex-1 h-full" style={{ backgroundColor: band.color }} />
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] text-[#5E7068]">
              {scaleLegend.map((band) => (
                <div key={band.label} className="leading-tight">
                  <span className="font-medium text-[#111C18] block truncate">{band.label}</span>
                  <span className="font-mono tabular-nums">{band.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Health & Outdoor Summary */}
          <div className="pt-4 border-t border-[#E2E8E5] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#111C18] mb-1">Health impact summary</h3>
              <p className="text-[#4A5B54] leading-relaxed">{snapshot.category.healthSummary}</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#111C18] mb-1">Outdoor activity guidance</h3>
              <p className="text-[#4A5B54] leading-relaxed">{snapshot.category.outdoorGuidance}</p>
            </div>
          </div>
        </section>

        {/* Pollutants & Weather Telemetry Panel */}
        <section
          aria-label="Pollutant concentrations and local weather"
          className="lg:col-span-5 bg-white border border-[#E2E8E5] rounded-xl p-6 flex flex-col justify-between gap-5"
        >
          <div>
            <h3 className="text-base font-semibold text-[#111C18]">
              Pollutant concentrations
            </h3>
            <p className="text-xs text-[#5E7068] mt-0.5">
              Measured concentrations shown separately from computed AQI index
            </p>

            <dl className="mt-4 divide-y divide-[#E2E8E5] text-sm">
              <div className="py-2.5 flex items-baseline justify-between gap-4">
                <dt className="text-[#4A5B54]">PM2.5 (Fine particulate)</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#111C18]">
                  {snapshot.pollutants.pm25} µg/m³
                </dd>
              </div>
              <div className="py-2.5 flex items-baseline justify-between gap-4">
                <dt className="text-[#4A5B54]">PM10 (Coarse particulate)</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#111C18]">
                  {snapshot.pollutants.pm10} µg/m³
                </dd>
              </div>
              {typeof snapshot.pollutants.no2 === 'number' && (
                <div className="py-2.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[#4A5B54]">Nitrogen Dioxide (NO₂)</dt>
                  <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                    {snapshot.pollutants.no2} µg/m³
                  </dd>
                </div>
              )}
              {typeof snapshot.pollutants.o3 === 'number' && (
                <div className="py-2.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[#4A5B54]">Ground-level Ozone (O₃)</dt>
                  <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                    {snapshot.pollutants.o3} µg/m³
                  </dd>
                </div>
              )}
              {typeof snapshot.pollutants.so2 === 'number' && (
                <div className="py-2.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[#4A5B54]">Sulphur Dioxide (SO₂)</dt>
                  <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                    {snapshot.pollutants.so2} µg/m³
                  </dd>
                </div>
              )}
              {typeof snapshot.pollutants.co === 'number' && (
                <div className="py-2.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[#4A5B54]">Carbon Monoxide (CO)</dt>
                  <dd className="font-mono tabular-nums font-medium text-[#111C18]">
                    {(snapshot.pollutants.co / 1000).toFixed(2)} mg/m³
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="pt-4 border-t border-[#E2E8E5]">
            <h3 className="text-sm font-semibold text-[#111C18] mb-3">
              Local weather · {snapshot.weather.conditionLabel}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-1 text-xs text-[#5E7068]">
                  <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                  Temp
                </div>
                <p className="font-mono tabular-nums text-base font-semibold text-[#111C18] mt-0.5">
                  {snapshot.weather.temperatureC}°C
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-[#5E7068]">
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                  Humidity
                </div>
                <p className="font-mono tabular-nums text-base font-semibold text-[#111C18] mt-0.5">
                  {snapshot.weather.humidityPercent}%
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-[#5E7068]">
                  <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                  Wind
                </div>
                <p className="font-mono tabular-nums text-base font-semibold text-[#111C18] mt-0.5">
                  {snapshot.weather.windSpeedKmh} km/h
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 24-Hour Pollution Trend & Forecast */}
      <section
        aria-label="24-hour pollution trend and forecast"
        className="bg-white border border-[#E2E8E5] rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#111C18]">
              24-hour AQI trend &amp; short-range forecast
            </h3>
            <p className="text-xs text-[#5E7068]">
              Select or focus any hour to inspect PM2.5 and find lower-pollution windows for errands or airing rooms.
            </p>
          </div>
        </div>
        <AQIChart points={snapshot.hourlyTrend} standard={standard} />
      </section>

      {/* Complete Guided User Journey Shortcuts */}
      <section aria-label="Recommended next actions">
        <h3 className="text-lg font-semibold text-[#111C18] mb-3">
          Act on today&rsquo;s air quality
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              section: 'planner' as const,
              title: 'Generate daily routine',
              desc: 'Personalize morning, afternoon, and evening steps for your commute and household.',
              icon: CalendarCheck,
            },
            {
              section: 'indoor' as const,
              title: 'Optimize indoor air',
              desc: 'Check safe window ventilation timing, HEPA CADR sizing, and smoke source control.',
              icon: Home,
            },
            {
              section: 'alternatives' as const,
              title: 'Find sustainable swaps',
              desc: 'Compare lower-emission alternatives with transparent CO2e and cost estimates.',
              icon: Leaf,
            },
            {
              section: 'assistant' as const,
              title: 'Ask AIRWISE AI',
              desc: `Get contextual answers grounded in ${snapshot.location.name}'s AQI ${snapshot.aqi}.`,
              icon: MessageSquare,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.section}
                type="button"
                onClick={() => onNavigate(item.section)}
                className="text-left bg-white border border-[#E2E8E5] rounded-xl p-5 hover:border-[#1F7A5C] hover:bg-[#F2FAF6]/40 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <Icon className="h-5 w-5 text-[#11382B]" aria-hidden="true" />
                  <h4 className="text-base font-semibold text-[#111C18]">{item.title}</h4>
                  <p className="text-xs text-[#4A5B54] leading-relaxed">{item.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#11382B]">
                  Open module
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Transparent Data Attribution & Medical Disclaimer */}
      <footer className="text-xs text-[#5E7068] pt-2 border-t border-[#E2E8E5] leading-relaxed">
        {snapshot.disclaimer} AIRWISE provides environmental and exposure-reduction guidance and does not replace professional medical advice.
      </footer>
    </div>
  );
}
