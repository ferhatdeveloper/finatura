import { Pool } from 'pg';
import { config } from '../config.js';

let centralPool: Pool | null = null;

/** Auth / membership için central DB pool (opsiyonel — AUTH_PROVIDER=central) */
export function getCentralPool(): Pool {
  if (!centralPool) {
    if (!config.centralDatabaseUrl) {
      throw new Error(
        'CENTRAL_DATABASE_URL tanımlı değil (AUTH_PROVIDER=central için zorunlu)',
      );
    }
    centralPool = new Pool({
      connectionString: config.centralDatabaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    centralPool.on('error', (err) => {
      console.error('[api-gateway:central-pool]', err.message);
    });
  }
  return centralPool;
}

export async function closeCentralPool(): Promise<void> {
  if (centralPool) {
    await centralPool.end();
    centralPool = null;
  }
}

export async function pingCentral(): Promise<boolean> {
  const pool = getCentralPool();
  const result = await pool.query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}
