import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: 'payload_too_large',
      message: 'Yüklenen dosya boyutu üst sınırı aşıldı',
    });
    return;
  }

  console.error('[document-agent]', err);
  res.status(500).json({ error: 'internal_error', message: 'Beklenmeyen sunucu hatası' });
}
