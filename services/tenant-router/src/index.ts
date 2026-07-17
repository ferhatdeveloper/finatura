import express from 'express';
import { assertConfig, config } from './config.js';
import { closeCentralPool } from './db/centralPool.js';
import { tenantContext } from './middleware/tenantContext.js';
import { bankTransactionsRouter } from './routes/bankTransactions.js';
import { healthRouter } from './routes/health.js';
import { invoicesRouter } from './routes/invoices.js';
import { manualVeresiyeRouter } from './routes/manualVeresiye.js';
import { ratesRouter } from './routes/rates.js';
import { reportsRouter } from './routes/reports.js';
import { settlementsRouter } from './routes/settlements.js';
import { tenantPoolCache } from './tenant/poolCache.js';
import './types.js';

assertConfig();

const app = express();
app.use(express.json());
app.use(healthRouter);

/**
 * Örnek korumalı uç — gerçek iş API'leri buraya veya ayrı servise taşınır.
 * Middleware tenant pool'u req.tenantPool olarak bağlar.
 */
app.get('/api/tenant/ping', tenantContext, async (req, res) => {
  try {
    const result = await req.tenantPool!.query(
      'SELECT 1 AS ok, current_database() AS db',
    );
    res.json({
      tenantId: req.tenant!.tenantId,
      slug: req.tenant!.slug,
      database: result.rows[0]?.db,
      ok: result.rows[0]?.ok === 1,
    });
  } catch (err) {
    console.error('[tenant-ping]', err);
    res.status(503).json({
      error: 'tenant_db_unreachable',
      message: 'Tenant veritabanına bağlanılamadı',
    });
  }
});

/** Banka hareketleri + matching önerileri + mahsup (gateway /v1/tenant/*). */
app.use('/api/tenant', bankTransactionsRouter);
app.use('/api/tenant', invoicesRouter);
app.use('/api/tenant', reportsRouter);
app.use('/api/tenant', ratesRouter);
app.use('/api/tenant', settlementsRouter);
app.use('/api/tenant', manualVeresiyeRouter);

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
    `[tenant-router] dinleniyor :${config.port} (env=${config.nodeEnv}, lookup=${config.tenantLookupBy})`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[tenant-router] ${signal} alındı, kapatılıyor…`);
  server.close(async () => {
    try {
      await tenantPoolCache.closeAll();
      await closeCentralPool();
      console.log("[tenant-router] pool'lar kapatıldı");
      process.exit(0);
    } catch (err) {
      console.error('[tenant-router] kapatma hatası:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export { app };
