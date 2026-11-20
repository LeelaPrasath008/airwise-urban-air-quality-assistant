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

## Test Coverage Breakdown

1. **Unit Tests (`tests/unit/domain.test.ts` — 15 tests)**
   - Indian National AQI (CPCB) sub-index breakpoint calculations across all 6 bands (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) and all 6 pollutants (`PM2.5`, `PM10`, `NO2`, `O3`, `SO2`, `CO`).
   - Gap, zero, negative, `NaN`, and extreme (`>500`) AQI concentration edge cases.
   - US EPA AQI breakpoint calculations and country-default selection.
   - WMO weather-code mapping and cleanest forecast ventilation window resolution.
   - `BoundedTTLCache` max-entry eviction and TTL expiration behavior.
   - Indoor Air Quality Optimizer logic (window closing during high outdoor AQI, HEPA CADR sizing, evidence-based vs. general separation, ozone/burning safety warnings).
   - Sustainability impact aggregation (weekly/monthly totals, CO₂e estimates, achievement milestones) and transparent assumption verification.
   - Input sanitization and Zod validation error handling.

2. **API Integration & Security Tests (`tests/integration/api.test.ts` — 11 tests)**
   - `/api/health` contract and Helmet security headers (`X-Content-Type-Options`, `Content-Security-Policy`, hidden `X-Powered-By`).
   - `/api/locations/presets` and `/api/locations/search` validation.
   - `/api/air-quality` live Open-Meteo parsing (`PM2.5`, `PM10`, `NO2`, `O3`, `SO2`, `CO`), TTL caching (`cacheHit: true`), concurrent request deduplication, 30s manual refresh cooldown, coordinate validation, and transparent demonstration fallback on network failure or HTTP 503.
   - `/api/routine` structured Morning/Afternoon/Evening generation containing all 6 mandatory fields per action.
   - `/api/ai/chat` contextual response, XSS script-tag sanitization, and prompt-injection resilience without leaking secrets or raw error traces.
   - CORS rejection (`403`) for unauthorized origins, rate-limit enforcement (`429`), malformed JSON (`400`), oversized payload rejection (`413`), and unknown `/api/*` route JSON `404`.

3. **Frontend, End-to-End Journey & WCAG 2.2 AA Accessibility Tests (`tests/frontend/app.test.tsx` — 4 tests)**
   - Full end-to-end journey across all 7 modules: onboarding & live AQI dashboard (with CPCB ↔ US EPA switcher & `refresh=true`) -> location selector modal -> Daily Planner routine generation -> Indoor Air Optimizer -> Sustainable Choices logging -> AIRWISE AI chat -> Community pledge -> Personal Impact CRUD (log + delete).
   - WCAG 2.2 AA modal focus trapping (`Tab` cycling) and `Escape` focus restoration back to triggering controls.
   - Network error fallback UI and mobile navigation drawer toggling.
   - Automated `axe-core` WCAG 2.2 AA audits across all 7 modules and open Location Selector / Alert Preferences modals verifying zero violations.

