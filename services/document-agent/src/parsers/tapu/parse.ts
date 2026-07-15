import { buildTapuExtractionPrompt } from './prompt.js';
import { extractTapuByRegex, parseAreaSqm } from './regex.js';
import { isValidTckn } from './validate-tckn.js';
import type {
  FieldConfidence,
  TapuFieldKey,
  TapuOcrFields,
  TapuParseOptions,
  TapuParseResult,
} from './types.js';

const FIELD_KEYS: TapuFieldKey[] = [
  'city',
  'district',
  'neighborhood',
  'ada',
  'parsel',
  'areaSqm',
  'ownerName',
  'ownerIdentity',
  'propertyType',
  'blockNumber',
  'independentSection',
];

function emptyFields(): TapuOcrFields {
  return {
    city: null,
    district: null,
    neighborhood: null,
    ada: null,
    parsel: null,
    areaSqm: null,
    ownerName: null,
    ownerIdentity: null,
    propertyType: null,
    blockNumber: null,
    independentSection: null,
  };
}

function scoreFields(fields: TapuOcrFields): FieldConfidence {
  return {
    city: fields.city ? 0.9 : 0,
    district: fields.district ? 0.9 : 0,
    neighborhood: fields.neighborhood ? 0.75 : 0,
    ada: fields.ada ? 0.95 : 0,
    parsel: fields.parsel ? 0.95 : 0,
    areaSqm: fields.areaSqm !== null && fields.areaSqm >= 0 ? 0.9 : 0,
    ownerName: fields.ownerName ? 0.9 : 0,
    ownerIdentity:
      fields.ownerIdentity && isValidTckn(fields.ownerIdentity)
        ? 0.95
        : fields.ownerIdentity
          ? 0.5
          : 0,
    propertyType: fields.propertyType ? 0.7 : 0,
    blockNumber: fields.blockNumber ? 0.65 : 0,
    independentSection: fields.independentSection ? 0.65 : 0,
  };
}

function overallFrom(confidence: FieldConfidence): number {
  /** Roadmap çekirdek alanları daha ağırlıklı. */
  const weights: Record<TapuFieldKey, number> = {
    city: 0.15,
    district: 0.15,
    neighborhood: 0.05,
    ada: 0.15,
    parsel: 0.15,
    areaSqm: 0.15,
    ownerName: 0.15,
    ownerIdentity: 0.05,
    propertyType: 0,
    blockNumber: 0,
    independentSection: 0,
  };
  let sum = 0;
  for (const key of FIELD_KEYS) {
    sum += confidence[key] * weights[key];
  }
  return sum;
}

function normalizeLlmFields(
  partial: Partial<TapuOcrFields> & { areaSqm?: number | string | null },
): Partial<TapuOcrFields> {
  const raw = partial as Record<string, unknown>;
  const out: Partial<TapuOcrFields> = {};

  for (const key of [
    'city',
    'district',
    'neighborhood',
    'ownerName',
    'propertyType',
  ] as const) {
    const v = raw[key];
    if (typeof v === 'string') {
      out[key] = v.replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR');
    }
  }

  if (typeof raw.ada === 'string') out.ada = raw.ada.trim();
  if (typeof raw.parsel === 'string') out.parsel = raw.parsel.trim();
  if (typeof raw.blockNumber === 'string') {
    out.blockNumber = raw.blockNumber.trim().toLocaleUpperCase('tr-TR');
  }
  if (typeof raw.independentSection === 'string') {
    out.independentSection = raw.independentSection.trim();
  }
  if (typeof raw.ownerIdentity === 'string') {
    out.ownerIdentity = raw.ownerIdentity.replace(/\D/g, '');
  }

  if (typeof raw.areaSqm === 'string') {
    out.areaSqm = parseAreaSqm(raw.areaSqm);
  } else if (typeof raw.areaSqm === 'number') {
    out.areaSqm = Number.isFinite(raw.areaSqm) ? raw.areaSqm : null;
  }

  return out;
}

function isEmptyValue(key: TapuFieldKey, value: TapuOcrFields[TapuFieldKey]): boolean {
  if (key === 'areaSqm') return value === null || value === undefined;
  return value === null || value === undefined || value === '';
}

function collectWarnings(fields: TapuOcrFields): string[] {
  const warnings: string[] = [];
  if (!fields.city || !fields.district) warnings.push('İl/İlçe eksik.');
  if (!fields.ada) warnings.push('Ada bulunamadı.');
  if (!fields.parsel) warnings.push('Parsel bulunamadı.');
  if (fields.areaSqm === null) warnings.push('Yüzölçümü bulunamadı.');
  if (!fields.ownerName) warnings.push('Malik bulunamadı.');
  return warnings;
}

/**
 * Tapu senedi OCR metnini yapısal JSON'a çevirir.
 * Önce regex, gerekirse LLM fallback.
 */
export async function parseTapuOcr(
  ocrText: string,
  options: TapuParseOptions = {},
): Promise<TapuParseResult> {
  const warnings: string[] = [];
  const fields = emptyFields();
  const extractedBy: TapuParseResult['extractedBy'] = {};

  const { fields: regexFields, sources } = extractTapuByRegex(ocrText);
  Object.assign(fields, regexFields);
  Object.assign(extractedBy, sources);

  if (
    fields.ownerIdentity &&
    fields.ownerIdentity.length === 11 &&
    !isValidTckn(fields.ownerIdentity)
  ) {
    warnings.push('Malik TCKN algoritma kontrolünden geçmedi; alan temizlendi.');
    fields.ownerIdentity = null;
    delete extractedBy.ownerIdentity;
  }

  let confidence = scoreFields(fields);
  let overall = overallFrom(confidence);
  const threshold = options.minOverallConfidence ?? 0.55;
  const needsLlm =
    Boolean(options.preferLlmFallback) ||
    overall < threshold ||
    !fields.city ||
    !fields.district ||
    !fields.ada ||
    !fields.parsel ||
    fields.areaSqm === null ||
    !fields.ownerName;

  if (needsLlm && options.llmExtractor) {
    const { system, user } = buildTapuExtractionPrompt(ocrText);
    try {
      const llmPartial = normalizeLlmFields(
        await options.llmExtractor(`${system}\n\n${user}`, ocrText),
      );
      for (const key of FIELD_KEYS) {
        if (!isEmptyValue(key, fields[key]) || llmPartial[key] === undefined) continue;
        const next = llmPartial[key];
        if (next === null || next === undefined || next === '') continue;
        if (
          key === 'ownerIdentity' &&
          typeof next === 'string' &&
          next.length === 11 &&
          !isValidTckn(next)
        ) {
          warnings.push('LLM malik TCKN geçersiz; yok sayıldı.');
          continue;
        }
        (fields as Record<string, unknown>)[key] = next;
        extractedBy[key] = 'llm';
      }
    } catch {
      warnings.push('LLM çıkarımı başarısız; yalnızca regex sonuçları kullanıldı.');
    }
  } else if (needsLlm && !options.llmExtractor) {
    warnings.push(
      'Bazı alanlar eksik veya düşük güvenli; LLM sağlayıcısı bağlanmadı (iskelet).',
    );
  }

  confidence = scoreFields(fields);
  overall = overallFrom(confidence);
  warnings.push(...collectWarnings(fields));

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
export function parseTapuOcrSync(ocrText: string): TapuParseResult {
  const warnings: string[] = [];
  const fields = emptyFields();
  const extractedBy: TapuParseResult['extractedBy'] = {};

  const { fields: regexFields, sources } = extractTapuByRegex(ocrText);
  Object.assign(fields, regexFields);
  Object.assign(extractedBy, sources);

  if (
    fields.ownerIdentity &&
    fields.ownerIdentity.length === 11 &&
    !isValidTckn(fields.ownerIdentity)
  ) {
    warnings.push('Malik TCKN algoritma kontrolünden geçmedi; alan temizlendi.');
    fields.ownerIdentity = null;
    delete extractedBy.ownerIdentity;
  }

  const confidence = scoreFields(fields);
  warnings.push(...collectWarnings(fields));

  return {
    fields,
    confidence,
    overallConfidence: Number(overallFrom(confidence).toFixed(3)),
    extractedBy,
    rawText: ocrText,
    warnings,
  };
}

/** Orkestratör / kısa alias. */
export const parseTapu = parseTapuOcr;
