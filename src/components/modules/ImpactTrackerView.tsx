import { type FormEvent, useMemo, useState } from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';
import { ACTION_ESTIMATE_FACTORS, computeImpactSummary } from '../../shared/sustainability.ts';
import { sanitizePlainText } from '../../shared/sanitize.ts';
import type { ActionCategory, TrackedAction } from '../../shared/types.ts';

interface ImpactTrackerViewProps {
  actions: TrackedAction[];
  onAddAction: (action: TrackedAction) => void;
  onDeleteAction: (id: string) => void;
}

export function ImpactTrackerView({
  actions,
  onAddAction,
  onDeleteAction,
}: ImpactTrackerViewProps) {
  const [category, setCategory] = useState<ActionCategory>('public_transit');
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dateIso, setDateIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const summary = useMemo(() => computeImpactSummary(actions), [actions]);
  const factor = ACTION_ESTIMATE_FACTORS[category];
  const previewCo2 = Math.round((Number(quantity) || 0) * factor.co2KgPerUnit * 100) / 100;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizePlainText(title || factor.label, 120);
    const numQty = Number(quantity);

    if (cleanTitle.length < 2) {
      setFormError('Action description must be at least 2 characters.');
      return;
    }
    if (!Number.isFinite(numQty) || numQty <= 0 || numQty > 1000) {
      setFormError('Quantity must be a positive number up to 1000.');
      return;
    }
    if (Number.isNaN(Date.parse(dateIso))) {
      setFormError('Please choose a valid completion date.');
      return;
    }

    setFormError(null);
    const estimatedCo2SavedKg = Math.round(numQty * factor.co2KgPerUnit * 100) / 100;
    const cleanNotes = sanitizePlainText(notes, 240);

    onAddAction({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      title: cleanTitle,
      quantity: numQty,
      unit: factor.defaultUnit,
      dateIso,
      estimatedCo2SavedKg,
      assumptionNote: factor.assumptionSummary,
      notes: cleanNotes || undefined,
    });

    setTitle('');
    setQuantity('1');
    setNotes('');
  };

  const maxBucketCo2 = Math.max(5, ...summary.weeklyBuckets.map((b) => b.co2Kg));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-[#5E7068]">
          Self-reported action log · Stored locally in your browser · Estimates clearly separated from sensor measurements
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18]">
          Personal Environmental Impact Tracker
        </h1>
        <p className="text-sm text-[#4A5B54] max-w-3xl">
          Track everyday low-emission commutes, energy reductions, waste diversion, and smoke-free
          indoor habits. Every carbon figure is transparently calculated from your logged inputs.
        </p>
      </header>

      {/* Progress KPI Strip */}
      <section
        aria-label="Personal sustainability progress metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-[#E2E8E5] rounded-xl p-5">
          <span className="text-xs text-[#5E7068]">This week (7 days)</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#111C18] mt-1">
            {summary.weeklyActions} actions
          </p>
          <span className="text-xs font-mono tabular-nums text-[#1F7A5C]">
            Est. {summary.weeklyEstimatedCo2Kg} kg CO₂e
          </span>
        </div>
        <div className="bg-white border border-[#E2E8E5] rounded-xl p-5">
          <span className="text-xs text-[#5E7068]">This month (30 days)</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#111C18] mt-1">
            {summary.monthlyActions} actions
          </p>
          <span className="text-xs font-mono tabular-nums text-[#1F7A5C]">
            Est. {summary.monthlyEstimatedCo2Kg} kg CO₂e
          </span>
        </div>
        <div className="bg-white border border-[#E2E8E5] rounded-xl p-5">
          <span className="text-xs text-[#5E7068]">Total logged actions</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#111C18] mt-1">
            {summary.totalActions}
          </p>
          <span className="text-xs text-[#5E7068]">User-entered records</span>
        </div>
        <div className="bg-white border border-[#E2E8E5] rounded-xl p-5">
          <span className="text-xs text-[#5E7068]">Cumulative estimate</span>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#11382B] mt-1">
            {summary.totalEstimatedCo2Kg} kg CO₂e
          </p>
          <span className="text-xs text-[#5E7068]">Modeled estimate, not metered</span>
        </div>
      </section>

      {/* Log New Action Form + 4-Week Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          aria-label="Log a sustainable action"
          className="lg:col-span-7 bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-[#111C18]">Log a sustainable action</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="impact-category" className="block text-sm font-medium text-[#111C18] mb-1">
                Action category
              </label>
              <select
                id="impact-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActionCategory)}
                className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
              >
                {(Object.keys(ACTION_ESTIMATE_FACTORS) as ActionCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {ACTION_ESTIMATE_FACTORS[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="impact-title" className="block text-sm font-medium text-[#111C18] mb-1">
                Description (optional custom title)
              </label>
              <input
                id="impact-title"
                type="text"
                maxLength={120}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'impact-form-error' : undefined}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={factor.label}
                className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
              />
            </div>

            <div>
              <label htmlFor="impact-date" className="block text-sm font-medium text-[#111C18] mb-1">
                Date completed
              </label>
              <input
                id="impact-date"
                type="date"
                required
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'impact-form-error' : undefined}
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
              />
            </div>

            <div>
              <label htmlFor="impact-qty" className="block text-sm font-medium text-[#111C18] mb-1">
                Quantity ({factor.defaultUnit})
              </label>
              <input
                id="impact-qty"
                type="number"
                step="0.5"
                min="0.5"
                max="1000"
                required
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'impact-form-error' : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
              />
            </div>

            <div>
              <label htmlFor="impact-notes" className="block text-sm font-medium text-[#111C18] mb-1">
                Notes (optional)
              </label>
              <input
                id="impact-notes"
                type="text"
                maxLength={240}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Took metro to office"
                className="w-full px-3.5 py-2 text-sm border border-[#CBD5D0] rounded-lg bg-white text-[#111C18]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F6F8F7] border border-[#E2E8E5] text-xs text-[#4A5B54] space-y-1">
            <p className="font-medium text-[#111C18] font-mono tabular-nums">
              Estimated credit: ~{previewCo2} kg CO₂e avoided
            </p>
            <p>{factor.assumptionSummary}</p>
          </div>

          {formError && (
            <p id="impact-form-error" role="alert" className="text-sm text-[#991B1B]">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#11382B] rounded-lg hover:bg-[#174C3A] transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Log sustainable action
          </button>
        </form>

        {/* Weekly Progress Chart & Milestones */}
        <div className="lg:col-span-5 space-y-5">
          <section
            aria-label="4-week progress trend"
            className="bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="text-base font-semibold text-[#111C18]">4-week estimated progress</h2>
              <p className="text-xs text-[#5E7068]">Estimated kg CO₂e avoided per week</p>
            </div>

            <div className="space-y-3">
              {summary.weeklyBuckets.map((bucket) => {
                const widthPct = Math.round((bucket.co2Kg / maxBucketCo2) * 100);
                return (
                  <div key={bucket.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#4A5B54]">{bucket.label}</span>
                      <span className="font-mono tabular-nums font-medium text-[#111C18]">
                        {bucket.co2Kg} kg · {bucket.count} act.
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#E9EFEC] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1F7A5C] transition-all"
                        style={{ width: `${Math.max(bucket.co2Kg > 0 ? 6 : 0, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            aria-label="Achievement milestones"
            className="bg-white border border-[#E2E8E5] rounded-xl p-6 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#11382B]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#111C18]">Milestones</h2>
            </div>

            <ul className="divide-y divide-[#E2E8E5]">
              {summary.milestones.map((m) => (
                <li key={m.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        m.achieved ? 'text-[#11382B]' : 'text-[#111C18]'
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="text-xs text-[#5E7068]">{m.description}</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[#4A5B54] whitespace-nowrap shrink-0">
                    {m.achieved ? 'Completed' : m.progressLabel}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Logged Actions Table */}
      <section
        aria-label="Completed sustainable activities"
        className="bg-white border border-[#E2E8E5] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E2E8E5] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111C18]">Completed activities</h2>
          <span className="text-xs font-mono tabular-nums text-[#5E7068]">
            {actions.length} {actions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-medium text-[#111C18]">No actions logged yet</p>
            <p className="text-xs text-[#5E7068] max-w-md mx-auto">
              Use the form above—or click &ldquo;Log to My Impact&rdquo; in Daily Planner or Sustainable
              Choices—to begin tracking your household&rsquo;s clean-air habits.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2E8E5] bg-[#F6F8F7] text-xs text-[#5E7068]">
                  <th scope="col" className="py-2.5 px-4 font-medium">
                    Date
                  </th>
                  <th scope="col" className="py-2.5 px-4 font-medium">
                    Activity
                  </th>
                  <th scope="col" className="py-2.5 px-4 font-medium text-right">
                    Quantity
                  </th>
                  <th scope="col" className="py-2.5 px-4 font-medium text-right">
                    Est. CO₂e avoided
                  </th>
                  <th scope="col" className="py-2.5 px-4 font-medium text-right">
                    Remove
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E5]">
                {actions.map((act) => (
                  <tr key={act.id} className="hover:bg-[#F6F8F7]/60">
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#4A5B54] whitespace-nowrap">
                      {act.dateIso}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-[#111C18] block">{act.title}</span>
                      {act.notes && <span className="text-xs text-[#5E7068]">{act.notes}</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#4A5B54] whitespace-nowrap">
                      {act.quantity} {act.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#11382B] whitespace-nowrap">
                      ~{act.estimatedCo2SavedKg} kg
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteAction(act.id)}
                        aria-label={`Remove logged action ${act.title}`}
                        className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg text-[#5E7068] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-[#5E7068]">
        Transparency notice: Impact totals are self-reported user estimates derived from published
        DEFRA, IEA, and CEA India average emission factors. They are not verified environmental
        sensor measurements.
      </p>
    </div>
  );
}
