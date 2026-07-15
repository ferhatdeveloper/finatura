import type { NextFunction, Request, Response } from 'express';

/**
 * İş uçları için X-Tenant-ID zorunlu.
 * Contör bakiyesi central DB'de tenant_id ile tutulur; tenant DB'ye bağlanılmaz.
 */
export function requireTenantHeader(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const raw = req.header('x-tenant-id')?.trim();
  if (!raw) {
    res.status(400).json({
      error: 'missing_tenant_id',
      message: 'X-Tenant-ID header zorunlu',
    });
    return;
  }
  req.tenantId = raw;
  next();
}
