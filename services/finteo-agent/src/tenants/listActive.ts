import type { Pool } from 'pg';
import { getCentralPool } from '../db/centralPool.js';
import { config } from '../config.js';
import type { TenantConnectionInfo } from '../types.js';

interface TenantRow {
  id: string;
  slug: string;
  db_host: string;
  db_port: number | string;
  db_name: string;
  db_user: string;
  db_password: string;
  is_active: boolean;
}

function mapRow(row: TenantRow): TenantConnectionInfo {
  return {
    tenantId: String(row.id),
    slug: row.slug,
    host: row.db_host,
    port: typeof row.db_port === 'string' ? Number.parseInt(row.db_port, 10) : row.db_port,
    database: row.db_name,
    user: row.db_user,
    password: row.db_password,
    isActive: Boolean(row.is_active),
  };
}

/**
 * Central DB'den aktif tenant listesini döner.
 * Şema: public.tenants (central) — kolon adları tenant-router ile hizalı.
 */
export async function listActiveTenants(
  pool: Pool = getCentralPool(),
): Promise<TenantConnectionInfo[]> {
  const filter = config.tenantIdsFilter;

  let sql = `
    SELECT id, slug, db_host, db_port, db_name, db_user, db_password, is_active
    FROM tenants
    WHERE is_active = true
  `;
  const params: unknown[] = [];

  if (filter.length > 0) {
    params.push(filter);
    sql += ` AND id::text = ANY($1::text[])`;
  }

  sql += ` ORDER BY slug`;

  const { rows } = await pool.query<TenantRow>(sql, params);
  return rows.map(mapRow);
}
