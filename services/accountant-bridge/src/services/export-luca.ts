import { exportLucaXml } from "@finatura/luca-agent";
import { STUB_ACCOUNTANT_CODES } from "../stub-codes.js";
import { getApproval, getSession } from "../store/approvals.js";
import { filterBatch } from "../demo/sample-batch.js";
import type { ExportLucaMeta, ExportLucaRequest } from "../types.js";

export class ExportLucaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ExportLucaError";
  }
}

export interface ExportLucaResult {
  meta: ExportLucaMeta;
  xml: string;
  filename: string;
}

function parsePeriod(period: string): { yil: number; ay: number } {
  const [y, m] = period.split("-").map(Number);
  return { yil: y, ay: m };
}

export function exportLucaForPeriod(body: ExportLucaRequest): ExportLucaResult {
  if (!body.token || !body.tenantId || !body.period) {
    throw new ExportLucaError(
      "token, tenantId ve period zorunlu",
      400,
      "missing_fields",
    );
  }

  const tenantId = body.tenantId.trim().toLowerCase();
  const session = getSession(body.token);
  if (!session || session.tenantId !== tenantId) {
    throw new ExportLucaError(
      "Oturum geçersiz veya süresi dolmuş",
      401,
      "invalid_session",
    );
  }

  const approval = getApproval(tenantId, body.period, body.approvalId);
  if (!approval && body.includeInvoices === undefined && body.includeBank === undefined) {
    throw new ExportLucaError(
      "Dönem onayı bulunamadı; önce approve-period çağırın",
      404,
      "approval_not_found",
    );
  }

  const includeInvoices =
    body.includeInvoices ?? approval?.includeInvoices ?? true;
  const includeBank = body.includeBank ?? approval?.includeBank ?? true;

  const batch = filterBatch({
    includeInvoices,
    includeBank,
    invoiceIds: approval?.invoiceIds?.length ? approval.invoiceIds : undefined,
    bankIds: approval?.bankIds?.length ? approval.bankIds : undefined,
  });

  if (batch.invoices.length === 0 && batch.bankTransactions.length === 0) {
    throw new ExportLucaError(
      "Dışa aktarılacak fatura/banka kaydı yok",
      422,
      "empty_batch",
    );
  }

  const stub = STUB_ACCOUNTANT_CODES.find((c) => c.tenantId === tenantId);
  const { yil, ay } = parsePeriod(body.period);

  const result = exportLucaXml(batch, {
    firma: {
      unvan: stub?.firmaUnvan ?? session.tenantName,
      vkn: stub?.firmaVkn ?? "0000000000",
      donemYil: yil,
      donemAy: ay,
    },
    baslangicFisNo: 1,
    metaYaz: true,
  });

  const filename = `luca-${tenantId}-${body.period}.xml`;
  return {
    xml: result.xml,
    filename,
    meta: {
      ok: true,
      filename,
      fisAdedi: result.ozet.fisAdedi,
      toplamBorc: result.ozet.toplamBorc,
      toplamAlacak: result.ozet.toplamAlacak,
      dengeli: result.ozet.dengeli,
      uyarilar: result.uyarilar,
      approvalId: approval?.id,
    },
  };
}
