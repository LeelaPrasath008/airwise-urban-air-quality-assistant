import type { NextFunction, Request, Response } from 'express';

/**
 * 404 handler for unknown API routes.
 */
export function apiNotFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'API endpoint not found.' });
}

/**
 * Centralized error handler — never leaks stack traces or secrets to clients.
 */
export function apiErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
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
}
