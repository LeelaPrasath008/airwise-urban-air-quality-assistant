import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import App from '../../src/App.tsx';
import {
  formatCoordinateRegion,
  LocationSelectorModal,
} from '../../src/components/LocationSelectorModal.tsx';
import { useLocalStorage } from '../../src/hooks/useLocalStorage.ts';
import type { AirQualitySnapshot, GeoLocation } from '../../src/shared/types.ts';

const SAMPLE_LOCATION: GeoLocation = {
  id: 'in-new-delhi',
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  countryCode: 'IN',
  latitude: 28.61,
  longitude: 77.21,
};

const SAMPLE_SNAPSHOT: AirQualitySnapshot = {
  location: SAMPLE_LOCATION,
  standard: 'INDIA_CPCB',
  aqi: 268,
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
  pollutants: {
    pm25: 112.4,
    pm10: 218.0,
    no2: 52.1,
    o3: 34.0,
    so2: 14.5,
    co: 1120,
  },
  weather: {
    temperatureC: 15.2,
    humidityPercent: 72,
    windSpeedKmh: 5.4,
    weatherCode: 45,
    conditionLabel: 'Fog / Winter haze',
  },
  hourlyTrend: [
    {
      timeIso: '2026-11-20T08:00',
      hourLabel: '08:00',
      pm25: 120,
      pm10: 225,
      aqi: 295,
      isForecast: false,
    },
    {
      timeIso: '2026-11-20T14:00',
      hourLabel: '14:00',
      pm25: 86,
      pm10: 165,
      aqi: 187,
      isForecast: true,
    },
  ],
  lastUpdatedIso: '2026-11-20T10:00:00.000Z',
  dataSource: 'Open-Meteo Air Quality (CAMS/ECMWF) & Weather API',
  isLive: true,
  isDemonstrationData: false,
  cacheHit: false,
  disclaimer: 'AQI computed using Indian National AQI (CPCB) breakpoints.',
};

describe('Batch F1 — Core Frontend Reliability & Accessibility Regression Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 1 — useDialogFocus stability inside modals', () => {
    it('keeps focus on interacted controls inside AlertSettingsModal instead of jumping back to Close button', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/locations/presets')) {
          return new Response(JSON.stringify({ locations: [SAMPLE_LOCATION] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(SAMPLE_SNAPSHOT), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const user = userEvent.setup();
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );

      await screen.findByText('268');

      const alertTrigger = screen.getByRole('button', { name: /Open smart alert preferences/i });
      alertTrigger.focus();
      await user.click(alertTrigger);

      const dialog = await screen.findByRole('dialog', { name: /Smart alert preferences/i });
      const closeBtn = screen.getByRole('button', { name: /Close alert preferences/i });
      const severeRadio = screen.getByRole('radio', { name: /Very Poor \/ Severe emergency only/i });
      const ventCheckbox = screen.getByRole('checkbox', {
        name: /Include window ventilation warnings/i,
      });

      // Clicking a radio updates App state -> re-renders AlertSettingsModal with new inline onClose
      await user.click(severeRadio);
      expect(severeRadio).toBeChecked();
      expect(document.activeElement).toBe(severeRadio);
      expect(document.activeElement).not.toBe(closeBtn);

      // Toggling checkbox also triggers App re-render and must preserve focus on the checkbox
      await user.click(ventCheckbox);
      expect(ventCheckbox).not.toBeChecked();
      expect(document.activeElement).toBe(ventCheckbox);
      expect(dialog.contains(document.activeElement)).toBe(true);

      // Escape still closes modal and restores focus to trigger
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Smart alert preferences/i })).not.toBeInTheDocument();
      });
      expect(document.activeElement).toBe(alertTrigger);
    });
  });

  describe('Task 2 — DashboardView non-blocking refresh and location-switch errors', () => {
    it('shows an accessible inline error banner with Retry when refresh fails after a snapshot is loaded', async () => {
      let aqCall = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/api/locations/presets')) {
          return new Response(JSON.stringify({ locations: [SAMPLE_LOCATION] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('/api/air-quality')) {
          aqCall += 1;
          if (aqCall === 2) {
            return new Response(JSON.stringify({ error: 'Upstream station timed out.' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(
            JSON.stringify({
              ...SAMPLE_SNAPSHOT,
              aqi: aqCall >= 3 ? 241 : SAMPLE_SNAPSHOT.aqi,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      });

      const user = userEvent.setup();
      const { container } = render(<App />);

      expect(await screen.findByText('268')).toBeInTheDocument();

      // Trigger manual refresh that fails while snapshot is already rendered
      await user.click(screen.getByRole('button', { name: /Refresh air quality readings/i }));

      const alertBanner = await screen.findByRole('alert');
      expect(alertBanner).toHaveTextContent(/displaying last loaded data for New Delhi/i);
      expect(alertBanner).toHaveTextContent(/Upstream station timed out\./i);
      // Previously loaded AQI stays visible without claiming it was refreshed
      expect(screen.getByText('268')).toBeInTheDocument();

      // Ensure inline error banner passes axe-core accessibility audit
      expect((await axe(container)).violations).toEqual([]);

      // Clicking Retry recovers and clears the inline error banner
      await user.click(screen.getByRole('button', { name: /^Retry$/i }));
      expect(await screen.findByText('241')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText(/Upstream station timed out\./i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Task 3 — useLocalStorage validation and fallback hardening', () => {
    it('loads valid persisted data and persists updates', () => {
      window.localStorage.setItem(
        'test_loc',
        JSON.stringify({
          id: 'in-mumbai',
          name: 'Mumbai',
          country: 'India',
          countryCode: 'IN',
          latitude: 19.08,
          longitude: 72.88,
        })
      );

      const { result } = renderHook(() => useLocalStorage<GeoLocation>('test_loc', SAMPLE_LOCATION));
      expect(result.current[0].name).toBe('Mumbai');

      act(() => {
        result.current[1]({ ...SAMPLE_LOCATION, name: 'Pune' });
      });
      expect(result.current[0].name).toBe('Pune');
      expect(JSON.parse(window.localStorage.getItem('test_loc') ?? '{}').name).toBe('Pune');
    });

    it('falls back to initialValue for missing key, malformed JSON, and null', () => {
      const missing = renderHook(() => useLocalStorage('missing_key', ['a']));
      expect(missing.result.current[0]).toEqual(['a']);

      window.localStorage.setItem('bad_json', '{not-valid-json');
      const malformed = renderHook(() => useLocalStorage('bad_json', SAMPLE_LOCATION));
      expect(malformed.result.current[0]).toEqual(SAMPLE_LOCATION);

      window.localStorage.setItem('null_val', 'null');
      const nullObj = renderHook(() => useLocalStorage('null_val', SAMPLE_LOCATION));
      expect(nullObj.result.current[0]).toEqual(SAMPLE_LOCATION);

      const nullArr = renderHook(() => useLocalStorage<string[]>('null_val', []));
      expect(nullArr.result.current[0]).toEqual([]);
    });

    it('rejects array/object and primitive type mismatches safely without crashing', () => {
      window.localStorage.setItem('expect_array', JSON.stringify({ not: 'an array' }));
      const arrHook = renderHook(() => useLocalStorage<string[]>('expect_array', ['default']));
      expect(arrHook.result.current[0]).toEqual(['default']);

      window.localStorage.setItem('expect_object', JSON.stringify(['not', 'an', 'object']));
      const objHook = renderHook(() => useLocalStorage('expect_object', SAMPLE_LOCATION));
      expect(objHook.result.current[0]).toEqual(SAMPLE_LOCATION);

      window.localStorage.setItem('empty_object', JSON.stringify({}));
      const emptyObjHook = renderHook(() => useLocalStorage('empty_object', SAMPLE_LOCATION));
      expect(emptyObjHook.result.current[0]).toEqual(SAMPLE_LOCATION);

      window.localStorage.setItem(
        'wrong_field_type',
        JSON.stringify({ enabled: 'yes', minSeverityLevel: 4 })
      );
      const fieldMismatch = renderHook(() =>
        useLocalStorage('wrong_field_type', { enabled: true, minSeverityLevel: 4 })
      );
      expect(fieldMismatch.result.current[0]).toEqual({ enabled: true, minSeverityLevel: 4 });

      window.localStorage.setItem('expect_string', JSON.stringify(42));
      const strHook = renderHook(() => useLocalStorage('expect_string', 'INDIA_CPCB'));
      expect(strHook.result.current[0]).toBe('INDIA_CPCB');

      window.localStorage.setItem('expect_bool', JSON.stringify('true'));
      const boolHook = renderHook(() => useLocalStorage('expect_bool', true));
      expect(boolHook.result.current[0]).toBe(true);

      window.localStorage.setItem('expect_num', JSON.stringify('123'));
      const numHook = renderHook(() => useLocalStorage('expect_num', 10));
      expect(numHook.result.current[0]).toBe(10);
    });
  });

  describe('Task 4 — LocationSelectorModal geolocation lifecycle, hemispheres, and reset', () => {
    it('formats positive and negative latitude/longitude hemispheres accurately', () => {
      expect(formatCoordinateRegion(28.61, 77.21)).toBe('28.61°N, 77.21°E');
      expect(formatCoordinateRegion(-33.87, 151.21)).toBe('33.87°S, 151.21°E');
      expect(formatCoordinateRegion(34.05, -118.24)).toBe('34.05°N, 118.24°W');
      expect(formatCoordinateRegion(-23.55, -46.63)).toBe('23.55°S, 46.63°W');
    });

    it('handles successful geolocation with negative coordinates and rounds to 2 decimals', async () => {
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: { latitude: -23.55052, longitude: -46.63331 },
            } as GeolocationPosition);
          },
        },
      });

      const onSelectLocation = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();

      try {
        render(
          <LocationSelectorModal
            open={true}
            onClose={onClose}
            currentLocation={SAMPLE_LOCATION}
            presets={[SAMPLE_LOCATION]}
            onSelectLocation={onSelectLocation}
          />
        );

        await user.click(screen.getByRole('button', { name: /Use my location/i }));

        expect(onSelectLocation).toHaveBeenCalledWith({
          id: 'geo--23.55--46.63',
          name: 'Current Area',
          region: '23.55°S, 46.63°W',
          country: 'Local Region',
          countryCode: 'US',
          latitude: -23.55,
          longitude: -46.63,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
      } finally {
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: originalGeolocation,
        });
      }
    });

    it('ignores late geolocation callbacks after the modal closes and resets transient errors on reopen', async () => {
      let capturedSuccess: PositionCallback | null = null;
      let capturedError: PositionErrorCallback | null = null;
      const originalGeolocation = navigator.geolocation;

      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (
            success: PositionCallback,
            errorCb?: PositionErrorCallback | null
          ) => {
            capturedSuccess = success;
            capturedError = errorCb ?? null;
          },
        },
      });

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Search unavailable'));

      const onSelectLocation = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();

      try {
        const { rerender } = render(
          <LocationSelectorModal
            open={true}
            onClose={onClose}
            currentLocation={SAMPLE_LOCATION}
            presets={[SAMPLE_LOCATION]}
            onSelectLocation={onSelectLocation}
          />
        );

        // Trigger a search error + pending geolocation request
        const searchInput = screen.getByLabelText(/Search city or urban area/i);
        await user.type(searchInput, 'Pune');
        expect(await screen.findByText(/Search unavailable/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Use my location/i }));
        expect(screen.getByText(/Waiting for your browser location permission/i)).toBeInTheDocument();

        // Close modal before geolocation resolves
        rerender(
          <LocationSelectorModal
            open={false}
            onClose={onClose}
            currentLocation={SAMPLE_LOCATION}
            presets={[SAMPLE_LOCATION]}
            onSelectLocation={onSelectLocation}
          />
        );

        // Fire late success & error callbacks from closed session -> must be ignored
        act(() => {
          capturedSuccess?.({
            coords: { latitude: 28.6139, longitude: 77.209 },
          } as GeolocationPosition);
          capturedError?.({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Denied',
          } as GeolocationPositionError);
        });

        expect(onSelectLocation).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();

        // Reopen modal -> query, search error, and geolocation message must be cleared
        rerender(
          <LocationSelectorModal
            open={true}
            onClose={onClose}
            currentLocation={SAMPLE_LOCATION}
            presets={[SAMPLE_LOCATION]}
            onSelectLocation={onSelectLocation}
          />
        );

        expect(screen.getByLabelText(/Search city or urban area/i)).toHaveValue('');
        expect(screen.queryByText(/Search unavailable/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Waiting for your browser location/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Location permission was declined/i)).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: originalGeolocation,
        });
      }
    });
  });
});
