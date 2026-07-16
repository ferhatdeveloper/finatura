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

interface SettlementCreditInput {
  bankTxId: string;
  veresiyeId: string;
  cariId: string;
  settleAmount: number;
  currencyCode: string;
  description: string;
}

export function buildSettlementMetadata(input: {
  bankTxId: string;
  veresiyeId: string;
}) {
  return {
    channel: 'bank',
    operation: 'tahsilat',
    source: 'bank_settlement',
    bankTxId: input.bankTxId,
    veresiyeId: input.veresiyeId,
  };
}

export function buildSettlementCreditInsert(input: SettlementCreditInput): {
  sql: string;
  values: unknown[];
} {
  return {
    sql: `INSERT INTO public.veresiye_transactions (
        cari_id,
        asset_kind,
        direction,
        amount,
        currency_code,
        description,
        transaction_date,
        metadata
      )
      VALUES (
        $1::uuid,
        'tl'::public.veresiye_asset_kind,
        'credit'::public.veresiye_direction,
        $2,
        $3,
        $4,
        CURRENT_DATE,
        $5::jsonb
      )
      RETURNING id`,
    values: [
      input.cariId,
      input.settleAmount,
      input.currencyCode,
      input.description,
      JSON.stringify(
        buildSettlementMetadata({
          bankTxId: input.bankTxId,
          veresiyeId: input.veresiyeId,
        }),
      ),
    ],
  };
}

/**
 * POST /api/tenant/settlements
 * Body: { bankTxId, veresiyeId, settleAmount, cariId? }
 *
 * bank_transactions → matched + matched_veresiye_id / matched_cari_id.
 * Aynı transaction içinde veresiye_transactions'a bank kaynaklı credit yazar.
 */
settlementsRouter.post('/settlements', async (req, res) => {
  const pool = req.tenantPool!;
  const body = (req.body ?? {}) as SettleBody;

  const bankTxId =
    typeof body.bankTxId === 'string' ? body.bankTxId.trim() : '';
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
    await pool.query('BEGIN');

    const veresiyeResult = await pool.query<{
      id: string;
      cari_id: string;
      amount: string | number;
      currency_code: string | null;
    }>(
      `SELECT id, cari_id, amount, currency_code
       FROM public.veresiye_transactions
       WHERE id = $1::uuid
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [veresiyeId],
    );

    const veresiye = veresiyeResult.rows[0];
    if (!veresiye) {
      await pool.query('ROLLBACK');
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
        await pool.query('ROLLBACK');
        res.status(404).json({
          error: 'bank_tx_not_found',
          message: 'Banka hareketi bulunamadı',
        });
        return;
      }
      await pool.query('ROLLBACK');
      res.status(409).json({
        error: 'already_settled',
        message: `Hareket zaten ${exists.rows[0].match_status}`,
      });
      return;
    }

    const credit = buildSettlementCreditInsert({
      bankTxId,
      veresiyeId,
      cariId,
      settleAmount,
      currencyCode: veresiye.currency_code ?? 'TRY',
      description: 'Banka havalesi mahsup',
    });
    const creditResult = await pool.query<{ id: string }>(
      credit.sql,
      credit.values,
    );

    await pool.query('COMMIT');

    res.status(201).json({
      ok: true,
      bankTxId,
      veresiyeId,
      cariId,
      movementId: creditResult.rows[0]?.id,
      settleAmount,
      status: 'settled',
      settledAt: new Date().toISOString(),
    });
  } catch (err) {
    try {
      await pool.query('ROLLBACK');
    } catch {}
    console.error('[settlements]', err);
    res.status(503).json({
      error: 'settlement_failed',
      message: 'Mahsup kaydı yazılamadı',
    });
  }
});
