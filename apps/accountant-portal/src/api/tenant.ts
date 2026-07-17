import { endpoints } from "./config";
import { gatewayFetch } from "./client";
import {
  currentPeriod,
  mapInvoiceKind,
  mapInvoiceStatus,
  type BankaHareketi,
  type FaturaKaydi,
  type GiderPusulasi,
  type OnayBekleyen,
} from "../data/types";

interface InvoiceApiItem {
  id: string;
  kind: string;
  direction: string;
  status: string;
  documentNumber?: string | null;
  issueDate?: string;
  counterpartyTitle?: string | null;
  netTotal?: number;
  vatTotal?: number;
  grandTotal?: number;
  notes?: string | null;
}

interface BankApiItem {
  id: string;
  bankAccountAlias?: string;
  direction?: string;
  amount?: number;
  transactionAt?: string;
  matchStatus?: string;
  counterpartyName?: string | null;
  description?: string | null;
  matchedCariId?: string | null;
}

function periodParam(period?: string): string {
  return period ?? currentPeriod();
}

export async function fetchFaturalar(period?: string): Promise<FaturaKaydi[]> {
  const qs = new URLSearchParams({
    kind: "efatura,earsiv",
    period: periodParam(period),
    limit: "200",
  });
  const data = await gatewayFetch<{ items: InvoiceApiItem[] }>(
    `${endpoints.invoices}?${qs}`,
    { method: "GET" },
  );
  return (data.items ?? []).map((i) => ({
    id: i.id,
    belgeNo: i.documentNumber ?? i.id.slice(0, 8).toUpperCase(),
    tarih: i.issueDate ?? "",
    mukellef: i.counterpartyTitle ?? "—",
    sektor: "—",
    tip: mapInvoiceKind(i.kind, i.direction),
    tutar: Number(i.netTotal ?? 0),
    kdv: Number(i.vatTotal ?? 0),
    durum: mapInvoiceStatus(i.status),
  }));
}

export async function fetchGiderPusulalari(
  period?: string,
): Promise<GiderPusulasi[]> {
  const qs = new URLSearchParams({
    kind: "gider_pusulasi",
    period: periodParam(period),
    limit: "200",
  });
  const data = await gatewayFetch<{ items: InvoiceApiItem[] }>(
    `${endpoints.invoices}?${qs}`,
    { method: "GET" },
  );
  return (data.items ?? []).map((i) => ({
    id: i.id,
    pusulaNo: i.documentNumber ?? i.id.slice(0, 8).toUpperCase(),
    tarih: i.issueDate ?? "",
    mukellef: i.counterpartyTitle ?? "—",
    aciklama: i.notes ?? "",
    tutar: Number(i.grandTotal ?? i.netTotal ?? 0),
    stopaj: 0,
    durum: mapInvoiceStatus(i.status),
  }));
}

export async function fetchBankaHareketleri(): Promise<BankaHareketi[]> {
  const qs = new URLSearchParams({ matchStatus: "all", limit: "200" });
  const data = await gatewayFetch<{ items: BankApiItem[] }>(
    `${endpoints.bankTransactions}?${qs}`,
    { method: "GET" },
  );
  return (data.items ?? []).map((b) => ({
    id: b.id,
    tarih: (b.transactionAt ?? "").slice(0, 10),
    banka: b.bankAccountAlias ?? "Banka",
    aciklama: b.description ?? b.counterpartyName ?? "",
    tutar: Number(b.amount ?? 0),
    yon: b.direction === "outbound" ? "cikis" : "giris",
    eslesenBelge: b.matchedCariId ?? undefined,
    mutabik: b.matchStatus === "matched" || b.matchStatus === "ignored",
  }));
}

/** Onay kuyruğu: bekleyen fatura/pusula + eşleşmeyen banka. */
export async function fetchOnayKuyrugu(
  period?: string,
): Promise<OnayBekleyen[]> {
  const [faturalar, pusulalar, bankalar] = await Promise.all([
    fetchFaturalar(period),
    fetchGiderPusulalari(period),
    fetchBankaHareketleri(),
  ]);

  const out: OnayBekleyen[] = [];

  for (const f of faturalar.filter((x) => x.durum === "beklemede" || x.durum === "taslak")) {
    out.push({
      id: f.id,
      tip: "Fatura",
      referans: f.belgeNo,
      mukellef: f.mukellef,
      tutar: f.tutar + f.kdv,
      tarih: f.tarih,
    });
  }
  for (const g of pusulalar.filter((x) => x.durum === "beklemede" || x.durum === "taslak")) {
    out.push({
      id: g.id,
      tip: "Gider Pusulası",
      referans: g.pusulaNo,
      mukellef: g.mukellef,
      tutar: g.tutar,
      tarih: g.tarih,
    });
  }
  for (const b of bankalar.filter((x) => !x.mutabik)) {
    out.push({
      id: b.id,
      tip: "Banka Mutabakat",
      referans: b.id.slice(0, 8).toUpperCase(),
      mukellef: b.aciklama || b.banka,
      tutar: b.tutar,
      tarih: b.tarih,
    });
  }

  return out.sort((a, b) => b.tarih.localeCompare(a.tarih));
}
