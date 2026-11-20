# AIRWISE Security Architecture & Decisions

## Core Security Principles
AIRWISE is designed with privacy minimization and defense-in-depth from the first line of code.

### 1. Secret Management
- `GEMINI_API_KEY` is read strictly on the Node.js backend (`server/services/aiService.ts`).
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
- Gemini AI system instructions explicitly enforce instruction hierarchy (ignoring untrusted override attempts), isolate user context inside `<user_household_context>` delimiters, impose a 15-second per-attempt upstream timeout (`withTimeout`), validate structured routine JSON with Zod (`ValidatedRoutineOutputSchema`), and sanitize all returned text fields.
- All user-supplied and AI-generated content is rendered via React's native escaped text nodes—`dangerouslySetInnerHTML` is never used anywhere in the codebase.

### 4. HTTP Security Headers & CORS
- Configured via `helmet` (`server/app.ts`) with Content Security Policy (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, strict `frame-ancestors`), `X-Content-Type-Options: nosniff`, and `X-Powered-By` disabled.
- `/api/*` enforces a strict CORS origin allowlist (`localhost:3000`, configured `APP_URL`, `ALLOWED_ORIGINS`, and trusted Cloud Run deployment hosts), returning `403` for unauthorized cross-origin requests.

### 5. Rate Limiting & Safe Error Handling
- `express-rate-limit` protects `/api/*` (180 requests / 15 min per IP) with a tighter window on AI generation endpoints `/api/routine` and `/api/ai/chat` (30 requests / 15 min per IP).
- Manual cache refresh (`refresh=true`) enforces a 30-second server-side cooldown per coordinate to prevent upstream API hammering.
- Centralized Express error handling converts malformed JSON to HTTP `400`, oversized bodies to HTTP `413`, unknown `/api/*` paths to HTTP `404` JSON, and unexpected exceptions to generic HTTP `500` responses without leaking internal stack traces, upstream SDK error messages, file paths, or environment variables.

### 6. Limitations & Residual Risks
- Rate limiting and response caching currently use in-memory stores suitable for single-instance deployment; horizontally scaled multi-instance deployments should swap in a shared Redis store.
- Prompt injection against LLMs cannot be eliminated 100% by prompt hardening alone; AIRWISE mitigates impact by isolating AI prompts to stateless non-privileged text generation without database write tools or secret access, enforcing strict Zod schema validation on both inputs and outputs, and escaping all rendered text.

