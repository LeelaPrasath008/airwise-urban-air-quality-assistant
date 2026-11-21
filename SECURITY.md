# AIRWISE Security Architecture & Decisions

## Core Security Principles
AIRWISE is designed with privacy minimization and defense-in-depth from the first line of code.

### 1. Secret Management
- `GEMINI_API_KEY` is read strictly on the Node.js backend (`server/services/ai/client.ts`, orchestrated by `server/services/aiService.ts`).
- Zero API keys or `@google/genai` SDK imports exist in client bundles (`src/`).
- No UI form asks users to paste or expose API keys.

### 2. Privacy & Data Minimization (No Unnecessary Accounts)
- AIRWISE operates without requiring account registration, passwords, or email collection.
- User lifestyle preferences, community pledges, alert preferences, and personal impact logs stay locally on the user's device (`localStorage`).
- Browser geolocation requires an explicit user click and OS/browser consent prompt; coordinates are rounded to 2 decimal places (~1.1 km precision) before querying the API and are never persisted in a server database.

### 3. Input Validation, Prompt-Injection Defense & Output Safety
- Every API query parameter and JSON request body is strictly validated with Zod schemas (`src/shared/validation.ts`) before reaching business logic or external services.
- Plain-text sanitization strips control characters and HTML angle brackets (`<`, `>`).
- Request bodies are capped at `32kb` (`express.json({ limit: '32kb' })`) with an explicit HTTP `413` handler to prevent memory exhaustion.
- Gemini AI `systemInstruction` strings (`server/services/ai/schemas.ts`) are strictly static trusted policy text with zero untrusted client data interpolated. Client-supplied environmental metadata (city, category, weather) is normalized to single-line plain text (stripping CR/LF/tabs) and passed strictly inside delimited data blocks (`<user_household_context>`, `<environmental_context>`, `<user_message>`) in user `contents`. Upstream calls impose a 15-second per-attempt timeout (`withTimeout`), validate structured routine JSON with Zod (`ValidatedRoutineOutputSchema`), and sanitize all returned text fields.
- All user-supplied and AI-generated content is rendered via React's native escaped text nodes—`dangerouslySetInnerHTML` is never used anywhere in the codebase.

### 4. HTTP Security Headers, Strict CSP & CORS
- Configured via `helmet` (`server/middleware/security.ts`, wired in `server/app.ts`) with separate **Production** and **Development** Content Security Policies:
  - **Production CSP**: `default-src 'self'`, `script-src 'self'` (**zero `'unsafe-inline'`, zero `'unsafe-eval'`**), `script-src-attr 'none'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`, and strict `frame-ancestors` (no `*.run.app` or `localhost` wildcards).
  - **Development CSP**: permits `'unsafe-inline'` strictly for Vite React Fast Refresh preamble and `ws:`/`wss:` for dev transport, with **`'unsafe-eval'` disabled in both dev and production**.
- `Permissions-Policy` explicitly disables `camera=()`, `microphone=()`, `payment=()`, and `usb=()`, permitting `geolocation=(self)` only for user-initiated location lookup.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Powered-By` disabled.
- `/api/*` enforces a strict CORS origin allowlist: exact same-host origin plus explicitly configured `APP_URL` and `ALLOWED_ORIGINS` (`localhost:3000` allowed only in development). Broad wildcard trust of arbitrary third-party `*.run.app` origins is explicitly rejected with HTTP `403`.

### 5. Proxy Trust, Rate Limiting & Safe Error Handling
- Express `trust proxy` is resolved conservatively via `resolveTrustProxy`: disabled (`false`) by default in local/direct deployments so forged `X-Forwarded-For` headers cannot spoof client IPs, automatically set to `1` hop when Cloud Run's `K_SERVICE` environment is present, or explicitly configured via `TRUST_PROXY` (never allowing unbounded `true`).
- `express-rate-limit` protects `/api/*` (180 requests / 15 min per resolved IP) with a tighter window on AI generation endpoints `/api/routine` and `/api/ai/chat` (30 requests / 15 min per IP).
- Manual cache refresh (`refresh=true`) enforces a 30-second server-side cooldown per coordinate to prevent upstream API hammering.
- Explicit `Cache-Control` headers enforce `no-store` on `/api/health`, `/api/routine`, and `/api/ai/chat`, `public, max-age=300` on `/api/locations/presets`, and on `/api/air-quality` (`server/routes/airQualityRoutes.ts`) `private, max-age=180` for normal requests and `no-store` when `refresh=true` is requested.
- Centralized Express error handling (`server/middleware/errorHandlers.ts`) converts malformed JSON to HTTP `400`, oversized bodies to HTTP `413`, unknown `/api/*` paths to HTTP `404` JSON, and unexpected exceptions to generic HTTP `500` responses without leaking internal stack traces, upstream SDK error messages, file paths, or environment variables.

### 6. Limitations & Residual Risks
- Rate limiting and response caching currently use in-memory stores suitable for single-instance deployment; horizontally scaled multi-instance deployments should swap in a shared Redis store.
- Prompt injection against LLMs cannot be eliminated 100% by prompt hardening alone; AIRWISE mitigates impact by isolating AI prompts to stateless non-privileged text generation without database write tools or secret access, enforcing strict Zod schema validation on both inputs and outputs, and escaping all rendered text.


