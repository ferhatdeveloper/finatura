import { config } from '../config.js';
import type { KontorReferenceType, OcrDocumentKind } from '../types.js';

/** OCR belge türü → ledger reference_type */
export function ocrReferenceType(kind: OcrDocumentKind): KontorReferenceType {
  switch (kind) {
    case 'sozlesme':
      return 'ocr_sozlesme';
    case 'kimlik':
      return 'ocr_kimlik';
    case 'tapu':
      return 'ocr_tapu';
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Bilinmeyen OCR türü: ${_exhaustive}`);
    }
  }
}

/** Tek OCR sorgusu için kontör maliyeti */
export function ocrCost(kind: OcrDocumentKind): number {
  switch (kind) {
    case 'sozlesme':
      return config.costs.ocrSozlesme;
    case 'kimlik':
      return config.costs.ocrKimlik;
    case 'tapu':
      return config.costs.ocrTapu;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Bilinmeyen OCR türü: ${_exhaustive}`);
    }
  }
}

/** Başarılı e-fatura gönderimi maliyeti */
export function efaturaSendCost(): number {
  return config.costs.efaturaSend;
}
