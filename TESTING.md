# AIRWISE Testing & Quality Assurance Guide

## Automated Test Suite
AIRWISE uses **Vitest**, **Supertest**, **React Testing Library**, and **`axe-core` (`vitest-axe`)** to validate domain logic, backend integrations, security controls, frontend user journeys, and WCAG 2.2 AA accessibility.

### Running Tests
```bash
# Run full automated test suite
npm test

# Run strict TypeScript type checker
npm run lint

# Verify production build
npm run build
```

## Test Coverage Breakdown (45 Automated Tests across 4 Suites)

1. **Domain & Cache Unit Tests (`tests/unit/domain.test.ts` — 18 tests)**
   - Indian National AQI (CPCB) sub-index breakpoint calculations across all 6 bands (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) and all 6 pollutants (`PM2.5`, `PM10`, `NO2`, `O3`, `SO2`, `CO`).
   - Exact threshold boundary checks for all 6 CPCB and 6 US EPA categories, gap/zero/negative/`NaN`/`Infinity`/`>500` edge cases, and shared AQI scale legend derivation.
   - Backward-compatible barrel verification across the split `src/shared/sustainability/*` modules.
   - US EPA AQI breakpoint calculations and country-default selection.
   - WMO weather-code mapping and cleanest forecast ventilation window resolution.
   - `BoundedTTLCache` max-entry eviction and TTL expiration behavior.
   - Indoor Air Quality Optimizer logic (window closing during high outdoor AQI, HEPA CADR sizing, evidence-based vs. general separation, ozone/burning safety warnings).
   - Sustainability impact aggregation (weekly/monthly totals, CO₂e estimates, achievement milestones) and transparent assumption verification.
   - Input sanitization (`sanitizePlainText`) and Zod validation error handling.

2. **WCAG 2.2 AA Color Contrast Unit Tests (`tests/unit/accessibility.test.ts` — 2 tests)**
   - W3C relative luminance contrast ratio verification (`>= 4.5:1`) across all 15 core AIRWISE foreground/background UI color pairs.
   - W3C relative luminance contrast verification (`>= 4.5:1`) for all 6 Indian CPCB and all 6 US EPA AQI category text/tint combinations.

3. **API Integration & Security Tests (`tests/integration/api.test.ts` — 15 tests)**
   - `/api/health` contract and Helmet security headers (`X-Content-Type-Options`, `Content-Security-Policy`, hidden `X-Powered-By`).
   - Strict CORS enforcement rejecting arbitrary third-party `*.run.app` origins and dev localhost in production (`403`) while allowing explicitly configured trusted origins.
   - Separated strict Production CSP (`script-src 'self'`, no `'unsafe-inline'`, no `'unsafe-eval'`) vs. Development CSP (no `'unsafe-eval'`), plus `Permissions-Policy` header enforcement.
   - Environment-aware `resolveTrustProxy` behavior and proof that forged `X-Forwarded-For` headers cannot bypass rate limiting when unproxied.
   - Explicit `Cache-Control` policies across `/api/locations/presets`, `/api/health`, `/api/air-quality`, and `/api/ai/chat`.
   - `/api/locations/presets` and `/api/locations/search` validation.
   - `/api/air-quality` live Open-Meteo parsing (`PM2.5`, `PM10`, `NO2`, `O3`, `SO2`, `CO`), TTL caching (`cacheHit: true`), concurrent request deduplication, 30s manual refresh cooldown, coordinate validation, and transparent demonstration fallback on network failure or HTTP 503.
   - `/api/routine` structured Morning/Afternoon/Evening generation containing all 6 mandatory fields per action.
   - `/api/ai/chat` contextual response, XSS script-tag sanitization, and prompt-injection resilience without leaking secrets or raw error traces.
   - Malformed JSON (`400`), oversized payload rejection (`413`), rate limiting (`429`), and unknown `/api/*` route JSON `404`.

4. **Frontend, End-to-End Journey & WCAG 2.2 AA Accessibility Tests (`tests/frontend/app.test.tsx` — 10 tests)**
   - Full end-to-end journey across all 7 modules: onboarding & live AQI dashboard (with CPCB ↔ US EPA switcher & `refresh=true`) -> location selector modal -> Daily Planner routine generation -> Indoor Air Optimizer -> Sustainable Choices logging -> AIRWISE AI chat -> Community pledge -> Personal Impact CRUD (log + delete).
   - WCAG 2.2 AA modal focus trapping (`Tab` cycling) and `Escape` focus restoration back to triggering controls.
   - Network error fallback UI and mobile navigation drawer toggling.
   - Automated `axe-core` WCAG 2.2 AA audits across all 7 modules and open Location Selector / Alert Preferences modals verifying zero violations.
   - `AQIChart` keyboard range scrubber updates, location-switch scrubber reset, debounced city search with aborted-request loading guard, and graceful browser geolocation denial error handling.
   - Fresh vs. stale-routine notice checks, logged-button reset on routine regeneration, React `<StrictMode>` community pledge toggles, and accessible form validation `aria-invalid`/`aria-describedby` bindings.


