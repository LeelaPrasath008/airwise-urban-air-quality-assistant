import { type ReactNode, useCallback, useRef, useState } from 'react';
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
import { AirwiseLogoMark } from '../BrandMark.tsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.ts';
import type { AirQualitySnapshot, NavSection } from '../../shared/types.ts';

export const NAV_ITEMS: Array<{
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

export interface AppShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  locationName: string;
  snapshot: AirQualitySnapshot | null;
  onOpenLocationModal: () => void;
  onOpenAlertModal: () => void;
  toastMessage: string | null;
  onDismissToast: () => void;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  onSelectSection,
  locationName,
  snapshot,
  onOpenLocationModal,
  onOpenAlertModal,
  toastMessage,
  onDismissToast,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  useDialogFocus(mobileNavOpen, mobileDrawerRef, closeMobileNav);

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
                onSelectSection(item.id);
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
          onClick={closeMobileNav}
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
                onClick={closeMobileNav}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#4A5B54] hover:bg-[#F2FAF6]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobile sections" className="flex-1 p-3 overflow-y-auto">
              {renderNavLinks(closeMobileNav)}
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
              onClick={onOpenLocationModal}
              aria-label={`Change monitoring location, currently ${locationName}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#11382B] bg-[#F2FAF6] border border-[#CBE8CE] rounded-lg hover:bg-[#E6F4EE] transition-colors whitespace-nowrap shrink-0 max-w-[180px] sm:max-w-[240px]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{locationName}</span>
            </button>

            <button
              type="button"
              onClick={onOpenAlertModal}
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
                onClick={onDismissToast}
                aria-label="Dismiss notification"
                className="min-h-[32px] min-w-[44px] px-2.5 py-1 inline-flex items-center justify-center rounded-md text-xs font-medium text-[#A7F3D0] hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
