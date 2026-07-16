import { buildNoterExtractionPrompt } from './prompt.js';
import {
  extractNoterByRegex,
  normalizePlaka,
  normalizeSase,
  parseTurkishMoney,
} from './regex.js';
import { isValidTckn } from './validate-tckn.js';
import type {
  NoterFieldConfidence,
  NoterOcrFields,
  NoterParseOptions,
  NoterParseResult,
} from './types.js';

function emptyFields(): NoterOcrFields {
  return {
    plaka: null,
    saseNo: null,
    satisBedeli: null,
    paraBirimi: null,
    aliciTckn: null,
    saticiTckn: null,
    belgeTuru: 'unknown',
  };
}

function scoreFields(fields: NoterOcrFields): NoterFieldConfidence {
  return {
    plaka: fields.plaka ? 0.9 : 0,
    saseNo: fields.saseNo ? 0.9 : 0,
    satisBedeli: fields.satisBedeli !== null ? 0.85 : 0,
    aliciTckn: fields.aliciTckn && isValidTckn(fields.aliciTckn) ? 0.95 : 0,
    saticiTckn: fields.saticiTckn && isValidTckn(fields.saticiTckn) ? 0.95 : 0,
    belgeTuru: fields.belgeTuru !== 'unknown' ? 0.8 : 0.3,
  };
}

function overallFrom(confidence: NoterFieldConfidence): number {
  const weights = {
    plaka: 0.2,
    saseNo: 0.2,
    satisBedeli: 0.2,
    aliciTckn: 0.18,
    saticiTckn: 0.18,
    belgeTuru: 0.04,
  };
  return (
    confidence.plaka * weights.plaka +
    confidence.saseNo * weights.saseNo +
    confidence.satisBedeli * weights.satisBedeli +
    confidence.aliciTckn * weights.aliciTckn +
    confidence.saticiTckn * weights.saticiTckn +
    confidence.belgeTuru * weights.belgeTuru
  );
}

function normalizeLlmFields(partial: Partial<NoterOcrFields>): Partial<NoterOcrFields> {
  const out: Partial<NoterOcrFields> = { ...partial };

  if (typeof out.plaka === 'string') {
    out.plaka = normalizePlaka(out.plaka);
  }
  if (typeof out.saseNo === 'string') {
    out.saseNo = normalizeSase(out.saseNo);
  }
  if (typeof out.satisBedeli === 'string') {
    out.satisBedeli = parseTurkishMoney(String(out.satisBedeli));
  }
  if (typeof out.aliciTckn === 'string') {
    out.aliciTckn = out.aliciTckn.replace(/\D/g, '');
  }
  if (typeof out.saticiTckn === 'string') {
    out.saticiTckn = out.saticiTckn.replace(/\D/g, '');
  }
  if (out.satisBedeli !== null && out.satisBedeli !== undefined && !out.paraBirimi) {
    out.paraBirimi = 'TRY';
  }

  return out;
}

function scrubInvalidTckn(
  fields: NoterOcrFields,
  extractedBy: NoterParseResult['extractedBy'],
  warnings: string[],
  key: 'aliciTckn' | 'saticiTckn',
): void {
  const value = fields[key];
  if (value && !isValidTckn(value)) {
    warnings.push(`${key} algoritma kontrolünden geçmedi; alan temizlendi.`);
    fields[key] = null;
    delete extractedBy[key];
  }
}

/**
 * Noter satış sözleşmesi OCR metnini yapısal JSON'a çevirir.
 * Önce regex, gerekirse LLM fallback.
 */
export async function parseNoterOcr(
  ocrText: string,
  options: NoterParseOptions = {},
): Promise<NoterParseResult> {
  const warnings: string[] = [];
  const fields = emptyFields();
  const extractedBy: NoterParseResult['extractedBy'] = {};

  const { fields: regexFields, sources } = extractNoterByRegex(ocrText);
  Object.assign(fields, regexFields);
  Object.assign(extractedBy, sources);

  scrubInvalidTckn(fields, extractedBy, warnings, 'aliciTckn');
  scrubInvalidTckn(fields, extractedBy, warnings, 'saticiTckn');

  let confidence = scoreFields(fields);
  let overall = overallFrom(confidence);
  const threshold = options.minOverallConfidence ?? 0.55;
  const needsLlm =
    Boolean(options.preferLlmFallback) ||
    overall < threshold ||
    !fields.plaka ||
    !fields.saseNo ||
    fields.satisBedeli === null ||
    !fields.aliciTckn ||
    !fields.saticiTckn;

  if (needsLlm && options.llmExtractor) {
    const { system, user } = buildNoterExtractionPrompt(ocrText);
    try {
      const llmPartial = normalizeLlmFields(
        await options.llmExtractor(`${system}\n\n${user}`, ocrText),
      );
      const keys = [
        'plaka',
        'saseNo',
        'satisBedeli',
        'paraBirimi',
        'aliciTckn',
        'saticiTckn',
        'belgeTuru',
      ] as const;

      for (const key of keys) {
        const current = fields[key];
        const next = llmPartial[key];
        const empty =
          current === null ||
          current === undefined ||
          current === 'unknown';
        if (!empty || next === null || next === undefined) continue;

        if (
          (key === 'aliciTckn' || key === 'saticiTckn') &&
          typeof next === 'string' &&
          !isValidTckn(next)
        ) {
          warnings.push(`LLM ${key} geçersiz; yok sayıldı.`);
          continue;
        }

        (fields as Record<string, unknown>)[key] = next;
        extractedBy[key] = 'llm';
      }
    } catch {
      warnings.push('LLM çıkarımı başarısız; yalnızca yerel OCR/regex sonuçları kullanıldı.');
    }
  } else if (needsLlm && !options.llmExtractor && overall < threshold) {
    warnings.push('Bazı alanlar düşük güvenli (yerel OCR/regex). Daha net fotoğraf deneyin.');
  }

  confidence = scoreFields(fields);
  overall = overallFrom(confidence);

  if (!fields.plaka) warnings.push('Plaka bulunamadı.');
  if (!fields.saseNo) warnings.push('Şasi no bulunamadı.');
  if (fields.satisBedeli === null) warnings.push('Satış bedeli bulunamadı.');
  if (!fields.aliciTckn) warnings.push('Alıcı TCKN bulunamadı.');
  if (!fields.saticiTckn) warnings.push('Satıcı TCKN bulunamadı.');

  return {
    fields,
    confidence,
    overallConfidence: Number(overall.toFixed(3)),
    extractedBy,
    rawText: ocrText,
    warnings,
  };
}

/** Senkron regex-only kısayol (test / orchestration stub). */
export function parseNoterOcrSync(ocrText: string): NoterParseResult {
  const warnings: string[] = [];
  const fields = emptyFields();
  const extractedBy: NoterParseResult['extractedBy'] = {};

  const { fields: regexFields, sources } = extractNoterByRegex(ocrText);
  Object.assign(fields, regexFields);
  Object.assign(extractedBy, sources);

  scrubInvalidTckn(fields, extractedBy, warnings, 'aliciTckn');
  scrubInvalidTckn(fields, extractedBy, warnings, 'saticiTckn');

  const confidence = scoreFields(fields);
  if (!fields.plaka) warnings.push('Plaka bulunamadı.');
  if (!fields.saseNo) warnings.push('Şasi no bulunamadı.');
  if (fields.satisBedeli === null) warnings.push('Satış bedeli bulunamadı.');
  if (!fields.aliciTckn) warnings.push('Alıcı TCKN bulunamadı.');
  if (!fields.saticiTckn) warnings.push('Satıcı TCKN bulunamadı.');

  return {
    fields,
    confidence,
    overallConfidence: Number(overallFrom(confidence).toFixed(3)),
    extractedBy,
    rawText: ocrText,
    warnings,
  };
}
