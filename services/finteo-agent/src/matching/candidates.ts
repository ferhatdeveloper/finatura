import type { Pool } from 'pg';
import type { MatchCandidate } from '@finatura/matching-agent';

interface InvoiceCandidateRow {
  id: string;
  status: string;
  grand_total: string | number;
  currency_code: string;
  counterparty_title: string | null;
  counterparty_vkn: string | null;
  cari_title: string | null;
  cari_identity_type: string | null;
  cari_identity_number: string | null;
  plate: string | null;
  ada: string | null;
  parsel: string | null;
}

function mapInvoiceStatus(status: string): MatchCandidate['status'] {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'rejected') return 'cancelled';
  return 'open';
}

/**
 * Açık / eşleştirilebilir fatura adaylarını tenant DB'den çeker.
 * Plaka (vehicles), ada/parsel (real_estates), TCKN/unvan (customer_caris) join edilir.
 */
export async function loadMatchCandidates(pool: Pool): Promise<MatchCandidate[]> {
  const { rows } = await pool.query<InvoiceCandidateRow>(
    `SELECT
       i.id,
       i.status::text AS status,
       i.grand_total,
       i.currency_code,
       i.counterparty_title,
       i.counterparty_vkn,
       c.title AS cari_title,
       c.identity_type::text AS cari_identity_type,
       c.identity_number AS cari_identity_number,
       v.plate,
       re.ada,
       re.parsel
     FROM public.invoices i
     LEFT JOIN public.customer_caris c
       ON c.id = i.cari_id AND c.deleted_at IS NULL
     LEFT JOIN public.vehicles v
       ON v.id = i.related_vehicle_id AND v.deleted_at IS NULL
     LEFT JOIN public.real_estates re
       ON re.id = i.related_real_estate_id AND re.deleted_at IS NULL
     WHERE i.deleted_at IS NULL
       AND i.status::text NOT IN ('cancelled', 'rejected')
     ORDER BY i.issue_date DESC
     LIMIT 500`,
  );

  return rows.map((row) => {
    const tckn =
      row.cari_identity_type === 'tckn' ? row.cari_identity_number ?? undefined : undefined;
    const vkn =
      row.cari_identity_type === 'vkn'
        ? row.cari_identity_number ?? undefined
        : row.counterparty_vkn ?? undefined;

    return {
      id: row.id,
      kind: 'invoice' as const,
      customerName: row.cari_title ?? row.counterparty_title ?? undefined,
      tckn,
      vkn,
      plate: row.plate ?? undefined,
      ada: row.ada ?? undefined,
      parsel: row.parsel ?? undefined,
      amount: typeof row.grand_total === 'string' ? Number.parseFloat(row.grand_total) : row.grand_total,
      currency: row.currency_code,
      status: mapInvoiceStatus(row.status),
    };
  });
}
