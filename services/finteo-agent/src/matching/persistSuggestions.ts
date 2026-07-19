import type { Pool } from 'pg';
import type { FinaturaMatchPayload } from './types.js';

/**
 * Skorları hem match_suggestions kolonuna hem raw_payload.finatura_match altına yazar.
 *
 * match_status bilerek değiştirilmez (Swipe-to-Settle UI onayı beklenir).
 * Kolon yoksa (eski tenant şema) yalnızca raw_payload yazılır.
 */
export async function persistMatchSuggestions(
  pool: Pool,
  transactionId: string,
  payload: FinaturaMatchPayload,
): Promise<void> {
  const suggestionsJson = JSON.stringify(payload.suggestions ?? []);
  const payloadJson = JSON.stringify(payload);

  try {
    await pool.query(
      `UPDATE public.bank_transactions
       SET match_suggestions = $2::jsonb,
           raw_payload = jsonb_set(
             COALESCE(raw_payload, '{}'::jsonb),
             '{finatura_match}',
             $3::jsonb,
             true
           ),
           updated_at = now()
       WHERE id = $1::uuid
         AND deleted_at IS NULL`,
      [transactionId, suggestionsJson, payloadJson],
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      !msg.includes('match_suggestions') &&
      !msg.includes('column') &&
      !msg.includes('does not exist')
    ) {
      throw err;
    }
    // Eski şema: yalnızca namespaced raw_payload
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
      [transactionId, payloadJson],
    );
  }
}
