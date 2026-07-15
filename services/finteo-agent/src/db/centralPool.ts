import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getCentralPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.centralDatabaseUrl,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMs,
    });
  }
  return pool;
}

export async function closeCentralPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
