import { Router } from 'express';
import { tenantContext } from '../middleware/tenantContext.js';

interface InvoiceRow {
  id: string;
  kind: string;
  direction: string;
  status: string;
  document_number: string | null;
  issue_date: Date;
  counterparty_title: string | null;
  currency_code: string;
  net_total: string | number;
  vat_total: string | number;
  grand_total: string | number;
  notes: string | null;
  created_at: Date;
}

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'string' ? Number.parseFloat(value) : value;
}

function mapInvoice(row: InvoiceRow) {
  return {
    id: row.id,
    kind: row.kind,
    direction: row.direction,
    status: row.status,
    documentNumber: row.document_number,
    issueDate: row.issue_date.toISOString().slice(0, 10),
    counterpartyTitle: row.counterparty_title,
    currencyCode: row.currency_code,
    netTotal: num(row.net_total),
    vatTotal: num(row.vat_total),
    grandTotal: num(row.grand_total),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Gateway: GET /v1/tenant/invoices
 * Query: kind (efatura,earsiv,gider_pusulasi), status, period (YYYY-MM), limit
 */
export const invoicesRouter = Router();

invoicesRouter.use(tenantContext);

invoicesRouter.get('/invoices', async (req, res) => {
  const pool = req.tenantPool!;
  const limitRaw = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 500)
    : 100;

  const kinds = String(req.query.kind ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const statuses = String(req.query.status ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const period =
    typeof req.query.period === 'string' && /^\d{4}-\d{2}$/.test(req.query.period)
      ? req.query.period
      : undefined;

  try {
    const clauses: string[] = ['i.deleted_at IS NULL'];
    const params: unknown[] = [];

    if (kinds.length > 0) {
      params.push(kinds);
      clauses.push(`i.kind::text = ANY($${params.length}::text[])`);
    }
    if (statuses.length > 0) {
      params.push(statuses);
      clauses.push(`i.status::text = ANY($${params.length}::text[])`);
    }
    if (period) {
      params.push(`${period}-01`);
      clauses.push(
        `date_trunc('month', i.issue_date)::date = $${params.length}::date`,
      );
    }

    params.push(limit);
    const { rows } = await pool.query<InvoiceRow>(
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
         i.grand_total,
         i.notes,
         i.created_at
       FROM public.invoices i
       WHERE ${clauses.join(' AND ')}
       ORDER BY i.issue_date DESC, i.created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    res.json({
      items: rows.map(mapInvoice),
      count: rows.length,
    });
  } catch (err) {
    console.error('[invoices]', err);
    res.status(503).json({
      error: 'invoices_unavailable',
      message: 'Faturalar okunamadı',
    });
  }
});
