import { lazy, Suspense, useCallback, useState } from 'react';
import {
  AlertSettingsModal,
  SmartAlertBanner,
} from './components/AlertBannerAndSettings.tsx';
import { LocationSelectorModal } from './components/LocationSelectorModal.tsx';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { DashboardView } from './components/modules/DashboardView.tsx';
import { useAirQualityData } from './hooks/useAirQualityData.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { useToast } from './hooks/useToast.ts';
import { getDefaultStandardForCountry } from './shared/aqi.ts';
import { ACTION_ESTIMATE_FACTORS } from './shared/sustainability.ts';
import type {
  ActionCategory,
  AlertPreferences,
  AQIStandard,
  ChatTurn,
  DailyRoutinePlan,
  GeoLocation,
  LifestyleProfile,
  NavSection,
  TrackedAction,
} from './shared/types.ts';

// Lazy-load secondary modules for bundle and initial-load efficiency
const DailyPlannerView = lazy(() =>
  import('./components/modules/DailyPlannerView.tsx').then((m) => ({
    default: m.DailyPlannerView,
  }))
);
const IndoorAirView = lazy(() =>
  import('./components/modules/IndoorAirView.tsx').then((m) => ({
    default: m.IndoorAirView,
  }))
);
const SustainableChoicesView = lazy(() =>
  import('./components/modules/SustainableChoicesView.tsx').then((m) => ({
    default: m.SustainableChoicesView,
  }))
);
const AssistantView = lazy(() =>
  import('./components/modules/AssistantView.tsx').then((m) => ({
    default: m.AssistantView,
  }))
);
const CommunityView = lazy(() =>
  import('./components/modules/CommunityView.tsx').then((m) => ({
    default: m.CommunityView,
  }))
);
const ImpactTrackerView = lazy(() =>
  import('./components/modules/ImpactTrackerView.tsx').then((m) => ({
    default: m.ImpactTrackerView,
  }))
);

const DEFAULT_LOCATION: GeoLocation = {
  id: 'in-new-delhi',
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  countryCode: 'IN',
  latitude: 28.6139,
  longitude: 77.209,
};

const DEFAULT_PROFILE: LifestyleProfile = {
  occupation: 'Office commuter & parent',
  typicalCommute: 'car_solo',
  worksOutdoors: false,
  householdSize: 4,
  indoorVentilation: 'exhaust_fans',
  preferredTransport: 'metro_bus',
  householdNotes: 'School-going child and elderly parent at home',
};

const DEFAULT_ALERTS: AlertPreferences = {
  enabled: true,
  minSeverityLevel: 4,
  outdoorActivityWarnings: true,
  ventilationChangeAlerts: true,
};

function ModuleLoadingFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading module">
      <div className="h-10 w-64 rounded-lg bg-white border border-[#E2E8E5] animate-pulse" />
      <div className="h-64 rounded-xl bg-white border border-[#E2E8E5] animate-pulse" />
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');

  const [location, setLocation] = useLocalStorage<GeoLocation>('airwise_location_v1', DEFAULT_LOCATION);
  const [standard, setStandard] = useLocalStorage<AQIStandard>('airwise_standard_v1', 'INDIA_CPCB');
  const [profile, setProfile] = useLocalStorage<LifestyleProfile>('airwise_profile_v1', DEFAULT_PROFILE);
  const [trackedActions, setTrackedActions] = useLocalStorage<TrackedAction[]>('airwise_actions_v1', []);
  const [joinedChallenges, setJoinedChallenges] = useLocalStorage<string[]>('airwise_community_v1', []);
  const [alertPrefs, setAlertPrefs] = useLocalStorage<AlertPreferences>('airwise_alerts_v1', DEFAULT_ALERTS);
  const [showOnboarding, setShowOnboarding] = useLocalStorage<boolean>('airwise_onboarding_v1', true);

  const {
    presets,
    snapshot,
    loading: aqLoading,
    error: aqError,
    refresh: handleRefreshAirQuality,
  } = useAirQualityData(location, standard, DEFAULT_LOCATION);
  const { toastMessage, showToast, dismissToast } = useToast(3500);

  const [routine, setRoutine] = useState<DailyRoutinePlan | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);

  const handleSelectLocation = useCallback(
    (nextLoc: GeoLocation) => {
      setLocation(nextLoc);
      setStandard(getDefaultStandardForCountry(nextLoc.countryCode));
      setDismissedAlertKey(null);
      showToast(`Monitoring switched to ${nextLoc.name}, ${nextLoc.country}`);
    },
    [setLocation, setStandard, showToast]
  );

  const handleAddAction = useCallback(
    (action: TrackedAction) => {
      setTrackedActions((prev) => [action, ...prev]);
      showToast(`Logged "${action.title}" to My Impact`);
    },
    [setTrackedActions, showToast]
  );

  const handleQuickLog = useCallback(
    (title: string, category: ActionCategory, customCo2?: number) => {
      const factor = ACTION_ESTIMATE_FACTORS[category];
      const newAction: TrackedAction = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        title,
        quantity: 1,
        unit: factor.defaultUnit,
        dateIso: new Date().toISOString().slice(0, 10),
        estimatedCo2SavedKg: customCo2 ?? factor.co2KgPerUnit,
        assumptionNote: factor.assumptionSummary,
      };
      handleAddAction(newAction);
    },
    [handleAddAction]
  );

  const handleDeleteAction = useCallback(
    (id: string) => {
      setTrackedActions((prev) => prev.filter((item) => item.id !== id));
      showToast('Removed action from My Impact');
    },
    [setTrackedActions, showToast]
  );

  const handleToggleCommunityJoin = useCallback(
    (id: string) => {
      const exists = joinedChallenges.includes(id);
      setJoinedChallenges((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      showToast(exists ? 'Removed community pledge' : 'Joined household community pledge');
    },
    [joinedChallenges, setJoinedChallenges, showToast]
  );

  return (
    <>
      <AppShell
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        locationName={location.name}
        snapshot={snapshot}
        onOpenLocationModal={() => setLocationModalOpen(true)}
        onOpenAlertModal={() => setAlertModalOpen(true)}
        toastMessage={toastMessage}
        onDismissToast={dismissToast}
      >
        {/* Contextual Smart Air Quality Alert Banner */}
        {snapshot && (
          <SmartAlertBanner
            snapshot={snapshot}
            preferences={alertPrefs}
            dismissedKey={dismissedAlertKey}
            onDismiss={(key) => setDismissedAlertKey(key)}
            onOpenSettings={() => setAlertModalOpen(true)}
          />
        )}

        {/* Active Module View */}
        {activeSection === 'dashboard' && (
          <DashboardView
            snapshot={snapshot}
            loading={aqLoading}
            error={aqError}
            standard={standard}
            onChangeStandard={(std) => setStandard(std)}
            onOpenLocationModal={() => setLocationModalOpen(true)}
            onRefresh={handleRefreshAirQuality}
            onNavigate={(sec) => setActiveSection(sec)}
            showOnboarding={showOnboarding}
            onDismissOnboarding={() => setShowOnboarding(false)}
          />
        )}

        {activeSection !== 'dashboard' && (
          <ModuleErrorBoundary
            resetKey={activeSection}
            onReturnToDashboard={() => setActiveSection('dashboard')}
          >
            <Suspense fallback={<ModuleLoadingFallback />}>
              {activeSection === 'planner' && (
                <DailyPlannerView
                  snapshot={snapshot}
                  profile={profile}
                  onUpdateProfile={setProfile}
                  routine={routine}
                  onUpdateRoutine={setRoutine}
                  onLogQuickAction={(title, cat) => handleQuickLog(title, cat)}
                />
              )}

              {activeSection === 'indoor' && <IndoorAirView snapshot={snapshot} />}

              {activeSection === 'alternatives' && (
                <SustainableChoicesView
                  snapshot={snapshot}
                  onLogAlternative={(title, cat, co2) => handleQuickLog(title, cat, co2)}
                />
              )}

              {activeSection === 'assistant' && (
                <AssistantView
                  snapshot={snapshot}
                  messages={chatMessages}
                  onUpdateMessages={setChatMessages}
                />
              )}

              {activeSection === 'community' && (
                <CommunityView
                  joinedIds={joinedChallenges}
                  onToggleJoin={handleToggleCommunityJoin}
                />
              )}

              {activeSection === 'impact' && (
                <ImpactTrackerView
                  actions={trackedActions}
                  onAddAction={handleAddAction}
                  onDeleteAction={handleDeleteAction}
                />
              )}
            </Suspense>
          </ModuleErrorBoundary>
        )}
      </AppShell>

      {/* Location Selector Dialog */}
      <LocationSelectorModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={location}
        presets={presets}
        onSelectLocation={handleSelectLocation}
      />

      {/* Smart Alert Preferences Dialog */}
      <AlertSettingsModal
        open={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        preferences={alertPrefs}
        onChange={setAlertPrefs}
      />
    </>
  );
}
