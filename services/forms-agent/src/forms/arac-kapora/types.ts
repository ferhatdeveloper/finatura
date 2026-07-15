import type { FormMeta, FormParty, TenantLetterhead } from "../../types.js";

/** Oto galeri — araç kapora / ön ödeme formu veri modeli. */
export interface AracKaporaVehicle {
  plate?: string;
  vin?: string;
  brand: string;
  model: string;
  modelYear?: number;
  color?: string;
  km?: number;
  fuelType?: string;
  gearType?: string;
  engineNo?: string;
}

export interface AracKaporaFormData {
  meta: FormMeta;
  letterhead: TenantLetterhead;
  /** Galeri / satıcı */
  seller: FormParty & { companyTitle?: string };
  /** Kapora ödeyen alıcı adayı */
  buyer: FormParty;
  vehicle: AracKaporaVehicle;
  deposit: {
    amountTry: number;
    currency?: "TRY";
    paymentMethod?: "nakit" | "havale" | "eft" | "kredi_karti" | "diger";
    bankRef?: string;
    /** Kararlaştırılan toplam satış bedeli (opsiyonel) */
    agreedSalePriceTry?: number;
    /** Kapora iade / cayma koşulları özeti */
    refundPolicy?: string;
    holdUntil?: string; // YYYY-MM-DD
  };
  terms: {
    extraClauses?: string[];
  };
  signatures?: {
    sellerSignedAt?: string;
    buyerSignedAt?: string;
  };
}
