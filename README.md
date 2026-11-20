# AIRWISE — Breathe Smarter. Live Greener.

AIRWISE is a GenAI-powered urban air quality assistant built to help families and residential communities navigate winter smog and urban air pollution through live air-quality interpretation, personalized low-emission daily routines, evidence-based indoor air guidance, sustainable activity swaps, and transparent environmental impact tracking.

## 1. Problem Statement
During winter temperature inversions and urban pollution peaks, households need more than raw pollution numbers. AIRWISE translates local AQI, PM2.5, PM10, and weather readings into actionable, safety-conscious everyday decisions—explaining both personal exposure considerations and environmental benefits without fabricating data or making unsupported medical claims.

## 2. Main Features
1. **Smart Air Quality Dashboard**: Live Open-Meteo Air Quality (CAMS/ECMWF) and Weather data with exact Indian National AQI (CPCB) and US EPA AQI breakpoint calculations, dominant pollutant reporting, 24-hour trend & short-range forecast chart, and clearly labeled demonstration fallback when live feeds are unreachable.
2. **AI Personalized Daily Routine Planner**: Collects household lifestyle details (occupation, commute, outdoor work, household size, indoor ventilation/HEPA, transport preference) and generates structured Morning, Afternoon, and Evening routines via server-side Gemini (`gemini-4-hydrogen`) with all six mandatory explanations per action, plus a transparent rule-based fallback.
3. **Indoor Air Quality Optimizer**: Links directly to outdoor AQI to advise when windows should stay closed, calculates True HEPA CADR targets by room size, separates evidence-based guidance (EPA/WHO/ASHRAE) from general practical suggestions, and explicitly warns against ozone generators, indoor burning, and unverified sprays.
4. **Sustainable Alternatives Finder**: Searchable, filterable comparison engine for commuting, home energy, waste, deliveries, reusables, and cooking—explicitly disclosing emission-factor assumptions and estimated cost differences.
5. **AIRWISE AI Assistant**: Context-aware conversational assistant grounded in the user's current city, AQI standard, pollutants, and weather, with medical-claim guardrails and rule-based fallback.
6. **Location-Based Pollution Monitoring**: Debounced manual city search, curated urban presets, and optional permission-gated browser geolocation (rounded to ~1 km, never persisted server-side).
7. **Community Impact Center**: Practical neighborhood initiatives, local household pledges, and a transparent household-count collective impact scenario calculator (zero fabricated participation metrics).
8. **Personal Environmental Impact Tracker**: Self-reported action ledger persisted in browser storage with weekly/monthly progress, 4-week chart, milestones, and explicit separation of user estimates from sensor measurements.
9. **Smart Alerts & Notifications**: Accessible contextual alerts (`aria-live`) triggered by user-configured severity thresholds or significant forecast spikes.

## 3. Technology Stack
- **Frontend**: React 19, TypeScript (strict mode), Tailwind CSS v4, Lucide icons, Vite 8
- **Backend**: Node.js, Express 4, Helmet security headers, `express-rate-limit`, Zod runtime validation
- **AI**: `@google/genai` (`gemini-4-hydrogen`, server-side only) with structured JSON schemas and rule-based fallback
- **External Data**: Open-Meteo Air Quality API, Open-Meteo Weather Forecast API, Open-Meteo Geocoding API
- **Testing & Accessibility**: Vitest, React Testing Library, Supertest, `axe-core` / `vitest-axe`

## 4. Architecture
```
├── server.ts                          # Express + Vite dev/prod entry point (port 3000)
├── server/
│   ├── app.ts                         # Hardened Express API routes, Helmet, CORS, rate limiters
│   ├── cache.ts                       # Bounded TTL in-memory cache
│   └── services/
│       ├── airQualityService.ts       # Open-Meteo AQ, Weather & Geocoding + demo fallback
│       └── aiService.ts               # Server-side @google/genai routines & chat + fallback
├── src/
│   ├── shared/
│   │   ├── types.ts                   # Shared TypeScript domain contracts
│   │   ├── aqi.ts                     # Exact Indian CPCB & US EPA AQI breakpoint math
│   │   ├── sustainability.ts          # Emission estimates, indoor optimizer, community & impact math
│   │   └── validation.ts              # Zod schemas & plain-text input sanitization
│   ├── services/api.ts                # Frontend HTTP client with AbortSignal support
│   ├── hooks/                         # useLocalStorage, useDebounce
│   └── components/                    # Accessible modular UI & lazy-loaded views
└── tests/                             # Unit, API integration, security, E2E & axe-core tests
```

## 5. Installation & Environment Configuration
```bash
npm install
cp .env.example .env
```
Configure `.env` (server-side only—never commit real secrets):
- `GEMINI_API_KEY`: Server-side Gemini API key for AIRWISE AI and Personalized Routines (if omitted, transparent rule-based guidance runs automatically).
- `PORT`: Server port (default `3000`).
- `APP_URL`: Deployed origin URL for CORS allowlisting.

## 6. Running the Application
```bash
# Development (Express API + Vite middleware on port 3000)
npm run dev

# Production build & start
npm run build
NODE_ENV=production npm start
```

## 7. Running Tests & Type Checking
```bash
npm run lint   # Strict TypeScript check (tsc --noEmit)
npm test       # Unit, API integration, security, frontend E2E, and WCAG axe-core suite
```

## 8. API Integrations
- **Open-Meteo Air Quality & Weather APIs**: Used server-side with 10-minute TTL caching and in-flight request deduplication.
- **Open-Meteo Geocoding API**: Used server-side for city lookup with 24-hour TTL caching.
- **Gemini API (`@google/genai`)**: Invoked strictly from Express routes (`/api/routine`, `/api/ai/chat`).

## 9. Known Limitations
- Open-Meteo provides model-assimilated CAMS/ECMWF air quality concentrations (~10–40 km grid), which may differ slightly from hyper-local street-side CPCB reference monitors.
- Personal and community CO₂e figures are transparent, user-entered estimates derived from DEFRA/IEA/CEA averages rather than verified carbon accounting.
- Household action logs and preferences are stored locally in browser `localStorage` for privacy minimization without requiring user accounts; clearing browser storage resets local logs.
- AIRWISE is an environmental information assistant and does not replace professional medical care or official emergency directives.
