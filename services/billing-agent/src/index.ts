import express from 'express';
import { assertConfig, config } from './config.js';
import { closeCentralPool } from './db/centralPool.js';
import { einvoiceRouter } from './routes/einvoice.js';
import { healthRouter } from './routes/health.js';
import { kontorRouter } from './routes/kontor.js';
import { paymentRouter } from './routes/payment.js';
import './types.js';

assertConfig();

const app = express();
app.use(express.json());
app.use(healthRouter);

/** Kontör API (Aşama 6.1) */
app.use('/api/kontor', kontorRouter);

/** Ödeme geçidi — paket + checkout + webhook (Aşama 6.2 + bayilik) */
app.use('/api/payment', paymentRouter);

/** Tenant e-fatura entegratör yapılandırması (bayilik iskeleti) */
app.use('/api/einvoice', einvoiceRouter);

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
    `[billing-agent] dinleniyor :${config.port} (env=${config.nodeEnv}, modul=kontor+payment+einvoice, provider=${config.payment.provider})`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[billing-agent] ${signal} alındı, kapatılıyor…`);
  server.close(async () => {
    try {
      await closeCentralPool();
      console.log('[billing-agent] central pool kapatıldı');
      process.exit(0);
    } catch (err) {
      console.error('[billing-agent] kapatma hatası:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export { app };
export { deductForEfaturaSend, deductForOcr } from './kontor/deduct.js';
export { kontorLedger } from './kontor/ledger.js';
export {
  getPrimaryEinvoiceProvider,
  listTenantEinvoiceProviders,
  upsertTenantEinvoiceProvider,
} from './einvoice/providerConfig.js';
export {
  creditReferenceTypeForKind,
  getPaymentAdapter,
  listActivePackages,
  processPaymentWebhook,
  startCheckout,
} from './payment/index.js';
