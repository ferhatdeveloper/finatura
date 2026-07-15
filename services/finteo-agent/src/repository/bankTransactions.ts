import type { Pool } from 'pg';
import type { FinteoTransaction } from '../types.js';

const PROVIDER = 'finteo';

export interface UpsertResult {
  inserted: number;
  skipped: number;
  unresolvedAccounts: string[];
}

/**
 * bank_accounts.provider_ref → id çözümlemesi.
 * Hesap yoksa null (satır yazılmaz; log üst katmanda).
 *
 * Şema referansı (SQL migration başka ajan):
 *   public.bank_accounts(provider_ref)
 *   public.bank_transactions(provider, provider_tx_id) UNIQUE where not deleted
 */
async function resolveBankAccountId(
  pool: Pool,
  providerAccountRef: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id
     FROM public.bank_accounts
     WHERE provider_ref = $1
       AND deleted_at IS NULL
       AND is_active = true
     LIMIT 1`,
    [providerAccountRef],
  );
  return rows[0]?.id ?? null;
}

/**
 * Geliştirme kolaylığı: mock hesap yoksa tenant DB'de placeholder bank_account oluşturur.
 * Production'da hesaplar yönetim UI / provisioning ile açılmalıdır.
 */
async function ensureMockBankAccount(
  pool: Pool,
  providerAccountRef: string,
): Promise<string> {
  const existing = await resolveBankAccountId(pool, providerAccountRef);
  if (existing) return existing;

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO public.bank_accounts (bank_name, account_alias, provider_ref, currency_code)
     VALUES ($1, $2, $3, 'TRY')
     RETURNING id`,
    ['Mock Bank', 'Finteo Mock Hesap', providerAccountRef],
  );
  return rows[0]!.id;
}

export interface PersistOptions {
  /** true ise eksik bank_accounts satırını otomatik açar (yalnızca mock). */
  autoProvisionAccounts?: boolean;
}

/**
 * Finteo hareketlerini tenant DB bank_transactions tablosuna idempotent yazar.
 * Çakışmada (provider, provider_tx_id) DO NOTHING → skipped.
 */
export async function upsertBankTransactions(
  pool: Pool,
  transactions: FinteoTransaction[],
  options: PersistOptions = {},
): Promise<UpsertResult> {
  let inserted = 0;
  let skipped = 0;
  const unresolvedAccounts: string[] = [];
  const accountCache = new Map<string, string | null>();

  for (const tx of transactions) {
    let accountId = accountCache.get(tx.providerAccountRef);
    if (accountId === undefined) {
      if (options.autoProvisionAccounts) {
        accountId = await ensureMockBankAccount(pool, tx.providerAccountRef);
      } else {
        accountId = await resolveBankAccountId(pool, tx.providerAccountRef);
      }
      accountCache.set(tx.providerAccountRef, accountId);
      if (!accountId) {
        unresolvedAccounts.push(tx.providerAccountRef);
      }
    }

    if (!accountId) {
      skipped += 1;
      continue;
    }

    // Partial unique index (provider, provider_tx_id) WHERE deleted_at IS NULL
    // ile uyumlu idempotent insert — ON CONFLICT yerine NOT EXISTS.
    const result = await pool.query(
      `INSERT INTO public.bank_transactions (
         bank_account_id,
         provider,
         provider_tx_id,
         direction,
         amount,
         currency_code,
         transaction_at,
         value_date,
         counterparty_name,
         counterparty_iban,
         description,
         raw_payload,
         match_status
       )
       SELECT
         $1, $2, $3, $4::public.bank_tx_direction, $5, $6, $7::timestamptz, $8::date,
         $9, $10, $11, $12::jsonb, 'unmatched'::public.bank_tx_match_status
       WHERE NOT EXISTS (
         SELECT 1
         FROM public.bank_transactions bt
         WHERE bt.provider = $2
           AND bt.provider_tx_id = $3
           AND bt.deleted_at IS NULL
       )`,
      [
        accountId,
        PROVIDER,
        tx.providerTxId,
        tx.direction,
        tx.amount,
        tx.currencyCode,
        tx.transactionAt.toISOString(),
        tx.valueDate ?? null,
        tx.counterpartyName ?? null,
        tx.counterpartyIban ?? null,
        tx.description ?? null,
        JSON.stringify(tx.rawPayload),
      ],
    );

    if (result.rowCount && result.rowCount > 0) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped, unresolvedAccounts: [...new Set(unresolvedAccounts)] };
}
