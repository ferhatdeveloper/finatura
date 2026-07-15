import type { SessionUser } from "./client";

export interface CariSummary {
  cariCount: number;
  openVeresiyeCount: number;
  openDebitTry: number;
  openCreditTry: number;
  topCaris: Array<{
    id: string;
    title: string;
    openBalance: number;
    currencyCode: string;
  }>;
}

export interface SettlementItem {
  id: string;
  bankAccountAlias: string;
  direction: "inbound" | "outbound";
  amount: number;
  currencyCode: string;
  transactionAt: string;
  matchStatus: "unmatched" | "matched" | "ignored";
  counterpartyName?: string;
  description?: string;
}

export interface EinvoiceDraft {
  id: string;
  draftNo: string;
  counterpartyTitle: string;
  amount: number;
  currencyCode: string;
  status: "draft" | "ready" | "sent";
  createdAt: string;
  documentHint?: string;
}

export interface AnalyzeResult {
  documentType: string;
  confidence: number;
  source: "live" | "mock";
  fields: Record<string, string | number | null>;
  raw?: unknown;
}

export const MOCK_DEMO = {
  email: "demo@finatura.app",
  password: "demo1234",
  firmaKodu: "ornek",
} as const;

export function mockLogin(
  email: string,
  password: string,
  firmaKodu: string,
): SessionUser {
  const okEmail = email.trim().toLowerCase() === MOCK_DEMO.email;
  const okPass = password === MOCK_DEMO.password;
  const okFirm =
    firmaKodu.trim().toLowerCase() === MOCK_DEMO.firmaKodu ||
    firmaKodu.trim().toLowerCase() === "demo";

  if (!okEmail || !okPass || !okFirm) {
    throw new Error(
      "E-posta, şifre veya firma kodu hatalı (demo: demo@finatura.app / demo1234 / ornek)",
    );
  }

  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: MOCK_DEMO.email,
    displayName: "Finatura Demo",
    tenantId: "00000000-0000-4000-8000-0000000000aa",
    tenantSlug: "ornek",
    role: "owner",
  };
}

export function mockCariSummary(): CariSummary {
  return {
    cariCount: 48,
    openVeresiyeCount: 7,
    openDebitTry: 312500.5,
    openCreditTry: 45000,
    topCaris: [
      {
        id: "cari-ay",
        title: "Ahmet Yılmaz",
        openBalance: 185000,
        currencyCode: "TRY",
      },
      {
        id: "cari-sk",
        title: "Selin Karaca",
        openBalance: 42500.5,
        currencyCode: "TRY",
      },
      {
        id: "cari-ht",
        title: "Altın Has Takas",
        openBalance: 98000,
        currencyCode: "TRY",
      },
    ],
  };
}

export function mockSettlements(): SettlementItem[] {
  return [
    {
      id: "btx-001",
      bankAccountAlias: "Garanti İşletme",
      direction: "inbound",
      amount: 185000,
      currencyCode: "TRY",
      transactionAt: "2026-07-14T11:22:00",
      matchStatus: "unmatched",
      counterpartyName: "AHMET YILMAZ",
      description: "34 ABC 123 kapora / AHMET YILMAZ",
    },
    {
      id: "btx-002",
      bankAccountAlias: "Yapı Kredi TL",
      direction: "inbound",
      amount: 42500.5,
      currencyCode: "TRY",
      transactionAt: "2026-07-13T16:05:00",
      matchStatus: "unmatched",
      counterpartyName: "SELİN KARACA",
      description: "Ada 412 Parsel 7 bakiye",
    },
    {
      id: "btx-003",
      bankAccountAlias: "Garanti İşletme",
      direction: "inbound",
      amount: 98000,
      currencyCode: "TRY",
      transactionAt: "2026-07-12T09:40:00",
      matchStatus: "unmatched",
      counterpartyName: "ALTIN HAS TAKAS",
      description: "Has 12.40 gr karşılığı havale",
    },
    {
      id: "btx-004",
      bankAccountAlias: "Garanti İşletme",
      direction: "outbound",
      amount: 12500,
      currencyCode: "TRY",
      transactionAt: "2026-07-11T14:10:00",
      matchStatus: "matched",
      counterpartyName: "NOTER ÖDEMESİ",
      description: "Noter harç",
    },
  ];
}

export function mockEinvoiceDrafts(): EinvoiceDraft[] {
  return [
    {
      id: "inv-d-01",
      draftNo: "DRAFT-2026-0142",
      counterpartyTitle: "Ahmet Yılmaz",
      amount: 185000,
      currencyCode: "TRY",
      status: "ready",
      createdAt: "2026-07-14T12:01:00",
      documentHint: "noter",
    },
    {
      id: "inv-d-02",
      draftNo: "DRAFT-2026-0141",
      counterpartyTitle: "Selin Karaca",
      amount: 42500.5,
      currencyCode: "TRY",
      status: "draft",
      createdAt: "2026-07-13T17:20:00",
      documentHint: "tapu",
    },
    {
      id: "inv-d-03",
      draftNo: "DRAFT-2026-0138",
      counterpartyTitle: "Has Altın Ltd.",
      amount: 64000,
      currencyCode: "TRY",
      status: "draft",
      createdAt: "2026-07-10T09:05:00",
      documentHint: "gider",
    },
  ];
}

export function mockAnalyze(fileName: string): AnalyzeResult {
  const lower = fileName.toLowerCase();
  const type = lower.includes("tapu")
    ? "tapu"
    : lower.includes("kimlik") || lower.includes("tc")
      ? "kimlik"
      : "noter";

  if (type === "kimlik") {
    return {
      documentType: "kimlik",
      confidence: 0.91,
      source: "mock",
      fields: {
        soyad: "YILMAZ",
        ad: "AHMET",
        tckn: "10000000146",
        dogumTarihi: "01.01.1990",
      },
    };
  }
  if (type === "tapu") {
    return {
      documentType: "tapu",
      confidence: 0.88,
      source: "mock",
      fields: {
        ada: "412",
        parsel: "7",
        il: "İstanbul",
        malik: "SELİN KARACA",
      },
    };
  }
  return {
    documentType: "noter",
    confidence: 0.94,
    source: "mock",
    fields: {
      plaka: "34 ABC 123",
      alici: "AHMET YILMAZ",
      satici: "GALERİ DEMO A.Ş.",
      bedel: 185000,
      paraBirimi: "TRY",
    },
  };
}
