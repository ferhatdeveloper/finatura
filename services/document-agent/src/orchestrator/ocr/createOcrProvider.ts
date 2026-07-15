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
    case 'tesseract':
      return new TesseractOcrProvider({ langs: options?.tesseractLangs });
    case 'stub':
    default:
      return new StubOcrProvider();
  }
}

export function parseOcrProviderName(raw: string | undefined): OcrProviderName {
  const value = (raw ?? 'stub').trim().toLowerCase();
  if (value === 'tesseract') return 'tesseract';
  return 'stub';
}
