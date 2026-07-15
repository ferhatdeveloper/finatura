/**
 * Document Agent (Aşama 2.1) çıktısıyla uyumlu noter satış sözleşmesi OCR JSON.
 * Alan adları Türkçe tutulur; İngilizce alias’lar opsiyonel kabul edilir.
 */

export interface NoterParty {
  /** TC Kimlik No (11) veya VKN (10) */
  tcknOrVkn: string;
  unvan?: string;
  adres?: string;
  vergiDairesi?: string;
  telefon?: string;
  email?: string;
}

export interface NoterArac {
  plaka: string;
  saseNo: string;
  motorNo?: string;
  marka?: string;
  model?: string;
  modelYili?: number;
  renk?: string;
}

/**
 * OCR’dan gelen yapısal noter sözleşmesi.
 */
export interface NoterSozlesmeOcr {
  /** Belge / sözleşme no (varsa) */
  sozlesmeNo?: string;
  /** ISO tarih: YYYY-MM-DD */
  sozlesmeTarihi?: string;
  noterUnvani?: string;
  noterIl?: string;

  alici: NoterParty;
  satici: NoterParty;
  arac: NoterArac;

  /** Brüt satış bedeli (KDV dahil veya hariç — bedelTipi ile) */
  satisBedeli: number;
  paraBirimi?: "TRY" | "USD" | "EUR";
  /**
   * Bedelin KDV durumu.
   * - dahil: OCR tutarı KDV dahil (varsayılan galeri pratiği)
   * - hariç: OCR tutarı matrah
   */
  bedelTipi?: "dahil" | "hariç";

  /** Ham OCR güvenirlik skoru 0–1 */
  guvenSkoru?: number;
  kaynakBelgeId?: string;
}

/**
 * Tenant (galeri) firma kimliği — yön tespitinde kullanılır.
 */
export interface TenantParty {
  /** 10 hane VKN veya 11 hane TCKN */
  vknOrTckn: string;
  unvan: string;
  vergiDairesi?: string;
  adres?: string;
  sehir?: string;
  ilce?: string;
  postaKodu?: string;
  ulkeKodu?: string;
  telefon?: string;
  email?: string;
  /**
   * e-Fatura mükellefi ise true → ProfileID TEMELFATURA/TICARIFATURA;
   * değilse e-Arşiv taslağı üretilir.
   */
  eFaturaMukellefi?: boolean;
}

export type BelgeTuru = "efatura" | "earsiv" | "gider_pusulasi";
export type IslemYonu = "satis" | "alis";

export interface TransformOptions {
  /** KDV oranı yüzde (örn. 20). Varsayılan 20. */
  kdvOrani?: number;
  /**
   * İkinci el araçta “fark üzerinden KDV” senaryosu için alış maliyeti.
   * Verilirse matrah = satisBedeli − alisMaliyeti; aksi halde tam bedel üzerinden hesaplanır.
   */
  alisMaliyeti?: number;
  /** Gider pusulasında stopaj oranı yüzde (varsayılan 0 — araç alımında genelde uygulanmaz). */
  stopajOrani?: number;
  /** Belge düzenleme tarihi; yoksa sözleşme tarihi / bugün. */
  issueDate?: string;
  /** Taslak belge numarası (entegratör öncesi geçici). */
  documentNumber?: string;
  /** Zorla belge türü; yoksa tenant kimliğine göre otomatik. */
  forceBelgeTuru?: BelgeTuru;
}
