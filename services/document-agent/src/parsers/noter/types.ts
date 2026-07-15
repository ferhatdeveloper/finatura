/**
 * AŞAMA 2.1 — Noter Satış Sözleşmesi OCR sonuç tipleri.
 * Araç alış/satış sözleşmesinden vehicles + cari formlarını besler.
 */

export type NoterBelgeTuru = 'noter_satis_sozlesmesi' | 'unknown';

export interface NoterOcrFields {
  /** TR plaka (normalize: "34 ABC 123") */
  plaka: string | null;
  /** Şasi / VIN (17 karakter, I/O/Q hariç) */
  saseNo: string | null;
  /** Satış bedeli (TL, ondalıklı sayı) */
  satisBedeli: number | null;
  /** Para birimi — varsayılan TRY */
  paraBirimi: 'TRY' | null;
  /** Alıcı TCKN (11 hane) */
  aliciTckn: string | null;
  /** Satıcı TCKN (11 hane) */
  saticiTckn: string | null;
  belgeTuru: NoterBelgeTuru;
}

export interface NoterFieldConfidence {
  plaka: number;
  saseNo: number;
  satisBedeli: number;
  aliciTckn: number;
  saticiTckn: number;
  belgeTuru: number;
}

export interface NoterParseResult {
  fields: NoterOcrFields;
  confidence: NoterFieldConfidence;
  /** Genel güven skoru 0–1 */
  overallConfidence: number;
  extractedBy: Partial<Record<keyof NoterOcrFields, 'regex' | 'llm'>>;
  rawText?: string;
  warnings: string[];
}

export interface NoterParseOptions {
  /** LLM çağrısı için opsiyonel sağlayıcı (iskelet) */
  llmExtractor?: (
    prompt: string,
    ocrText: string,
  ) => Promise<Partial<NoterOcrFields>>;
  /** Regex yetersizse LLM'e düş */
  preferLlmFallback?: boolean;
  minOverallConfidence?: number;
}
