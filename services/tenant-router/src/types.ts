import type { Pool } from 'pg';

/** Central DB'den çözülen tenant bağlantı bilgisi (düz metin parola yalnızca bellek içi) */
export interface TenantConnectionInfo {
  tenantId: string;
  slug: string;
  host: string;
  port: number;
  database: string;
  user: string;
  /** Decrypt edilmiş parola — loglanmamalı */
  password: string;
  sslMode: string;
  encryptionKeyId: string;
  isActive: boolean;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  pool: Pool;
}

declare global {
  namespace Express {
    interface Request {
      /** X-Tenant-ID ham değeri */
      tenantId?: string;
      /** Central'den çözülen tenant meta */
      tenant?: TenantConnectionInfo;
      /** Tenant izole PostgreSQL pool'u */
      tenantPool?: Pool;
    }
  }
}

export {};
