import type { OcrProvider, OcrRecognizeInput, OcrRecognizeResult } from './types.js';

/**
 * Geliştirme / pipeline testi: istemci `ocrText` yoksa okunabilir placeholder üretir.
 * Gerçek OCR bağlı değilken geriye uyumlu davranış.
 */
export class StubOcrProvider implements OcrProvider {
  readonly name = 'stub' as const;

  async recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult> {
    if (input.ocrText && input.ocrText.trim().length > 0) {
      return {
        text: input.ocrText.trim(),
        provider: this.name,
        stubbed: false,
      };
    }

    return {
      text: buildStubPlaceholder(input),
      provider: this.name,
      stubbed: true,
    };
  }
}

export function buildStubPlaceholder(input: OcrRecognizeInput): string {
  const name = input.filename ?? 'belge';
  const mime = input.mimeType ?? 'application/octet-stream';
  const size = input.buffer?.byteLength ?? 0;

  return [
    '[OCR_STUB]',
    `Dosya: ${name}`,
    `MIME: ${mime}`,
    `Boyut: ${size} bayt`,
    '',
    'Gerçek OCR henüz bağlı değil. Flutter/kamera tarafı OCR metni',
    "(`ocrText`) veya harici sağlayıcı sonuçunu gönderdiğinde parser'lar çalışır.",
  ].join('\n');
}
