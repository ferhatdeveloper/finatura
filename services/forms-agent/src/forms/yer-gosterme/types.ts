import type { FormMeta, FormParty, TenantLetterhead } from "../../types.js";

/** Emlak — yer gösterme (gösterim) belgesi veri modeli. */
export interface YerGostermeProperty {
  title?: string;
  /** İl / ilçe / mahalle satırı */
  locationText: string;
  ada?: string;
  parsel?: string;
  block?: string;
  independentSection?: string;
  netM2?: number;
  grossM2?: number;
  propertyType?: "konut" | "isyeri" | "arsa" | "diger";
  listingNo?: string;
  askingPriceTry?: number;
}

export interface YerGostermeFormData {
  meta: FormMeta;
  letterhead: TenantLetterhead;
  /** Gayrimenkulü gösteren emlak ofisi / danışman */
  broker: FormParty & { companyTitle?: string; licenseNo?: string };
  /** Yer gösterilen müşteri */
  client: FormParty;
  /** Malikin bilgisi (opsiyonel) */
  owner?: FormParty;
  property: YerGostermeProperty;
  /** Komisyon / gizlilik / süre maddeleri */
  terms: {
    commissionNote?: string;
    validityDays?: number;
    confidentiality?: boolean;
    extraClauses?: string[];
  };
  /** İmza alanları için boş bırakılabilir */
  signatures?: {
    brokerSignedAt?: string;
    clientSignedAt?: string;
  };
}
