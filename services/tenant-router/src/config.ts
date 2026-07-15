import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Eksik ortam değişkeni: ${name}`);
  }
  return value;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`${name} geçerli bir sayı olmalı, gelen: ${raw}`);
  }
  return n;
}

export type TenantLookupBy = 'id' | 'slug';

export const config = {
  port: intEnv('PORT', 3100),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  centralDatabaseUrl: process.env.CENTRAL_DATABASE_URL ?? '',
  tenantLookupBy: (process.env.TENANT_LOOKUP_BY ?? 'id') as TenantLookupBy,
  pool: {
    max: intEnv('POOL_MAX', 10),
    idleTimeoutMs: intEnv('POOL_IDLE_TIMEOUT_MS', 30_000),
    cacheTtlMs: intEnv('POOL_CACHE_TTL_MS', 300_000),
    cacheMaxEntries: intEnv('POOL_CACHE_MAX_ENTRIES', 100),
  },
} as const;

export function assertConfig(): void {
  required('CENTRAL_DATABASE_URL');
  if (config.tenantLookupBy !== 'id' && config.tenantLookupBy !== 'slug') {
    throw new Error('TENANT_LOOKUP_BY yalnızca "id" veya "slug" olabilir');
  }
}
