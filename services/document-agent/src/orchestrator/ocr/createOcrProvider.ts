import type { OcrProviderName } from './types.js';
import type { OcrProvider } from './types.js';
import { StubOcrProvider } from './stubOcrProvider.js';
import { TesseractOcrProvider } from './tesseractOcrProvider.js';

export type { OcrProviderName };

export function createOcrProvider(
  name: OcrProviderName,
  options?: { tesseractLangs?: string },
): OcrProvider {
  switch (name) {
    case 'stub':
      return new StubOcrProvider();
    case 'tesseract':
    default:
      return new TesseractOcrProvider({ langs: options?.tesseractLangs });
  }
}

/**
 * Varsayılan: tesseract (gerçek OCR).
 * Stub yalnızca açıkça OCR_PROVIDER=stub iken.
 */
export function parseOcrProviderName(raw: string | undefined): OcrProviderName {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === 'stub') return 'stub';
  return 'tesseract';
}
