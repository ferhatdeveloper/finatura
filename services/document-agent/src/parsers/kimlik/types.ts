/**
 * AŞAMA 2.3 — Kimlik / Ehliyet OCR sonuç tipleri.
 * Yeni cari açılışında forma doldurulacak alanlar.
 */

export type KimlikBelgeTuru = 'tc_kimlik' | 'ehliyet' | 'unknown';

export interface KimlikOcrFields {
  /** 11 haneli T.C. Kimlik Numarası */
  tckn: string | null;
  /** Ad (birden fazla ön ad olabilir) */
  ad: string | null;
  /** Soyad */
  soyad: string | null;
  /** Birleşik görüntüleme: "AD SOYAD" */
  adSoyad: string | null;
  /** ISO 8601 tarih (YYYY-MM-DD) */
  dogumTarihi: string | null;
  belgeTuru: KimlikBelgeTuru;
  /** Ehliyet belge / sürücü belgesi no (alan 5) */
  ehliyetNo: string | null;
  /** Sınıf / kategoriler (alan 9), örn. B, A1 */
  sinif: string | null;
  /** Veriliş tarihi (4a) ISO */
  verilisTarihi: string | null;
  /** Geçerlilik / bitiş tarihi (4b) ISO */
  bitisTarihi: string | null;
}

export interface FieldConfidence {
  tckn: number;
  ad: number;
  soyad: number;
  dogumTarihi: number;
  belgeTuru: number;
  ehliyetNo: number;
  sinif: number;
  verilisTarihi: number;
  bitisTarihi: number;
}

export interface KimlikParseResult {
  fields: KimlikOcrFields;
  confidence: FieldConfidence;
  /** Genel güven skoru 0–1 */
  overallConfidence: number;
  /** Regex ile bulunan alanlar */
  extractedBy: Partial<Record<keyof KimlikOcrFields, 'regex' | 'llm' | 'mrz'>>;
  rawText?: string;
  warnings: string[];
}

export interface KimlikParseOptions {
  /** LLM çağrısı için opsiyonel sağlayıcı (kapalı varsayılan) */
  llmExtractor?: (prompt: string, ocrText: string) => Promise<Partial<KimlikOcrFields>>;
  /** Regex yetersizse LLM'e düş */
  preferLlmFallback?: boolean;
  minOverallConfidence?: number;
  /** İstemci "Ehliyet" seçtiyse belge türünü zorla */
  forceBelgeTuru?: KimlikBelgeTuru;
}
