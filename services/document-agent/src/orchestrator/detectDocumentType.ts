import type { DocumentType, DocumentTypeDetection } from './types.js';

const NOTER_SIGNALS = [
  /noter/i,
  /sat[ıi][sş]\s+s[oö]zle[sş]me/i,
  /ara[cç]\s+sat[ıi][sş]/i,
  /[sş]asi\s*(no|numara)?/i,
  /plaka/i,
  /tescil/i,
];

const TAPU_SIGNALS = [
  /tapu/i,
  /ada\s*[:=]?\s*\d+/i,
  /parsel\s*[:=]?\s*\d+/i,
  /y[uü]z[oö]l[cç][uü]m/i,
  /malik/i,
  /tapu\s+senedi/i,
  /kadastro/i,
];

const EHLIYET_SIGNALS = [
  /ehliyet/i,
  /s[uü]r[uü]c[uü]\s+belgesi/i,
  /driving\s+licen[cs]e/i,
  /\b4d\.?\s*personal\b/i,
  /(?:^|\n)\s*1\.?\s*surname\b/im,
  /(?:^|\n)\s*5\.?\s*(?:document|licence|license)\s*no/im,
];

const KIMLIK_SIGNALS = [
  /t\.?\s*c\.?\s*kimlik/i,
  /n[uü]fus\s+c[uü]zdan/i,
  /\bMRZ\b/,
  /identity\s+card/i,
  /kimlik\s+kart/i,
  /do[gğ]um\s+tarih/i,
  /soyad[ıi]?/i,
];

function scoreSignals(text: string, patterns: RegExp[]): { score: number; hits: string[] } {
  const hits: string[] = [];
  for (const re of patterns) {
    if (re.test(text)) hits.push(re.source);
  }
  const score = hits.length === 0 ? 0 : Math.min(1, 0.25 + hits.length * 0.2);
  return { score, hits };
}

/**
 * OCR metninden belge tipini sezgisel (regex sinyal) olarak tahmin eder.
 */
export function detectDocumentType(ocrText: string): DocumentTypeDetection {
  const text = (ocrText ?? '').trim();
  if (!text) {
    return { documentType: 'unknown', confidence: 0, signals: ['empty_ocr'] };
  }

  const noter = scoreSignals(text, NOTER_SIGNALS);
  const tapu = scoreSignals(text, TAPU_SIGNALS);
  const ehliyet = scoreSignals(text, EHLIYET_SIGNALS);
  const kimlik = scoreSignals(text, KIMLIK_SIGNALS);

  const ranked: Array<{ type: DocumentType; score: number; hits: string[] }> = (
    [
      { type: 'noter' as const, score: noter.score, hits: noter.hits },
      { type: 'tapu' as const, score: tapu.score, hits: tapu.hits },
      { type: 'ehliyet' as const, score: ehliyet.score, hits: ehliyet.hits },
      { type: 'kimlik' as const, score: kimlik.score, hits: kimlik.hits },
    ] satisfies Array<{ type: DocumentType; score: number; hits: string[] }>
  ).sort((a, b) => b.score - a.score);

  const best = ranked[0]!;
  if (best.score < 0.25) {
    return { documentType: 'unknown', confidence: best.score, signals: best.hits };
  }

  return {
    documentType: best.type,
    confidence: best.score,
    signals: best.hits,
  };
}

export function resolveDocumentType(
  ocrText: string,
  hint?: DocumentType,
): DocumentTypeDetection {
  if (hint && hint !== 'unknown') {
    return {
      documentType: hint,
      confidence: 1,
      signals: ['client_hint'],
    };
  }
  return detectDocumentType(ocrText);
}
