import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';

/**
 * Authorization: Bearer <jwt> doğrulama stub'ı.
 * Başarılıysa req.auth doldurulur.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization: Bearer <token> gerekli',
    });
    return;
  }

  const token = header.slice('bearer '.length).trim();
  if (!token) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Boş bearer token',
    });
    return;
  }

  try {
    const claims = verifyAccessToken(token);
    req.auth = {
      userId: claims.sub,
      email: claims.email,
      tenantId: claims.tenantId,
      tenantSlug: claims.tenantSlug,
      role: claims.role ?? 'member',
    };
    next();
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : 'invalid_token';
    const expired = code === 'token_expired';
    res.status(401).json({
      error: expired ? 'token_expired' : 'invalid_token',
      message: expired
        ? 'JWT süresi dolmuş — /auth/refresh ile yenileyin'
        : 'JWT geçersiz — yeniden giriş yapın',
    });
  }
}
