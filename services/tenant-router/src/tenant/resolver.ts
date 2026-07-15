import type { Pool } from 'pg';
import { getPasswordDecryptor } from '../crypto/passwordDecrypt.js';
import { getCentralPool } from '../db/centralPool.js';
import { config } from '../config.js';
import type { TenantConnectionInfo } from '../types.js';

export class TenantNotFoundError extends Error {
  constructor(tenantKey: string) {
    super(`Tenant bulunamadı: ${tenantKey}`);
    this.name = 'TenantNotFoundError';
  }
}

export class TenantInactiveError extends Error {
  constructor(tenantKey: string) {
    super(`Tenant pasif: ${tenantKey}`);
    this.name = 'TenantInactiveError';
  }
}

interface TenantDbRow {
  id: string;
  slug: string;
  status: string;
  db_host: string;
  db_port: number | string;
  db_name: string;
  db_user: string;
  password_ciphertext: string;
  encryption_key_id: string;
  ssl_mode: string;
}

/**
 * Central şema (database/central/01_schema.sql):
 *   tenants + tenant_databases (password_ciphertext, encryption_key_id)
 *
 * Eski düz `tenants.db_password` kolonları kullanılmaz.
 */
export async function resolveTenant(
  tenantKey: string,
  pool: Pool = getCentralPool(),
): Promise<TenantConnectionInfo> {
  const column = config.tenantLookupBy === 'slug' ? 't.slug' : 't.id';

  const { rows } = await pool.query<TenantDbRow>(
    `SELECT
       t.id,
       t.slug,
       t.status::text AS status,
       td.db_host,
       td.db_port,
       td.db_name,
       td.db_user,
       td.password_ciphertext,
       td.encryption_key_id,
       td.ssl_mode
     FROM public.tenants t
     INNER JOIN public.tenant_databases td
       ON td.tenant_id = t.id
      AND td.is_primary = true
      AND td.deleted_at IS NULL
     WHERE t.deleted_at IS NULL
       AND ${column} = $1
     LIMIT 1`,
    [tenantKey],
  );

  if (rows.length === 0) {
    throw new TenantNotFoundError(tenantKey);
  }

  const row = rows[0]!;
  const isActive = row.status === 'active';

  if (!isActive) {
    throw new TenantInactiveError(tenantKey);
  }

  const password = await getPasswordDecryptor().decrypt(
    row.password_ciphertext,
    row.encryption_key_id,
  );

  return {
    tenantId: String(row.id),
    slug: row.slug,
    host: row.db_host,
    port:
      typeof row.db_port === 'string'
        ? Number.parseInt(row.db_port, 10)
        : row.db_port,
    database: row.db_name,
    user: row.db_user,
    password,
    sslMode: row.ssl_mode,
    encryptionKeyId: row.encryption_key_id,
    isActive: true,
  };
}
