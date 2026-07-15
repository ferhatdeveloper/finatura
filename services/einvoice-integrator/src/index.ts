import express from 'express';
import { assertConfig, config } from './config.js';
import { healthRouter } from './routes/health.js';
import { invoicesRouter } from './routes/invoices.js';

assertConfig();

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(healthRouter);
app.use('/api/invoices', invoicesRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[unhandled]', err);
    res.status(500).json({ error: 'internal_error' });
  },
);

const server = app.listen(config.port, () => {
  console.log(
    `[einvoice-integrator] dinleniyor :${config.port} ` +
      `(env=${config.nodeEnv}, provider=${config.provider}, stub=${config.stubMode})`,
  );
});

function shutdown(signal: string): void {
  console.log(`[einvoice-integrator] ${signal} alındı, kapatılıyor…`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
export {
  createIntegrator,
  createFetchHttpClient,
  getDefaultIntegrator,
} from './adapters/index.js';
export type { CreateIntegratorOptions, HttpClient } from './adapters/index.js';
export { invoiceDraftFromTransformer } from './flow/fromTransformerDraft.js';
export { runSendApprovePdfFlow } from './flow/sendApprovePdf.js';
