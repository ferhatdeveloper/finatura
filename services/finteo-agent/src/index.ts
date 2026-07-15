import { assertConfig, config } from './config.js';
import { closeCentralPool } from './db/centralPool.js';
import { closeAllTenantPools } from './db/tenantPool.js';
import { createFinteoClient } from './finteo/factory.js';
import { PollScheduler } from './worker/pollScheduler.js';
import { runSyncCycle } from './worker/syncJob.js';

assertConfig();

const once = process.argv.includes('--once');
const client = createFinteoClient();
let scheduler: PollScheduler | undefined;

console.log(
  `[finteo-agent] başlıyor mode=${client.mode} env=${config.nodeEnv} intervalMs=${config.pollIntervalMs}`,
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[finteo-agent] ${signal} alındı, kapatılıyor…`);
  scheduler?.stop();
  try {
    await closeAllTenantPools();
    await closeCentralPool();
    console.log('[finteo-agent] pool\'lar kapatıldı');
    process.exit(0);
  } catch (err) {
    console.error('[finteo-agent] kapatma hatası:', err);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  if (once) {
    const summary = await runSyncCycle(client);
    console.log(
      `[finteo-agent] --once bitti tenants=${summary.tenants.length} ` +
        `inserted=${summary.tenants.reduce((a, t) => a + t.inserted, 0)}`,
    );
    await closeAllTenantPools();
    await closeCentralPool();
    return;
  }

  scheduler = new PollScheduler(
    config.pollIntervalMs,
    async () => {
      await runSyncCycle(client);
    },
    'bank-poll-10m',
  );

  scheduler.start(config.pollRunOnStart);

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[finteo-agent] fatal:', err);
  process.exit(1);
});
