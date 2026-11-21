import express from 'express';
import { apiErrorHandler, apiNotFoundHandler } from './middleware/errorHandlers.ts';
import {
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiters,
  permissionsPolicyMiddleware,
  resolveTrustProxy,
} from './middleware/security.ts';
import { createApiRouter } from './routes/index.ts';

export { resolveTrustProxy } from './middleware/security.ts';

export interface AppOptions {
  apiRateLimitMax?: number;
  aiRateLimitMax?: number;
  isProduction?: boolean;
  allowedOrigins?: string[];
  trustProxy?: boolean | number | string;
}

export function createApiApp(options: AppOptions = {}): express.Express {
  const app = express();
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';

  // 1. Express hardening & conservative proxy trust
  app.disable('x-powered-by');
  const trustProxySetting = resolveTrustProxy(options.trustProxy);
  app.set('trust proxy', trustProxySetting);

  // 2. Global security headers (Helmet CSP + Permissions-Policy)
  app.use(createHelmetMiddleware(isProduction));
  app.use(permissionsPolicyMiddleware);

  // 3. Strict CORS allowlist for API routes (before body parsing & rate limiting)
  app.use('/api', createCorsMiddleware(isProduction, options.allowedOrigins));

  // 4. Strict JSON payload limit (32 KB)
  app.use(express.json({ limit: '32kb' }));

  // 5. Rate limiting on API routes using Express's resolved trustworthy req.ip
  const { generalLimiter, aiLimiter } = createRateLimiters(trustProxySetting, {
    apiRateLimitMax: options.apiRateLimitMax,
    aiRateLimitMax: options.aiRateLimitMax,
  });
  app.use('/api', generalLimiter);

  // 6. API routes
  app.use('/api', createApiRouter(aiLimiter));

  // 7. Unknown API route 404 & centralized safe error handler
  app.use('/api', apiNotFoundHandler);
  app.use(apiErrorHandler);

  return app;
}
