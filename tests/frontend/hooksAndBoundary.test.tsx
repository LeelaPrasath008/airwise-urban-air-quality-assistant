import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ModuleErrorBoundary } from '../../src/components/ModuleErrorBoundary.tsx';
import { useAirQualityData } from '../../src/hooks/useAirQualityData.ts';
import { useToast } from '../../src/hooks/useToast.ts';
import type { AirQualitySnapshot, AQIStandard, GeoLocation } from '../../src/shared/types.ts';

const DELHI: GeoLocation = {
  id: 'in-new-delhi',
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  countryCode: 'IN',
  latitude: 28.6139,
  longitude: 77.209,
};

const BENGALURU: GeoLocation = {
  id: 'in-bengaluru',
  name: 'Bengaluru',
  region: 'Karnataka',
  country: 'India',
  countryCode: 'IN',
  latitude: 12.9716,
  longitude: 77.5946,
};

function makeSnapshot(location: GeoLocation, standard: AQIStandard, aqi: number): AirQualitySnapshot {
  return {
    location,
    standard,
    aqi,
    dominantPollutant: 'PM2.5',
    category: {
      key: 'poor',
      label: 'Poor',
      rangeLabel: '201–300',
      severityLevel: 4,
      textColorClass: 'text-[#9A3412]',
      bgTintClass: 'bg-[#FFF7ED]',
      borderTintClass: 'border-[#FDBA74]',
      barColorHex: '#EA580C',
      healthSummary: 'Breathing discomfort likely on prolonged exposure.',
      outdoorGuidance: 'Shift exercise indoors.',
      ventilationAdvice: 'Keep windows mostly closed.',
    },
    pollutants: { pm25: 110, pm10: 205 },
    weather: {
      temperatureC: 16,
      humidityPercent: 70,
      windSpeedKmh: 5,
      weatherCode: 45,
      conditionLabel: 'Haze',
    },
    hourlyTrend: [],
    lastUpdatedIso: '2026-11-21T08:00:00.000Z',
    dataSource: 'Open-Meteo Air Quality (CAMS/ECMWF) & Weather API',
    isLive: true,
    isDemonstrationData: false,
    cacheHit: false,
    disclaimer: 'AQI estimate disclaimer.',
  };
}

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('SECRET_INTERNAL_STACK_TOKEN_XYZ');
  }
  return <div>Module rendered safely</div>;
}

describe('Phase 3C Sub-batch F2A — Hooks & ModuleErrorBoundary', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useToast', () => {
    it('displays toast, dismisses manually, auto-dismisses after duration, and cleans up timer on unmount', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      const { result, unmount } = renderHook(() => useToast(3500));
      expect(result.current.toastMessage).toBeNull();

      act(() => {
        result.current.showToast('Saved profile');
      });
      expect(result.current.toastMessage).toBe('Saved profile');

      act(() => {
        result.current.dismissToast();
      });
      expect(result.current.toastMessage).toBeNull();

      act(() => {
        result.current.showToast('Auto-dismiss test');
      });
      expect(result.current.toastMessage).toBe('Auto-dismiss test');

      act(() => {
        vi.advanceTimersByTime(3499);
      });
      expect(result.current.toastMessage).toBe('Auto-dismiss test');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.toastMessage).toBeNull();

      // Verify cleanup on unmount clears active timer
      act(() => {
        result.current.showToast('Pending unmount toast');
      });
      const beforeUnmountClears = clearTimeoutSpy.mock.calls.length;
      unmount();
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(beforeUnmountClears);
    });

    it('restarts auto-dismiss timer on repeated toast calls including identical messages', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useToast(3500));

      act(() => {
        result.current.showToast('Removed action from My Impact');
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.toastMessage).toBe('Removed action from My Impact');

      // Re-trigger the exact same message -> must reset full 3500 ms window
      act(() => {
        result.current.showToast('Removed action from My Impact');
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.toastMessage).toBe('Removed action from My Impact');

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(result.current.toastMessage).toBeNull();
    });
  });

  describe('useAirQualityData', () => {
    it('loads presets and snapshot, responds to location and standard changes, and scopes refresh cache bypass', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/locations/presets')) {
          return new Response(JSON.stringify({ locations: [DELHI, BENGALURU] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('/api/air-quality')) {
          const isBlr = url.includes('Bengaluru');
          const std: AQIStandard = url.includes('standard=US_EPA') ? 'US_EPA' : 'INDIA_CPCB';
          const aqi = isBlr ? 82 : std === 'US_EPA' ? 190 : 265;
          return new Response(JSON.stringify(makeSnapshot(isBlr ? BENGALURU : DELHI, std, aqi)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      });

      const { result, rerender } = renderHook(
        ({ location, standard }: { location: GeoLocation; standard: AQIStandard }) =>
          useAirQualityData(location, standard, DELHI),
        { initialProps: { location: DELHI, standard: 'INDIA_CPCB' as AQIStandard } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.snapshot?.aqi).toBe(265);
        expect(result.current.presets).toHaveLength(2);
      });

      // Manual refresh must send refresh=true
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        const aqCalls = fetchSpy.mock.calls
          .map(([arg]) => String(arg))
          .filter((u) => u.includes('/api/air-quality'));
        expect(aqCalls).toHaveLength(2);
        expect(aqCalls[1]).toContain('refresh=true');
      });

      // Subsequent standard change must NOT leak refresh=true
      rerender({ location: DELHI, standard: 'US_EPA' });
      await waitFor(() => {
        expect(result.current.snapshot?.aqi).toBe(190);
      });

      // Subsequent location change must NOT leak refresh=true
      rerender({ location: BENGALURU, standard: 'INDIA_CPCB' });
      await waitFor(() => {
        expect(result.current.snapshot?.aqi).toBe(82);
        expect(result.current.snapshot?.location.name).toBe('Bengaluru');
      });

      const aqUrls = fetchSpy.mock.calls
        .map(([arg]) => String(arg))
        .filter((u) => u.includes('/api/air-quality'));
      expect(aqUrls[0]).not.toContain('refresh=true');
      expect(aqUrls[1]).toContain('refresh=true');
      expect(aqUrls[2]).not.toContain('refresh=true');
      expect(aqUrls[3]).not.toContain('refresh=true');
    });

    it('falls back to defaultLocation when presets fail and preserves previous snapshot on refresh failure', async () => {
      let aqAttempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/locations/presets')) {
          throw new Error('Presets offline');
        }
        aqAttempts += 1;
        if (aqAttempts === 2) {
          return new Response(JSON.stringify({ error: 'Upstream air API down' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(makeSnapshot(DELHI, 'INDIA_CPCB', 274)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const { result } = renderHook(() => useAirQualityData(DELHI, 'INDIA_CPCB', DELHI));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.snapshot?.aqi).toBe(274);
      });
      expect(result.current.presets).toEqual([DELHI]);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Upstream air API down');
      });
      // Previously loaded snapshot remains intact for Batch F1 inline error banner
      expect(result.current.snapshot?.aqi).toBe(274);
    });

    it('aborts stale requests on rapid location changes and stays clean under React StrictMode', async () => {
      let abortedCount = 0;
      let resolveSecond: ((res: Response) => void) | null = null;
      let aqCallIndex = 0;

      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/locations/presets')) {
          return Promise.resolve(
            new Response(JSON.stringify({ locations: [DELHI, BENGALURU] }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        aqCallIndex += 1;
        if (aqCallIndex === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              abortedCount += 1;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });
        }
        return new Promise<Response>((resolve) => {
          resolveSecond = resolve;
        });
      });

      const { result, rerender } = renderHook(
        ({ location }: { location: GeoLocation }) =>
          useAirQualityData(location, 'INDIA_CPCB', DELHI),
        { initialProps: { location: DELHI } }
      );

      expect(result.current.loading).toBe(true);

      // Switch location before first request finishes -> first request aborted
      rerender({ location: BENGALURU });
      expect(abortedCount).toBe(1);
      expect(result.current.loading).toBe(true);

      act(() => {
        resolveSecond?.(
          new Response(JSON.stringify(makeSnapshot(BENGALURU, 'INDIA_CPCB', 77)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.snapshot?.location.name).toBe('Bengaluru');
        expect(result.current.error).toBeNull();
      });

      // StrictMode mount check: no stuck loading state
      vi.restoreAllMocks();
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/locations/presets')) {
          return new Response(JSON.stringify({ locations: [DELHI] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(makeSnapshot(DELHI, 'INDIA_CPCB', 250)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const strictWrapper = ({ children }: { children: ReactNode }) => (
        <StrictMode>{children}</StrictMode>
      );
      const strictHook = renderHook(() => useAirQualityData(DELHI, 'INDIA_CPCB', DELHI), {
        wrapper: strictWrapper,
      });

      await waitFor(() => {
        expect(strictHook.result.current.loading).toBe(false);
        expect(strictHook.result.current.snapshot?.aqi).toBe(250);
        expect(strictHook.result.current.error).toBeNull();
      });
    });
  });

  describe('ModuleErrorBoundary', () => {
    it('renders children normally, catches render errors safely without leaking raw error text, and supports retry, resetKey, and Back to Dashboard', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onReturnToDashboard = vi.fn();
      const user = userEvent.setup();

      const { container, rerender } = render(
        <ModuleErrorBoundary resetKey="planner" onReturnToDashboard={onReturnToDashboard}>
          <Bomb shouldThrow={false} />
        </ModuleErrorBoundary>
      );

      expect(screen.getByText('Module rendered safely')).toBeInTheDocument();

      // Trigger render error
      rerender(
        <ModuleErrorBoundary resetKey="planner" onReturnToDashboard={onReturnToDashboard}>
          <Bomb shouldThrow={true} />
        </ModuleErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Unable to load this section/i);
      expect(alert.textContent).not.toContain('SECRET_INTERNAL_STACK_TOKEN_XYZ');

      // Fallback UI passes axe-core WCAG 2.2 AA check
      expect((await axe(container)).violations).toEqual([]);

      // Back to Dashboard invokes callback
      await user.click(screen.getByRole('button', { name: /Back to Dashboard/i }));
      expect(onReturnToDashboard).toHaveBeenCalledTimes(1);

      // Re-trigger error and verify Try again resets boundary when child recovers
      rerender(
        <ModuleErrorBoundary resetKey="planner" onReturnToDashboard={onReturnToDashboard}>
          <Bomb shouldThrow={true} />
        </ModuleErrorBoundary>
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(
        <ModuleErrorBoundary resetKey="planner" onReturnToDashboard={onReturnToDashboard}>
          <Bomb shouldThrow={false} />
        </ModuleErrorBoundary>
      );
      await user.click(screen.getByRole('button', { name: /Try again/i }));
      expect(screen.getByText('Module rendered safely')).toBeInTheDocument();

      // Re-trigger error and verify changing resetKey clears boundary automatically
      rerender(
        <ModuleErrorBoundary resetKey="planner" onReturnToDashboard={onReturnToDashboard}>
          <Bomb shouldThrow={true} />
        </ModuleErrorBoundary>
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(
        <ModuleErrorBoundary resetKey="indoor" onReturnToDashboard={onReturnToDashboard}>
          <Bomb shouldThrow={false} />
        </ModuleErrorBoundary>
      );
      expect(screen.getByText('Module rendered safely')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
