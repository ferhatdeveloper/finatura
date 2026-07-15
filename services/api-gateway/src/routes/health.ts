import { Router } from 'express';
import { config } from '../config.js';
import { pingTenantRouter } from '../proxy/tenantRouterProxy.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    env: config.nodeEnv,
    authProvider: config.authProvider,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', async (_req, res) => {
  const tenantRouterOk = await pingTenantRouter();

  const checks = {
    config: true,
    authProvider: config.authProvider,
    rateLimit: config.rateLimit.enabled,
    tenantRouter: tenantRouterOk,
  };

  // tenant-router yokken de geliştirme yapılabilsin; ready yine 200 ama uyarı
  const status = tenantRouterOk ? 'ready' : 'degraded';

  res.status(200).json({
    status,
    checks,
    tenantRouterUrl: config.tenantRouterUrl,
  });
});
