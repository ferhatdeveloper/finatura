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
}

export interface FieldConfidence {
  tckn: number;
  ad: number;
  soyad: number;
  dogumTarihi: number;
  belgeTuru: number;
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
  /** LLM çağrısı için opsiyonel sağlayıcı (iskelet) */
  llmExtractor?: (prompt: string, ocrText: string) => Promise<Partial<KimlikOcrFields>>;
  /** Regex yetersizse LLM'e düş */
  preferLlmFallback?: boolean;
  minOverallConfidence?: number;
}
