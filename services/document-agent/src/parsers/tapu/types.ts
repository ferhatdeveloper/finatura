/**
 * AŞAMA 2.2 — Tapu Senedi OCR sonuç tipleri.
 * packages/shared-types `tapuOcrFieldsSchema` ile hizalı.
 */

export interface TapuOcrFields {
  /** İl */
  city: string | null;
  /** İlçe */
  district: string | null;
  /** Mahalle / Köy */
  neighborhood: string | null;
  /** Ada */
  ada: string | null;
  /** Parsel */
  parsel: string | null;
  /** Yüzölçümü (m²) */
  areaSqm: number | null;
  /** Malik adı-soyadı / unvan */
  ownerName: string | null;
  /** Malik TCKN / vergi no */
  ownerIdentity: string | null;
  /** Nitelik (arsa, mesken, vb.) */
  propertyType: string | null;
  /** Blok no */
  blockNumber: string | null;
  /** Bağımsız bölüm no */
  independentSection: string | null;
}

export type TapuFieldKey = keyof TapuOcrFields;

export type FieldConfidence = Record<TapuFieldKey, number>;

export type ExtractionSource = 'regex' | 'llm';

export interface TapuParseResult {
  fields: TapuOcrFields;
  confidence: FieldConfidence;
  /** Genel güven skoru 0–1 */
  overallConfidence: number;
  extractedBy: Partial<Record<TapuFieldKey, ExtractionSource>>;
  rawText?: string;
  warnings: string[];
}

export interface TapuParseOptions {
  /** LLM çağrısı için opsiyonel sağlayıcı (iskelet) */
  llmExtractor?: (
    prompt: string,
    ocrText: string,
  ) => Promise<Partial<TapuOcrFields>>;
  /** Regex yetersizse LLM'e düş */
  preferLlmFallback?: boolean;
  minOverallConfidence?: number;
}
