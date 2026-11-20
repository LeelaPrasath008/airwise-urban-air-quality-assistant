import { useRef } from 'react';
import { AlertTriangle, Bell, Info, ShieldAlert, X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus.ts';
import type { AirQualitySnapshot, AlertPreferences } from '../shared/types.ts';

interface SmartAlertBannerProps {
  snapshot: AirQualitySnapshot;
  preferences: AlertPreferences;
  dismissedKey: string | null;
  onDismiss: (key: string) => void;
  onOpenSettings: () => void;
}

export function SmartAlertBanner({
  snapshot,
  preferences,
  dismissedKey,
  onDismiss,
  onOpenSettings,
}: SmartAlertBannerProps) {
  if (!preferences.enabled) return null;

  const currentSeverity = snapshot.category.severityLevel;
  const upcomingForecast = snapshot.hourlyTrend.filter((h) => h.isForecast).slice(0, 8);
  const peakUpcoming = upcomingForecast.reduce(
    (max, item) => (item.aqi > max.aqi ? item : max),
    { hourLabel: '', aqi: snapshot.aqi }
  );
  const significantSpike = peakUpcoming.aqi - snapshot.aqi >= 45;

  const shouldAlert = currentSeverity >= preferences.minSeverityLevel || significantSpike;
  if (!shouldAlert) return null;

  const alertKey = `${snapshot.location.id}-${snapshot.aqi}-${snapshot.category.key}`;
  if (dismissedKey === alertKey) return null;

  const isSevereOrVeryPoor = currentSeverity >= 5;
  const Icon = isSevereOrVeryPoor ? ShieldAlert : currentSeverity >= 4 ? AlertTriangle : Info;

  return (
    <section
      aria-label="Air quality alert"
      aria-live={isSevereOrVeryPoor ? 'assertive' : 'polite'}
      className={`rounded-xl border p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${snapshot.category.bgTintClass} ${snapshot.category.borderTintClass}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`h-5 w-5 shrink-0 mt-0.5 ${snapshot.category.textColorClass}`}
          aria-hidden="true"
        />
        <div className="space-y-1 text-sm">
          <div className={`font-semibold ${snapshot.category.textColorClass}`}>
            {isSevereOrVeryPoor
              ? `${snapshot.category.label} Air Quality Alert — ${snapshot.location.name} (AQI ${snapshot.aqi})`
              : significantSpike && currentSeverity < preferences.minSeverityLevel
                ? `Rising Pollution Forecast — ${snapshot.location.name} projected to reach AQI ${peakUpcoming.aqi} around ${peakUpcoming.hourLabel}`
                : `${snapshot.category.label} Air Quality Notice — ${snapshot.location.name} (AQI ${snapshot.aqi})`}
          </div>
          <p className="text-[#111C18]">
            {preferences.outdoorActivityWarnings
              ? snapshot.category.outdoorGuidance
              : snapshot.category.healthSummary}
            {preferences.ventilationChangeAlerts ? ` ${snapshot.category.ventilationAdvice}` : ''}
          </p>
          {snapshot.category.officialAdvisoryNote && (
            <p className={`text-xs font-medium ${snapshot.category.textColorClass}`}>
              {snapshot.category.officialAdvisoryNote}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
        <button
          type="button"
          onClick={onOpenSettings}
          className="px-3 py-1.5 text-xs font-medium text-[#111C18] bg-white/85 border border-[#CBD5D0] rounded-lg hover:bg-white transition-colors whitespace-nowrap"
        >
          Alert settings
        </button>
        <button
          type="button"
          onClick={() => onDismiss(alertKey)}
          aria-label="Dismiss air quality alert"
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#4A5B54] hover:bg-white/70 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

interface AlertSettingsModalProps {
  open: boolean;
  onClose: () => void;
  preferences: AlertPreferences;
  onChange: (next: AlertPreferences) => void;
}

export function AlertSettingsModal({
  open,
  onClose,
  preferences,
  onChange,
}: AlertSettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialogRef, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B261D]/45 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-settings-title"
        className="w-full max-w-md bg-white border border-[#E2E8E5] rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8E5]">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#11382B]" aria-hidden="true" />
            <h2 id="alert-settings-title" className="text-lg font-semibold text-[#111C18]">
              Smart alert preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert preferences"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#4A5B54] hover:bg-[#F2FAF6]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-[#4A5B54]">
            AIRWISE alerts only appear when pollution crosses your chosen threshold or spikes significantly in the forecast—never for routine noise.
          </p>

          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <span>
              <span className="block text-sm font-medium text-[#111C18]">Enable contextual AQI alerts</span>
              <span className="block text-xs text-[#5E7068]">
                Show in-app advisories for poor air quality and forecast changes
              </span>
            </span>
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onChange({ ...preferences, enabled: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[#11382B]"
            />
          </label>

          <fieldset disabled={!preferences.enabled} className="space-y-2 disabled:opacity-50">
            <legend className="text-sm font-medium text-[#111C18]">Alert sensitivity threshold</legend>
            <div className="grid grid-cols-1 gap-2">
              {[
                { level: 3 as const, label: 'Moderate or worse (sensitive groups)' },
                { level: 4 as const, label: 'Poor / Unhealthy or worse (recommended)' },
                { level: 5 as const, label: 'Very Poor / Severe emergency only' },
              ].map((opt) => (
                <label
                  key={opt.level}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#E2E8E5] cursor-pointer hover:bg-[#F6F8F7]"
                >
                  <input
                    type="radio"
                    name="alert-threshold"
                    checked={preferences.minSeverityLevel === opt.level}
                    onChange={() => onChange({ ...preferences, minSeverityLevel: opt.level })}
                    className="h-4 w-4 accent-[#11382B]"
                  />
                  <span className="text-sm text-[#111C18]">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3 pt-2 border-t border-[#E2E8E5]">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-[#111C18]">Include outdoor activity change guidance</span>
              <input
                type="checkbox"
                disabled={!preferences.enabled}
                checked={preferences.outdoorActivityWarnings}
                onChange={(e) =>
                  onChange({ ...preferences, outdoorActivityWarnings: e.target.checked })
                }
                className="h-4 w-4 accent-[#11382B]"
              />
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-[#111C18]">Include window ventilation warnings</span>
              <input
                type="checkbox"
                disabled={!preferences.enabled}
                checked={preferences.ventilationChangeAlerts}
                onChange={(e) =>
                  onChange({ ...preferences, ventilationChangeAlerts: e.target.checked })
                }
                className="h-4 w-4 accent-[#11382B]"
              />
            </label>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#F6F8F7] border-t border-[#E2E8E5] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-[#11382B] rounded-lg hover:bg-[#174C3A] transition-colors"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
