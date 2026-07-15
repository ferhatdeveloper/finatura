import type { Pool } from 'pg';
import type { BankTransactionInput } from '@finatura/matching-agent';

interface UnmatchedRow {
  id: string;
  description: string | null;
  amount: string | number;
  currency_code: string;
  direction: string;
  transaction_at: Date;
}

/**
 * match_status = unmatched ve soft-delete edilmemiş hareketler.
 */
export async function loadUnmatchedTransactions(
  pool: Pool,
  limit = 200,
): Promise<BankTransactionInput[]> {
  const { rows } = await pool.query<UnmatchedRow>(
    `SELECT
       id,
       description,
       amount,
       currency_code,
       direction::text AS direction,
       transaction_at
     FROM public.bank_transactions
     WHERE deleted_at IS NULL
       AND match_status = 'unmatched'::public.bank_tx_match_status
     ORDER BY transaction_at DESC
     LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    id: row.id,
    description: row.description ?? '',
    amount: typeof row.amount === 'string' ? Number.parseFloat(row.amount) : row.amount,
    currency: row.currency_code,
    direction: row.direction === 'outbound' ? ('out' as const) : ('in' as const),
    bookedAt: row.transaction_at.toISOString(),
  }));
}
