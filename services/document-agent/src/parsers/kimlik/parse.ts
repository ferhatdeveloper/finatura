import { buildKimlikExtractionPrompt } from './prompt.js';
import { extractKimlikByRegex } from './regex.js';
import { isValidTckn } from './validate-tckn.js';
import type {
  FieldConfidence,
  KimlikOcrFields,
  KimlikParseOptions,
  KimlikParseResult,
} from './types.js';

function emptyFields(): KimlikOcrFields {
  return {
    tckn: null,
    ad: null,
    soyad: null,
    adSoyad: null,
    dogumTarihi: null,
    belgeTuru: 'unknown',
    ehliyetNo: null,
    sinif: null,
    verilisTarihi: null,
    bitisTarihi: null,
  };
}

function mergeAdSoyad(fields: KimlikOcrFields): void {
  if (!fields.adSoyad && (fields.ad || fields.soyad)) {
    fields.adSoyad = [fields.ad, fields.soyad].filter(Boolean).join(' ') || null;
  }
}

function scoreFields(fields: KimlikOcrFields): FieldConfidence {
  const isEhliyet = fields.belgeTuru === 'ehliyet';
  return {
    tckn: fields.tckn && isValidTckn(fields.tckn) ? 0.95 : fields.tckn ? 0.4 : 0,
    ad: fields.ad ? 0.85 : 0,
    soyad: fields.soyad ? 0.85 : 0,
    dogumTarihi: fields.dogumTarihi ? 0.9 : 0,
    belgeTuru: fields.belgeTuru !== 'unknown' ? 0.8 : 0.3,
    ehliyetNo: isEhliyet && fields.ehliyetNo ? 0.85 : fields.ehliyetNo ? 0.5 : 0,
    sinif: isEhliyet && fields.sinif ? 0.8 : fields.sinif ? 0.4 : 0,
    verilisTarihi: fields.verilisTarihi ? 0.75 : 0,
    bitisTarihi: fields.bitisTarihi ? 0.75 : 0,
  };
}

function overallFrom(confidence: FieldConfidence, belgeTuru: KimlikOcrFields['belgeTuru']): number {
  if (belgeTuru === 'ehliyet') {
    const weights = {
      tckn: 0.28,
      ad: 0.16,
      soyad: 0.16,
      dogumTarihi: 0.14,
      belgeTuru: 0.04,
      ehliyetNo: 0.1,
      sinif: 0.06,
      verilisTarihi: 0.03,
      bitisTarihi: 0.03,
    };
    return (
      confidence.tckn * weights.tckn +
      confidence.ad * weights.ad +
      confidence.soyad * weights.soyad +
      confidence.dogumTarihi * weights.dogumTarihi +
      confidence.belgeTuru * weights.belgeTuru +
      confidence.ehliyetNo * weights.ehliyetNo +
      confidence.sinif * weights.sinif +
      confidence.verilisTarihi * weights.verilisTarihi +
      confidence.bitisTarihi * weights.bitisTarihi
    );
  }

  const weights = {
    tckn: 0.35,
    ad: 0.2,
    soyad: 0.2,
    dogumTarihi: 0.2,
    belgeTuru: 0.05,
  };
  return (
    confidence.tckn * weights.tckn +
    confidence.ad * weights.ad +
    confidence.soyad * weights.soyad +
    confidence.dogumTarihi * weights.dogumTarihi +
    confidence.belgeTuru * weights.belgeTuru
  );
}

function normalizeLlmFields(partial: Partial<KimlikOcrFields>): Partial<KimlikOcrFields> {
  const out: Partial<KimlikOcrFields> = { ...partial };
  if (out.ad) out.ad = out.ad.toLocaleUpperCase('tr-TR');
  if (out.soyad) out.soyad = out.soyad.toLocaleUpperCase('tr-TR');
  if (out.tckn) out.tckn = out.tckn.replace(/\D/g, '');
  if (out.ad || out.soyad) {
    out.adSoyad = [out.ad, out.soyad].filter(Boolean).join(' ') || out.adSoyad || null;
  }
  return out;
}

function applyForceBelgeTuru(
  fields: KimlikOcrFields,
  extractedBy: KimlikParseResult['extractedBy'],
  force?: KimlikParseOptions['forceBelgeTuru'],
): void {
  if (!force || force === 'unknown') return;
  if (fields.belgeTuru === 'unknown' || force === 'ehliyet') {
    fields.belgeTuru = force;
    extractedBy.belgeTuru = extractedBy.belgeTuru ?? 'regex';
  }
}

/**
 * Kimlik / ehliyet OCR metnini yapısal JSON'a çevirir.
 * Yerel regex (+ MRZ); LLM yalnızca açıkça enjekte edilirse.
 */
export async function parseKimlikOcr(
  ocrText: string,
  options: KimlikParseOptions = {},
): Promise<KimlikParseResult> {
  const warnings: string[] = [];
  const fields = emptyFields();
  const extractedBy: KimlikParseResult['extractedBy'] = {};

  const { fields: regexFields, sources } = extractKimlikByRegex(ocrText);
  Object.assign(fields, regexFields);
  Object.assign(extractedBy, sources);
  mergeAdSoyad(fields);
  applyForceBelgeTuru(fields, extractedBy, options.forceBelgeTuru);

  if (fields.tckn && !isValidTckn(fields.tckn)) {
    warnings.push('TCKN algoritma kontrolünden geçmedi; alan temizlendi.');
    fields.tckn = null;
    delete extractedBy.tckn;
  }

  let confidence = scoreFields(fields);
  let overall = overallFrom(confidence, fields.belgeTuru);
  const threshold = options.minOverallConfidence ?? 0.55;
  const needsLlm =
    Boolean(options.preferLlmFallback) ||
    overall < threshold ||
    !fields.tckn ||
    !fields.ad ||
    !fields.soyad ||
    !fields.dogumTarihi;

  if (needsLlm && options.llmExtractor) {
    const { system, user } = buildKimlikExtractionPrompt(ocrText);
    try {
      const llmPartial = normalizeLlmFields(
        await options.llmExtractor(`${system}\n\n${user}`, ocrText),
      );
      const keys = [
        'tckn',
        'ad',
        'soyad',
        'adSoyad',
        'dogumTarihi',
        'belgeTuru',
        'ehliyetNo',
        'sinif',
        'verilisTarihi',
        'bitisTarihi',
      ] as const;
      for (const key of keys) {
        const current = fields[key];
        const next = llmPartial[key];
        if ((current === null || current === 'unknown' || current === undefined) && next) {
          if (key === 'tckn' && typeof next === 'string' && !isValidTckn(next)) {
            warnings.push('LLM TCKN geçersiz; yok sayıldı.');
            continue;
          }
          (fields as Record<string, unknown>)[key] = next;
          extractedBy[key] = 'llm';
        }
      }
      mergeAdSoyad(fields);
      applyForceBelgeTuru(fields, extractedBy, options.forceBelgeTuru);
    } catch {
      warnings.push('LLM çıkarımı başarısız; yalnızca yerel OCR/regex sonuçları kullanıldı.');
    }
  }

  confidence = scoreFields(fields);
  overall = overallFrom(confidence, fields.belgeTuru);

  if (!fields.tckn) warnings.push('TCKN bulunamadı.');
  if (!fields.ad || !fields.soyad) warnings.push('Ad/Soyad eksik.');
  if (!fields.dogumTarihi) warnings.push('Doğum tarihi bulunamadı.');
  if (fields.belgeTuru === 'ehliyet') {
    if (!fields.ehliyetNo) warnings.push('Ehliyet no bulunamadı.');
    if (!fields.sinif) warnings.push('Sınıf/kategori bulunamadı.');
  }
  if (needsLlm && !options.llmExtractor && overall < threshold) {
    warnings.push('Bazı alanlar düşük güvenli (yerel OCR/regex). Daha net fotoğraf deneyin.');
  }

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
export function parseKimlikOcrSync(
  ocrText: string,
  options: Pick<KimlikParseOptions, 'forceBelgeTuru'> = {},
): KimlikParseResult {
  const warnings: string[] = [];
  const fields = emptyFields();
  const extractedBy: KimlikParseResult['extractedBy'] = {};

  const { fields: regexFields, sources } = extractKimlikByRegex(ocrText);
  Object.assign(fields, regexFields);
  Object.assign(extractedBy, sources);
  mergeAdSoyad(fields);
  applyForceBelgeTuru(fields, extractedBy, options.forceBelgeTuru);

  if (fields.tckn && !isValidTckn(fields.tckn)) {
    warnings.push('TCKN algoritma kontrolünden geçmedi; alan temizlendi.');
    fields.tckn = null;
    delete extractedBy.tckn;
  }

  const confidence = scoreFields(fields);
  if (!fields.tckn) warnings.push('TCKN bulunamadı.');
  if (!fields.ad || !fields.soyad) warnings.push('Ad/Soyad eksik.');
  if (!fields.dogumTarihi) warnings.push('Doğum tarihi bulunamadı.');

  return {
    fields,
    confidence,
    overallConfidence: Number(overallFrom(confidence, fields.belgeTuru).toFixed(3)),
    extractedBy,
    rawText: ocrText,
    warnings,
  };
}
