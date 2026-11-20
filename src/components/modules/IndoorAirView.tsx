import { useMemo, useState } from 'react';
import { AlertOctagon, CheckCircle2, ShieldCheck, Wind } from 'lucide-react';
import { ResilientImage } from '../BrandMark.tsx';
import { findBestVentilationWindow } from '../../shared/aqi.ts';
import { generateIndoorRecommendations } from '../../shared/sustainability.ts';
import type { AirQualitySnapshot, IndoorAuditInput } from '../../shared/types.ts';

interface IndoorAirViewProps {
  snapshot: AirQualitySnapshot | null;
}

export function IndoorAirView({ snapshot }: IndoorAirViewProps) {
  const [audit, setAudit] = useState<IndoorAuditInput>({
    roomType: 'living_room',
    hasHepaPurifier: false,
    hasKitchenExhaust: true,
    cookingFuel: 'lpg_gas',
    usesIncenseOrCandles: false,
    dustyEnvironment: true,
    roomAreaSqFt: 200,
  });

  const outdoorAqi = snapshot?.aqi ?? 180;
  const bestVent = useMemo(
    () => findBestVentilationWindow(snapshot?.hourlyTrend ?? []),
    [snapshot?.hourlyTrend]
  );

  const plan = useMemo(
    () => generateIndoorRecommendations(audit, outdoorAqi, bestVent),
    [audit, outdoorAqi, bestVent]
  );

  const evidenceBased = plan.recommendations.filter((r) => r.evidenceTier === 'evidence_based');
  const generalPractical = plan.recommendations.filter((r) => r.evidenceTier === 'general_practical');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-[#5E7068]">
          {snapshot
            ? `Linked to ${snapshot.location.name} outdoor AQI ${snapshot.aqi} (${snapshot.category.label})`
            : 'Outdoor air quality linked automatically'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18]">
          Indoor Air Quality Optimizer
        </h1>
        <p className="text-sm text-[#4A5B54] max-w-3xl">
          Tailor ventilation, filtration, cooking exhaust, and cleaning practices to current outdoor
          pollution levels—built strictly on evidence-based respiratory safety guidance.
        </p>
      </header>

      {/* Top Split: Dynamic Ventilation Decision + Editorial Clean Indoor Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section
          aria-label="Current window ventilation guidance"
          className="lg:col-span-7 bg-white border border-[#E2E8E5] rounded-xl p-6 flex flex-col justify-between gap-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#11382B]">
              <Wind className="h-4 w-4" aria-hidden="true" />
              <span>
                Outdoor ventilation decision · Outdoor AQI{' '}
                <span className="font-mono tabular-nums">{outdoorAqi}</span>
              </span>
            </div>

            <h2
              className={`text-xl font-bold ${
                plan.ventilationStatus === 'close_windows'
                  ? 'text-[#991B1B]'
                  : plan.ventilationStatus === 'brief_window'
                    ? 'text-[#9A3412]'
                    : 'text-[#14532D]'
              }`}
            >
              {plan.ventilationHeadline}
            </h2>

            <p className="text-sm text-[#4A5B54] leading-relaxed">{plan.ventilationExplanation}</p>
          </div>

          <div className="pt-4 border-t border-[#E2E8E5] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-[#5E7068] block">Recommended HEPA CADR for room</span>
              <span className="font-mono tabular-nums text-xl font-bold text-[#111C18]">
                ≥ {plan.recommendedCadrM3h} m³/h
              </span>
              <span className="text-xs text-[#5E7068] block mt-0.5">
                Target ~4.8 air changes/hour for {audit.roomAreaSqFt} sq ft (~2.6m ceiling)
              </span>
            </div>
            <div>
              <span className="text-xs text-[#5E7068] block">Lowest forecast AQI window</span>
              <span className="font-mono tabular-nums text-xl font-bold text-[#111C18]">
                {bestVent.windowLabel}
              </span>
              <span className="text-xs text-[#5E7068] block mt-0.5">
                Projected AQI {bestVent.minAqi} ·{' '}
                {bestVent.safeToVentilate ? 'Suitable for brief airing' : 'Keep windows closed'}
              </span>
            </div>
          </div>
        </section>

        <div className="lg:col-span-5 rounded-xl overflow-hidden border border-[#E2E8E5] bg-white min-h-[220px]">
          <ResilientImage
            src="/src/assets/images/indoor_clean_living_1795173810730.jpg"
            alt="Calm family living room with sealed double-glazed windows and a cylindrical True HEPA air purifier"
            fallbackTitle="Sealed indoor space with True HEPA filtration"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Interactive Household Air Audit */}
      <section
        aria-label="Home environment setup"
        className="bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-semibold text-[#111C18]">Customize for your home</h2>
          <p className="text-xs text-[#5E7068]">
            Adjust room size, cooking fuel, and indoor sources to update CADR targets and prioritized guidance immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="room-type-select" className="block text-sm font-medium text-[#111C18] mb-1">
              Primary room focus
            </label>
            <select
              id="room-type-select"
              value={audit.roomType}
              onChange={(e) =>
                setAudit({ ...audit, roomType: e.target.value as IndoorAuditInput['roomType'] })
              }
              className="w-full px-3 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            >
              <option value="living_room">Living room</option>
              <option value="bedroom">Bedroom</option>
              <option value="kitchen">Kitchen</option>
              <option value="home_office">Home office / study</option>
              <option value="whole_home">Whole apartment / home</option>
            </select>
          </div>

          <div>
            <label htmlFor="cooking-fuel-select" className="block text-sm font-medium text-[#111C18] mb-1">
              Primary cooking fuel
            </label>
            <select
              id="cooking-fuel-select"
              value={audit.cookingFuel}
              onChange={(e) =>
                setAudit({
                  ...audit,
                  cookingFuel: e.target.value as IndoorAuditInput['cookingFuel'],
                })
              }
              className="w-full px-3 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            >
              <option value="lpg_gas">LPG / Piped natural gas</option>
              <option value="induction_electric">Induction / electric stove</option>
              <option value="biomass_solid">Wood, coal, or solid fuel</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="room-area-range" className="flex items-center justify-between text-sm font-medium text-[#111C18] mb-1">
              <span>Room floor area</span>
              <span className="font-mono tabular-nums text-[#11382B]">{audit.roomAreaSqFt} sq ft</span>
            </label>
            <input
              id="room-area-range"
              type="range"
              min={80}
              max={600}
              step={10}
              value={audit.roomAreaSqFt}
              onChange={(e) => setAudit({ ...audit, roomAreaSqFt: Number(e.target.value) })}
              className="w-full accent-[#11382B]"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#5E7068]">
              <span>80 sq ft</span>
              <span>300 sq ft</span>
              <span>600 sq ft</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E2E8E5]">
          {[
            { key: 'hasHepaPurifier' as const, label: 'True HEPA purifier available' },
            { key: 'hasKitchenExhaust' as const, label: 'Ducted kitchen exhaust / chimney' },
            { key: 'usesIncenseOrCandles' as const, label: 'Uses incense, dhoop, or candles' },
            { key: 'dustyEnvironment' as const, label: 'High roadside dust / construction nearby' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2.5 text-sm text-[#111C18] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={audit[item.key]}
                onChange={(e) => setAudit({ ...audit, [item.key]: e.target.checked })}
                className="h-4 w-4 accent-[#11382B]"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Evidence-Based Recommendations */}
      <section aria-label="Evidence-based indoor air recommendations" className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#11382B]" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#111C18]">
            Evidence-based recommendations (EPA / WHO / ASHRAE)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {evidenceBased.map((rec) => (
            <article
              key={rec.id}
              className="bg-white border border-[#E2E8E5] rounded-xl p-5 space-y-3"
            >
              <div className="text-xs text-[#5E7068] flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#11382B]">Evidence-based</span>
                <span aria-hidden="true">·</span>
                <span>Priority: {rec.priority}</span>
                <span aria-hidden="true">·</span>
                <span>{rec.evidenceSource}</span>
              </div>

              <h3 className="text-base font-semibold text-[#111C18]">{rec.title}</h3>
              <p className="text-sm text-[#111C18]">{rec.action}</p>
              <p className="text-xs text-[#4A5B54] leading-relaxed">{rec.rationale}</p>

              <ul className="space-y-1.5 pt-2 border-t border-[#E2E8E5] text-xs text-[#4A5B54]">
                {rec.implementationSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A5C] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* General Practical Suggestions (Clearly separated from Evidence-Based) */}
      <section aria-label="General practical suggestions" className="space-y-3">
        <h2 className="text-lg font-semibold text-[#111C18]">General practical suggestions</h2>
        <div className="grid grid-cols-1 gap-4">
          {generalPractical.map((rec) => (
            <article
              key={rec.id}
              className="bg-white border border-[#E2E8E5] rounded-xl p-5 space-y-2.5"
            >
              <div className="text-xs text-[#5E7068]">
                General household suggestion · {rec.evidenceSource}
              </div>
              <h3 className="text-base font-semibold text-[#111C18]">{rec.title}</h3>
              <p className="text-sm text-[#111C18]">{rec.action}</p>
              <p className="text-xs text-[#4A5B54]">{rec.rationale}</p>
              <ul className="space-y-1 pt-2 border-t border-[#E2E8E5] text-xs text-[#4A5B54]">
                {rec.implementationSteps.map((step, i) => (
                  <li key={i}>• {step}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Mandatory Safety Warnings: What NOT to do */}
      <section
        aria-label="Important indoor air safety warnings"
        className="rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] p-6 space-y-3"
      >
        <div className="flex items-center gap-2 text-[#991B1B]">
          <AlertOctagon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <h2 className="text-base font-bold">
            Methods to avoid — unsafe or unverified indoor air practices
          </h2>
        </div>
        <ul className="space-y-2 text-sm text-[#7F1D1D]">
          {plan.safetyWarnings.map((warning, idx) => (
            <li key={idx} className="leading-relaxed">
              • {warning}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
