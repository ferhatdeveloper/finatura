import { findValidTckns } from './validate-tckn.js';
import type { KimlikBelgeTuru, KimlikOcrFields } from './types.js';

/**
 * Etiket satırı + bir sonraki satırdaki değer.
 * "Adı"nın "Soyadı" içinde eşleşmesi word-boundary ile engellenir.
 */
/** İsim parçaları arasında yalnızca yatay boşluk; satır atlamasın. */
const LABEL_VALUE =
  String.raw`(?:[ \t]*\/[ \t]*[^\n]+)?[ \t]*\r?\n[ \t]*([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*(?:[ \t]+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*)*)`;

const LABEL_TCKN =
  /(?:T\.?\s*C\.?\s*Kimlik\s*No|Kimlik\s*No|Identity\s*No\.?|TCKN|4d\.?\s*Personal\s*No\.?)(?:\s*\/\s*[^\n]+)?\s*\n?\s*([1-9]\d{10})/i;

const LABEL_SOYAD = new RegExp(
  String.raw`(?:^|\n)\s*(?:Soyad[ıi]|Surname|1\.?\s*Surname)${LABEL_VALUE}`,
  'imu',
);

const LABEL_AD = new RegExp(
  String.raw`(?:^|\n)\s*(?:(?<!Soy)Ad[ıi]|Given\s*Names?|2\.?\s*Names?)${LABEL_VALUE}`,
  'imu',
);

const LABEL_DOGUM =
  /(?:Do[ğg]um\s*Tarihi|Date\s*of\s*Birth|3\.?\s*Date\s*of\s*Birth)(?:\s*\/\s*[^\n]+)?\s*\n?\s*(\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4})/i;

/** TD1 MRZ satır pattern (yeni kimlik arka yüz) — basitleştirilmiş. */
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

function toIsoDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
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

export function detectBelgeTuru(text: string): KimlikBelgeTuru {
  const t = text.toLocaleLowerCase('tr-TR');
  if (
    t.includes('sürücü belgesi') ||
    t.includes('surucu belgesi') ||
    t.includes('driving licence') ||
    t.includes('driving license') ||
    /\behliyet\b/i.test(text)
  ) {
    return 'ehliyet';
  }
  if (
    t.includes('kimlik kart') ||
    t.includes('t.c. kimlik') ||
    t.includes('republic of turkey') ||
    t.includes('identity card') ||
    t.includes('nüfus cüzdan') ||
    t.includes('nufus cuzdan')
  ) {
    return 'tc_kimlik';
  }
  return 'unknown';
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
    const labeled = text.match(LABEL_TCKN);
    if (labeled?.[1]) {
      fields.tckn = labeled[1];
      sources.tckn = 'regex';
    } else {
      const found = findValidTckns(text);
      if (found.length === 1) {
        fields.tckn = found[0];
        sources.tckn = 'regex';
      }
    }
  }

  const soyad = text.match(LABEL_SOYAD);
  if (soyad?.[1]) {
    fields.soyad = normalizeName(soyad[1]);
    sources.soyad = 'regex';
  }

  const ad = text.match(LABEL_AD);
  if (ad?.[1]) {
    fields.ad = normalizeName(ad[1]);
    sources.ad = 'regex';
  }

  if (fields.ad || fields.soyad) {
    fields.adSoyad = [fields.ad, fields.soyad].filter(Boolean).join(' ') || null;
    if (fields.adSoyad) sources.adSoyad = 'regex';
  }

  if (!fields.dogumTarihi) {
    const dogum = text.match(LABEL_DOGUM);
    if (dogum?.[1]) {
      const iso = toIsoDate(dogum[1]);
      if (iso) {
        fields.dogumTarihi = iso;
        sources.dogumTarihi = 'regex';
      }
    }
  }

  return { fields, sources };
}
