import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Sparkles, Sun, Sunrise, Sunset } from 'lucide-react';
import { requestDailyRoutine } from '../../services/api.ts';
import type {
  ActionCategory,
  AirQualitySnapshot,
  DailyRoutinePlan,
  LifestyleProfile,
  RoutineRecommendation,
} from '../../shared/types.ts';

interface DailyPlannerViewProps {
  snapshot: AirQualitySnapshot | null;
  profile: LifestyleProfile;
  onUpdateProfile: (profile: LifestyleProfile) => void;
  routine: DailyRoutinePlan | null;
  onUpdateRoutine: (plan: DailyRoutinePlan) => void;
  onLogQuickAction: (title: string, category: ActionCategory) => void;
}

export function DailyPlannerView({
  snapshot,
  profile,
  onUpdateProfile,
  routine,
  onUpdateRoutine,
  onLogQuickAction,
}: DailyPlannerViewProps) {
  const [formState, setFormState] = useState<LifestyleProfile>(profile);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const isRoutineStale = Boolean(
    routine &&
      snapshot &&
      (routine.locationName !== snapshot.location.name ||
        Math.abs(routine.aqiAtGeneration - snapshot.aqi) >= 30)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!snapshot) {
      setError('Air quality context is still loading. Please try again in a moment.');
      return;
    }
    if (formState.occupation.trim().length < 2) {
      setError('Please enter your occupation or primary daily activity.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setGenerating(true);
    onUpdateProfile(formState);

    try {
      const generated = await requestDailyRoutine(snapshot, formState, controller.signal);
      if (!controller.signal.aborted) {
        onUpdateRoutine(generated);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate your personalized routine right now.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setGenerating(false);
      }
    }
  };

  const renderSection = (
    heading: string,
    Icon: typeof Sunrise,
    items: RoutineRecommendation[]
  ) => (
    <section aria-label={`${heading} routine`} className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#11382B]" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-[#111C18]">{heading}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => {
          const isLogged = Boolean(loggedIds[item.id]);
          return (
            <article
              key={item.id}
              className="bg-white border border-[#E2E8E5] rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-semibold text-[#111C18]">{item.title}</h4>
                  <span className="text-xs text-[#5E7068] whitespace-nowrap shrink-0">
                    {item.effortOrCost}
                  </span>
                </div>

                <dl className="space-y-2.5 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-[#11382B]">What to do</dt>
                    <dd className="text-[#111C18] mt-0.5">{item.whatToDo}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#11382B]">Why it is recommended</dt>
                    <dd className="text-[#4A5B54] mt-0.5">{item.whyRecommended}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#11382B]">How to implement</dt>
                    <dd className="text-[#4A5B54] mt-0.5">{item.howToImplement}</dd>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8E5]">
                    <div>
                      <dt className="text-xs font-semibold text-[#1F7A5C]">Environmental benefit</dt>
                      <dd className="text-xs text-[#4A5B54] mt-0.5 leading-relaxed">
                        {item.environmentalBenefit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#111C18]">Exposure &amp; health note</dt>
                      <dd className="text-xs text-[#4A5B54] mt-0.5 leading-relaxed">
                        {item.healthConsideration}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {item.impactCategory && (
                <div className="pt-3 border-t border-[#E2E8E5] flex items-center justify-between">
                  <span className="text-xs text-[#5E7068]">Completed this step today?</span>
                  <button
                    type="button"
                    disabled={isLogged}
                    onClick={() => {
                      onLogQuickAction(item.title, item.impactCategory ?? 'clean_indoor_air');
                      setLoggedIds((prev) => ({ ...prev, [item.id]: true }));
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isLogged
                        ? 'bg-[#E6F4EE] text-[#11382B]'
                        : 'border border-[#CBD5D0] text-[#11382B] hover:bg-[#F2FAF6]'
                    }`}
                  >
                    {isLogged && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {isLogged ? 'Logged to My Impact' : 'Log to My Impact'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-[#5E7068]">
          {snapshot
            ? `${snapshot.location.name} · AQI ${snapshot.aqi} (${snapshot.category.label}) · ${snapshot.weather.temperatureC}°C`
            : 'Syncing local air quality context...'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18]">
          AI Personalized Daily Routine Planner
        </h1>
        <p className="text-sm text-[#4A5B54] max-w-3xl">
          Tell AIRWISE how your household commutes, works, and ventilates. We combine your lifestyle
          with local AQI and weather to generate practical morning, afternoon, and evening actions.
        </p>
      </header>

      {/* Lifestyle Intake Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-5"
        aria-label="Household lifestyle preferences"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="occupation-input" className="block text-sm font-medium text-[#111C18] mb-1">
              Occupation or daily activity
            </label>
            <input
              id="occupation-input"
              type="text"
              required
              minLength={2}
              maxLength={120}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'planner-form-error' : undefined}
              value={formState.occupation}
              onChange={(e) => setFormState({ ...formState, occupation: e.target.value })}
              placeholder="e.g., Office commuter, University student, Parent at home"
              className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            />
          </div>

          <div>
            <label htmlFor="commute-select" className="block text-sm font-medium text-[#111C18] mb-1">
              Typical commute
            </label>
            <select
              id="commute-select"
              value={formState.typicalCommute}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  typicalCommute: e.target.value as LifestyleProfile['typicalCommute'],
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            >
              <option value="car_solo">Private car (solo)</option>
              <option value="carpool">Carpool / shared cab</option>
              <option value="public_transit">Metro / bus public transit</option>
              <option value="two_wheeler">Two-wheeler / scooter</option>
              <option value="walk_cycle">Walking or cycling</option>
              <option value="remote">Work or study from home</option>
            </select>
          </div>

          <div>
            <label htmlFor="household-size-input" className="block text-sm font-medium text-[#111C18] mb-1">
              Household size
            </label>
            <input
              id="household-size-input"
              type="number"
              min={1}
              max={20}
              required
              value={formState.householdSize}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  householdSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            />
          </div>

          <div>
            <label htmlFor="ventilation-select" className="block text-sm font-medium text-[#111C18] mb-1">
              Indoor ventilation &amp; filtration
            </label>
            <select
              id="ventilation-select"
              value={formState.indoorVentilation}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  indoorVentilation: e.target.value as LifestyleProfile['indoorVentilation'],
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            >
              <option value="natural_windows">Windows &amp; ceiling fans only</option>
              <option value="exhaust_fans">Windows + kitchen/bath exhaust fans</option>
              <option value="hvac_filtered">Central AC / filtered HVAC</option>
              <option value="hepa_purifier">True HEPA air purifier available</option>
            </select>
          </div>

          <div>
            <label htmlFor="preferred-transport-select" className="block text-sm font-medium text-[#111C18] mb-1">
              Preferred sustainable transport
            </label>
            <select
              id="preferred-transport-select"
              value={formState.preferredTransport}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  preferredTransport: e.target.value as LifestyleProfile['preferredTransport'],
                })
              }
              className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
            >
              <option value="metro_bus">Metro / electric bus</option>
              <option value="walk_cycle">Walking / cycling when safe</option>
              <option value="ev_shared">EV cab / shared carpool</option>
              <option value="flexible">Open to best option</option>
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2.5 text-sm text-[#111C18] cursor-pointer">
              <input
                type="checkbox"
                checked={formState.worksOutdoors}
                onChange={(e) => setFormState({ ...formState, worksOutdoors: e.target.checked })}
                className="h-4 w-4 accent-[#11382B]"
              />
              <span>Works or studies outdoors regularly</span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="household-notes-input" className="block text-sm font-medium text-[#111C18] mb-1">
            Household requirements (optional)
          </label>
          <input
            id="household-notes-input"
            type="text"
            maxLength={300}
            value={formState.householdNotes}
            onChange={(e) => setFormState({ ...formState, householdNotes: e.target.value })}
            placeholder="e.g., School-going child, older parent at home, early morning commute, apartment facing main road"
            className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
          />
        </div>

        {error && (
          <p id="planner-form-error" role="alert" className="text-sm text-[#991B1B]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E2E8E5]">
          <p className="text-xs text-[#5E7068]">
            Preferences stay in your browser and are sent only when generating your plan.
          </p>
          <button
            type="submit"
            disabled={generating || !snapshot}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#11382B] rounded-lg hover:bg-[#174C3A] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {generating
              ? 'Generating routine...'
              : routine
                ? 'Regenerate routine'
                : 'Generate daily routine'}
          </button>
        </div>
      </form>

      {/* Generated Routine Output */}
      {!routine && !generating && (
        <div className="bg-white border border-[#E2E8E5] rounded-xl p-8 text-center space-y-2">
          <h2 className="text-base font-semibold text-[#111C18]">No routine generated yet</h2>
          <p className="text-sm text-[#4A5B54] max-w-lg mx-auto">
            Review your household profile above and select &ldquo;Generate daily routine&rdquo; to receive tailored Morning, Afternoon, and Evening guidance.
          </p>
        </div>
      )}

      {routine && (
        <div className="space-y-6">
          <div className="bg-[#F2FAF6] border border-[#CBE8CE] rounded-xl p-5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#11382B]">
              <span className="font-semibold">
                {routine.source === 'gemini_ai'
                  ? 'Generated by AIRWISE GenAI'
                  : 'Generated by AIRWISE Rule-Based Engine (Fallback)'}
              </span>
              <span className="font-mono tabular-nums">
                {routine.locationName} · AQI {routine.aqiAtGeneration} ·{' '}
                {new Date(routine.generatedAtIso).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-sm text-[#111C18] leading-relaxed">{routine.summary}</p>
            {routine.fallbackReason && (
              <p className="text-xs text-[#4A5B54]">{routine.fallbackReason}</p>
            )}
            {isRoutineStale && snapshot && (
              <p
                role="status"
                className="text-xs font-medium text-[#854D0E] bg-[#FEFCE8] border border-[#FDE047] rounded-lg px-3 py-2 mt-2"
              >
                This routine was generated for {routine.locationName} (AQI {routine.aqiAtGeneration}).
                Select &ldquo;Regenerate routine&rdquo; above to match {snapshot.location.name} (AQI{' '}
                {snapshot.aqi}).
              </p>
            )}
          </div>

          {renderSection('Morning', Sunrise, routine.morning)}
          {renderSection('Afternoon', Sun, routine.afternoon)}
          {renderSection('Evening', Sunset, routine.evening)}

          <p className="text-xs text-[#5E7068] pt-2 border-t border-[#E2E8E5]">
            {routine.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
