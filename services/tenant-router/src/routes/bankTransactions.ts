import { Router } from 'express';
import type { Pool } from 'pg';
import { tenantContext } from '../middleware/tenantContext.js';

interface BankTxRow {
  id: string;
  bank_account_alias: string | null;
  bank_name: string | null;
  direction: string;
  amount: string | number;
  currency_code: string;
  transaction_at: Date;
  match_status: string;
  counterparty_name: string | null;
  description: string | null;
  matched_cari_id: string | null;
  matched_veresiye_id: string | null;
  raw_payload: unknown;
}

interface VeresiyeRow {
  id: string;
  cari_id: string;
  cari_title: string;
  asset_kind: string;
  direction: string;
  amount: string | number;
  currency_code: string;
  transaction_date: Date;
  description: string | null;
  gold_grams: string | number | null;
}

interface MatchSuggestionStored {
  candidateId?: string;
  kind?: string;
  score?: number;
  confidence?: number;
  breakdown?: Array<{ signal?: string; points?: number; detail?: string }>;
}

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'string' ? Number.parseFloat(value) : value;
}

function accountAlias(row: BankTxRow): string {
  return row.bank_account_alias?.trim() || row.bank_name?.trim() || 'Banka hesabı';
}

function mapBankTx(row: BankTxRow) {
  return {
    id: row.id,
    bankAccountAlias: accountAlias(row),
    direction: row.direction,
    amount: num(row.amount),
    currencyCode: row.currency_code,
    transactionAt: row.transaction_at.toISOString(),
    matchStatus: row.match_status,
    counterpartyName: row.counterparty_name,
    description: row.description,
    matchedCariId: row.matched_cari_id,
    matchedVeresiyeId: row.matched_veresiye_id,
  };
}

function mapVeresiye(
  row: VeresiyeRow,
  score: number,
  matchHint: string | null,
) {
  return {
    id: row.id,
    cariId: row.cari_id,
    cariTitle: row.cari_title,
    assetKind: row.asset_kind,
    direction: row.direction,
    openAmount: Math.abs(num(row.amount)),
    currencyCode: row.currency_code,
    transactionDate: row.transaction_date.toISOString().slice(0, 10),
    description: row.description,
    goldGrams: row.gold_grams == null ? null : num(row.gold_grams),
    matchScore: Math.round(score),
    matchHint,
  };
}

function readStoredSuggestions(rawPayload: unknown): MatchSuggestionStored[] {
  if (!rawPayload || typeof rawPayload !== 'object') return [];
  const root = rawPayload as Record<string, unknown>;
  const finatura = root.finatura_match;
  if (!finatura || typeof finatura !== 'object') return [];
  const suggestions = (finatura as Record<string, unknown>).suggestions;
  if (!Array.isArray(suggestions)) return [];
  return suggestions.filter(
    (s): s is MatchSuggestionStored => !!s && typeof s === 'object',
  );
}

function hintFromBreakdown(s: MatchSuggestionStored): string | null {
  const parts = (s.breakdown ?? [])
    .map((b) => b.detail || b.signal)
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (parts.length > 0) return parts.slice(0, 3).join(' · ');
  if (typeof s.kind === 'string') return `Eşleşme: ${s.kind}`;
  return null;
}

async function loadOpenVeresiyeByIds(
  pool: Pool,
  ids: string[],
): Promise<Map<string, VeresiyeRow>> {
  const map = new Map<string, VeresiyeRow>();
  if (ids.length === 0) return map;

  const { rows } = await pool.query<VeresiyeRow>(
    `SELECT
       v.id,
       v.cari_id,
       COALESCE(c.title, 'Cari') AS cari_title,
       v.asset_kind::text AS asset_kind,
       v.direction::text AS direction,
       v.amount,
       v.currency_code,
       v.transaction_date,
       v.description,
       v.gold_grams
     FROM public.veresiye_transactions v
     LEFT JOIN public.customer_caris c
       ON c.id = v.cari_id AND c.deleted_at IS NULL
     WHERE v.deleted_at IS NULL
       AND v.id = ANY($1::uuid[])`,
    [ids],
  );
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function loadOpenVeresiyeForInvoiceCandidates(
  pool: Pool,
  invoiceIds: string[],
): Promise<Map<string, VeresiyeRow>> {
  const map = new Map<string, VeresiyeRow>();
  if (invoiceIds.length === 0) return map;

  const { rows } = await pool.query<VeresiyeRow & { invoice_id: string }>(
    `SELECT DISTINCT ON (i.id)
       v.id,
       v.cari_id,
       COALESCE(c.title, i.counterparty_title, 'Cari') AS cari_title,
       v.asset_kind::text AS asset_kind,
       v.direction::text AS direction,
       v.amount,
       v.currency_code,
       v.transaction_date,
       v.description,
       v.gold_grams,
       i.id AS invoice_id
     FROM public.invoices i
     INNER JOIN public.veresiye_transactions v
       ON v.deleted_at IS NULL
      AND v.direction = 'debit'::public.veresiye_direction
      AND (
        v.invoice_id = i.id
        OR (i.cari_id IS NOT NULL AND v.cari_id = i.cari_id)
      )
     LEFT JOIN public.customer_caris c
       ON c.id = v.cari_id AND c.deleted_at IS NULL
     WHERE i.deleted_at IS NULL
       AND i.id = ANY($1::uuid[])
       AND NOT EXISTS (
         SELECT 1
         FROM public.bank_transactions bt
         WHERE bt.matched_veresiye_id = v.id
           AND bt.match_status = 'matched'::public.bank_tx_match_status
           AND bt.deleted_at IS NULL
       )
     ORDER BY i.id, v.transaction_date DESC`,
    [invoiceIds],
  );

  for (const row of rows) {
    map.set(row.invoice_id, row);
  }
  return map;
}

/**
 * Banka hareketleri + matching önerileri (gateway: /v1/tenant/bank-transactions*).
 */
export const bankTransactionsRouter = Router();

bankTransactionsRouter.use(tenantContext);

/**
 * GET /api/tenant/bank-transactions?matchStatus=unmatched|matched|ignored|all&direction=inbound
 * matchStatus=all (veya *) → durum filtresi yok.
 */
bankTransactionsRouter.get('/bank-transactions', async (req, res) => {
  const pool = req.tenantPool!;
  const matchStatusRaw =
    typeof req.query.matchStatus === 'string' && req.query.matchStatus.trim()
      ? req.query.matchStatus.trim().toLowerCase()
      : 'unmatched';
  const filterByStatus =
    matchStatusRaw !== 'all' && matchStatusRaw !== '*';
  const matchStatus = filterByStatus ? matchStatusRaw : undefined;
  const direction =
    typeof req.query.direction === 'string' && req.query.direction.trim()
      ? req.query.direction.trim()
      : undefined;
  const limitRaw = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 500)
    : 100;

  try {
    const clauses: string[] = ['bt.deleted_at IS NULL'];
    const params: unknown[] = [];

    if (matchStatus) {
      params.push(matchStatus);
      clauses.push(
        `bt.match_status = $${params.length}::public.bank_tx_match_status`,
      );
    }
    if (direction === 'inbound' || direction === 'outbound') {
      params.push(direction);
      clauses.push(
        `bt.direction = $${params.length}::public.bank_tx_direction`,
      );
    }

    params.push(limit);

    const { rows } = await pool.query<BankTxRow>(
      `SELECT
         bt.id,
         ba.account_alias AS bank_account_alias,
         ba.bank_name,
         bt.direction::text AS direction,
         bt.amount,
         bt.currency_code,
         bt.transaction_at,
         bt.match_status::text AS match_status,
         bt.counterparty_name,
         bt.description,
         bt.matched_cari_id,
         bt.matched_veresiye_id,
         bt.raw_payload
       FROM public.bank_transactions bt
       LEFT JOIN public.bank_accounts ba
         ON ba.id = bt.bank_account_id AND ba.deleted_at IS NULL
       WHERE ${clauses.join(' AND ')}
       ORDER BY bt.transaction_at DESC
       LIMIT $${params.length}`,
      params,
    );

    res.json({
      items: rows.map(mapBankTx),
      count: rows.length,
    });
  } catch (err) {
    console.error('[bank-transactions]', err);
    res.status(503).json({
      error: 'bank_transactions_unavailable',
      message: 'Banka hareketleri okunamadı',
    });
  }
});

/**
 * GET /api/tenant/bank-transactions/:id/match-suggestions
 * raw_payload.finatura_match + açık veresiye hidrasyonu.
 */
bankTransactionsRouter.get(
  '/bank-transactions/:id/match-suggestions',
  async (req, res) => {
    const pool = req.tenantPool!;
    const bankTxId = req.params.id;

    try {
      const { rows } = await pool.query<BankTxRow>(
        `SELECT
           bt.id,
           ba.account_alias AS bank_account_alias,
           ba.bank_name,
           bt.direction::text AS direction,
           bt.amount,
           bt.currency_code,
           bt.transaction_at,
           bt.match_status::text AS match_status,
           bt.counterparty_name,
           bt.description,
           bt.matched_cari_id,
           bt.matched_veresiye_id,
           bt.raw_payload
         FROM public.bank_transactions bt
         LEFT JOIN public.bank_accounts ba
           ON ba.id = bt.bank_account_id AND ba.deleted_at IS NULL
         WHERE bt.id = $1::uuid
           AND bt.deleted_at IS NULL
         LIMIT 1`,
        [bankTxId],
      );

      const tx = rows[0];
      if (!tx) {
        res.status(404).json({
          error: 'bank_tx_not_found',
          message: 'Banka hareketi bulunamadı',
        });
        return;
      }

      const stored = readStoredSuggestions(tx.raw_payload);
      const veresiyeIds = stored
        .map((s) => s.candidateId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      const byVeresiye = await loadOpenVeresiyeByIds(pool, veresiyeIds);
      const missingInvoiceIds = veresiyeIds.filter((id) => !byVeresiye.has(id));
      const byInvoice = await loadOpenVeresiyeForInvoiceCandidates(
        pool,
        missingInvoiceIds,
      );

      const suggestions = [];
      const seen = new Set<string>();

      for (const s of stored) {
        const candidateId = s.candidateId;
        if (!candidateId) continue;
        const row =
          byVeresiye.get(candidateId) ?? byInvoice.get(candidateId) ?? null;
        if (!row || seen.has(row.id)) continue;
        seen.add(row.id);
        const score =
          typeof s.score === 'number'
            ? s.score
            : typeof s.confidence === 'number'
              ? s.confidence * 100
              : 0;
        suggestions.push(mapVeresiye(row, score, hintFromBreakdown(s)));
      }

      res.json({
        bankTxId: tx.id,
        bankTransaction: mapBankTx(tx),
        suggestions,
        count: suggestions.length,
      });
    } catch (err) {
      console.error('[match-suggestions]', err);
      res.status(503).json({
        error: 'match_suggestions_unavailable',
        message: 'Eşleştirme önerileri okunamadı',
      });
    }
  },
);
