import { apiConfig, endpoints } from "./config";
import { gatewayFetch, loadSession } from "./client";
import {
  mockCariSummary,
  mockEinvoiceDrafts,
  mockSettlements,
  type CariSummary,
  type EinvoiceDraft,
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

/** GET /v1/tenant/settlements */
export async function fetchSettlements(): Promise<SettlementItem[]> {
  if (apiConfig.useMock) {
    await delay(280);
    return mockSettlements();
  }
  const data = await gatewayFetch<SettlementItem[] | { items: SettlementItem[] }>(
    endpoints.settlements,
    { method: "GET", ...authHeaders() },
  );
  return Array.isArray(data) ? data : data.items;
}

/** GET /v1/tenant/einvoices/drafts */
export async function fetchEinvoiceDrafts(): Promise<EinvoiceDraft[]> {
  if (apiConfig.useMock) {
    await delay(280);
    return mockEinvoiceDrafts();
  }
  const data = await gatewayFetch<EinvoiceDraft[] | { items: EinvoiceDraft[] }>(
    endpoints.einvoiceDrafts,
    { method: "GET", ...authHeaders() },
  );
  return Array.isArray(data) ? data : data.items;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
