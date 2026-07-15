import { Pool } from 'pg';
import { config } from '../config.js';

let centralPool: Pool | null = null;

/** Central DB — kontör bakiyesi ve ledger burada yaşar */
export function getCentralPool(): Pool {
  if (!centralPool) {
    if (!config.centralDatabaseUrl) {
      throw new Error('CENTRAL_DATABASE_URL tanımlı değil');
    }
    centralPool = new Pool({
      connectionString: config.centralDatabaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
    centralPool.on('error', (err) => {
      console.error('[central-pool] beklenmeyen hata:', err.message);
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
