import { Router, type Request, type RequestHandler, type Response } from 'express';
import { createAirQualityRouter } from './airQualityRoutes.ts';
import { createAiRouter } from './aiRoutes.ts';

export function createApiRouter(aiLimiter: RequestHandler): Router {
  const router = Router();

  // Health endpoint (exposes zero secrets or environment details)
  router.get('/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      service: 'airwise-api',
      timestamp: new Date().toISOString(),
    });
  });

  router.use(createAirQualityRouter());
  router.use(createAiRouter(aiLimiter));

  return router;
}
