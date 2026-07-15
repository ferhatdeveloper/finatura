import type { IslemYonu } from "../../types/noter-sozlesme.js";
import type { UblInvoiceLine, UblMonetaryTotal, UblTaxTotal } from "./line-and-tax.js";
import type { UblParty } from "./party.js";

/**
 * Gider Pusulası taslak modeli (şahıstan alış).
 * UBL-TR fatura şemasına yakın alanlarla; entegratör adapter’ı (3.2) kendi payload’ına map eder.
 */
export interface GiderPusulasiDraft {
  kind: "gider_pusulasi";
  direction: Extract<IslemYonu, "alis">;

  ublVersionId: "2.1";
  customizationId: "TR1.2";
  profileId: "GIDERPUSULASI";
  invoiceTypeCode: "SATIS";
  documentCurrencyCode: string;

  uuid: string;
  id?: string;
  issueDate: string;
  note?: string[];

  /** Malı satan şahıs */
  accountingSupplierParty: UblParty;
  /** Alan mükellef (galeri) */
  accountingCustomerParty: UblParty;

  taxTotal: UblTaxTotal;
  /** Stopaj varsa (hizmet senaryoları); araçta genelde 0 */
  withholdingTaxTotal?: UblTaxTotal;
  legalMonetaryTotal: UblMonetaryTotal;
  invoiceLines: UblInvoiceLine[];

  source: {
    documentType: "noter_sozlesme";
    sozlesmeNo?: string;
    kaynakBelgeId?: string;
    plaka: string;
    saseNo: string;
  };
}

export type TransformResult =
  | { belgeTuru: "efatura" | "earsiv"; draft: import("./efatura-draft.js").UblTrInvoiceDraft; summary: import("./efatura-draft.js").InvoiceDraftSummary }
  | { belgeTuru: "gider_pusulasi"; draft: GiderPusulasiDraft; summary: import("./efatura-draft.js").InvoiceDraftSummary };
