import express from 'express';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimitPlaceholder } from './middleware/rateLimit.js';
import { tenantContext } from './middleware/tenantContext.js';
import { createTenantRouterProxy } from './proxy/tenantRouterProxy.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { membershipsRouter } from './routes/memberships.js';
import { openApiRouter } from './routes/openapi.js';
import './types.js';

function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? '';
  if (!raw.trim()) {
    return [
      'https://finatura.app',
      'https://www.finatura.app',
      'https://app.finatura.app',
      'https://login.finatura.app',
      'https://mm.finatura.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'http://localhost:8081',
    ];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Browser istemcileri (Flutter web / mm portal / marketing)
  const allowed = new Set(corsOrigins());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, X-Tenant-ID',
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Public (rate-limit dışı)
  app.use(healthRouter);
  app.use(openApiRouter);

  // Placeholder rate limit — auth ve korumalı uçlar
  app.use(rateLimitPlaceholder);
  app.use(authRouter);

  /** Üyelik / mali müşavir davet & bağlama */
  app.use(membershipsRouter);

  /**
   * Korumalı örnek uç — auth + tenant context.
   */
  app.get('/v1/ping', requireAuth, tenantContext, (req, res) => {
    res.json({
      ok: true,
      service: 'api-gateway',
      userId: req.auth!.userId,
      tenant: req.tenant,
      message:
        'Auth + tenant context hazır. Tenant DB: GET /v1/tenant/ping → tenant-router',
    });
  });

  /**
   * tenant-router proxy — X-Tenant-ID ile izole DB ping / iş uçları.
   * /v1/tenant/* → TENANT_ROUTER_URL/api/tenant/*
   */
  app.use(
    '/v1/tenant',
    requireAuth,
    tenantContext,
    createTenantRouterProxy(),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

