import { Router } from 'express';
import { config } from '../config.js';
import { pingCentral } from '../db/centralPool.js';
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

  let centralDbOk: boolean | 'n/a' = 'n/a';
  if (config.authProvider === 'central') {
    try {
      centralDbOk = await pingCentral();
    } catch {
      centralDbOk = false;
    }
  }

  const checks = {
    config: true,
    authProvider: config.authProvider,
    rateLimit: config.rateLimit.enabled,
    centralDb: centralDbOk,
    tenantRouter: tenantRouterOk,
  };

  // central auth iken DB zorunlu; tenant-router yoksa degraded
  const centralFail = config.authProvider === 'central' && centralDbOk !== true;
  const status = centralFail ? 'not_ready' : tenantRouterOk ? 'ready' : 'degraded';

  res.status(centralFail ? 503 : 200).json({
    status,
    checks,
    tenantRouterUrl: config.tenantRouterUrl,
  });
});
