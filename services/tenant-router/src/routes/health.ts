import { Router } from 'express';
import { pingCentral } from '../db/centralPool.js';
import { tenantPoolCache } from '../tenant/poolCache.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'tenant-router',
    cachedPools: tenantPoolCache.size(),
  });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    const ok = await pingCentral();
    if (!ok) {
      res.status(503).json({ status: 'not_ready', reason: 'central_db_ping_failed' });
      return;
    }
    res.json({ status: 'ready', centralDb: true });
  } catch (err) {
    console.error('[ready]', err);
    res.status(503).json({
      status: 'not_ready',
      reason: 'central_db_unreachable',
    });
  }
});
