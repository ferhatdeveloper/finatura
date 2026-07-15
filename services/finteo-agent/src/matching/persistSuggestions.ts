import type { Pool } from 'pg';
import type { FinaturaMatchPayload } from './types.js';

/**
 * Skorları bank_transactions.raw_payload.finatura_match altına yazar.
 *
 * TODO (migration önerisi — ayrı kolon yoksa mevcut jsonb güvenli kullanım):
 *   ALTER TABLE public.bank_transactions
 *     ADD COLUMN IF NOT EXISTS match_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;
 *   COMMENT ON COLUMN public.bank_transactions.match_suggestions IS
 *     'Matching agent önerileri; UI onayına kadar match_status unmatched kalır.';
 *
 * Kolon eklendiğinde bu fonksiyon dual-write / kolon tercihine geçirilebilir.
 * match_status bilerek değiştirilmez (Swipe-to-Settle UI onayı beklenir).
 */
export async function persistMatchSuggestions(
  pool: Pool,
  transactionId: string,
  payload: FinaturaMatchPayload,
): Promise<void> {
  await pool.query(
    `UPDATE public.bank_transactions
     SET raw_payload = jsonb_set(
           COALESCE(raw_payload, '{}'::jsonb),
           '{finatura_match}',
           $2::jsonb,
           true
         ),
         updated_at = now()
     WHERE id = $1::uuid
       AND deleted_at IS NULL`,
    [transactionId, JSON.stringify(payload)],
  );
}
