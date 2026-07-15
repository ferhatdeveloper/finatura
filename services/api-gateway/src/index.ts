import { createApp } from './app.js';
import { assertConfig, config } from './config.js';
import { closeCentralPool } from './db/centralPool.js';
import { clearRateLimitBuckets } from './middleware/rateLimit.js';

assertConfig();

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(
    `[api-gateway] dinleniyor :${config.port} (env=${config.nodeEnv}, auth=${config.authProvider})`,
  );
  console.log(
    `[api-gateway] health=/health login=POST /auth/login tenant-proxy=/v1/tenant/* → ${config.tenantRouterUrl}`,
  );
});

function shutdown(signal: string): void {
  console.log(`[api-gateway] ${signal} alındı, kapatılıyor…`);
  server.close(() => {
    clearRateLimitBuckets();
    void closeCentralPool()
      .catch((err) => console.error('[api-gateway] central pool kapatma:', err))
      .finally(() => {
        console.log('[api-gateway] kapatıldı');
        process.exit(0);
      });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
