import type { FinteoClient } from '../finteo/client.js';
import { getTenantPool } from '../db/tenantPool.js';
import { runMatchingForTenant } from '../matching/bridge.js';
import { upsertBankTransactions } from '../repository/bankTransactions.js';
import { listActiveTenants } from '../tenants/listActive.js';
import type { SyncTenantResult, TenantConnectionInfo } from '../types.js';

export interface SyncRunSummary {
  startedAt: Date;
  finishedAt: Date;
  tenants: SyncTenantResult[];
}

async function syncTenant(
  client: FinteoClient,
  tenant: TenantConnectionInfo,
): Promise<SyncTenantResult> {
  const result: SyncTenantResult = {
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    matchScanned: 0,
    matchScored: 0,
    matchWithSuggestions: 0,
    errors: [],
  };

  try {
    const transactions = await client.fetchTransactions({
      tenantId: tenant.tenantId,
      accountRefs: tenant.finteoAccountRefs,
    });
    result.fetched = transactions.length;

    const pool = getTenantPool(tenant);
    const persist = await upsertBankTransactions(pool, transactions, {
      // Mock client ile geliştirmede hesap yoksa placeholder aç.
      autoProvisionAccounts: client.mode === 'mock',
    });

    result.inserted = persist.inserted;
    result.skipped = persist.skipped;

    for (const ref of persist.unresolvedAccounts) {
      result.errors.push(`bank_account bulunamadı: provider_ref=${ref}`);
    }

    // Sync sonrası unmatched hareketler → matching-agent
    const match = await runMatchingForTenant(pool, tenant);
    result.matchScanned = match.scanned;
    result.matchScored = match.scored;
    result.matchWithSuggestions = match.withSuggestions;
    for (const e of match.errors) {
      result.errors.push(`matching: ${e}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
  }

  return result;
}

/**
 * Tüm aktif tenant'lar için bir sync turu çalıştırır.
 */
export async function runSyncCycle(client: FinteoClient): Promise<SyncRunSummary> {
  const startedAt = new Date();
  const tenants = await listActiveTenants();
  const results: SyncTenantResult[] = [];

  if (tenants.length === 0) {
    console.warn('[finteo-agent] aktif tenant yok; tur atlandı');
  }

  for (const tenant of tenants) {
    console.log(`[finteo-agent] sync başlıyor tenant=${tenant.slug} (${tenant.tenantId})`);
    const r = await syncTenant(client, tenant);
    results.push(r);
    console.log(
      `[finteo-agent] sync bitti tenant=${tenant.slug} fetched=${r.fetched} inserted=${r.inserted} skipped=${r.skipped} ` +
        `matchScanned=${r.matchScanned} matchSuggestions=${r.matchWithSuggestions} errors=${r.errors.length}`,
    );
    if (r.errors.length > 0) {
      for (const e of r.errors) {
        console.warn(`[finteo-agent]   ! ${e}`);
      }
    }
  }

  return {
    startedAt,
    finishedAt: new Date(),
    tenants: results,
  };
}
