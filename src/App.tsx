import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Home,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import { AirwiseLogoMark } from './components/BrandMark.tsx';
import {
  AlertSettingsModal,
  SmartAlertBanner,
} from './components/AlertBannerAndSettings.tsx';
import { LocationSelectorModal } from './components/LocationSelectorModal.tsx';
import { DashboardView } from './components/modules/DashboardView.tsx';
import { useDialogFocus } from './hooks/useDialogFocus.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { fetchAirQuality, fetchPresetLocations } from './services/api.ts';
import { getDefaultStandardForCountry } from './shared/aqi.ts';
import { ACTION_ESTIMATE_FACTORS } from './shared/sustainability.ts';
import type {
  ActionCategory,
  AirQualitySnapshot,
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

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planner', label: 'Daily Planner', icon: CalendarCheck },
  { id: 'indoor', label: 'Indoor Air', icon: Home },
  { id: 'alternatives', label: 'Sustainable Choices', icon: Leaf },
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'impact', label: 'My Impact', icon: BarChart3 },
];

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [location, setLocation] = useLocalStorage<GeoLocation>('airwise_location_v1', DEFAULT_LOCATION);
  const [standard, setStandard] = useLocalStorage<AQIStandard>('airwise_standard_v1', 'INDIA_CPCB');
  const [profile, setProfile] = useLocalStorage<LifestyleProfile>('airwise_profile_v1', DEFAULT_PROFILE);
  const [trackedActions, setTrackedActions] = useLocalStorage<TrackedAction[]>('airwise_actions_v1', []);
  const [joinedChallenges, setJoinedChallenges] = useLocalStorage<string[]>('airwise_community_v1', []);
  const [alertPrefs, setAlertPrefs] = useLocalStorage<AlertPreferences>('airwise_alerts_v1', DEFAULT_ALERTS);
  const [showOnboarding, setShowOnboarding] = useLocalStorage<boolean>('airwise_onboarding_v1', true);

  const [presets, setPresets] = useState<GeoLocation[]>([DEFAULT_LOCATION]);
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [aqLoading, setAqLoading] = useState(true);
  const [aqError, setAqError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const bypassNextCacheRef = useRef(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  const [routine, setRoutine] = useState<DailyRoutinePlan | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  useDialogFocus(mobileNavOpen, mobileDrawerRef, closeMobileNav);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Fetch preset monitoring cities once
  useEffect(() => {
    const controller = new AbortController();
    fetchPresetLocations(controller.signal)
      .then((list) => {
        if (list.length > 0) setPresets(list);
      })
      .catch(() => {
        // Fallback already populated with default location
      });
    return () => controller.abort();
  }, []);

  // Fetch live air quality + weather when location, standard, or manual refresh changes
  useEffect(() => {
    const controller = new AbortController();
    setAqLoading(true);
    setAqError(null);

    const bypassCache = bypassNextCacheRef.current;
    bypassNextCacheRef.current = false;

    fetchAirQuality(location, standard, controller.signal, bypassCache)
      .then((data) => {
        setSnapshot(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setAqError(
          err instanceof Error
            ? err.message
            : 'Unable to fetch air quality data. Please try refreshing.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAqLoading(false);
        }
      });

    return () => controller.abort();
  }, [location, standard, refreshNonce]);

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
      setJoinedChallenges((prev) => {
        const exists = prev.includes(id);
        showToast(exists ? 'Removed community pledge' : 'Joined household community pledge');
        return exists ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [setJoinedChallenges, showToast]
  );

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const renderNavLinks = (onAfterSelect?: () => void) => (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                setActiveSection(item.id);
                onAfterSelect?.();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#11382B] text-white'
                  : 'text-[#4A5B54] hover:bg-[#E6F4EE]/70 hover:text-[#11382B]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#111C18] flex">
      {/* WCAG 2.2 AA Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#11382B] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop Left Sidebar */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-[#E2E8E5]"
      >
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-[#E2E8E5]">
          <AirwiseLogoMark className="h-8 w-8 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-[#11382B] whitespace-nowrap">
            AIRWISE
          </span>
        </div>

        <nav aria-label="Main sections" className="flex-1 px-3 py-4 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        <div className="p-4 border-t border-[#E2E8E5] text-xs text-[#5E7068] space-y-1">
          <p className="font-medium text-[#111C18]">Breathe Smarter. Live Greener.</p>
          <p>
            {snapshot
              ? `${snapshot.location.name} · AQI ${snapshot.aqi} (${snapshot.category.label})`
              : 'Loading air quality...'}
          </p>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="presentation"
          onClick={() => setMobileNavOpen(false)}
        >
          <div className="fixed inset-0 bg-[#0B261D]/45" aria-hidden="true" />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-[#E2E8E5]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 h-16 flex items-center justify-between border-b border-[#E2E8E5]">
              <div className="flex items-center gap-2.5">
                <AirwiseLogoMark className="h-7 w-7" />
                <span className="font-display text-lg font-bold text-[#11382B]">AIRWISE</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#4A5B54] hover:bg-[#F2FAF6]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobile sections" className="flex-1 p-3 overflow-y-auto">
              {renderNavLinks(() => setMobileNavOpen(false))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Clean Single-Row Top Bar (SaaS Top Bar Contract) */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-[#E2E8E5] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg text-[#11382B] hover:bg-[#F2FAF6]"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="lg:hidden font-display font-bold text-[#11382B] whitespace-nowrap">
                AIRWISE
              </span>
              <span className="hidden lg:inline text-[#5E7068] whitespace-nowrap">AIRWISE</span>
              <span className="text-[#CBD5D0]" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-[#111C18] truncate">{activeNavMeta.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              aria-label={`Change monitoring location, currently ${location.name}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#11382B] bg-[#F2FAF6] border border-[#CBE8CE] rounded-lg hover:bg-[#E6F4EE] transition-colors whitespace-nowrap shrink-0 max-w-[180px] sm:max-w-[240px]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location.name}</span>
            </button>

            <button
              type="button"
              onClick={() => setAlertModalOpen(true)}
              aria-label="Open smart alert preferences"
              className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-2 text-xs font-medium text-[#4A5B54] bg-white border border-[#CBD5D0] rounded-lg hover:text-[#11382B] hover:bg-[#F6F8F7] transition-colors whitespace-nowrap shrink-0"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Alerts</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Viewport */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 focus:outline-none"
        >
          {/* Accessible Status Toast */}
          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg bg-[#11382B] text-white px-4 py-2.5 text-sm flex items-center justify-between gap-4"
            >
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                aria-label="Dismiss notification"
                className="text-xs text-[#A7F3D0] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

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
              onRefresh={() => {
                bypassNextCacheRef.current = true;
                setRefreshNonce((n) => n + 1);
              }}
              onNavigate={(sec) => setActiveSection(sec)}
              showOnboarding={showOnboarding}
              onDismissOnboarding={() => setShowOnboarding(false)}
            />
          )}

          {activeSection !== 'dashboard' && (
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
          )}
        </main>
      </div>

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
    </div>
  );
}
