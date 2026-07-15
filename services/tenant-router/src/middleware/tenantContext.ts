import type { NextFunction, Request, Response } from 'express';
import {
  resolveTenant,
  TenantInactiveError,
  TenantNotFoundError,
} from '../tenant/resolver.js';
import { tenantPoolCache } from '../tenant/poolCache.js';

export const TENANT_HEADER = 'x-tenant-id';

/**
 * X-Tenant-ID → central resolve → tenant pool cache → req.tenant / req.tenantPool
 */
export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.header(TENANT_HEADER);

  if (!raw || !raw.trim()) {
    res.status(400).json({
      error: 'missing_tenant_header',
      message: `İstek başlığında ${TENANT_HEADER} zorunludur`,
    });
    return;
  }

  const tenantKey = raw.trim();
  req.tenantId = tenantKey;

  try {
    const info = await resolveTenant(tenantKey);
    const pool = await tenantPoolCache.getPool(info);

    req.tenant = info;
    req.tenantPool = pool;
    next();
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      res.status(404).json({
        error: 'tenant_not_found',
        message: err.message,
      });
      return;
    }
    if (err instanceof TenantInactiveError) {
      res.status(403).json({
        error: 'tenant_inactive',
        message: err.message,
      });
      return;
    }

    console.error('[tenant-context]', err);
    res.status(503).json({
      error: 'tenant_resolution_failed',
      message: 'Tenant bağlantısı çözülemedi',
    });
  }
}
