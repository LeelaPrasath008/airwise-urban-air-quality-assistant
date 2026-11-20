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
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  if (process.env.APP_URL) {
    try {
      origins.add(new URL(process.env.APP_URL).origin);
    } catch {
      // Ignore malformed APP_URL
    }
  }
  if (process.env.ALLOWED_ORIGINS) {
    for (const raw of process.env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = raw.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  return origins;
}

export function createApiApp(options: AppOptions = {}): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers via Helmet (configured cleanly for AI Studio iframe preview & Google Fonts)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: null,
          frameAncestors: [
            "'self'",
            'https://aistudio.google.com',
            'https://*.aistudio.google.com',
            'https://*.google.com',
            'https://*.googleusercontent.com',
            'https://*.run.app',
            'http://localhost:*',
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
    })
  );

  // Strict CORS restriction for API routes
  const allowedOrigins = getAllowedOrigins();
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      const host = req.get('host');
      const isSameHost = Boolean(
        host && (origin === `https://${host}` || origin === `http://${host}`)
      );
      const isTrustedRunApp = /^https:\/\/([a-z0-9-]+\.)+run\.app$/i.test(origin);
      if (isSameHost || allowedOrigins.has(origin) || isTrustedRunApp) {
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

  // Rate limiting on API routes
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.apiRateLimitMax ?? 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests. Please wait a few minutes before retrying.',
    },
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.aiRateLimitMax ?? 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'AI request rate limit reached. Please pause briefly before sending more prompts.',
    },
  });

  app.use('/api', generalLimiter);

  // Health endpoint (exposes zero secrets or environment details)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'airwise-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Preset cities endpoint
  app.get('/api/locations/presets', (_req: Request, res: Response) => {
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
