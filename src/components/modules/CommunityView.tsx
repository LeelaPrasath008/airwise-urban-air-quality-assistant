import { useMemo, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { COMMUNITY_INITIATIVES } from '../../shared/sustainability.ts';

interface CommunityViewProps {
  joinedIds: string[];
  onToggleJoin: (id: string) => void;
}

export function CommunityView({ joinedIds, onToggleJoin }: CommunityViewProps) {
  const [simulatedHouseholds, setSimulatedHouseholds] = useState(20);

  const selectedInitiatives = useMemo(
    () =>
      COMMUNITY_INITIATIVES.filter((item) =>
        joinedIds.length > 0 ? joinedIds.includes(item.id) : true
      ),
    [joinedIds]
  );

  const perHouseholdMonthlyKg = useMemo(
    () =>
      selectedInitiatives.reduce((sum, item) => sum + item.estimatedPerHouseholdMonthlyCo2Kg, 0),
    [selectedInitiatives]
  );

  const neighborhoodMonthlyKg = perHouseholdMonthlyKg * simulatedHouseholds;
  const neighborhoodWinterSeasonKg = neighborhoodMonthlyKg * 4;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-[#5E7068]">
          Transparent neighborhood modeling · No fabricated participant counts
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18]">Community Impact Center</h1>
        <p className="text-sm text-[#4A5B54] max-w-3xl">
          Urban winter smog drops fastest when entire residential blocks act together. Join local
          pledges for your household and model transparent collective emissions reductions.
        </p>
      </header>

      {/* Transparent Community Impact Calculator (Zero fabricated global user counts) */}
      <section
        aria-label="Transparent neighborhood impact calculator"
        className="bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#11382B]">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Neighborhood scenario calculator (Transparent estimate)</span>
            </div>
            <h2 className="text-lg font-semibold text-[#111C18]">
              Model collective block or RWA impact
            </h2>
            <p className="text-xs text-[#4A5B54]">
              {joinedIds.length > 0
                ? `Calculating across your ${joinedIds.length} pledged initiative(s).`
                : 'Showing potential if a block adopts all 5 neighborhood initiatives (select specific pledges below to narrow).'}
            </p>
          </div>

          <div className="w-full md:w-64">
            <label
              htmlFor="household-sim-range"
              className="flex items-center justify-between text-xs font-medium text-[#111C18] mb-1"
            >
              <span>Participating households</span>
              <span className="font-mono tabular-nums font-semibold text-[#11382B]">
                {simulatedHouseholds} homes
              </span>
            </label>
            <input
              id="household-sim-range"
              type="range"
              min={5}
              max={100}
              step={5}
              value={simulatedHouseholds}
              onChange={(e) => setSimulatedHouseholds(Number(e.target.value))}
              className="w-full accent-[#11382B]"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#5E7068]">
              <span>5</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8E5]">
          <div>
            <span className="text-xs text-[#5E7068] block">Your household pledges</span>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#111C18] mt-1">
              {joinedIds.length} / {COMMUNITY_INITIATIVES.length}
            </p>
            <span className="text-xs text-[#5E7068]">Stored locally on your device</span>
          </div>
          <div>
            <span className="text-xs text-[#5E7068] block">Estimated monthly block reduction</span>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#11382B] mt-1">
              {neighborhoodMonthlyKg.toLocaleString()} kg CO₂e
            </p>
            <span className="text-xs font-mono tabular-nums text-[#5E7068]">
              {simulatedHouseholds} homes × {perHouseholdMonthlyKg} kg/home/mo
            </span>
          </div>
          <div>
            <span className="text-xs text-[#5E7068] block">4-month winter season scenario</span>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#1F7A5C] mt-1">
              {(neighborhoodWinterSeasonKg / 1000).toFixed(2)} tonnes CO₂e
            </p>
            <span className="text-xs text-[#5E7068]">Scenario estimate, not live telemetry</span>
          </div>
        </div>
      </section>

      {/* Practical Neighborhood Initiatives */}
      <section aria-label="Neighborhood pollution-reduction challenges" className="space-y-4">
        <h2 className="text-lg font-semibold text-[#111C18]">
          Community initiatives &amp; household challenges
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {COMMUNITY_INITIATIVES.map((init) => {
            const joined = joinedIds.includes(init.id);
            return (
              <article
                key={init.id}
                className="bg-white border border-[#E2E8E5] rounded-xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#5E7068]">
                        Est. ~{init.estimatedPerHouseholdMonthlyCo2Kg} kg CO₂e / household / month
                      </span>
                      <h3 className="text-base font-semibold text-[#111C18] mt-0.5">
                        {init.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      aria-pressed={joined}
                      onClick={() => onToggleJoin(init.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        joined
                          ? 'bg-[#E6F4EE] text-[#11382B] border border-[#1F7A5C]'
                          : 'bg-[#11382B] text-white hover:bg-[#174C3A]'
                      }`}
                    >
                      {joined && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {joined ? 'Pledged' : 'Join pledge'}
                    </button>
                  </div>

                  <p className="text-sm text-[#4A5B54] leading-relaxed">{init.summary}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8E5] text-xs">
                    <div>
                      <h4 className="font-semibold text-[#11382B] mb-1">At home</h4>
                      <ul className="space-y-1 text-[#4A5B54]">
                        {init.householdSteps.map((step, i) => (
                          <li key={i}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#11382B] mb-1">With neighbors / RWA</h4>
                      <ul className="space-y-1 text-[#4A5B54]">
                        {init.neighborhoodSteps.map((step, i) => (
                          <li key={i}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#5E7068] pt-2 border-t border-[#E2E8E5]">
                  Calculation basis: {init.calculationBasis}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
