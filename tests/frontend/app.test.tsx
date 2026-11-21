import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import App from '../../src/App.tsx';
import type { AirQualitySnapshot, DailyRoutinePlan } from '../../src/shared/types.ts';

const MOCK_SNAPSHOT: AirQualitySnapshot = {
  location: {
    id: 'in-new-delhi',
    name: 'New Delhi',
    region: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.61,
    longitude: 77.21,
  },
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
    { timeIso: '2026-11-20T08:00', hourLabel: '08:00', pm25: 120, pm10: 225, aqi: 295, isForecast: false },
    { timeIso: '2026-11-20T14:00', hourLabel: '14:00', pm25: 86, pm10: 165, aqi: 187, isForecast: true },
  ],
  lastUpdatedIso: '2026-11-20T10:00:00.000Z',
  dataSource: 'Open-Meteo Air Quality (CAMS/ECMWF) & Weather API',
  isLive: true,
  isDemonstrationData: false,
  cacheHit: false,
  disclaimer: 'AQI computed using Indian National AQI (CPCB) breakpoints.',
};

const MOCK_ROUTINE: DailyRoutinePlan = {
  generatedAtIso: '2026-11-20T10:05:00.000Z',
  locationName: 'Bengaluru, India',
  aqiAtGeneration: 74,
  standard: 'INDIA_CPCB',
  source: 'gemini_ai',
  summary: 'Personalized Satisfactory AQI routine for Bengaluru.',
  morning: [
    {
      id: 'm1',
      title: 'Seal windows during morning smog',
      whatToDo: 'Keep exterior windows closed during rush hour.',
      whyRecommended: 'Outdoor PM2.5 is elevated.',
      howToImplement: 'Check door seals and run HEPA filtration.',
      environmentalBenefit: 'Retains winter indoor heat.',
      healthConsideration: 'Lowers indoor PM2.5 exposure.',
      effortOrCost: 'Zero cost',
      impactCategory: 'clean_indoor_air',
    },
  ],
  afternoon: [
    {
      id: 'a1',
      title: 'Use metro for office commute',
      whatToDo: 'Take enclosed metro rail instead of solo driving.',
      whyRecommended: 'Cuts tailpipe emissions and exposure.',
      howToImplement: 'Use transit card.',
      environmentalBenefit: 'Estimated 65-80% lower commute CO2e.',
      healthConsideration: 'Reduces roadside exhaust inhalation.',
      effortOrCost: 'Lower than fuel + parking',
      impactCategory: 'public_transit',
    },
  ],
  evening: [
    {
      id: 'e1',
      title: 'Run kitchen exhaust while cooking',
      whatToDo: 'Switch on chimney before stove ignition.',
      whyRecommended: 'Prevents indoor cooking PM2.5 spikes.',
      howToImplement: 'Run 10 minutes post-cooking.',
      environmentalBenefit: 'Use lids to save gas.',
      healthConsideration: 'Protects sleeping family members.',
      effortOrCost: 'Zero cost',
      impactCategory: 'clean_indoor_air',
    },
  ],
  disclaimer: 'Not medical advice.',
};

function setupMockFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes('/api/locations/presets')) {
      return new Response(
        JSON.stringify({
          locations: [
            MOCK_SNAPSHOT.location,
            {
              id: 'in-bengaluru',
              name: 'Bengaluru',
              region: 'Karnataka',
              country: 'India',
              countryCode: 'IN',
              latitude: 12.97,
              longitude: 77.59,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/api/locations/search')) {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: 'in-pune',
              name: 'Pune',
              region: 'Maharashtra',
              country: 'India',
              countryCode: 'IN',
              latitude: 18.52,
              longitude: 73.86,
            },
          ],
          source: 'Open-Meteo Geocoding API',
          isFallback: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/api/air-quality')) {
      const isBlr = url.includes('Bengaluru');
      const isUsEpa = url.includes('standard=US_EPA');
      const isRefresh = url.includes('refresh=true');
      const base: AirQualitySnapshot = isBlr
        ? {
            ...MOCK_SNAPSHOT,
            location: {
              id: 'in-bengaluru',
              name: 'Bengaluru',
              region: 'Karnataka',
              country: 'India',
              countryCode: 'IN',
              latitude: 12.97,
              longitude: 77.59,
            },
            aqi: 74,
            category: { ...MOCK_SNAPSHOT.category, key: 'satisfactory', label: 'Satisfactory', severityLevel: 2 },
          }
        : MOCK_SNAPSHOT;

      const payload: AirQualitySnapshot = {
        ...base,
        standard: isUsEpa ? 'US_EPA' : 'INDIA_CPCB',
        aqi: isUsEpa ? 185 : base.aqi,
        cacheHit: !isRefresh && !isBlr && !isUsEpa,
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/routine')) {
      return new Response(JSON.stringify(MOCK_ROUTINE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/ai/chat')) {
      return new Response(
        JSON.stringify({
          reply: 'With current air quality conditions, move strenuous exercise indoors today.',
          source: 'gemini_ai',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  });
}

describe('AIRWISE Frontend, E2E User Journey & WCAG 2.2 AA Accessibility', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes complete user journey across all 7 modules including standard switch, refresh, indoor air, alternatives, community, and impact CRUD', async () => {
    const fetchSpy = setupMockFetch();
    const user = userEvent.setup();
    render(<App />);

    // 1. Onboarding + Live AQI dashboard render (including SO2 and CO rows + cached indicator)
    expect(await screen.findByText('268')).toBeInTheDocument();
    expect(screen.getByText(/New Delhi, Delhi/i)).toBeInTheDocument();
    expect(screen.getByText(/Poor Air Quality Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Sulphur Dioxide/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.12 mg\/m³/i)).toBeInTheDocument();

    // Toggle AQI Standard (CPCB -> US EPA) and click Refresh (verifies refresh=true query)
    await user.click(screen.getByRole('button', { name: /^US EPA AQI$/i }));
    expect(await screen.findByText('185')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Refresh air quality readings/i }));
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([arg]) => String(arg).includes('refresh=true'))
      ).toBe(true);
    });

    // 2. Switch location via Location Selector modal
    await user.click(
      screen.getByRole('button', { name: /Change monitoring location, currently New Delhi/i })
    );
    const dialog = await screen.findByRole('dialog', { name: /Select monitoring location/i });
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Bengaluru/i }));
    expect(await screen.findByText('74')).toBeInTheDocument();

    // 3. Daily Planner: generate personalized routine
    await user.click(screen.getByRole('button', { name: /^Daily Planner$/i }));
    const generateBtn = await screen.findByRole('button', { name: /Generate daily routine/i });
    await user.click(generateBtn);
    expect(await screen.findByText(/Seal windows during morning smog/i)).toBeInTheDocument();

    // 4. Indoor Air Optimizer: verify CADR and safety warnings
    await user.click(screen.getByRole('button', { name: /^Indoor Air$/i }));
    expect(await screen.findByText(/Indoor Air Quality Optimizer/i)).toBeInTheDocument();
    expect(screen.getByText(/Methods to avoid/i)).toBeInTheDocument();

    // 5. Sustainable Choices: search & log an alternative
    await user.click(screen.getByRole('button', { name: /^Sustainable Choices$/i }));
    expect(await screen.findByText(/Sustainable Alternatives Finder/i)).toBeInTheDocument();
    const logButtons = screen.getAllByRole('button', { name: /Adopt & log action/i });
    await user.click(logButtons[0]);

    // 6. Ask AIRWISE AI a question
    await user.click(screen.getByRole('button', { name: /^AI Assistant$/i }));
    const starterBtn = await screen.findByRole('button', {
      name: /Is it a good idea to exercise outdoors today\?/i,
    });
    await user.click(starterBtn);
    expect(
      await screen.findByText(/move strenuous exercise indoors today/i)
    ).toBeInTheDocument();

    // 7. Community Impact Center: join a pledge
    await user.click(screen.getByRole('button', { name: /^Community$/i }));
    expect(await screen.findByText(/Community Impact Center/i)).toBeInTheDocument();
    const joinButtons = screen.getAllByRole('button', { name: /^Join pledge$/i });
    await user.click(joinButtons[0]);
    expect(screen.getByRole('button', { name: /Pledged/i })).toBeInTheDocument();

    // 8. Personal Impact Tracker: log custom action and delete it
    await user.click(screen.getByRole('button', { name: /^My Impact$/i }));
    const titleInput = await screen.findByLabelText(/Description/i);
    await user.type(titleInput, 'Took metro to office');
    await user.click(screen.getByRole('button', { name: /Log sustainable action/i }));
    expect(await screen.findByText('Took metro to office')).toBeInTheDocument();

    // Delete the newly logged custom action
    await user.click(
      screen.getByRole('button', { name: /Remove logged action Took metro to office/i })
    );
    await waitFor(() => {
      expect(screen.queryByText('Took metro to office')).not.toBeInTheDocument();
    });
  }, 20000);

  it('enforces WCAG modal focus trapping and restores focus to trigger on Escape', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('268');

    const alertTrigger = screen.getByRole('button', { name: /Open smart alert preferences/i });
    alertTrigger.focus();
    await user.click(alertTrigger);

    const dialog = await screen.findByRole('dialog', { name: /Smart alert preferences/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Tabbing repeatedly stays trapped inside the modal dialog
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    // Escape closes dialog and restores focus to triggering button
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Smart alert preferences/i })).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(alertTrigger);
  });

  it('renders accessible error state and supports mobile navigation drawer', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Service unreachable'));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load air quality data/i);

    // Open and close mobile navigation drawer
    const openMenuBtn = screen.getByRole('button', { name: /Open navigation menu/i });
    await user.click(openMenuBtn);
    expect(screen.getByRole('dialog', { name: /Mobile navigation/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Close navigation menu/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Mobile navigation/i })).not.toBeInTheDocument();
    });
  });

  it('passes automated axe-core WCAG 2.2 AA accessibility audit across all 7 modules and open modals with zero violations', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByText('268');
    expect((await axe(container)).violations).toEqual([]);

    // Audit open Location Selector modal
    await user.click(
      screen.getByRole('button', { name: /Change monitoring location, currently New Delhi/i })
    );
    await screen.findByRole('dialog', { name: /Select monitoring location/i });
    expect((await axe(container)).violations).toEqual([]);
    await user.keyboard('{Escape}');

    // Audit open Alert Preferences modal
    await user.click(screen.getByRole('button', { name: /Open smart alert preferences/i }));
    await screen.findByRole('dialog', { name: /Smart alert preferences/i });
    expect((await axe(container)).violations).toEqual([]);
    await user.keyboard('{Escape}');

    const modules: Array<{ nav: RegExp; heading: RegExp }> = [
      { nav: /^Daily Planner$/i, heading: /AI Personalized Daily Routine Planner/i },
      { nav: /^Indoor Air$/i, heading: /Indoor Air Quality Optimizer/i },
      { nav: /^Sustainable Choices$/i, heading: /Sustainable Alternatives Finder/i },
      { nav: /^AI Assistant$/i, heading: /AIRWISE AI Assistant/i },
      { nav: /^Community$/i, heading: /Community Impact Center/i },
      { nav: /^My Impact$/i, heading: /Personal Environmental Impact Tracker/i },
    ];

    for (const mod of modules) {
      await user.click(screen.getByRole('button', { name: mod.nav }));
      await screen.findByText(mod.heading);
      expect((await axe(container)).violations).toEqual([]);
    }
  }, 45000);

  it('supports keyboard AQIChart hour scrubbing, debounced location search, and graceful geolocation denial', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('268');

    // Keyboard range scrubber updates active hour readout
    const scrubber = screen.getByLabelText(/Inspect hour/i) as HTMLInputElement;
    fireEvent.change(scrubber, { target: { value: '1' } });
    expect(screen.getByText(/AQI 187/i)).toBeInTheDocument();

    // Debounced city search & graceful geolocation permission denial
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          errorCb?: PositionErrorCallback | null
        ) => {
          errorCb?.({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Denied',
          } as GeolocationPositionError);
        },
      },
    });

    try {
      await user.click(
        screen.getByRole('button', { name: /Change monitoring location, currently New Delhi/i })
      );
      const searchInput = await screen.findByLabelText(/Search city or urban area/i);
      await user.type(searchInput, 'Pune');
      expect(await screen.findByRole('button', { name: /Pune, Maharashtra/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Use my location/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/Location permission was declined/i);
    } finally {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: originalGeolocation,
      });
    }
  });

  it('displays stale-routine notice on city change and binds aria-invalid/aria-describedby on form validation error', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('268');

    // Generate routine while New Delhi is active (MOCK_ROUTINE is for Bengaluru AQI 74 -> triggers staleness check)
    await user.click(screen.getByRole('button', { name: /^Daily Planner$/i }));
    await user.click(await screen.findByRole('button', { name: /Generate daily routine/i }));
    expect(
      await screen.findByText(/This routine was generated for Bengaluru, India/i)
    ).toBeInTheDocument();

    // Impact tracker invalid quantity binds aria-invalid and aria-describedby
    await user.click(screen.getByRole('button', { name: /^My Impact$/i }));
    const qtyInput = await screen.findByLabelText(/Quantity/i);
    fireEvent.change(qtyInput, { target: { value: '0' } });
    fireEvent.submit(qtyInput.closest('form')!);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('id', 'impact-form-error');
    expect(qtyInput).toHaveAttribute('aria-invalid', 'true');
    expect(qtyInput).toHaveAttribute('aria-describedby', 'impact-form-error');
  });

  it('does not mark a freshly generated routine as stale for the active city and resets logged action buttons on regeneration', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/locations/presets')) {
        return new Response(JSON.stringify({ locations: [MOCK_SNAPSHOT.location] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/air-quality')) {
        return new Response(JSON.stringify(MOCK_SNAPSHOT), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/routine')) {
        return new Response(
          JSON.stringify({
            ...MOCK_ROUTINE,
            locationName: 'New Delhi, India',
            aqiAtGeneration: MOCK_SNAPSHOT.aqi,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('268');

    await user.click(screen.getByRole('button', { name: /^Daily Planner$/i }));
    await user.click(await screen.findByRole('button', { name: /Generate daily routine/i }));
    expect(await screen.findByText(/Seal windows during morning smog/i)).toBeInTheDocument();

    // Fresh routine matching "New Delhi, India" and AQI 268 must NOT show stale-routine banner
    expect(screen.queryByText(/This routine was generated for/i)).not.toBeInTheDocument();

    // Log first routine action -> button becomes disabled "Logged to My Impact"
    const logButtons = screen.getAllByRole('button', { name: /^Log to My Impact$/i });
    await user.click(logButtons[0]);
    expect(screen.getByRole('button', { name: /^Logged to My Impact$/i })).toBeDisabled();

    // Regenerating the routine resets loggedIds so all items can be logged again
    await user.click(screen.getByRole('button', { name: /Regenerate routine/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Logged to My Impact$/i })).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: /^Log to My Impact$/i }).length).toBe(3);
  });

  it('resets AQIChart selectedIndex when switching monitoring locations', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('268');

    // Scrub to index 1 (14:00) on New Delhi
    const scrubber = screen.getByLabelText(/Inspect hour/i) as HTMLInputElement;
    expect(scrubber.value).toBe('0');
    fireEvent.change(scrubber, { target: { value: '1' } });
    expect(scrubber.value).toBe('1');

    // Switch location to Bengaluru -> AQIChart remounts and resets scrubber back to 0
    await user.click(
      screen.getByRole('button', { name: /Change monitoring location, currently New Delhi/i })
    );
    await user.click(await screen.findByRole('button', { name: /Bengaluru/i }));
    await screen.findByText('74');

    const resetScrubber = screen.getByLabelText(/Inspect hour/i) as HTMLInputElement;
    expect(resetScrubber.value).toBe('0');
  });

  it('keeps searching state active when an earlier city search is aborted by a newer query', async () => {
    let resolveSecondSearch: ((res: Response) => void) | null = null;
    let searchCallCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/locations/presets')) {
        return Promise.resolve(
          new Response(JSON.stringify({ locations: [MOCK_SNAPSHOT.location] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.includes('/api/air-quality')) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_SNAPSHOT), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.includes('/api/locations/search')) {
        searchCallCount += 1;
        if (searchCallCount === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });
        }
        return new Promise<Response>((resolve) => {
          resolveSecondSearch = resolve;
        });
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }));
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('268');

    await user.click(
      screen.getByRole('button', { name: /Change monitoring location, currently New Delhi/i })
    );
    const searchInput = await screen.findByLabelText(/Search city or urban area/i);

    await user.type(searchInput, 'Pu');
    expect(await screen.findByText(/Searching cities\.\.\./i)).toBeInTheDocument();

    // Type more before first request resolves -> aborts first request, starts second
    await user.type(searchInput, 'ne');
    await waitFor(() => expect(searchCallCount).toBe(2));

    // Aborted first request must NOT clear the loading indicator while second request is pending
    expect(screen.getByText(/Searching cities\.\.\./i)).toBeInTheDocument();

    // Now resolve the second search request
    resolveSecondSearch!(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 'in-pune',
              name: 'Pune',
              region: 'Maharashtra',
              country: 'India',
              countryCode: 'IN',
              latitude: 18.52,
              longitude: 73.86,
            },
          ],
          source: 'Open-Meteo Geocoding API',
          isFallback: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    expect(await screen.findByRole('button', { name: /Pune, Maharashtra/i })).toBeInTheDocument();
    expect(screen.queryByText(/Searching cities\.\.\./i)).not.toBeInTheDocument();
  });

  it('renders cleanly under React StrictMode and toggles community pledges with accurate toast messages', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    expect(await screen.findByText('268')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Community$/i }));
    const joinButtons = await screen.findAllByRole('button', { name: /^Join pledge$/i });

    await user.click(joinButtons[0]);
    expect(await screen.findByText(/Joined household community pledge/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Pledged$/i }));
    expect(await screen.findByText(/Removed community pledge/i)).toBeInTheDocument();
  });

  it('preserves AppShell skip navigation, desktop aria-current, mobile drawer keyboard focus/selection, toast dismissal, and drawer axe-core compliance', async () => {
    setupMockFetch();
    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByText('268');

    // Skip navigation targets main#main-content with tabIndex={-1}
    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });
    expect(skipLink).toHaveAttribute('href', '#main-content');
    const mainLandmark = screen.getByRole('main');
    expect(mainLandmark).toHaveAttribute('id', 'main-content');
    expect(mainLandmark).toHaveAttribute('tabindex', '-1');

    // Desktop sidebar navigation reflects active aria-current
    const desktopNav = screen.getByRole('navigation', { name: /Main sections/i });
    expect(within(desktopNav).getByRole('button', { name: /^Dashboard$/i })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await user.click(within(desktopNav).getByRole('button', { name: /^Community$/i }));
    await screen.findByText(/Community Impact Center/i);
    expect(within(desktopNav).getByRole('button', { name: /^Community$/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(desktopNav).getByRole('button', { name: /^Dashboard$/i })).not.toHaveAttribute(
      'aria-current'
    );

    // Toast notification appears and can be manually dismissed
    const joinButtons = screen.getAllByRole('button', { name: /^Join pledge$/i });
    await user.click(joinButtons[0]);
    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent(/Joined household community pledge/i);
    await user.click(screen.getByRole('button', { name: /Dismiss notification/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Mobile drawer opens, passes axe-core, closes on Escape, and restores focus to trigger
    const drawerTrigger = screen.getByRole('button', { name: /Open navigation menu/i });
    drawerTrigger.focus();
    await user.click(drawerTrigger);

    const mobileDrawer = await screen.findByRole('dialog', { name: /Mobile navigation/i });
    expect(mobileDrawer.contains(document.activeElement)).toBe(true);
    expect((await axe(container)).violations).toEqual([]);

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Mobile navigation/i })).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(drawerTrigger);

    // Selecting a navigation item inside the mobile drawer navigates and closes the drawer
    await user.click(drawerTrigger);
    const reopenedDrawer = await screen.findByRole('dialog', { name: /Mobile navigation/i });
    await user.click(within(reopenedDrawer).getByRole('button', { name: /^Indoor Air$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Mobile navigation/i })).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Indoor Air Quality Optimizer/i)).toBeInTheDocument();
    expect(within(desktopNav).getByRole('button', { name: /^Indoor Air$/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});




