import { config as loadEnv } from 'dotenv';
import { parseOcrProviderName } from './orchestrator/ocr/createOcrProvider.js';

loadEnv();

export const config = {
  port: Number(process.env.PORT ?? 3100),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** Multipart tek dosya üst sınırı (byte) */
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 12 * 1024 * 1024),
  /** OCR motoru: tesseract (varsayılan) | stub (yalnızca OCR_PROVIDER=stub) */
  ocrProvider: parseOcrProviderName(process.env.OCR_PROVIDER),
  /** tesseract.js dil kodları (varsayılan tur+eng) */
  tesseractLangs: process.env.TESSERACT_LANGS?.trim() || 'tur+eng',
};

export function assertConfig(): void {
  if (!Number.isFinite(config.port) || config.port <= 0) {
    throw new Error('PORT geçersiz');
  }
}
