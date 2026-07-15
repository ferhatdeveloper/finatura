import type { OcrProvider, OcrRecognizeInput, OcrRecognizeResult } from './types.js';
import { buildStubPlaceholder } from './stubOcrProvider.js';

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

type TesseractWorker = {
  recognize: (
    image: Buffer | string,
  ) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<unknown>;
};

/**
 * tesseract.js tabanlı OCR. Görüntü buffer yoksa veya desteklenmeyen MIME ise
 * stub placeholder'a düşer (pipeline kırılmaz).
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
      return {
        text: buildStubPlaceholder(input),
        provider: this.name,
        stubbed: true,
      };
    }

    try {
      const worker = await this.getWorker();
      const {
        data: { text, confidence },
      } = await worker.recognize(input.buffer);
      const trimmed = text.trim();
      if (!trimmed) {
        return {
          text: buildStubPlaceholder(input),
          provider: this.name,
          stubbed: true,
          confidence: 0,
        };
      }
      return {
        text: trimmed,
        provider: this.name,
        stubbed: false,
        confidence: Math.max(0, Math.min(1, confidence / 100)),
      };
    } catch {
      return {
        text: buildStubPlaceholder(input),
        provider: this.name,
        stubbed: true,
      };
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
