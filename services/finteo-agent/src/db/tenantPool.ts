import pg from 'pg';
import { config } from '../config.js';
import type { TenantConnectionInfo } from '../types.js';

const { Pool } = pg;

const pools = new Map<string, pg.Pool>();

export function getTenantPool(info: TenantConnectionInfo): pg.Pool {
  const existing = pools.get(info.tenantId);
  if (existing) return existing;

  const pool = new Pool({
    host: info.host,
    port: info.port,
    database: info.database,
    user: info.user,
    password: info.password,
    max: config.pool.max,
    idleTimeoutMillis: config.pool.idleTimeoutMs,
  });

  pools.set(info.tenantId, pool);
  return pool;
}

export async function closeAllTenantPools(): Promise<void> {
  const pending = [...pools.values()].map((p) => p.end());
  pools.clear();
  await Promise.all(pending);
}
