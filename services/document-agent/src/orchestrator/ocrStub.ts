import type { DocumentInput } from './types.js';
import { getDefaultOcrProvider } from './ocr/defaultProvider.js';

/**
 * @deprecated Doğrudan `OcrProvider.recognize` kullanın.
 * Geriye uyum: varsayılan yapılandırılmış OCR sağlayıcısı üzerinden metin çıkarır.
 */
export async function extractOcrText(input: DocumentInput): Promise<string> {
  const result = await getDefaultOcrProvider().recognize(input);
  return result.text;
}
