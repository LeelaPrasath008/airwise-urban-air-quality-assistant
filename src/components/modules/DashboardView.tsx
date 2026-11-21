import { useMemo } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  Home,
  Leaf,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { AQIChart } from '../AQIChart.tsx';
import { OnboardingHero } from '../OnboardingHero.tsx';
import { PollutantTelemetryCard } from '../PollutantTelemetryCard.tsx';
import { findBestVentilationWindow, getAQIScaleLegend } from '../../shared/aqi.ts';
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
  const bestVent = useMemo(
    () => (snapshot ? findBestVentilationWindow(snapshot.hourlyTrend) : null),
    [snapshot]
  );

  const formattedUpdated = useMemo(
    () =>
      snapshot
        ? new Date(snapshot.lastUpdatedIso).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
    [snapshot]
  );

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

  if (!snapshot || !bestVent) return null;

  const scaleLegend = getAQIScaleLegend(standard);
  const SectionHeading = showOnboarding ? 'h3' : 'h2';
  const CardHeading = showOnboarding ? 'h4' : 'h3';

  return (
    <div className="space-y-6">
      {/* First-time Onboarding Hero Experience (dismissible, non-blocking) */}
      {showOnboarding && (
        <OnboardingHero
          onNavigate={onNavigate}
          onOpenLocationModal={onOpenLocationModal}
          onDismiss={onDismissOnboarding}
        />
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

      {/* Non-blocking Refresh / Location-Switch Error Banner (when prior snapshot remains visible) */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-[#7F1D1D]"
        >
          <div>
            <p className="font-semibold text-[#991B1B]">
              Could not update air quality readings — displaying last loaded data for{' '}
              {snapshot.location.name}.
            </p>
            <p className="text-xs text-[#7F1D1D] mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#991B1B] bg-white border border-[#FCA5A5] rounded-lg hover:bg-[#FEE2E2] transition-colors whitespace-nowrap shrink-0 self-start sm:self-center disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Retry
          </button>
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
              <SectionHeading className="font-semibold text-[#111C18] mb-1">
                Health impact summary
              </SectionHeading>
              <p className="text-[#4A5B54] leading-relaxed">{snapshot.category.healthSummary}</p>
            </div>
            <div>
              <SectionHeading className="font-semibold text-[#111C18] mb-1">
                Outdoor activity guidance
              </SectionHeading>
              <p className="text-[#4A5B54] leading-relaxed">{snapshot.category.outdoorGuidance}</p>
            </div>
          </div>
        </section>

        {/* Pollutants & Weather Telemetry Panel */}
        <PollutantTelemetryCard
          pollutants={snapshot.pollutants}
          weather={snapshot.weather}
          headingLevel={SectionHeading}
        />
      </div>

      {/* 24-Hour Pollution Trend & Forecast */}
      <section
        aria-label="24-hour pollution trend and forecast"
        className="bg-white border border-[#E2E8E5] rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
          <div>
            <SectionHeading className="text-lg font-semibold text-[#111C18]">
              24-hour AQI trend &amp; short-range forecast
            </SectionHeading>
            <p className="text-xs text-[#5E7068]">
              Select or focus any hour to inspect PM2.5 and find lower-pollution windows for errands or airing rooms.
            </p>
          </div>
        </div>
        <AQIChart key={snapshot.location.id} points={snapshot.hourlyTrend} standard={standard} />
      </section>

      {/* Complete Guided User Journey Shortcuts */}
      <section aria-label="Recommended next actions">
        <SectionHeading className="text-lg font-semibold text-[#111C18] mb-3">
          Act on today&rsquo;s air quality
        </SectionHeading>
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
                  <CardHeading className="text-base font-semibold text-[#111C18]">
                    {item.title}
                  </CardHeading>
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
