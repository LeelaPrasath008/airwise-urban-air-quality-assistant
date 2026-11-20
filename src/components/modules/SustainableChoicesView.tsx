import { useMemo, useState } from 'react';
import { ArrowRight, Check, Search } from 'lucide-react';
import { SUSTAINABLE_ALTERNATIVES } from '../../shared/sustainability.ts';
import type { ActionCategory, AirQualitySnapshot, AlternativeDomain } from '../../shared/types.ts';

interface SustainableChoicesViewProps {
  snapshot: AirQualitySnapshot | null;
  onLogAlternative: (title: string, category: ActionCategory, defaultCo2: number) => void;
}

const DOMAIN_FILTERS: Array<{ id: 'all' | AlternativeDomain; label: string }> = [
  { id: 'all', label: 'All choices' },
  { id: 'commuting', label: 'Commuting' },
  { id: 'energy', label: 'Home energy' },
  { id: 'waste', label: 'Waste & burning' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'single_use', label: 'Reusables' },
  { id: 'heating_cooking', label: 'Cooking & heating' },
];

export function SustainableChoicesView({
  snapshot,
  onLogAlternative,
}: SustainableChoicesViewProps) {
  const [domain, setDomain] = useState<'all' | AlternativeDomain>('all');
  const [query, setQuery] = useState('');
  const [loggedIds, setLoggedIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUSTAINABLE_ALTERNATIVES.filter((item) => {
      if (domain !== 'all' && item.domain !== domain) return false;
      if (!q) return true;
      return (
        item.originalActivity.toLowerCase().includes(q) ||
        item.recommendedAlternative.toLowerCase().includes(q) ||
        item.whyBetter.toLowerCase().includes(q)
      );
    });
  }, [domain, query]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-[#5E7068]">
          Transparent emissions estimates · Methodology and assumptions disclosed on every card
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18]">
          Sustainable Alternatives Finder
        </h1>
        <p className="text-sm text-[#4A5B54] max-w-3xl">
          Replace everyday pollution-intensive habits with practical lower-emission choices. Every
          figure is explicitly labeled as an estimate grounded in published emission factors.
        </p>
      </header>

      {/* Search + Segmented Category Filter */}
      <div className="bg-white border border-[#E2E8E5] rounded-xl p-4 space-y-4">
        <div className="relative">
          <Search
            className="h-4 w-4 text-[#5E7068] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="alt-search-input" className="sr-only">
            Search sustainable alternatives
          </label>
          <input
            id="alt-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everyday activities (e.g., car commute, deliveries, leaves, electricity)..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
          />
        </div>

        <div
          role="group"
          aria-label="Filter alternatives by category"
          className="flex flex-wrap items-center gap-1.5"
        >
          {DOMAIN_FILTERS.map((f) => {
            const active = domain === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setDomain(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#11382B] text-white'
                    : 'bg-[#F6F8F7] text-[#4A5B54] hover:bg-[#E6F4EE] hover:text-[#11382B]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contextual AQI suitability note for active travel */}
      {snapshot && snapshot.aqi > 200 && (
        <div
          role="note"
          className="rounded-xl bg-[#FFF7ED] border border-[#FDBA74] px-5 py-3.5 text-sm text-[#9A3412]"
        >
          <span className="font-semibold">AQI suitability note ({snapshot.location.name}, AQI {snapshot.aqi}):</span>{' '}
          Because outdoor pollution is currently {snapshot.category.label}, prefer enclosed metro or
          bus transit over open cycling or prolonged walking today.
        </div>
      )}

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8E5] rounded-xl p-8 text-center space-y-2">
          <h2 className="text-base font-semibold text-[#111C18]">No matching alternatives</h2>
          <p className="text-sm text-[#4A5B54]">
            Try clearing your search filter to view all sustainable daily swaps.
          </p>
          <button
            type="button"
            onClick={() => {
              setDomain('all');
              setQuery('');
            }}
            className="mt-2 px-4 py-2 text-xs font-medium text-[#11382B] border border-[#CBD5D0] rounded-lg hover:bg-[#F2FAF6]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isLogged = Boolean(loggedIds[item.id]);
            return (
              <article
                key={item.id}
                className="bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-4"
              >
                {/* Swap Header */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center pb-4 border-b border-[#E2E8E5]">
                  <div className="md:col-span-5">
                    <span className="text-xs text-[#5E7068] block">Instead of</span>
                    <p className="text-sm font-medium text-[#4A5B54] mt-0.5">
                      {item.originalActivity}
                    </p>
                  </div>
                  <div className="md:col-span-1 flex md:justify-center text-[#1F7A5C]">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="md:col-span-5">
                    <span className="text-xs font-semibold text-[#1F7A5C] block">
                      Recommended sustainable alternative
                    </span>
                    <h2 className="text-base font-semibold text-[#111C18] mt-0.5">
                      {item.recommendedAlternative}
                    </h2>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-sm">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-[#11382B]">Why it is better</h3>
                    <p className="text-[#4A5B54] leading-relaxed">{item.whyBetter}</p>
                    <p className="text-xs text-[#5E7068]">
                      <span className="font-medium text-[#111C18]">Suitability:</span>{' '}
                      {item.suitabilityNote}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-[#11382B]">
                      Estimated emissions &amp; cost impact
                    </h3>
                    <p className="text-[#111C18] font-medium">{item.estimatedEmissionsReduction}</p>
                    <p className="text-xs text-[#4A5B54]">
                      <span className="font-medium text-[#111C18]">Cost difference:</span>{' '}
                      {item.estimatedCostDifference}
                    </p>
                    <p className="text-xs text-[#5E7068] leading-relaxed">
                      <span className="font-medium text-[#111C18]">Assumptions:</span>{' '}
                      {item.estimateBasisAndAssumptions}
                    </p>
                  </div>

                  <div className="space-y-2 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-[#11382B] mb-1.5">
                        Practical implementation
                      </h3>
                      <ul className="space-y-1.5 text-xs text-[#4A5B54]">
                        {item.practicalImplementation.map((step, i) => (
                          <li key={i}>• {step}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        disabled={isLogged}
                        onClick={() => {
                          onLogAlternative(
                            item.recommendedAlternative,
                            item.impactCategory,
                            item.defaultCo2SavedKg
                          );
                          setLoggedIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          isLogged
                            ? 'bg-[#E6F4EE] text-[#11382B]'
                            : 'bg-[#11382B] text-white hover:bg-[#174C3A]'
                        }`}
                      >
                        {isLogged && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        {isLogged ? 'Logged to My Impact' : 'Adopt & log action'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
