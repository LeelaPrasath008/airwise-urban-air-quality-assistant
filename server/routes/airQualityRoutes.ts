import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  AirQualityQuerySchema,
  LocationQuerySchema,
} from '../../src/shared/validation.ts';
import {
  getAirQualitySnapshot,
  PRESET_LOCATIONS,
  searchLocations,
} from '../services/airQualityService.ts';

export function createAirQualityRouter(): Router {
  const router = Router();

  // Preset cities endpoint
  router.get('/locations/presets', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ locations: PRESET_LOCATIONS });
  });

  // Location search endpoint
  router.get('/locations/search', async (req: Request, res: Response, next: NextFunction) => {
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
  router.get('/air-quality', async (req: Request, res: Response, next: NextFunction) => {
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

  return router;
}
