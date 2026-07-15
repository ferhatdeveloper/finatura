import { Router } from 'express';
import { config } from '../../config.js';
import { listRegisteredParsers } from '../../orchestrator/parserRegistry.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    service: 'document-agent',
    status: 'ok',
    ocrProvider: config.ocrProvider,
    parsers: listRegisteredParsers(),
  });
});
