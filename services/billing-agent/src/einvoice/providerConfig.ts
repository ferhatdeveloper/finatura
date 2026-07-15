/**
 * Tenant e-fatura entegratör yapılandırması (bayilik).
 *
 * SQL: database/central/03_einvoice_reseller.sql (+ 04_einvoice_providers_expand.sql)
 *   public.einvoice_provider_code ENUM
 *     ('edm', 'uyumsoft', 'fit', 'elogo', 'qnb', 'nes', 'nilvera', 'izibiz')
 *   public.tenant_einvoice_providers (...)
 *   public.v_tenant_einvoice_primary
 *
 * Bu modül şu an bellek içi iskelettir; üretimde central DB'ye bağlanır.
 */

import type { EinvoiceProviderCode } from '../types.js';

export type { EinvoiceProviderCode };

export type EinvoiceEnvironment = 'test' | 'production';

/** API yanıtı — credentials asla düz metin dönmez */
export interface TenantEinvoiceProviderConfig {
  id: string;
  tenantId: string;
  provider: EinvoiceProviderCode;
  isPrimary: boolean;
  isActive: boolean;
  merchantCode: string | null;
  branchCode: string | null;
  /** true ise credentials_ciphertext central DB'de mevcut */
  hasCredentials: boolean;
  environment: EinvoiceEnvironment;
  metadata: Record<string, unknown>;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTenantEinvoiceProviderInput {
  tenantId: string;
  provider: EinvoiceProviderCode;
  isPrimary?: boolean;
  isActive?: boolean;
  merchantCode?: string | null;
  branchCode?: string | null;
  environment?: EinvoiceEnvironment;
  metadata?: Record<string, unknown>;
  /**
   * Ham credential (yalnızca yazma). Üretimde KMS ile şifrelenip
   * credentials_ciphertext olarak saklanır; burada stub.
   */
  credentialsPlaintext?: string | null;
}

export class EinvoiceConfigValidationError extends Error {
  readonly code = 'einvoice_config_validation' as const;

  constructor(message: string) {
    super(message);
    this.name = 'EinvoiceConfigValidationError';
  }
}

const PROVIDERS = new Set<EinvoiceProviderCode>([
  'edm',
  'uyumsoft',
  'fit',
  'elogo',
  'qnb',
  'nes',
  'nilvera',
  'izibiz',
]);

const PROVIDER_LIST = [...PROVIDERS].join(' | ');

export function assertEinvoiceProvider(
  value: string,
): asserts value is EinvoiceProviderCode {
  if (!PROVIDERS.has(value as EinvoiceProviderCode)) {
    throw new EinvoiceConfigValidationError(
      `provider ${PROVIDER_LIST} olmalı (gelen: ${value})`,
    );
  }
}

/** Bellek içi store — DB bağlanana kadar geliştirme / typecheck iskeleti */
const store = new Map<string, TenantEinvoiceProviderConfig[]>();

function nowIso(): string {
  return new Date().toISOString();
}

function listForTenant(tenantId: string): TenantEinvoiceProviderConfig[] {
  return store.get(tenantId) ?? [];
}

/**
 * Tenant'ın tüm entegratör yapılandırmaları (soft-delete hariç stub).
 */
export async function listTenantEinvoiceProviders(
  tenantId: string,
): Promise<TenantEinvoiceProviderConfig[]> {
  if (!tenantId?.trim()) {
    throw new EinvoiceConfigValidationError('tenantId zorunlu');
  }
  return listForTenant(tenantId).filter((c) => c.isActive);
}

/**
 * Birincil aktif entegratör (gönderimde kullanılacak).
 * SQL karşılığı: v_tenant_einvoice_primary
 */
export async function getPrimaryEinvoiceProvider(
  tenantId: string,
): Promise<TenantEinvoiceProviderConfig | null> {
  const rows = await listTenantEinvoiceProviders(tenantId);
  return rows.find((r) => r.isPrimary && r.isActive) ?? null;
}

/**
 * Upsert: aynı tenant+provider aktif satırı günceller veya ekler.
 * isPrimary=true ise diğerlerinin primary bayrağı düşürülür.
 */
export async function upsertTenantEinvoiceProvider(
  input: UpsertTenantEinvoiceProviderInput,
): Promise<TenantEinvoiceProviderConfig> {
  const { tenantId, provider } = input;
  if (!tenantId?.trim()) {
    throw new EinvoiceConfigValidationError('tenantId zorunlu');
  }
  assertEinvoiceProvider(provider);

  const environment: EinvoiceEnvironment = input.environment ?? 'test';
  if (environment !== 'test' && environment !== 'production') {
    throw new EinvoiceConfigValidationError(
      'environment test | production olmalı',
    );
  }

  const existing = listForTenant(tenantId);
  const idx = existing.findIndex((r) => r.provider === provider);
  const ts = nowIso();
  const makePrimary = input.isPrimary ?? (idx < 0 && existing.length === 0);

  let row: TenantEinvoiceProviderConfig;
  if (idx >= 0) {
    const prev = existing[idx]!;
    row = {
      ...prev,
      isPrimary: makePrimary ? true : (input.isPrimary ?? prev.isPrimary),
      isActive: input.isActive ?? prev.isActive,
      merchantCode:
        input.merchantCode !== undefined
          ? input.merchantCode
          : prev.merchantCode,
      branchCode:
        input.branchCode !== undefined ? input.branchCode : prev.branchCode,
      hasCredentials:
        input.credentialsPlaintext != null &&
        input.credentialsPlaintext.length > 0
          ? true
          : prev.hasCredentials,
      environment,
      metadata: input.metadata ?? prev.metadata,
      activatedAt:
        (input.isActive ?? prev.isActive) && !prev.activatedAt
          ? ts
          : prev.activatedAt,
      updatedAt: ts,
    };
    existing[idx] = row;
  } else {
    row = {
      id: cryptoRandomId(),
      tenantId,
      provider,
      isPrimary: makePrimary,
      isActive: input.isActive ?? true,
      merchantCode: input.merchantCode ?? null,
      branchCode: input.branchCode ?? null,
      hasCredentials: Boolean(input.credentialsPlaintext?.length),
      environment,
      metadata: input.metadata ?? {},
      activatedAt: (input.isActive ?? true) ? ts : null,
      createdAt: ts,
      updatedAt: ts,
    };
    existing.push(row);
  }

  if (row.isPrimary) {
    for (let i = 0; i < existing.length; i++) {
      if (existing[i]!.id !== row.id && existing[i]!.isPrimary) {
        existing[i] = {
          ...existing[i]!,
          isPrimary: false,
          updatedAt: ts,
        };
      }
    }
  }

  store.set(tenantId, existing);
  return row;
}

/** Birincil sağlayıcıyı değiştir (mevcut kaydı primary yap) */
export async function setPrimaryEinvoiceProvider(
  tenantId: string,
  provider: EinvoiceProviderCode,
): Promise<TenantEinvoiceProviderConfig> {
  assertEinvoiceProvider(provider);
  const rows = listForTenant(tenantId);
  const found = rows.find((r) => r.provider === provider && r.isActive);
  if (!found) {
    throw new EinvoiceConfigValidationError(
      `Aktif ${provider} yapılandırması yok; önce upsert edin`,
    );
  }
  return upsertTenantEinvoiceProvider({
    tenantId,
    provider,
    isPrimary: true,
  });
}

function cryptoRandomId(): string {
  // Node 20+ global crypto
  return globalThis.crypto.randomUUID();
}

/** Test yardımcısı */
export function _resetEinvoiceConfigStoreForTests(): void {
  store.clear();
}
