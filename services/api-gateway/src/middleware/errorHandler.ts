import type { NextFunction, Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'not_found',
    message: `Rota bulunamadı: ${req.method} ${req.path}`,
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[api-gateway]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Beklenmeyen sunucu hatası',
  });
}
