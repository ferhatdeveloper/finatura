import type { NextFunction, Request, Response } from 'express';

/** Platform superadmin — sistem ayarları / OpenRouter. */
export function requirePlatformAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Oturum gerekli',
    });
    return;
  }
  if (!req.auth.isPlatformAdmin) {
    res.status(403).json({
      error: 'forbidden',
      message: 'Yalnızca platform superadmin',
    });
    return;
  }
  next();
}
