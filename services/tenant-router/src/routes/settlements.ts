import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';

/**
 * Mahsup (swipe-to-settle) iskeleti.
 * Gateway: POST /v1/tenant/settlements
 */
export const settlementsRouter = Router();

settlementsRouter.use(tenantContext);

interface SettleBody {
  bankTxId?: string;
  veresiyeId?: string;
  settleAmount?: number;
  cariId?: string;
}

/**
 * POST /api/tenant/settlements
 * Body: { bankTxId, veresiyeId, settleAmount, cariId? }
 *
 * bank_transactions → matched + matched_veresiye_id / matched_cari_id.
 * Veresiye satırına ayrı credit kaydı (ileride) — iskelet yalnızca eşleştirmeyi yazar.
 */
settlementsRouter.post('/settlements', async (req, res) => {
  const pool = req.tenantPool!;
  const body = (req.body ?? {}) as SettleBody;

  const bankTxId = typeof body.bankTxId === 'string' ? body.bankTxId.trim() : '';
  const veresiyeId =
    typeof body.veresiyeId === 'string' ? body.veresiyeId.trim() : '';
  const settleAmount =
    typeof body.settleAmount === 'number'
      ? body.settleAmount
      : Number.parseFloat(String(body.settleAmount ?? ''));

  if (!bankTxId || !veresiyeId) {
    res.status(400).json({
      error: 'invalid_body',
      message: 'bankTxId ve veresiyeId zorunludur',
    });
    return;
  }

  if (!Number.isFinite(settleAmount) || settleAmount <= 0) {
    res.status(400).json({
      error: 'invalid_settle_amount',
      message: 'settleAmount pozitif bir sayı olmalıdır',
    });
    return;
  }

  try {
    const veresiyeResult = await pool.query<{
      id: string;
      cari_id: string;
      amount: string | number;
    }>(
      `SELECT id, cari_id, amount
       FROM public.veresiye_transactions
       WHERE id = $1::uuid
         AND deleted_at IS NULL
       LIMIT 1`,
      [veresiyeId],
    );

    const veresiye = veresiyeResult.rows[0];
    if (!veresiye) {
      res.status(404).json({
        error: 'veresiye_not_found',
        message: 'Veresiye kaydı bulunamadı',
      });
      return;
    }

    const cariId =
      typeof body.cariId === 'string' && body.cariId.trim()
        ? body.cariId.trim()
        : veresiye.cari_id;

    const update = await pool.query<{ id: string }>(
      `UPDATE public.bank_transactions
       SET match_status = 'matched'::public.bank_tx_match_status,
           matched_veresiye_id = $2::uuid,
           matched_cari_id = $3::uuid,
           updated_at = now()
       WHERE id = $1::uuid
         AND deleted_at IS NULL
         AND match_status = 'unmatched'::public.bank_tx_match_status
       RETURNING id`,
      [bankTxId, veresiyeId, cariId],
    );

    if (!update.rows[0]) {
      const exists = await pool.query<{ match_status: string }>(
        `SELECT match_status::text AS match_status
         FROM public.bank_transactions
         WHERE id = $1::uuid AND deleted_at IS NULL
         LIMIT 1`,
        [bankTxId],
      );
      if (!exists.rows[0]) {
        res.status(404).json({
          error: 'bank_tx_not_found',
          message: 'Banka hareketi bulunamadı',
        });
        return;
      }
      res.status(409).json({
        error: 'already_settled',
        message: `Hareket zaten ${exists.rows[0].match_status}`,
      });
      return;
    }

    res.status(201).json({
      ok: true,
      bankTxId,
      veresiyeId,
      cariId,
      settleAmount,
      status: 'settled',
      settledAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[settlements]', err);
    res.status(503).json({
      error: 'settlement_failed',
      message: 'Mahsup kaydı yazılamadı',
    });
  }
});
