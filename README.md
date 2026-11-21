# AIRWISE — Breathe Smarter. Live Greener.

AIRWISE is a GenAI-powered urban air quality assistant built to help families and residential communities navigate winter smog and urban air pollution through live air-quality interpretation, personalized low-emission daily routines, evidence-based indoor air guidance, sustainable activity swaps, and transparent environmental impact tracking.

## 1. Selected Challenge Vertical
**Urban Air Quality Assistant**

## 2. Problem Statement
During winter temperature inversions and urban pollution peaks, households need more than raw pollution statistics. Families must decide whether it is safe to open windows, how to commute with lower emissions and exposure, how to size indoor air filtration safely, and how everyday choices affect neighborhood air quality. AIRWISE turns live local AQI, pollutant concentrations, and weather conditions into practical, context-driven daily decisions—explaining both personal exposure considerations and direct environmental benefits without fabricating sensor data or making unsupported medical claims.

## 3. Solution & Approach
AIRWISE connects real-time environmental telemetry with household lifestyle context through a full-stack architecture:
- **Live Environmental Grounding**: Server-side integrations with Open-Meteo Air Quality (CAMS/ECMWF) and Weather APIs compute standardized AQI readings using exact **Indian National AQI (CPCB)** (6-pollutant breakpoints: `PM2.5`, `PM10`, `NO₂`, `O₃`, `SO₂`, `CO`) and **US EPA AQI** standards, paired with 24-hour trend and short-range forecast analysis.
- **Action-First Household Guidance**: Every module ties directly to the active location's AQI severity, dominant pollutant, and forecast ventilation windows—from morning/afternoon/evening daily routines to True HEPA CADR sizing and sustainable activity swaps.
- **Privacy-First, Resilient Design**: Requires zero user account registration; household preferences, community pledges, and impact logs stay local in browser storage (`localStorage`). When external feeds or AI services are unreachable, AIRWISE switches transparently to clearly labeled demonstration datasets or deterministic rule-based guidance rather than failing silently or presenting mock numbers as live data.

## 4. AI & Decision-Making Logic
AIRWISE combines deterministic environmental science with structured server-side Generative AI (`@google/genai` using `gemini-4-hydrogen`):
1. **Context Assembly**: The backend receives strictly Zod-validated environmental readings (city, AQI standard, AQI score, category, `PM2.5`, `PM10`, temperature, humidity, weather condition) and household lifestyle inputs (occupation, commute mode, outdoor work, household size, indoor ventilation/HEPA, transport preference, notes).
2. **Dynamic Decision Engine**:
   - **AQI & Ventilation Classification (`src/shared/aqi.ts`)**: Computes exact pollutant sub-indices, identifies the dominant pollutant, maps severity levels (1–6), and scans upcoming forecast hours to identify the cleanest window for natural ventilation (safe only when forecast AQI ≤ 120 and PM2.5 ≤ 45 µg/m³).
   - **Indoor Air Optimizer (`src/shared/sustainability.ts`)**: Links room area, cooking fuel, exhaust availability, incense/candle habits, and outdoor AQI to calculate recommended True HEPA CADR (`m³/h`), separate evidence-based guidance (EPA/WHO/ASHRAE) from general practical tips, and trigger explicit safety warnings (against ozone generators, indoor burning, and unverified sprays).
   - **Structured GenAI Routine & Assistant (`server/services/aiService.ts`)**: Enforces prompt-injection defenses (instruction hierarchy + `<user_household_context>` delimiters), a strict 15-second per-attempt timeout with retry, structured JSON schema generation for Morning/Afternoon/Evening routines (each requiring all 6 fields: what to do, why recommended, how to implement, environmental benefit, health consideration, and effort/cost), and runtime Zod validation + sanitization (`ValidatedRoutineOutputSchema`) on model output.
3. **Transparent Rule-Based Fallback**: If `GEMINI_API_KEY` is unconfigured or the upstream AI call times out or returns invalid output, AIRWISE generates context-tailored, rule-based routines and assistant guidance clearly labeled as `Rule-Based Fallback`—never leaking raw SDK errors or stack traces.

## 5. Features
1. **Smart Air Quality Dashboard**: Live Open-Meteo AQI & weather readings, Indian CPCB (6 pollutants) and US EPA standard switcher, 24-hour interactive SVG trend chart with keyboard range scrubber and screen-reader data table, manual cache-bypassing refresh (30s cooldown), cached/demonstration badges, and window ventilation guidance.
2. **AI Personalized Daily Routine Planner**: Collects household lifestyle profile, generates structured Morning, Afternoon, and Evening actions with one-click logging to *My Impact*, and detects stale routines whenever the active city changes or AQI shifts by `≥ 30`.
3. **Indoor Air Quality Optimizer**: Interactive room audit computing True HEPA CADR targets, window open/close advice synced to live outdoor AQI, separated evidence-based vs. practical guidance, and mandatory safety warnings.
4. **Sustainable Alternatives Finder**: Searchable, category-filterable sustainable swaps (commuting, energy, waste, deliveries, reusables, cooking) with explicit CO₂e/cost assumptions, AQI-aware commuting cautions, and one-click impact logging.
5. **AIRWISE AI Assistant**: Grounded conversational assistant with starter prompts, plain-text XSS-safe rendering, medical-advice disclaimers, and rule-based fallback.
6. **Location-Based Pollution Monitoring**: Curated urban presets, debounced city search (Open-Meteo Geocoding API), and optional permission-gated browser geolocation (rounded to ~1.1 km, never stored server-side).
7. **Community Impact Center**: Practical household/RWA neighborhood initiatives, local pledge tracking, and a transparent household-count collective impact scenario estimator (zero fabricated participation metrics).
8. **Personal Environmental Impact Tracker**: Self-reported action ledger with validated form inputs, weekly/monthly KPIs, 4-week progress visualization, achievement milestones, and clear separation between modeled user estimates and sensor measurements.
9. **Smart Contextual Alerts**: User-configurable severity threshold and forecast-spike alert banner (`aria-live`) with accessible preferences modal.

## 6. Technology Stack
- **Frontend**: React 19, TypeScript (strict mode with `noUnusedLocals` & `noUnusedParameters`), Tailwind CSS v4, Lucide icons, Vite 8 (Rolldown with vendor chunk splitting & `React.lazy` module splitting)
- **Backend**: Node.js, Express 4, Helmet security headers, `express-rate-limit`, Zod runtime validation
- **AI**: `@google/genai` (`gemini-4-hydrogen`, server-side only) with structured JSON output validation and deterministic fallback
- **External Data**: Open-Meteo Air Quality API, Open-Meteo Weather Forecast API, Open-Meteo Geocoding API
- **Testing & Accessibility**: Vitest, React Testing Library, Supertest, `axe-core` (`vitest-axe`), W3C WCAG 2.2 AA contrast verification

## 7. Architecture
```
├── server.ts                              # Express + Vite dev / immutable-asset prod entry point (port 3000)
├── server/
│   ├── app.ts                             # Hardened Express API: Helmet (prod/dev CSP), strict CORS, trust proxy, rate limiters
│   ├── cache.ts                           # Bounded TTL in-memory cache with FIFO/capacity eviction
│   └── services/
│       ├── airQualityService.ts           # Open-Meteo AQ, Weather & Geocoding + deduplication + demo fallback
│       └── aiService.ts                   # Server-side @google/genai routines & chat + Zod output validation + fallback
├── src/
│   ├── App.tsx                            # Main shell, keyboard-accessible nav, lazy-loaded module router
│   ├── shared/
│   │   ├── types.ts                       # Shared TypeScript domain contracts
│   │   ├── aqi.ts                         # Exact 6-pollutant Indian CPCB & US EPA AQI breakpoint math
│   │   ├── sanitize.ts                    # Zero-dependency plain-text sanitizer shared by client & server
│   │   ├── sustainability.ts              # Backward-compatible barrel for split sustainability domain modules
│   │   ├── sustainability/                # Focused factors, alternatives, community, indoor & impact modules
│   │   └── validation.ts                  # Zod request schemas
│   ├── services/api.ts                    # Frontend HTTP client with AbortSignal & refresh bypass support
│   ├── hooks/                             # useLocalStorage, useDebounce, useDialogFocus (WCAG modal focus trap)
│   └── components/                        # AQIChart, OnboardingHero, PollutantTelemetryCard, modals & 7 modules
└── tests/
    ├── unit/domain.test.ts                # 18 domain, AQI breakpoint/boundary, cache & validation unit tests
    ├── unit/accessibility.test.ts         # 2 W3C WCAG 2.2 AA color-contrast unit tests
    ├── integration/api.test.ts            # 15 API, live/fallback, CORS, CSP, proxy & rate-limit integration tests
    └── frontend/app.test.tsx              # 10 E2E 7-module journey, focus-trap, regression & axe-core tests
```

## 8. Installation Instructions
Requires **Node.js 20+** (or **Bun 1.4+** using the committed `bun.lock` lockfile).

```bash
# Using Bun with committed lockfile (reproducible install)
bun install --frozen-lockfile

# Or using npm
npm install

# Create local environment file (never commit .env)
cp .env.example .env
```

## 9. Environment Variable Configuration
Configure `.env` on the server only (see `.env.example` for defaults; never prefix secrets with `VITE_`):
- `GEMINI_API_KEY`: Server-side Gemini API key for AIRWISE AI and Personalized Routines. If omitted or placeholder, transparent rule-based fallback runs automatically.
- `PORT`: Express server port (default `3000`).
- `APP_URL`: Deployed origin URL used for CORS allowlisting (e.g., `http://localhost:3000` or your production HTTPS origin).
- `ALLOWED_ORIGINS`: Optional comma-separated list of additional trusted origins allowed by CORS.
- `TRUST_PROXY`: Express reverse-proxy trust setting (`false` for direct local deployments, `1` behind a single reverse proxy/load balancer; auto-defaults to `1` on Cloud Run via `K_SERVICE` and `false` locally).
- `FRAME_ANCESTORS`: Optional comma-separated trusted origins permitted to embed the app in an iframe.
- `NODE_ENV`: `development` or `production` (production activates strict CSP without `'unsafe-inline'` scripts and immutable `/assets/*` caching).

## 10. Running Instructions
```bash
# Development (Express API + Vite middleware on http://localhost:3000)
npm run dev

# Production build & start
npm run build
NODE_ENV=production npm start
```

## 11. Testing Instructions
See [TESTING.md](./TESTING.md) for the full test matrix.
```bash
# Strict TypeScript check (noUnusedLocals & noUnusedParameters enabled)
npm run lint

# Run all 45 automated tests (unit, WCAG contrast, API/security integration, E2E & axe-core)
npm test

# Verify production bundle
npm run build
```

## 12. Assumptions & Limitations
- **Air Quality Data Grid**: Open-Meteo provides model-assimilated CAMS/ECMWF concentrations (~10–40 km resolution), which can differ from hyper-local street-side CPCB/EPA monitoring stations.
- **Emission Factor Estimates**: Household CO₂e savings in *Sustainable Choices*, *Community Impact*, and *My Impact* are modeled estimates derived from published DEFRA, IEA, and CEA India average factors—not metered carbon accounting—and are explicitly labeled as estimates throughout the UI.
- **HEPA CADR Sizing**: Indoor CADR estimates assume a 2.6 m (~8.5 ft) ceiling height targeting ~4.8 air changes per hour (AHAM/EPA guidance) and adjust conservatively for higher outdoor AQI.
- **Local Privacy Storage**: Preferences, pledges, and logged actions persist in browser `localStorage` without server accounts; clearing site storage resets local records and data does not sync across devices.
- **Single-Instance Caching & Rate Limiting**: `BoundedTTLCache` and `express-rate-limit` use in-memory stores suitable for single-instance deployment; horizontally scaled multi-replica production deployments should use a shared Redis store.
- **Non-Medical Disclaimer**: AIRWISE offers environmental and exposure-reduction guidance only and does not replace professional medical advice or official public-health emergency directives.

## 13. Security & Privacy Considerations
See [SECURITY.md](./SECURITY.md) for full details.
- **Server-Side Secrets Only**: `GEMINI_API_KEY` and `@google/genai` are strictly confined to `server/`; zero secrets appear in client bundles (`dist/`).
- **Hardened HTTP Headers & Strict CSP**: Helmet enforces `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (disabling camera, microphone, payment, USB), hidden `X-Powered-By`, and separated Production CSP (`script-src 'self'` with zero `'unsafe-inline'` or `'unsafe-eval'`).
- **Strict CORS & Anti-Spoofing Proxy Trust**: No wildcard `*.run.app` origin trust; unauthorized cross-origin requests return HTTP `403`; conservative `trust proxy` resolution prevents forged `X-Forwarded-For` headers from bypassing rate limits (`180/15m` API, `30/15m` AI).
- **Input, Payload & Output Safety**: Zod schema validation on all API inputs and Gemini JSON outputs, `32 KB` JSON body cap (HTTP `413`), malformed JSON handling (HTTP `400`), prompt-injection delimiters, plain-text React escaping (zero `dangerouslySetInnerHTML`), and generic error responses with zero stack-trace or upstream error leakage.
- **Privacy Minimization**: No accounts or PII collection; optional browser geolocation requires explicit user action and rounds coordinates to 2 decimal places (~1.1 km) without server persistence.
