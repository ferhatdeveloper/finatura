import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';

/**
 * Tenant raporları — gateway: GET /v1/tenant/reports/*
 */
export const reportsRouter = Router();

reportsRouter.use(tenantContext);

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'string' ? Number.parseFloat(v) : v;
}

function periodOrCurrent(raw: unknown): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** GET /api/tenant/reports/overview?period=YYYY-MM */
reportsRouter.get('/reports/overview', async (req, res) => {
  const pool = req.tenantPool!;
  const period = periodOrCurrent(req.query.period);
  const periodStart = `${period}-01`;

  try {
    const [invoiceAgg, bankAgg, veresiyeAgg, cariCount] = await Promise.all([
      pool.query<{
        kind: string;
        status: string;
        adet: string;
        net_total: string;
        vat_total: string;
        grand_total: string;
      }>(
        `SELECT
           i.kind::text AS kind,
           i.status::text AS status,
           COUNT(*)::text AS adet,
           COALESCE(SUM(i.net_total), 0)::text AS net_total,
           COALESCE(SUM(i.vat_total), 0)::text AS vat_total,
           COALESCE(SUM(i.grand_total), 0)::text AS grand_total
         FROM public.invoices i
         WHERE i.deleted_at IS NULL
           AND date_trunc('month', i.issue_date)::date = $1::date
         GROUP BY i.kind, i.status`,
        [periodStart],
      ),
      pool.query<{
        match_status: string;
        direction: string;
        adet: string;
        toplam: string;
      }>(
        `SELECT
           bt.match_status::text AS match_status,
           bt.direction::text AS direction,
           COUNT(*)::text AS adet,
           COALESCE(SUM(bt.amount), 0)::text AS toplam
         FROM public.bank_transactions bt
         WHERE bt.deleted_at IS NULL
           AND date_trunc('month', bt.transaction_at)::date = $1::date
         GROUP BY bt.match_status, bt.direction`,
        [periodStart],
      ),
      pool.query<{
        open_debit: string;
        open_credit: string;
        tx_count: string;
      }>(
        `SELECT
           COALESCE(SUM(CASE WHEN v.direction = 'debit' THEN v.amount ELSE 0 END), 0)::text AS open_debit,
           COALESCE(SUM(CASE WHEN v.direction = 'credit' THEN v.amount ELSE 0 END), 0)::text AS open_credit,
           COUNT(*)::text AS tx_count
         FROM public.veresiye_transactions v
         WHERE v.deleted_at IS NULL
           AND v.asset_kind = 'tl'`,
      ),
      pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM public.customer_caris
         WHERE deleted_at IS NULL AND is_active = true`,
      ),
    ]);

    const invoices = {
      byKindStatus: invoiceAgg.rows.map((r) => ({
        kind: r.kind,
        status: r.status,
        count: Number(r.adet),
        netTotal: num(r.net_total),
        vatTotal: num(r.vat_total),
        grandTotal: num(r.grand_total),
      })),
      totalCount: invoiceAgg.rows.reduce((s, r) => s + Number(r.adet), 0),
      totalVat: invoiceAgg.rows.reduce((s, r) => s + num(r.vat_total), 0),
      totalGrand: invoiceAgg.rows.reduce((s, r) => s + num(r.grand_total), 0),
    };

    const bank = {
      byStatusDirection: bankAgg.rows.map((r) => ({
        matchStatus: r.match_status,
        direction: r.direction,
        count: Number(r.adet),
        amount: num(r.toplam),
      })),
      unmatchedCount: bankAgg.rows
        .filter((r) => r.match_status === 'unmatched')
        .reduce((s, r) => s + Number(r.adet), 0),
      matchedCount: bankAgg.rows
        .filter((r) => r.match_status === 'matched')
        .reduce((s, r) => s + Number(r.adet), 0),
      totalCount: bankAgg.rows.reduce((s, r) => s + Number(r.adet), 0),
    };

    const matchRate =
      bank.totalCount > 0
        ? Math.round((bank.matchedCount / bank.totalCount) * 1000) / 10
        : 0;

    const veresiye = veresiyeAgg.rows[0];
    const openDebit = num(veresiye?.open_debit);
    const openCredit = num(veresiye?.open_credit);

    res.json({
      period,
      generatedAt: new Date().toISOString(),
      invoices,
      bank: { ...bank, matchRatePercent: matchRate },
      veresiye: {
        openDebitTry: openDebit,
        openCreditTry: openCredit,
        netOpenTry: openDebit - openCredit,
        transactionCount: Number(veresiye?.tx_count ?? 0),
      },
      cariActiveCount: Number(cariCount.rows[0]?.n ?? 0),
    });
  } catch (err) {
    console.error('[reports/overview]', err);
    res.status(503).json({
      error: 'reports_unavailable',
      message: 'Özet rapor üretilemedi',
    });
  }
});

/** GET /api/tenant/reports/invoices?period=YYYY-MM */
reportsRouter.get('/reports/invoices', async (req, res) => {
  const pool = req.tenantPool!;
  const period = periodOrCurrent(req.query.period);
  const periodStart = `${period}-01`;

  try {
    const { rows } = await pool.query(
      `SELECT
         i.id,
         i.kind::text AS kind,
         i.direction::text AS direction,
         i.status::text AS status,
         i.document_number,
         i.issue_date,
         i.counterparty_title,
         i.currency_code,
         i.net_total,
         i.vat_total,
         i.grand_total
       FROM public.invoices i
       WHERE i.deleted_at IS NULL
         AND date_trunc('month', i.issue_date)::date = $1::date
       ORDER BY i.issue_date DESC, i.created_at DESC
       LIMIT 500`,
      [periodStart],
    );

    const items = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      direction: r.direction,
      status: r.status,
      documentNumber: r.document_number,
      issueDate: r.issue_date,
      counterpartyTitle: r.counterparty_title,
      currencyCode: r.currency_code,
      netTotal: num(r.net_total),
      vatTotal: num(r.vat_total),
      grandTotal: num(r.grand_total),
    }));

    res.json({
      period,
      items,
      totals: {
        count: items.length,
        netTotal: items.reduce((s, i) => s + i.netTotal, 0),
        vatTotal: items.reduce((s, i) => s + i.vatTotal, 0),
        grandTotal: items.reduce((s, i) => s + i.grandTotal, 0),
      },
    });
  } catch (err) {
    console.error('[reports/invoices]', err);
    res.status(503).json({
      error: 'reports_unavailable',
      message: 'Fatura raporu üretilemedi',
    });
  }
});

/** GET /api/tenant/reports/bank-reconciliation?period=YYYY-MM */
reportsRouter.get('/reports/bank-reconciliation', async (req, res) => {
  const pool = req.tenantPool!;
  const period = periodOrCurrent(req.query.period);
  const periodStart = `${period}-01`;

  try {
    const { rows } = await pool.query(
      `SELECT
         bt.id,
         ba.account_alias,
         ba.bank_name,
         bt.direction::text AS direction,
         bt.amount,
         bt.currency_code,
         bt.transaction_at,
         bt.match_status::text AS match_status,
         bt.counterparty_name,
         bt.description
       FROM public.bank_transactions bt
       LEFT JOIN public.bank_accounts ba
         ON ba.id = bt.bank_account_id AND ba.deleted_at IS NULL
       WHERE bt.deleted_at IS NULL
         AND date_trunc('month', bt.transaction_at)::date = $1::date
       ORDER BY bt.transaction_at DESC
       LIMIT 500`,
      [periodStart],
    );

    const items = rows.map((r) => ({
      id: r.id,
      bankAccountAlias: r.account_alias || r.bank_name || 'Banka',
      direction: r.direction,
      amount: num(r.amount),
      currencyCode: r.currency_code,
      transactionAt: r.transaction_at,
      matchStatus: r.match_status,
      counterpartyName: r.counterparty_name,
      description: r.description,
    }));

    const unmatched = items.filter((i) => i.matchStatus === 'unmatched');
    const matched = items.filter((i) => i.matchStatus === 'matched');

    res.json({
      period,
      items,
      summary: {
        total: items.length,
        matched: matched.length,
        unmatched: unmatched.length,
        ignored: items.filter((i) => i.matchStatus === 'ignored').length,
        matchRatePercent:
          items.length > 0
            ? Math.round((matched.length / items.length) * 1000) / 10
            : 0,
        unmatchedAmount: unmatched.reduce((s, i) => s + i.amount, 0),
        matchedAmount: matched.reduce((s, i) => s + i.amount, 0),
      },
    });
  } catch (err) {
    console.error('[reports/bank]', err);
    res.status(503).json({
      error: 'reports_unavailable',
      message: 'Banka mutabakat raporu üretilemedi',
    });
  }
});

/** GET /api/tenant/reports/veresiye-aging */
reportsRouter.get('/reports/veresiye-aging', async (req, res) => {
  const pool = req.tenantPool!;

  try {
    const { rows } = await pool.query(
      `WITH balances AS (
         SELECT
           c.id AS cari_id,
           c.title AS cari_title,
           c.code AS cari_code,
           COALESCE(SUM(
             CASE
               WHEN v.direction = 'debit' THEN v.amount
               WHEN v.direction = 'credit' THEN -v.amount
               ELSE 0
             END
           ), 0) AS open_balance,
           MAX(v.transaction_date) AS last_tx_date,
           MIN(CASE WHEN v.direction = 'debit' THEN v.transaction_date END) AS oldest_debit
         FROM public.customer_caris c
         LEFT JOIN public.veresiye_transactions v
           ON v.cari_id = c.id
          AND v.deleted_at IS NULL
          AND v.asset_kind = 'tl'
         WHERE c.deleted_at IS NULL AND c.is_active = true
         GROUP BY c.id, c.title, c.code
       )
       SELECT *
       FROM balances
       WHERE open_balance <> 0
       ORDER BY open_balance DESC
       LIMIT 200`,
    );

    const today = new Date();
    const items = rows.map((r) => {
      const balance = num(r.open_balance);
      const anchor = r.oldest_debit
        ? new Date(r.oldest_debit)
        : r.last_tx_date
          ? new Date(r.last_tx_date)
          : today;
      const days = Math.max(
        0,
        Math.floor((today.getTime() - anchor.getTime()) / 86_400_000),
      );
      let bucket = '0-30';
      if (days > 90) bucket = '90+';
      else if (days > 60) bucket = '61-90';
      else if (days > 30) bucket = '31-60';

      return {
        cariId: r.cari_id,
        cariTitle: r.cari_title,
        cariCode: r.cari_code,
        openBalance: balance,
        lastTxDate: r.last_tx_date,
        agingDays: days,
        bucket,
      };
    });

    const buckets = {
      '0-30': items.filter((i) => i.bucket === '0-30'),
      '31-60': items.filter((i) => i.bucket === '31-60'),
      '61-90': items.filter((i) => i.bucket === '61-90'),
      '90+': items.filter((i) => i.bucket === '90+'),
    };

    res.json({
      generatedAt: new Date().toISOString(),
      items,
      bucketTotals: {
        '0-30': buckets['0-30'].reduce((s, i) => s + i.openBalance, 0),
        '31-60': buckets['31-60'].reduce((s, i) => s + i.openBalance, 0),
        '61-90': buckets['61-90'].reduce((s, i) => s + i.openBalance, 0),
        '90+': buckets['90+'].reduce((s, i) => s + i.openBalance, 0),
      },
      totalOpen: items.reduce((s, i) => s + i.openBalance, 0),
    });
  } catch (err) {
    console.error('[reports/veresiye-aging]', err);
    res.status(503).json({
      error: 'reports_unavailable',
      message: 'Veresiye yaşlandırma raporu üretilemedi',
    });
  }
});

/** GET /api/tenant/reports/kdv?period=YYYY-MM */
reportsRouter.get('/reports/kdv', async (req, res) => {
  const pool = req.tenantPool!;
  const period = periodOrCurrent(req.query.period);
  const periodStart = `${period}-01`;

  try {
    const { rows } = await pool.query(
      `SELECT
         i.direction::text AS direction,
         i.kind::text AS kind,
         COUNT(*)::text AS adet,
         COALESCE(SUM(i.net_total), 0)::text AS net_total,
         COALESCE(SUM(i.vat_total), 0)::text AS vat_total,
         COALESCE(SUM(i.grand_total), 0)::text AS grand_total
       FROM public.invoices i
       WHERE i.deleted_at IS NULL
         AND i.status IN ('sent', 'accepted', 'queued')
         AND date_trunc('month', i.issue_date)::date = $1::date
       GROUP BY i.direction, i.kind`,
      [periodStart],
    );

    const lines = rows.map((r) => ({
      direction: r.direction,
      kind: r.kind,
      count: Number(r.adet),
      netTotal: num(r.net_total),
      vatTotal: num(r.vat_total),
      grandTotal: num(r.grand_total),
    }));

    const salesVat = lines
      .filter((l) => l.direction === 'sales')
      .reduce((s, l) => s + l.vatTotal, 0);
    const purchaseVat = lines
      .filter((l) => l.direction === 'purchase')
      .reduce((s, l) => s + l.vatTotal, 0);

    res.json({
      period,
      lines,
      summary: {
        salesVat,
        purchaseVat,
        netVatPayable: salesVat - purchaseVat,
      },
    });
  } catch (err) {
    console.error('[reports/kdv]', err);
    res.status(503).json({
      error: 'reports_unavailable',
      message: 'KDV raporu üretilemedi',
    });
  }
});
