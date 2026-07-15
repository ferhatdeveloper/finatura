import express from 'express';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimitPlaceholder } from './middleware/rateLimit.js';
import { tenantContext } from './middleware/tenantContext.js';
import { createTenantRouterProxy } from './proxy/tenantRouterProxy.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { openApiRouter } from './routes/openapi.js';
import './types.js';

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Public (rate-limit dışı)
  app.use(healthRouter);
  app.use(openApiRouter);

  // Placeholder rate limit — auth ve korumalı uçlar
  app.use(rateLimitPlaceholder);
  app.use(authRouter);

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
