import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  AirQualityQuerySchema,
  ChatRequestSchema,
  LocationQuerySchema,
  RoutineRequestSchema,
} from '../src/shared/validation.ts';
import {
  getAirQualitySnapshot,
  PRESET_LOCATIONS,
  searchLocations,
} from './services/airQualityService.ts';
import {
  generateAssistantReply,
  generatePersonalizedRoutine,
} from './services/aiService.ts';

export interface AppOptions {
  apiRateLimitMax?: number;
  aiRateLimitMax?: number;
  isProduction?: boolean;
  allowedOrigins?: string[];
  trustProxy?: boolean | number | string;
}

function parseOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveTrustProxy(
  explicit?: boolean | number | string,
  envValue: string | undefined = process.env.TRUST_PROXY,
  isCloudRun: boolean = Boolean(process.env.K_SERVICE)
): boolean | number | string {
  if (explicit !== undefined) return explicit;
  if (envValue !== undefined && envValue.trim() !== '') {
    const normalized = envValue.trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'off') return false;
    // Never map "true" to Express's unbounded trust-all-proxies; cap to 1 hop
    if (normalized === 'true' || normalized === 'on') return 1;
    const hops = Number(normalized);
    if (Number.isInteger(hops) && hops > 0 && hops <= 5) return hops;
    return envValue.trim();
  }
  // Automatically trust 1 hop on Cloud Run (single Google Frontend proxy); otherwise disable
  return isCloudRun ? 1 : false;
}

function getAllowedOrigins(isProduction: boolean, explicitOrigins?: string[]): Set<string> {
  const origins = new Set<string>();

  if (!isProduction) {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  if (process.env.APP_URL) {
    const origin = parseOrigin(process.env.APP_URL);
    if (origin) origins.add(origin);
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const raw of process.env.ALLOWED_ORIGINS.split(',')) {
      const origin = parseOrigin(raw);
      if (origin) origins.add(origin);
    }
  }

  if (explicitOrigins) {
    for (const raw of explicitOrigins) {
      const origin = parseOrigin(raw);
      if (origin) origins.add(origin);
    }
  }

  return origins;
}

function getFrameAncestors(isProduction: boolean): string[] {
  const ancestors = new Set<string>([
    "'self'",
    'https://aistudio.google.com',
    'https://*.aistudio.google.com',
    'https://*.google.com',
    'https://*.googleusercontent.com',
  ]);

  if (!isProduction) {
    ancestors.add('http://localhost:*');
  }

  if (process.env.FRAME_ANCESTORS) {
    for (const entry of process.env.FRAME_ANCESTORS.split(',')) {
      const origin = parseOrigin(entry);
      if (origin) ancestors.add(origin);
    }
  }

  return Array.from(ancestors);
}

export function createApiApp(options: AppOptions = {}): express.Express {
  const app = express();
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  const trustProxySetting = resolveTrustProxy(options.trustProxy);
  app.set('trust proxy', trustProxySetting);

  // Separate strict Production CSP (no unsafe-inline / unsafe-eval scripts) from Development CSP (Vite React Refresh)
  const scriptSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"];
  const connectSrc = isProduction ? ["'self'"] : ["'self'", 'ws:', 'wss:'];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc,
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
          frameAncestors: getFrameAncestors(isProduction),
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
    })
  );

  // Restrict sensitive browser permissions (allow optional same-origin geolocation only)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)'
    );
    next();
  });

  // Strict CORS allowlist for API routes (explicit trusted origins + exact same-host only; no wildcard *.run.app)
  const allowedOrigins = getAllowedOrigins(isProduction, options.allowedOrigins);
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      const host = req.get('host');
      const isSameHost = Boolean(
        host && (origin === `https://${host}` || (!isProduction && origin === `http://${host}`))
      );
      if (isSameHost || allowedOrigins.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      } else {
        res.status(403).json({
          error: 'Origin not permitted by CORS policy.',
        });
        return;
      }
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Strict body size limit to prevent payload flooding
  app.use(express.json({ limit: '32kb' }));

  // Rate limiting on API routes using Express's resolved trustworthy req.ip
  const limiterValidation = { xForwardedForHeader: Boolean(trustProxySetting) };

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.apiRateLimitMax ?? 180,
    standardHeaders: true,
    legacyHeaders: false,
    validate: limiterValidation,
    message: {
      error: 'Too many requests. Please wait a few minutes before retrying.',
    },
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.aiRateLimitMax ?? 30,
    standardHeaders: true,
    legacyHeaders: false,
    validate: limiterValidation,
    message: {
      error: 'AI request rate limit reached. Please pause briefly before sending more prompts.',
    },
  });

  app.use('/api', generalLimiter);

  // Health endpoint (exposes zero secrets or environment details)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      service: 'airwise-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Preset cities endpoint
  app.get('/api/locations/presets', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ locations: PRESET_LOCATIONS });
  });

  // Location search endpoint
  app.get('/api/locations/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LocationQuerySchema.safeParse({ q: req.query.q });
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message ?? 'Invalid search query.',
        });
        return;
      }
      const data = await searchLocations(parsed.data.q);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Live Air Quality + Weather snapshot endpoint
  app.get('/api/air-quality', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = AirQualityQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid location coordinates or AQI standard parameter.',
          details: parsed.error.issues.map((i) => i.message),
        });
        return;
      }

      const bypassCache = req.query.refresh === 'true';

      const snapshot = await getAirQualitySnapshot({
        latitude: parsed.data.lat,
        longitude: parsed.data.lon,
        name: parsed.data.city,
        region: parsed.data.region,
        country: parsed.data.country,
        countryCode: parsed.data.countryCode,
        standard: parsed.data.standard,
        bypassCache,
      });

      res.setHeader('Cache-Control', 'private, max-age=180');
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  // Personalized Daily Routine Generator endpoint
  app.post('/api/routine', aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RoutineRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid lifestyle profile or air quality payload.',
          details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
        return;
      }

      const routine = await generatePersonalizedRoutine(parsed.data);
      res.setHeader('Cache-Control', 'no-store');
      res.json(routine);
    } catch (err) {
      next(err);
    }
  });

  // AIRWISE AI conversational assistant endpoint
  app.post('/api/ai/chat', aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ChatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message ?? 'Invalid chat request.',
        });
        return;
      }

      const result = await generateAssistantReply(parsed.data);
      res.setHeader('Cache-Control', 'no-store');
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 404 handler for unknown API routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Centralized error handler — never leaks stack traces or secrets to clients
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const errWithStatus = err as { status?: number; type?: string };
    if (errWithStatus?.type === 'entity.too.large' || errWithStatus?.status === 413) {
      res.status(413).json({ error: 'Request payload exceeds the 32 KB limit.' });
      return;
    }
    const isSyntaxError = err instanceof SyntaxError && errWithStatus?.status === 400;
    if (isSyntaxError) {
      res.status(400).json({ error: 'Malformed JSON request body.' });
      return;
    }
    res.status(500).json({
      error: 'An unexpected server error occurred. Please try again shortly.',
    });
  });

  return app;
}

