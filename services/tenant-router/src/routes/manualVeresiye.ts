import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';

const assetKinds = new Set(['tl', 'gold', 'fx']);
const directions = new Set(['debit', 'credit']);
const operations = new Set(['tahsilat', 'tediye']);

interface ManualVeresiyeBody {
  cariId?: unknown;
  amount?: unknown;
  currencyCode?: unknown;
  currency?: unknown;
  assetKind?: unknown;
  asset_kind?: unknown;
  operation?: unknown;
  direction?: unknown;
  description?: unknown;
  note?: unknown;
  goldGrams?: unknown;
  gold_grams?: unknown;
  goldPurity?: unknown;
  gold_purity?: unknown;
  fxRate?: unknown;
  fx_rate?: unknown;
  transactionDate?: unknown;
  transaction_date?: unknown;
}

export interface ManualVeresiyeInput {
  cariId: string;
  amount: number;
  currencyCode: string;
  assetKind: 'tl' | 'gold' | 'fx';
  direction: 'debit' | 'credit';
  operation: 'tahsilat' | 'tediye';
  description: string | null;
  goldGrams: number | null;
  goldPurity: number | null;
  fxRate: number | null;
  transactionDate: string | null;
  metadata: {
    channel: 'cash';
    operation: 'tahsilat' | 'tediye';
    source: 'manual_cari_movement';
  };
}

type ValidationResult =
  | { ok: true; value: ManualVeresiyeInput }
  | { ok: false; status: number; error: string; message: string };

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n > 0 ? n : Number.NaN;
}

function optionalPositiveNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = positiveNumber(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

function isoDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function operationToDirection(operation: string): 'debit' | 'credit' {
  return operation === 'tahsilat' ? 'credit' : 'debit';
}

function directionToOperation(direction: string): 'tahsilat' | 'tediye' {
  return direction === 'credit' ? 'tahsilat' : 'tediye';
}

export function validateManualVeresiyeBody(
  body: ManualVeresiyeBody,
): ValidationResult {
  const cariId = text(body.cariId);
  if (!cariId) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_cari',
      message: 'cariId zorunludur',
    };
  }

  const amount = positiveNumber(body.amount);
  if (!Number.isFinite(amount)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_amount',
      message: 'amount pozitif bir sayı olmalıdır',
    };
  }

  const assetKind = text(body.assetKind ?? body.asset_kind).toLowerCase();
  if (!assetKinds.has(assetKind)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_asset_kind',
      message: 'assetKind tl, gold veya fx olmalıdır',
    };
  }

  const rawOperation = text(body.operation).toLowerCase();
  const rawDirection = text(body.direction).toLowerCase();
  if (!operations.has(rawOperation) && !directions.has(rawDirection)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_operation',
      message: 'operation tahsilat/tediye veya direction debit/credit olmalıdır',
    };
  }

  const operation = operations.has(rawOperation)
    ? (rawOperation as 'tahsilat' | 'tediye')
    : directionToOperation(rawDirection);
  const direction = directions.has(rawDirection)
    ? (rawDirection as 'debit' | 'credit')
    : operationToDirection(operation);

  const currencyCode = text(body.currencyCode ?? body.currency).toUpperCase() || 'TRY';
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_currency',
      message: 'currencyCode üç harfli ISO para birimi olmalıdır',
    };
  }
  if (assetKind === 'fx' && currencyCode === 'TRY') {
    return {
      ok: false,
      status: 400,
      error: 'invalid_fx_currency',
      message: 'Döviz hareketinde currencyCode TRY olamaz',
    };
  }

  const goldGrams = optionalPositiveNumber(body.goldGrams ?? body.gold_grams);
  if (assetKind === 'gold' && !Number.isFinite(goldGrams)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_gold_grams',
      message: 'Altın hareketinde goldGrams pozitif olmalıdır',
    };
  }
  if (Number.isNaN(goldGrams)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_gold_grams',
      message: 'goldGrams pozitif bir sayı olmalıdır',
    };
  }

  const goldPurity = optionalPositiveNumber(body.goldPurity ?? body.gold_purity);
  const fxRate = optionalPositiveNumber(body.fxRate ?? body.fx_rate);
  if (Number.isNaN(goldPurity) || Number.isNaN(fxRate)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_optional_amount',
      message: 'goldPurity ve fxRate pozitif sayı olmalıdır',
    };
  }

  const transactionDate = isoDate(body.transactionDate ?? body.transaction_date);
  if (transactionDate === '') {
    return {
      ok: false,
      status: 400,
      error: 'invalid_transaction_date',
      message: 'transactionDate YYYY-MM-DD formatında olmalıdır',
    };
  }

  return {
    ok: true,
    value: {
      cariId,
      amount,
      currencyCode,
      assetKind: assetKind as 'tl' | 'gold' | 'fx',
      direction,
      operation,
      description: text(body.description ?? body.note) || null,
      goldGrams,
      goldPurity,
      fxRate,
      transactionDate,
      metadata: {
        channel: 'cash',
        operation,
        source: 'manual_cari_movement',
      },
    },
  };
}

export function buildManualVeresiyeInsert(input: ManualVeresiyeInput): {
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
        gold_grams,
        gold_purity,
        fx_rate,
        description,
        transaction_date,
        metadata
      )
      VALUES (
        $1::uuid,
        $2::public.veresiye_asset_kind,
        $3::public.veresiye_direction,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        COALESCE($10::date, CURRENT_DATE),
        $11::jsonb
      )
      RETURNING
        id,
        cari_id,
        asset_kind::text AS asset_kind,
        direction::text AS direction,
        amount,
        currency_code,
        gold_grams,
        gold_purity,
        fx_rate,
        description,
        transaction_date,
        metadata`,
    values: [
      input.cariId,
      input.assetKind,
      input.direction,
      input.amount,
      input.currencyCode,
      input.goldGrams,
      input.goldPurity,
      input.fxRate,
      input.description,
      input.transactionDate,
      JSON.stringify(input.metadata),
    ],
  };
}

function num(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'string' ? Number.parseFloat(value) : value;
}

function mapMovement(row: Record<string, unknown>) {
  return {
    id: row.id,
    cariId: row.cari_id,
    assetKind: row.asset_kind,
    direction: row.direction,
    amount: num(row.amount as string | number),
    currencyCode: row.currency_code,
    goldGrams: num(row.gold_grams as string | number | null),
    goldPurity: num(row.gold_purity as string | number | null),
    fxRate: num(row.fx_rate as string | number | null),
    description: row.description,
    transactionDate:
      row.transaction_date instanceof Date
        ? row.transaction_date.toISOString().slice(0, 10)
        : row.transaction_date,
    metadata: row.metadata,
  };
}

export const manualVeresiyeRouter = Router();

manualVeresiyeRouter.use(tenantContext);

manualVeresiyeRouter.get('/caris', async (req, res) => {
  const pool = req.tenantPool!;
  const limitRaw = Number.parseInt(String(req.query.limit ?? '50'), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 200)
    : 50;

  try {
    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.title,
         c.code,
         c.mobile_phone,
         COALESCE(SUM(
           CASE
             WHEN v.direction = 'debit'::public.veresiye_direction THEN v.amount
             WHEN v.direction = 'credit'::public.veresiye_direction THEN -v.amount
             ELSE 0
           END
         ), 0) AS open_balance
       FROM public.customer_caris c
       LEFT JOIN public.veresiye_transactions v
         ON v.cari_id = c.id
        AND v.deleted_at IS NULL
        AND v.asset_kind = 'tl'::public.veresiye_asset_kind
       WHERE c.deleted_at IS NULL
         AND c.is_active = true
       GROUP BY c.id, c.title, c.code, c.mobile_phone
       ORDER BY c.title ASC
       LIMIT $1`,
      [limit],
    );

    res.json({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        code: row.code,
        phone: row.mobile_phone,
        openBalance: num(row.open_balance),
      })),
      count: rows.length,
    });
  } catch (err) {
    console.error('[caris]', err);
    res.status(503).json({
      error: 'caris_unavailable',
      message: 'Cari listesi okunamadı',
    });
  }
});

manualVeresiyeRouter.get('/caris/summary', async (req, res) => {
  const pool = req.tenantPool!;

  try {
    const [counts, totals, top] = await Promise.all([
      pool.query<{ cari_count: string; open_veresiye_count: string }>(
        `SELECT
           (SELECT COUNT(*) FROM public.customer_caris WHERE deleted_at IS NULL) AS cari_count,
           (SELECT COUNT(*) FROM public.veresiye_transactions WHERE deleted_at IS NULL) AS open_veresiye_count`,
      ),
      pool.query<{ direction: string; total: string }>(
        `SELECT direction::text AS direction, COALESCE(SUM(amount), 0) AS total
         FROM public.veresiye_transactions
         WHERE deleted_at IS NULL
           AND asset_kind = 'tl'::public.veresiye_asset_kind
         GROUP BY direction`,
      ),
      pool.query(
        `SELECT
           c.id,
           c.title,
           COALESCE(SUM(
             CASE
               WHEN v.direction = 'debit'::public.veresiye_direction THEN v.amount
               WHEN v.direction = 'credit'::public.veresiye_direction THEN -v.amount
               ELSE 0
             END
           ), 0) AS open_balance
         FROM public.customer_caris c
         INNER JOIN public.veresiye_transactions v
           ON v.cari_id = c.id
          AND v.deleted_at IS NULL
          AND v.asset_kind = 'tl'::public.veresiye_asset_kind
         WHERE c.deleted_at IS NULL
         GROUP BY c.id, c.title
         ORDER BY ABS(COALESCE(SUM(v.amount), 0)) DESC
         LIMIT 5`,
      ),
    ]);

    const openDebitTry = totals.rows
      .filter((row) => row.direction === 'debit')
      .reduce((sum, row) => sum + Number.parseFloat(row.total), 0);
    const openCreditTry = totals.rows
      .filter((row) => row.direction === 'credit')
      .reduce((sum, row) => sum + Number.parseFloat(row.total), 0);

    res.json({
      cariCount: Number.parseInt(counts.rows[0]?.cari_count ?? '0', 10),
      openVeresiyeCount: Number.parseInt(
        counts.rows[0]?.open_veresiye_count ?? '0',
        10,
      ),
      openDebitTry,
      openCreditTry,
      topCaris: top.rows.map((row) => ({
        id: row.id,
        title: row.title,
        openBalance: num(row.open_balance),
        currencyCode: 'TRY',
      })),
    });
  } catch (err) {
    console.error('[caris-summary]', err);
    res.status(503).json({
      error: 'cari_summary_unavailable',
      message: 'Cari özeti okunamadı',
    });
  }
});

manualVeresiyeRouter.post('/veresiye-transactions/manual', async (req, res) => {
  const pool = req.tenantPool!;
  const parsed = validateManualVeresiyeBody(req.body ?? {});

  if (!parsed.ok) {
    res.status(parsed.status).json({
      error: parsed.error,
      message: parsed.message,
    });
    return;
  }

  try {
    const cari = await pool.query<{ id: string }>(
      `SELECT id
       FROM public.customer_caris
       WHERE id = $1::uuid
         AND deleted_at IS NULL
         AND is_active = true
       LIMIT 1`,
      [parsed.value.cariId],
    );
    if (!cari.rows[0]) {
      res.status(404).json({
        error: 'cari_not_found',
        message: 'Cari kart bulunamadı',
      });
      return;
    }

    const insert = buildManualVeresiyeInsert(parsed.value);
    const result = await pool.query(insert.sql, insert.values);

    res.status(201).json({
      ok: true,
      movement: mapMovement(result.rows[0]),
    });
  } catch (err) {
    console.error('[manual-veresiye]', err);
    res.status(503).json({
      error: 'manual_veresiye_failed',
      message: 'Elden cari hareketi kaydedilemedi',
    });
  }
});
