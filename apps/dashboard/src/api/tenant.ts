import { apiConfig, endpoints } from "./config";
import { gatewayFetch, loadSession } from "./client";
import {
  mockCariSummary,
  mockCariOptions,
  mockEinvoiceDrafts,
  mockSettlements,
  type CariOption,
  type CariSummary,
  type EinvoiceDraft,
  type ManualCariMovementInput,
  type SettlementItem,
} from "./mock";

function authHeaders() {
  const s = loadSession();
  return {
    token: s?.accessToken ?? null,
    tenantId: s?.user.tenantId ?? null,
  };
}

/** GET /v1/tenant/caris/summary */
export async function fetchCariSummary(): Promise<CariSummary> {
  if (apiConfig.useMock) {
    await delay(280);
    return mockCariSummary();
  }
  return gatewayFetch<CariSummary>(endpoints.cariSummary, {
    method: "GET",
    ...authHeaders(),
  });
}

/** GET /v1/tenant/caris */
export async function fetchCariOptions(): Promise<CariOption[]> {
  if (apiConfig.useMock) {
    await delay(180);
    return mockCariOptions();
  }
  const data = await gatewayFetch<CariOption[] | { items: CariOption[] }>(
    endpoints.caris,
    {
      method: "GET",
      ...authHeaders(),
    },
  );
  return Array.isArray(data) ? data : data.items;
}

/** POST /v1/tenant/veresiye-transactions/manual */
export async function createManualCariMovement(
  input: ManualCariMovementInput,
): Promise<void> {
  if (apiConfig.useMock) {
    await delay(220);
    return;
  }
  await gatewayFetch(endpoints.manualCariMovement, {
    method: "POST",
    body: JSON.stringify(input),
    ...authHeaders(),
  });
}

/** GET /v1/tenant/bank-transactions — mutabakat listesi */
export async function fetchSettlements(): Promise<SettlementItem[]> {
  if (apiConfig.useMock) {
    await delay(280);
    return mockSettlements();
  }
  const qs = new URLSearchParams({ matchStatus: "all", limit: "100" });
  const data = await gatewayFetch<
    SettlementItem[] | { items: Array<Record<string, unknown>> }
  >(`${endpoints.bankTransactions}?${qs}`, {
    method: "GET",
    ...authHeaders(),
  });
  const items = Array.isArray(data) ? data : data.items;
  return items.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      bankAccountAlias: String(r.bankAccountAlias ?? r.bank_account_alias ?? ""),
      direction: (r.direction === "outbound" ? "outbound" : "inbound") as
        | "inbound"
        | "outbound",
      amount: Number(r.amount ?? 0),
      currencyCode: String(r.currencyCode ?? r.currency_code ?? "TRY"),
      transactionAt: String(r.transactionAt ?? r.transaction_at ?? ""),
      matchStatus: (["matched", "ignored"].includes(String(r.matchStatus ?? r.match_status))
        ? String(r.matchStatus ?? r.match_status)
        : "unmatched") as "unmatched" | "matched" | "ignored",
      counterpartyName:
        typeof r.counterpartyName === "string"
          ? r.counterpartyName
          : typeof r.counterparty_name === "string"
            ? r.counterparty_name
            : undefined,
      description:
        typeof r.description === "string" ? r.description : undefined,
    };
  });
}

/** GET /v1/tenant/invoices?status=draft — e-fatura taslakları */
export async function fetchEinvoiceDrafts(): Promise<EinvoiceDraft[]> {
  if (apiConfig.useMock) {
    await delay(280);
    return mockEinvoiceDrafts();
  }
  const qs = new URLSearchParams({
    status: "draft,queued",
    kind: "efatura,earsiv",
    limit: "100",
  });
  const data = await gatewayFetch<
    EinvoiceDraft[] | { items: Array<Record<string, unknown>> }
  >(`${endpoints.invoices}?${qs}`, {
    method: "GET",
    ...authHeaders(),
  });
  const items = Array.isArray(data) ? data : data.items;
  return items.map((raw) => {
    const r = raw as Record<string, unknown>;
    const statusRaw = String(r.status ?? "draft");
    const status = (
      statusRaw === "sent" || statusRaw === "accepted"
        ? "sent"
        : statusRaw === "queued"
          ? "ready"
          : "draft"
    ) as EinvoiceDraft["status"];
    return {
      id: String(r.id ?? ""),
      draftNo: String(r.documentNumber ?? r.document_number ?? r.draftNo ?? r.id ?? ""),
      counterpartyTitle: String(
        r.counterpartyTitle ?? r.counterparty_title ?? "",
      ),
      amount: Number(r.grandTotal ?? r.grand_total ?? r.amount ?? 0),
      currencyCode: String(r.currencyCode ?? r.currency_code ?? "TRY"),
      status,
      createdAt: String(r.issueDate ?? r.issue_date ?? r.createdAt ?? ""),
      documentHint:
        typeof r.kind === "string" ? String(r.kind) : undefined,
    };
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
