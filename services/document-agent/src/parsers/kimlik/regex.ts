import { findValidTckns } from './validate-tckn.js';
import type { KimlikBelgeTuru, KimlikOcrFields } from './types.js';

/**
 * Etiket satırı + bir sonraki satırdaki değer (temiz OCR).
 */
const LABEL_VALUE =
  String.raw`(?:[ \t]*\/[ \t]*[^\n]+)?[ \t]*\r?\n[ \t]*([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*(?:[ \t]+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*)*)`;

const NAME_TOKEN =
  String.raw`[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*`;

/** EU/TR ehliyet numaralı etiketler: 1. Surname / 2. Name / 3. Date… */
const NUM_SOYAD = new RegExp(
  String.raw`(?:^|\n)\s*1\.?\s*(?:Surname|Soyad[ıi]?)\b[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(${NAME_TOKEN}(?:[ \t]+${NAME_TOKEN}){0,2})`,
  'imu',
);
const NUM_AD = new RegExp(
  String.raw`(?:^|\n)\s*2\.?\s*(?:Names?|Given\s*Names?|Ad[ıi]?|Ön\s*Ad[ıi]?)\b[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(${NAME_TOKEN}(?:[ \t]+${NAME_TOKEN}){0,3})`,
  'imu',
);
const NUM_DOGUM =
  /(?:^|\n)\s*3\.?\s*(?:Date\s*of\s*Birth|Do[ğg]um(?:\s*Tarihi)?)\b[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(\d{1,2}(?:[./\-\s]\d{1,2})(?:[./\-\s]\d{2,4}))/imu;

const NUM_TCKN =
  /(?:^|\n)\s*4d\.?\s*(?:Personal\s*No\.?|TCKN|Kimlik\s*No)?[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)*((?:[1-9](?:[\s.\-]?\d){10}))/imu;

const NUM_EHL_NO =
  /(?:^|\n)\s*5\.?\s*(?:Document\s*No\.?|Licence\s*No\.?|License\s*No\.?|Belge\s*No|Ehliyet\s*No)?[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)*([A-Z0-9][A-Z0-9\-\/]{4,24})/imu;

const NUM_VERILIS =
  /(?:^|\n)\s*4a\.?\s*(?:Date\s*of\s*issue|Verili[sş]\s*Tarihi)?[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(\d{1,2}(?:[./\-\s]\d{1,2})(?:[./\-\s]\d{2,4}))/imu;

const NUM_BITIS =
  /(?:^|\n)\s*4b\.?\s*(?:Date\s*of\s*expiry|Ge[cç]erlilik(?:\s*Tarihi)?|Biti[sş]\s*Tarihi)?[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(\d{1,2}(?:[./\-\s]\d{1,2})(?:[./\-\s]\d{2,4}))/imu;

const NUM_SINIF =
  /(?:^|\n)\s*9\.?\s*(?:Categor(?:y|ies)|S[ıi]n[ıi]f(?:lar)?|Class(?:es)?)\b[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)*([A-Z0-9][A-Z0-9,\s\/\-]{0,40})/imu;

const INLINE_SOYAD =
  /(?:^|[\n\s])(?:Soyad[ıi]?(?:\[[^\]]*\])?|Surname)(?=[\s:\-–]|$)[ \t]*[:\-–]?[ \t]*([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*(?:[ \t]+(?!(?:Ad[ıi]?|Given|Do[ğg]um|Kimlik|TCKN|Surname|Name)\b)[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*){0,2})/imu;

const INLINE_AD =
  /(?:^|[\n\s])(?:(?<!Soy)Ad[ıi]?(?:\[[^\]]*\])?|Given\s*Names?|Names?)(?=[\s:\-–]|$)[ \t]*[:\-–]?[ \t]*([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*(?:[ \t]+(?!(?:Do[ğg]um|Kimlik|TCKN|Soyad|Surname)\b)[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*){0,3})/imu;

const LABEL_TCKN =
  /(?:T\.?\s*C\.?\s*Kimlik\s*No|Kimlik\s*No|Identity\s*No\.?|TCKN|Personal\s*No\.?|4d\.?\s*Personal\s*No\.?)(?:\s*\/\s*[^\n]+)?\s*[:\-]?\s*\n?\s*((?:[1-9](?:[\s.\-]?\d){10}))/i;

const LABEL_SOYAD_BLOCK = new RegExp(
  String.raw`(?:^|\n)\s*(?:Soyad[ıi]|Surname|1\.?\s*Surname)${LABEL_VALUE}`,
  'imu',
);

const LABEL_AD_BLOCK = new RegExp(
  String.raw`(?:^|\n)\s*(?:(?<!Soy)Ad[ıi]|Given\s*Names?|2\.?\s*Names?)${LABEL_VALUE}`,
  'imu',
);

const LABEL_DOGUM =
  /(?:Do[ğg]um\s*Tarihi|Do[ğg]um|Date\s*of\s*Birth|3\.?\s*Date\s*of\s*Birth)(?:\s*\/\s*[^\n]+)?\s*[:\-]?\s*\n?\s*(\d{1,2}(?:[./\-\s]\d{1,2})(?:[./\-\s]\d{2,4}))/i;

const LABEL_EHL_NO =
  /(?:Ehliyet\s*No|S[uü]r[uü]c[uü]\s*Belgesi\s*No|Belge\s*No|Document\s*No\.?|Licence\s*No\.?|License\s*No\.?)[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)*([A-Z0-9][A-Z0-9\-\/]{4,24})/i;

const LABEL_SINIF =
  /(?:S[ıi]n[ıi]f(?:lar)?|Categor(?:y|ies)|Class(?:es)?)[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)*([A-Z0-9][A-Z0-9,\s\/\-]{0,40})/i;

const LABEL_VERILIS =
  /(?:Verili[sş]\s*Tarihi|Date\s*of\s*issue|4a\.?)[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(\d{1,2}(?:[./\-\s]\d{1,2})(?:[./\-\s]\d{2,4}))/i;

const LABEL_BITIS =
  /(?:Ge[cç]erlilik(?:\s*Tarihi)?|Biti[sş]\s*Tarihi|Date\s*of\s*expiry|4b\.?)[ \t]*[:\-–]?[ \t]*(?:\n[ \t]*)?(\d{1,2}(?:[./\-\s]\d{1,2})(?:[./\-\s]\d{2,4}))/i;

/** TD1 MRZ satır pattern (yeni kimlik arka yüz). */
const MRZ_TD1_LINE2 = /^(\d{6})\d[A-Z<\d]{7}([1-9]\d{10})/m;

export interface RegexExtractResult {
  fields: Partial<KimlikOcrFields>;
  sources: Partial<Record<keyof KimlikOcrFields, 'regex' | 'mrz'>>;
}

function normalizeName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('tr-TR');
}

function compactDigits(raw: string): string {
  return raw.replace(/[\s.\-]/g, '');
}

function toIsoDate(raw: string): string | null {
  const compact = raw.trim().replace(/\s+/g, ' ');
  const m = compact.match(/^(\d{1,2})[./\-\s]+(\d{1,2})[./\-\s]+(\d{2,4})$/);
  if (!m) return null;

  let [, dd, mm, yyyy] = m;
  if (yyyy.length === 2) {
    const yy = Number(yyyy);
    yyyy = String(yy >= 30 ? 1900 + yy : 2000 + yy);
  }

  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function mrzYyMmDdToIso(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const year = yy >= 30 ? 1900 + yy : 2000 + yy;
  return toIsoDate(`${dd}.${mm}.${year}`);
}

function normalizeSinif(raw: string): string | null {
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9,\s\/\-]/g, '');
  if (!cleaned || cleaned.length < 1) return null;
  // Sadece "9" veya etiket kalıntısı değil
  if (/^(CATEGOR|SINIF|CLASS)/i.test(cleaned)) return null;
  return cleaned.slice(0, 48);
}

function normalizeEhliyetNo(raw: string): string | null {
  const v = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9\-\/]{4,24}$/.test(v)) return null;
  if (/^(DOCUMENT|LICENCE|LICENSE|BELGE|EHLİYET|EHLIYET)/i.test(v)) return null;
  return v;
}

export function detectBelgeTuru(text: string): KimlikBelgeTuru {
  const t = text.toLocaleLowerCase('tr-TR');
  if (
    t.includes('sürücü belgesi') ||
    t.includes('surucu belgesi') ||
    t.includes('driving licence') ||
    t.includes('driving license') ||
    /\behliyet\b/i.test(text) ||
    /\b4d\.?\s*personal\b/i.test(text) ||
    /(?:^|\n)\s*1\.?\s*surname\b/im.test(text) ||
    /(?:^|\n)\s*5\.?\s*(?:document|licence|license)\b/im.test(text)
  ) {
    return 'ehliyet';
  }
  if (
    t.includes('kimlik kart') ||
    t.includes('kmlk kart') ||
    t.includes('t.c. kimlik') ||
    t.includes('t c kimlik') ||
    t.includes('t c kmlk') ||
    t.includes('republic of turkey identity') ||
    t.includes('identity card') ||
    t.includes('nüfus cüzdan') ||
    t.includes('nufus cuzdan') ||
    /\bkimlik\b/i.test(text) ||
    /\bkmlk\b/i.test(text)
  ) {
    return 'tc_kimlik';
  }
  return 'unknown';
}

function pickName(
  text: string,
  patterns: RegExp[],
): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return normalizeName(m[1]);
  }
  return null;
}

function pickDate(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const iso = toIsoDate(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}

export function extractKimlikByRegex(ocrText: string): RegexExtractResult {
  const fields: Partial<KimlikOcrFields> = {};
  const sources: RegexExtractResult['sources'] = {};
  const text = ocrText.replace(/\r\n/g, '\n');

  const belgeTuru = detectBelgeTuru(text);
  fields.belgeTuru = belgeTuru;
  sources.belgeTuru = 'regex';

  const mrz = text.match(MRZ_TD1_LINE2);
  if (mrz) {
    const dogum = mrzYyMmDdToIso(mrz[1]);
    const tckn = mrz[2];
    if (dogum) {
      fields.dogumTarihi = dogum;
      sources.dogumTarihi = 'mrz';
    }
    if (tckn) {
      fields.tckn = tckn;
      sources.tckn = 'mrz';
    }
  }

  if (!fields.tckn) {
    for (const re of [NUM_TCKN, LABEL_TCKN]) {
      const labeled = text.match(re);
      if (labeled?.[1]) {
        const digits = compactDigits(labeled[1]);
        if (/^[1-9]\d{10}$/.test(digits)) {
          fields.tckn = digits;
          sources.tckn = 'regex';
          break;
        }
      }
    }
    if (!fields.tckn) {
      const found = findValidTckns(text);
      if (found.length >= 1) {
        fields.tckn = found[0];
        sources.tckn = 'regex';
      }
    }
  }

  const soyad = pickName(text, [NUM_SOYAD, LABEL_SOYAD_BLOCK, INLINE_SOYAD]);
  if (soyad) {
    fields.soyad = soyad;
    sources.soyad = 'regex';
  }

  const ad = pickName(text, [NUM_AD, LABEL_AD_BLOCK, INLINE_AD]);
  if (ad) {
    fields.ad = ad;
    sources.ad = 'regex';
  }

  if (fields.ad || fields.soyad) {
    fields.adSoyad = [fields.ad, fields.soyad].filter(Boolean).join(' ') || null;
    if (fields.adSoyad) sources.adSoyad = 'regex';
  }

  if (!fields.dogumTarihi) {
    const dogum = pickDate(text, [NUM_DOGUM, LABEL_DOGUM]);
    if (dogum) {
      fields.dogumTarihi = dogum;
      sources.dogumTarihi = 'regex';
    }
  }

  for (const re of [NUM_EHL_NO, LABEL_EHL_NO]) {
    const m = text.match(re);
    if (m?.[1]) {
      const no = normalizeEhliyetNo(m[1]);
      if (no) {
        fields.ehliyetNo = no;
        sources.ehliyetNo = 'regex';
        break;
      }
    }
  }

  for (const re of [NUM_SINIF, LABEL_SINIF]) {
    const m = text.match(re);
    if (m?.[1]) {
      const sinif = normalizeSinif(m[1]);
      if (sinif) {
        fields.sinif = sinif;
        sources.sinif = 'regex';
        break;
      }
    }
  }

  const verilis = pickDate(text, [NUM_VERILIS, LABEL_VERILIS]);
  if (verilis) {
    fields.verilisTarihi = verilis;
    sources.verilisTarihi = 'regex';
  }

  const bitis = pickDate(text, [NUM_BITIS, LABEL_BITIS]);
  if (bitis) {
    fields.bitisTarihi = bitis;
    sources.bitisTarihi = 'regex';
  }

  return { fields, sources };
}
