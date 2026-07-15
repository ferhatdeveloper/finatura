import type {
  BankTransactionInput,
  InvoiceInput,
} from "@finatura/luca-agent";

/** Portal mock / demo ile uyumlu örnek parti (dönem 2026-07). */
export const DEMO_INVOICES: InvoiceInput[] = [
  {
    id: "o1",
    kind: "efatura",
    direction: "sales",
    documentNumber: "FTA2026000124",
    issueDate: "2026-07-03",
    counterpartyTitle: "Ahmet Yılmaz",
    counterpartyVkn: "12345678901",
    netTotal: 493220.34,
    vatTotal: 88779.66,
    grandTotal: 582000,
    vatRate: 18,
    cariHesapEki: "01.001",
  },
  {
    id: "o2",
    kind: "gider_pusulasi",
    direction: "purchase",
    documentNumber: "GP-2026-0041",
    issueDate: "2026-07-02",
    counterpartyTitle: "Mehmet Demir",
    counterpartyVkn: "98765432109",
    netTotal: 350625,
    vatTotal: 0,
    grandTotal: 280500,
    stopajAmount: 70125,
    cariHesapEki: "01.010",
  },
  {
    id: "o3",
    kind: "efatura",
    direction: "sales",
    documentNumber: "FTA2026000140",
    issueDate: "2026-07-11",
    counterpartyTitle: "Marmara Emlak Danışmanlık",
    netTotal: 86440.68,
    vatTotal: 15559.32,
    grandTotal: 102000,
    vatRate: 18,
    cariHesapEki: "01.020",
  },
  {
    id: "o5",
    kind: "gider_pusulasi",
    direction: "purchase",
    documentNumber: "GP-2026-0048",
    issueDate: "2026-07-13",
    counterpartyTitle: "Can Oto Servis",
    netTotal: 522750,
    vatTotal: 0,
    grandTotal: 418200,
    stopajAmount: 104550,
    cariHesapEki: "01.011",
  },
  {
    id: "o6",
    kind: "efatura",
    direction: "sales",
    documentNumber: "FTA2026000160",
    issueDate: "2026-07-14",
    counterpartyTitle: "Pırlanta Altın",
    netTotal: 75457.63,
    vatTotal: 13582.37,
    grandTotal: 89040,
    vatRate: 18,
    cariHesapEki: "01.030",
  },
];

export const DEMO_BANK: BankTransactionInput[] = [
  {
    id: "o4",
    direction: "inbound",
    amount: 126500,
    transactionAt: "2026-07-08T11:00:00+03:00",
    valueDate: "2026-07-08",
    counterpartyName: "Pırlanta Altın Kuyumculuk",
    description: "MUT-2026-07-W2 mutabakat",
    bankName: "Ziraat",
    matchedInvoiceDocumentNumber: "FTA2026000131",
    cariHesapEki: "01.030",
  },
];

export function filterBatch(opts: {
  includeInvoices: boolean;
  includeBank: boolean;
  invoiceIds?: string[];
  bankIds?: string[];
}): { invoices: InvoiceInput[]; bankTransactions: BankTransactionInput[] } {
  let invoices = opts.includeInvoices ? [...DEMO_INVOICES] : [];
  let bankTransactions = opts.includeBank ? [...DEMO_BANK] : [];

  if (opts.invoiceIds?.length) {
    const set = new Set(opts.invoiceIds);
    invoices = invoices.filter((i) => set.has(i.id));
  }
  if (opts.bankIds?.length) {
    const set = new Set(opts.bankIds);
    bankTransactions = bankTransactions.filter((b) => set.has(b.id));
  }

  return { invoices, bankTransactions };
}
