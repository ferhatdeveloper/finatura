import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import type { TenantContext } from '../types.js';

/**
 * Tenant bağlamı (gateway).
 * - JWT içindeki tenantId / tenantSlug
 * - Opsiyonel X-Tenant-ID (veya TENANT_HEADER) ile çapraz doğrulama
 *
 * Not: Tenant DB bağlantı çözümü services/tenant-router sorumluluğundadır.
 * Bu katman yalnızca kimlik + yönlendirme bağlamını taşır.
 */
export function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const headerRaw = req.header(config.tenantHeader)?.trim();
  const jwtTenantId = req.auth?.tenantId;
  const jwtTenantSlug = req.auth?.tenantSlug;

  if (config.requireTenantHeader && !headerRaw) {
    res.status(400).json({
      error: 'missing_tenant_header',
      message: `İstek başlığında ${config.tenantHeader} zorunludur`,
    });
    return;
  }

  if (!jwtTenantId && !headerRaw) {
    res.status(400).json({
      error: 'missing_tenant_context',
      message: 'Tenant bağlamı JWT veya X-Tenant-ID ile gelmelidir',
    });
    return;
  }

  if (jwtTenantId && headerRaw && headerRaw !== jwtTenantId && headerRaw !== jwtTenantSlug) {
    res.status(403).json({
      error: 'tenant_mismatch',
      message: 'X-Tenant-ID, JWT tenant kimliği ile uyuşmuyor',
    });
    return;
  }

  let source: TenantContext['source'] = 'jwt';
  if (jwtTenantId && headerRaw) source = 'jwt+header';
  else if (headerRaw && !jwtTenantId) source = 'header';

  const tenantId = jwtTenantId ?? headerRaw!;
  req.tenant = {
    tenantId,
    tenantSlug: jwtTenantSlug,
    source,
  };

  // Downstream servislere (ör. tenant-router) iletmek için normalize header
  req.headers[config.tenantHeader] = tenantId;

  next();
}
