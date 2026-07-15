import { Pool } from 'pg';
import { config } from '../config.js';
import type { TenantConnectionInfo } from '../types.js';

interface CacheEntry {
  pool: Pool;
  fingerprint: string;
  createdAt: number;
  lastUsedAt: number;
}

/** Tenant bağlantı parametrelerinin değişip değişmediğini anlamak için */
function fingerprint(info: TenantConnectionInfo): string {
  return [
    info.host,
    info.port,
    info.database,
    info.user,
    info.password,
    info.sslMode,
  ].join('|');
}

/** pg ssl seçeneği — central.tenant_databases.ssl_mode */
function mapSslMode(
  sslMode: string,
): boolean | { rejectUnauthorized: boolean } | undefined {
  switch (sslMode) {
    case 'disable':
      return false;
    case 'require':
    case 'verify-ca':
    case 'verify-full':
      // TODO(prod): CA cert / rejectUnauthorized=true verify-* için
      return { rejectUnauthorized: false };
    case 'allow':
    case 'prefer':
    default:
      return undefined;
  }
}

/**
 * Tenant başına pg.Pool cache'i.
 * TTL + max entry (basit LRU: en eski lastUsedAt düşürülür).
 */
export class TenantPoolCache {
  private readonly entries = new Map<string, CacheEntry>();

  async getPool(info: TenantConnectionInfo): Promise<Pool> {
    const key = info.tenantId;
    const now = Date.now();
    const fp = fingerprint(info);
    const existing = this.entries.get(key);

    if (existing) {
      const expired = now - existing.createdAt > config.pool.cacheTtlMs;
      const stale = existing.fingerprint !== fp;

      if (!expired && !stale) {
        existing.lastUsedAt = now;
        // Map sırasını güncelle (LRU benzeri)
        this.entries.delete(key);
        this.entries.set(key, existing);
        return existing.pool;
      }

      await this.disposeEntry(key, existing);
    }

    await this.evictIfNeeded();

    const pool = new Pool({
      host: info.host,
      port: info.port,
      database: info.database,
      user: info.user,
      password: info.password,
      ssl: mapSslMode(info.sslMode),
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMs,
    });

    pool.on('error', (err) => {
      console.error(`[tenant-pool:${key}] beklenmeyen hata:`, err.message);
    });

    this.entries.set(key, {
      pool,
      fingerprint: fp,
      createdAt: now,
      lastUsedAt: now,
    });

    return pool;
  }

  /** Belirli tenant pool'unu kapat ve cache'ten çıkar */
  async invalidate(tenantId: string): Promise<void> {
    const entry = this.entries.get(tenantId);
    if (entry) {
      await this.disposeEntry(tenantId, entry);
    }
  }

  async closeAll(): Promise<void> {
    const closing = [...this.entries.entries()].map(([key, entry]) =>
      this.disposeEntry(key, entry),
    );
    await Promise.all(closing);
  }

  size(): number {
    return this.entries.size;
  }

  private async disposeEntry(key: string, entry: CacheEntry): Promise<void> {
    this.entries.delete(key);
    try {
      await entry.pool.end();
    } catch (err) {
      console.error(`[tenant-pool:${key}] kapatma hatası:`, err);
    }
  }

  private async evictIfNeeded(): Promise<void> {
    while (this.entries.size >= config.pool.cacheMaxEntries) {
      // Map insertion order: en az yakın kullanılan başta tutulmaya çalışılır
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const entry = this.entries.get(oldestKey);
      if (!entry) break;
      await this.disposeEntry(oldestKey, entry);
    }
  }
}

/** Uygulama genelinde paylaşılan cache örneği */
export const tenantPoolCache = new TenantPoolCache();
