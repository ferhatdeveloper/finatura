import { endpoints } from "./config";
import { gatewayFetch } from "./client";

function qs(period: string): string {
  return new URLSearchParams({ period }).toString();
}

export interface OverviewReport {
  period: string;
  generatedAt: string;
  invoices: {
    totalCount: number;
    totalVat: number;
    totalGrand: number;
    byKindStatus: Array<{
      kind: string;
      status: string;
      count: number;
      netTotal: number;
      vatTotal: number;
      grandTotal: number;
    }>;
  };
  bank: {
    totalCount: number;
    matchedCount: number;
    unmatchedCount: number;
    matchRatePercent: number;
  };
  veresiye: {
    openDebitTry: number;
    openCreditTry: number;
    netOpenTry: number;
    transactionCount: number;
  };
  cariActiveCount: number;
}

export async function fetchOverviewReport(
  period: string,
): Promise<OverviewReport> {
  return gatewayFetch(`${endpoints.reportsOverview}?${qs(period)}`, {
    method: "GET",
  });
}

export async function fetchInvoiceReport(period: string) {
  return gatewayFetch<{
    period: string;
    items: Array<Record<string, unknown>>;
    totals: {
      count: number;
      netTotal: number;
      vatTotal: number;
      grandTotal: number;
    };
  }>(`${endpoints.reportsInvoices}?${qs(period)}`, { method: "GET" });
}

export async function fetchBankReport(period: string) {
  return gatewayFetch<{
    period: string;
    items: Array<Record<string, unknown>>;
    summary: {
      total: number;
      matched: number;
      unmatched: number;
      ignored: number;
      matchRatePercent: number;
      unmatchedAmount: number;
      matchedAmount: number;
    };
  }>(`${endpoints.reportsBank}?${qs(period)}`, { method: "GET" });
}

export async function fetchVeresiyeAgingReport() {
  return gatewayFetch<{
    items: Array<{
      cariId: string;
      cariTitle: string;
      openBalance: number;
      agingDays: number;
      bucket: string;
    }>;
    bucketTotals: Record<string, number>;
    totalOpen: number;
  }>(endpoints.reportsVeresiye, { method: "GET" });
}

export async function fetchKdvReport(period: string) {
  return gatewayFetch<{
    period: string;
    lines: Array<Record<string, unknown>>;
    summary: {
      salesVat: number;
      purchaseVat: number;
      netVatPayable: number;
    };
  }>(`${endpoints.reportsKdv}?${qs(period)}`, { method: "GET" });
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
