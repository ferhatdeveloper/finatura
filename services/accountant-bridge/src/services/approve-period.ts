import { getSession, saveApproval } from "../store/approvals.js";
import type {
  ApprovePeriodRequest,
  ApprovePeriodResponse,
} from "../types.js";

export class ApprovePeriodError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApprovePeriodError";
  }
}

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function approvePeriod(
  body: ApprovePeriodRequest,
): ApprovePeriodResponse {
  if (!body.token || !body.tenantId || !body.period) {
    throw new ApprovePeriodError(
      "token, tenantId ve period zorunlu",
      400,
      "missing_fields",
    );
  }
  if (!PERIOD_RE.test(body.period)) {
    throw new ApprovePeriodError(
      "period YYYY-MM formatında olmalı",
      400,
      "invalid_period",
    );
  }

  const session = getSession(body.token);
  if (!session || session.tenantId !== body.tenantId.trim().toLowerCase()) {
    throw new ApprovePeriodError(
      "Oturum geçersiz veya süresi dolmuş",
      401,
      "invalid_session",
    );
  }

  const includeInvoices = body.includeInvoices !== false;
  const includeBank = body.includeBank !== false;
  if (!includeInvoices && !includeBank) {
    throw new ApprovePeriodError(
      "En az bir kaynak seçilmeli (fatura veya banka)",
      400,
      "empty_selection",
    );
  }

  const approval = saveApproval({
    tenantId: session.tenantId,
    period: body.period,
    includeInvoices,
    includeBank,
    invoiceIds: body.invoiceIds ?? [],
    bankIds: body.bankIds ?? [],
  });

  return { ok: true, approval };
}
