/** Central DB tenants satırından türetilen bağlantı bilgisi. */
export interface TenantConnectionInfo {
  tenantId: string;
  slug: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  isActive: boolean;
  /** İleride tenant bazlı Finteo credential / hesap eşlemesi için. */
  finteoAccountRefs?: string[];
}

export type BankTxDirection = 'inbound' | 'outbound';

/**
 * Finteo API'den (veya mock'tan) gelen normalize hareket.
 * Tenant şeması: public.bank_transactions
 */
export interface FinteoTransaction {
  providerTxId: string;
  providerAccountRef: string;
  direction: BankTxDirection;
  amount: number;
  currencyCode: string;
  transactionAt: Date;
  valueDate?: string | null;
  counterpartyName?: string | null;
  counterpartyIban?: string | null;
  description?: string | null;
  rawPayload: Record<string, unknown>;
}

export interface FinteoFetchParams {
  tenantId: string;
  accountRefs?: string[];
  /** ISO başlangıç; yoksa client varsayılan pencere kullanır. */
  since?: Date;
}

export interface SyncTenantResult {
  tenantId: string;
  slug: string;
  fetched: number;
  inserted: number;
  skipped: number;
  /** Matching bridge — unmatched hareket skorlama */
  matchScanned: number;
  matchScored: number;
  matchWithSuggestions: number;
  errors: string[];
}
