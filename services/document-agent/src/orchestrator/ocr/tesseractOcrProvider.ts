import type { OcrProvider, OcrRecognizeInput, OcrRecognizeResult } from './types.js';

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/tif',
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i;

function looksLikeImage(input: OcrRecognizeInput): boolean {
  if (input.mimeType && IMAGE_MIME.has(input.mimeType.toLowerCase())) {
    return true;
  }
  if (input.filename && IMAGE_EXT.test(input.filename)) {
    return true;
  }
  return false;
}

export class OcrInputError extends Error {
  readonly code = 'ocr_input_required';

  constructor(message: string) {
    super(message);
    this.name = 'OcrInputError';
  }
}

type TesseractWorker = {
  recognize: (
    image: Buffer | string,
  ) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<unknown>;
};

/**
 * tesseract.js tabanlı OCR.
 * İstemci `ocrText` yoksa görüntü buffer gerekir — stub placeholder’a düşülmez.
 * Offline / fixture için açıkça `OCR_PROVIDER=stub` kullanın.
 */
export class TesseractOcrProvider implements OcrProvider {
  readonly name = 'tesseract' as const;

  private worker: TesseractWorker | null = null;
  private workerPromise: Promise<TesseractWorker> | null = null;
  private readonly langs: string;

  constructor(options?: { langs?: string }) {
    this.langs = options?.langs ?? 'tur+eng';
  }

  async recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult> {
    if (input.ocrText && input.ocrText.trim().length > 0) {
      return {
        text: input.ocrText.trim(),
        provider: this.name,
        stubbed: false,
      };
    }

    if (!input.buffer || input.buffer.byteLength === 0 || !looksLikeImage(input)) {
      throw new OcrInputError(
        'OCR için görüntü buffer (image/*) veya ocrText gerekli. ' +
          'Stub placeholder kapalı; yerel fixture için OCR_PROVIDER=stub veya ' +
          'POST /analyze-text ile gerçek OCR metni gönderin.',
      );
    }

    try {
      const worker = await this.getWorker();
      const {
        data: { text, confidence },
      } = await worker.recognize(input.buffer);
      const trimmed = text.trim();
      if (!trimmed) {
        throw new OcrInputError(
          'Tesseract metin üretemedi (boş OCR). Görüntü kalitesini kontrol edin.',
        );
      }
      return {
        text: trimmed,
        provider: this.name,
        stubbed: false,
        confidence: Math.max(0, Math.min(1, confidence / 100)),
      };
    } catch (err) {
      if (err instanceof OcrInputError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new OcrInputError(`Tesseract OCR başarısız: ${message}`);
    }
  }

  async dispose(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.workerPromise = null;
    }
  }

  private async getWorker(): Promise<TesseractWorker> {
    if (this.worker) return this.worker;
    if (this.workerPromise) return this.workerPromise;

    this.workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = (await createWorker(this.langs)) as unknown as TesseractWorker;
      this.worker = worker;
      return worker;
    })();

    try {
      return await this.workerPromise;
    } catch (err) {
      this.workerPromise = null;
      throw err;
    }
  }
}
