import type { NextFunction, Request, RequestHandler, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export interface RateLimitConfig {
  apiRateLimitMax?: number;
  aiRateLimitMax?: number;
}

export interface ApiRateLimiters {
  generalLimiter: RequestHandler;
  aiLimiter: RequestHandler;
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

export function getAllowedOrigins(isProduction: boolean, explicitOrigins?: string[]): Set<string> {
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

export function getFrameAncestors(isProduction: boolean): string[] {
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

/**
 * Separates strict Production CSP (no unsafe-inline / unsafe-eval scripts)
 * from Development CSP (Vite React Refresh).
 */
export function createHelmetMiddleware(isProduction: boolean): RequestHandler {
  const scriptSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"];
  const connectSrc = isProduction ? ["'self'"] : ["'self'", 'ws:', 'wss:'];

  return helmet({
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
  });
}

/**
 * Restricts sensitive browser permissions (allow optional same-origin geolocation only).
 */
export function permissionsPolicyMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)'
  );
  next();
}

/**
 * Strict CORS allowlist for API routes (explicit trusted origins + exact same-host only).
 */
export function createCorsMiddleware(
  isProduction: boolean,
  explicitOrigins?: string[]
): RequestHandler {
  const allowedOrigins = getAllowedOrigins(isProduction, explicitOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
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
  };
}

/**
 * Rate limiting on API routes using Express's resolved trustworthy req.ip.
 */
export function createRateLimiters(
  trustProxySetting: boolean | number | string,
  config: RateLimitConfig = {}
): ApiRateLimiters {
  const limiterValidation = { xForwardedForHeader: Boolean(trustProxySetting) };

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.apiRateLimitMax ?? 180,
    standardHeaders: true,
    legacyHeaders: false,
    validate: limiterValidation,
    message: {
      error: 'Too many requests. Please wait a few minutes before retrying.',
    },
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.aiRateLimitMax ?? 30,
    standardHeaders: true,
    legacyHeaders: false,
    validate: limiterValidation,
    message: {
      error: 'AI request rate limit reached. Please pause briefly before sending more prompts.',
    },
  });

  return { generalLimiter, aiLimiter };
}
