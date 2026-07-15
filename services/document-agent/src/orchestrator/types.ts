/**
 * Orkestrasyon katmanı — ortak tipler.
 * Parser implementasyonları `src/parsers/*` altında ayrı ajanlara aittir.
 */

export type DocumentType = 'noter' | 'tapu' | 'kimlik' | 'unknown';

export interface DocumentInput {
  /** Yüklenen dosya tamponu (opsiyonel; OCR stub aşamasında) */
  buffer?: Buffer;
  /** Dosya adı / MIME ipucu */
  filename?: string;
  mimeType?: string;
  /**
   * Ham OCR metni. Flutter veya harici OCR sağladıysa pipeline bunu kullanır.
   * Yoksa yapılandırılmış `OcrProvider` (stub | tesseract) metin üretir.
   */
  ocrText?: string;
  /** İstemci tipi biliyorsa zorla */
  documentTypeHint?: DocumentType;
}

export interface DocumentTypeDetection {
  documentType: DocumentType;
  confidence: number;
  signals: string[];
}

export interface OrchestrationResult {
  documentType: DocumentType;
  detection: DocumentTypeDetection;
  /** Seçilen parser'ın yapısal çıktısı */
  fields: Record<string, unknown> | null;
  overallConfidence: number;
  warnings: string[];
  /** Ham OCR (debug / audit) */
  ocrText?: string;
  parser: DocumentType | 'none';
  meta: {
    filename?: string;
    mimeType?: string;
    pipelineMs: number;
    /** Kullanılan OCR sağlayıcısı */
    ocrProvider?: 'stub' | 'tesseract';
  };
}

export interface ParserAdapter {
  readonly type: DocumentType;
  parse(input: DocumentInput & { ocrText: string }): Promise<{
    fields: Record<string, unknown>;
    overallConfidence: number;
    warnings: string[];
  }>;
}
