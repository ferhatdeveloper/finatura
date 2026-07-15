import { createApp } from './api/app.js';
import { assertConfig, config } from './config.js';

assertConfig();

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(
    `[document-agent] dinleniyor :${config.port} (env=${config.nodeEnv})`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[document-agent] ${signal} alındı, kapatılıyor…`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export { app };
