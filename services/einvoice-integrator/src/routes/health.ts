import { Router } from 'express';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'einvoice-integrator',
    provider: config.provider,
    stubMode: config.stubMode,
  });
});

healthRouter.get('/ready', (_req, res) => {
  res.json({
    ready: true,
    service: 'einvoice-integrator',
  });
});
