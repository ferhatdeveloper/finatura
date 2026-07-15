import { config } from '../../config.js';
import { createOcrProvider } from './createOcrProvider.js';
import type { OcrProvider } from './types.js';

let cached: OcrProvider | null = null;

/** Config’teki OCR_PROVIDER ile tekil varsayılan sağlayıcı. */
export function getDefaultOcrProvider(): OcrProvider {
  if (!cached) {
    cached = createOcrProvider(config.ocrProvider, {
      tesseractLangs: config.tesseractLangs,
    });
  }
  return cached;
}

/** Testler için cache’i sıfırla. */
export function resetDefaultOcrProvider(): void {
  cached = null;
}
