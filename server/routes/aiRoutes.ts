import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import {
  ChatRequestSchema,
  RoutineRequestSchema,
} from '../../src/shared/validation.ts';
import {
  generateAssistantReply,
  generatePersonalizedRoutine,
} from '../services/aiService.ts';

export function createAiRouter(aiLimiter: RequestHandler): Router {
  const router = Router();

  // Personalized Daily Routine Generator endpoint
  router.post('/routine', aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
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
  router.post('/ai/chat', aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
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

  return router;
}
