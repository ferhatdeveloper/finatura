import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { documentsRouter } from './routes/documents.js';
import { healthRouter } from './routes/health.js';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(healthRouter);
  app.use('/api/v1/documents', documentsRouter);

  app.use(errorHandler);

  return app;
}
