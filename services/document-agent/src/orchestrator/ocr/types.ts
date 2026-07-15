/**
 * OCR sağlayıcı sözleşmesi — stub veya gerçek motor (Tesseract / cloud).
 */

export type OcrProviderName = 'stub' | 'tesseract';

export interface OcrRecognizeInput {
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  /**
   * İstemci (Flutter / harici OCR) metin gönderdiyse sağlayıcı bunu öncelikli kullanır.
   */
  ocrText?: string;
}

export interface OcrRecognizeResult {
  text: string;
  provider: OcrProviderName;
  /** Placeholder / stub metni kullanıldıysa true */
  stubbed: boolean;
  /** Tesseract vb. için ortalama güven (0–1); yoksa undefined */
  confidence?: number;
}

export interface OcrProvider {
  readonly name: OcrProviderName;
  recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult>;
}
