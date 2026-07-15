/**
 * AŞAMA 5.1 — Luca yevmiye fişi XML aktarım tipleri.
 * Kaynak: tenant_template `invoices` + `bank_transactions`.
 */

export type InvoiceKind = 'efatura' | 'earsiv' | 'gider_pusulasi';
export type InvoiceDirection = 'sales' | 'purchase';
export type BankTxDirection = 'inbound' | 'outbound';

/** Luca fiş tipi — Excel Veri Aktarımı / Fiş Kes ekranı ile uyumlu */
export type LucaFisTipi = 'Mahsup' | 'Acilis' | 'Kapanis';

/** Belge türü etiketi (fiş üst bilgisi) */
export type LucaBelgeTuru =
  | 'e-Fatura'
  | 'e-Arsiv'
  | 'Gider Pusulasi'
  | 'Banka'
  | 'Diger';

export type ExportKaynak =
  | 'efatura'
  | 'earsiv'
  | 'gider_pusulasi'
  | 'banka_gelen'
  | 'banka_giden';

/** tenant_template.invoices satırından gelen giriş */
export interface InvoiceInput {
  id: string;
  kind: InvoiceKind;
  direction: InvoiceDirection;
  documentNumber?: string | null;
  uuidEttn?: string | null;
  issueDate: string; // YYYY-MM-DD
  counterpartyTitle?: string | null;
  counterpartyVkn?: string | null;
  currencyCode?: string;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  vatRate?: number | null;
  /** Gider pusulası stopaj tutarı (TL); yoksa net üzerinden hesaplanır */
  stopajAmount?: number | null;
  stopajRate?: number | null;
  notes?: string | null;
  /** Cari alt hesap eki: örn. "001" → 120.01.001 */
  cariHesapEki?: string | null;
}

/** tenant_template.bank_transactions + bank_accounts özeti */
export interface BankTransactionInput {
  id: string;
  direction: BankTxDirection;
  amount: number;
  currencyCode?: string;
  transactionAt: string; // ISO date veya timestamptz
  valueDate?: string | null;
  counterpartyName?: string | null;
  counterpartyIban?: string | null;
  description?: string | null;
  bankName?: string | null;
  iban?: string | null;
  matchedInvoiceDocumentNumber?: string | null;
  cariHesapEki?: string | null;
}

export interface FirmaBilgisi {
  unvan: string;
  vkn: string;
  donemYil: number;
  donemAy: number; // 1–12
}

/**
 * Tekdüzen hesap planı eşlemesi.
 * Mali müşavir firmanın planına göre override edilebilir.
 */
export interface AccountMap {
  /** 120 Alıcılar (ana) */
  alicilar: string;
  /** 320 Satıcılar */
  saticilar: string;
  /** 600 Yurtiçi Satışlar */
  yurticiSatislar: string;
  /** 153 Ticari Mallar (galeri stok / emlak maliyet) */
  ticariMallar: string;
  /** 391 Hesaplanan KDV */
  hesaplananKdv: string;
  /** 191 İndirilecek KDV */
  indirilecekKdv: string;
  /** 360 Ödenecek Vergi ve Fonlar (stopaj) */
  odenecekVergi: string;
  /** 102 Bankalar */
  bankalar: string;
  /** 100 Kasa (opsiyonel yedek) */
  kasa: string;
  /** 770 Genel Yönetim Giderleri (fallback alış) */
  genelGider: string;
}

export interface LucaFisSatir {
  siraNo: number;
  hesapKodu: string;
  hesapAdi?: string;
  evrakNo?: string;
  evrakTarihi?: string; // YYYY-MM-DD
  aciklama: string;
  borc: number;
  alacak: number;
  miktar?: number;
}

export interface LucaFis {
  fisNo: number;
  fisTarihi: string; // YYYY-MM-DD
  fisTipi: LucaFisTipi;
  fisKodu: string;
  belgeTuru: LucaBelgeTuru;
  aciklama: string;
  kaynak: ExportKaynak;
  kaynakId: string;
  satirlar: LucaFisSatir[];
}

export interface LucaExportOptions {
  firma: FirmaBilgisi;
  accountMap?: Partial<AccountMap>;
  /** İlk fiş numarası (varsayılan 1) */
  baslangicFisNo?: number;
  /**
   * Gider pusulası varsayılan stopaj oranı (örn. 0.20).
   * `stopajAmount` yoksa net × oran kullanılır.
   */
  varsayilanStopajOrani?: number;
  /** XML içine Finatura üretici meta yazılsın mı */
  metaYaz?: boolean;
}

export interface LucaExportResult {
  fisler: LucaFis[];
  xml: string;
  ozet: {
    fisAdedi: number;
    toplamBorc: number;
    toplamAlacak: number;
    dengeli: boolean;
  };
  uyarilar: string[];
}
