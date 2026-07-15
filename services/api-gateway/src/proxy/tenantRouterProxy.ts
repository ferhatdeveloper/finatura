import type { NextFunction, Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { config } from '../config.js';

/**
 * api-gateway → tenant-router proxy.
 *
 * GET  /v1/tenant/ping                              → /api/tenant/ping
 * GET  /v1/tenant/bank-transactions                 → /api/tenant/bank-transactions
 * GET  /v1/tenant/bank-transactions/:id/match-suggestions
 * POST /v1/tenant/settlements                       → /api/tenant/settlements
 * (X-Tenant-ID + Authorization iletilir)
 *
 * Genel path: /v1/tenant/* → /api/tenant/*
 */
export function createTenantRouterProxy(): Router {
  const router = createRouter();

  router.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await forwardToTenantRouter(req, res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

async function forwardToTenantRouter(
  req: Request,
  res: Response,
): Promise<void> {
  const base = config.tenantRouterUrl.replace(/\/$/, '');
  // Mount: /v1/tenant → req.path örn. /ping
  const suffix = req.path === '/' ? '' : req.path;
  const targetUrl = new URL(`${base}/api/tenant${suffix}`);

  if (req.url.includes('?')) {
    targetUrl.search = req.url.slice(req.url.indexOf('?') + 1);
  }

  const headers = new Headers();
  const tenantId = req.tenant?.tenantId ?? req.header(config.tenantHeader);
  if (tenantId) {
    headers.set('X-Tenant-ID', tenantId);
  }

  const auth = req.header('authorization');
  if (auth) headers.set('Authorization', auth);

  const contentType = req.header('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  headers.set('X-Forwarded-By', 'api-gateway');
  if (req.auth?.userId) {
    headers.set('X-User-ID', req.auth.userId);
  }

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  let body: string | undefined;
  if (hasBody && req.body !== undefined) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(config.tenantRouterTimeoutMs),
    });
  } catch (err) {
    console.error('[tenant-router-proxy]', err);
    res.status(502).json({
      error: 'tenant_router_unreachable',
      message: `tenant-router'a ulaşılamadı (${base})`,
    });
    return;
  }

  const text = await upstream.text();
  res.status(upstream.status);
  const ct = upstream.headers.get('content-type');
  if (ct) res.setHeader('Content-Type', ct);

  if (text.length === 0) {
    res.end();
    return;
  }

  try {
    res.json(JSON.parse(text) as unknown);
  } catch {
    res.send(text);
  }
}

/** Readiness için tenant-router /health ping */
export async function pingTenantRouter(): Promise<boolean> {
  const base = config.tenantRouterUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
