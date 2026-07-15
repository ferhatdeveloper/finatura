import type { BelgeTuru, IslemYonu } from "../../types/noter-sozlesme.js";
import type { UblInvoiceLine, UblMonetaryTotal, UblTaxTotal } from "./line-and-tax.js";
import type { UblParty } from "./party.js";

/**
 * UBL-TR e-Fatura / e-Arşiv taslak modeli.
 * Entegratör API’sine (Aşama 3.2) serileştirilmeden önce ara katman.
 */
export interface UblTrInvoiceDraft {
  kind: Extract<BelgeTuru, "efatura" | "earsiv">;
  direction: IslemYonu;

  ublVersionId: "2.1";
  customizationId: "TR1.2";
  /** TEMELFATURA | TICARIFATURA | EARSIVFATURA */
  profileId: "TEMELFATURA" | "TICARIFATURA" | "EARSIVFATURA";
  invoiceTypeCode: "SATIS" | "IADE" | "TEVKIFAT" | "ISTISNA";
  documentCurrencyCode: string;

  uuid: string;
  id?: string;
  issueDate: string;
  issueTime?: string;
  note?: string[];

  accountingSupplierParty: UblParty;
  accountingCustomerParty: UblParty;

  taxTotal: UblTaxTotal;
  legalMonetaryTotal: UblMonetaryTotal;
  invoiceLines: UblInvoiceLine[];

  /** Kaynak OCR izi */
  source: {
    documentType: "noter_sozlesme";
    sozlesmeNo?: string;
    kaynakBelgeId?: string;
    plaka: string;
    saseNo: string;
  };
}

/**
 * Persist / UI için sade özet (tenant invoices satırına yakın).
 */
export interface InvoiceDraftSummary {
  kind: BelgeTuru;
  direction: IslemYonu;
  status: "draft";
  uuidEttn: string;
  issueDate: string;
  documentNumber?: string;
  counterpartyTitle: string;
  counterpartyVkn: string;
  currencyCode: string;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  vatRate: number;
  notes?: string;
  metadata: Record<string, unknown>;
}
