import { findValidTckns } from './validate-tckn.js';
import type { ExtractionSource, TapuFieldKey, TapuOcrFields } from './types.js';

/**
 * Tek satır yer adı — satır kırılımı / sonraki etiketleri yutmaz.
 */
const PLACE =
  String.raw`([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*(?:[ \t]+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]*){0,3})`;

/** Aynı satır veya hemen sonraki satır (yalnızca bir satır değeri). */
const VALUE = String.raw`[ \t]*:?[ \t]*(?:\n[ \t]*)?`;

const LABEL_IL = new RegExp(
  String.raw`(?:^|\n)[ \t]*(?:İli|Ili|İLİ|(?:İl|Il)(?![çcÇC]))${VALUE}${PLACE}`,
  'imu',
);

const LABEL_ILCE = new RegExp(
  String.raw`(?:^|\n)[ \t]*(?:İlçesi|Ilcesi|İLÇESİ|İlçe|Ilce)${VALUE}${PLACE}`,
  'imu',
);

const LABEL_MAHALLE = new RegExp(
  String.raw`(?:^|\n)[ \t]*(?:Mahallesi|Mahalle|Köyü|Koyu|Köy)${VALUE}${PLACE}`,
  'imu',
);

const LABEL_ADA =
  /(?:^|\n)[ \t]*Ada(?:[ \t]*No(?:su)?)?[ \t]*:?[ \t]*(?:\n[ \t]*)?(\d{1,6})\b/imu;

const LABEL_PARSEL =
  /(?:^|\n)[ \t]*Parsel(?:[ \t]*No(?:su)?)?[ \t]*:?[ \t]*(?:\n[ \t]*)?(\d{1,6}(?:\/\d{1,4})?)\b/imu;

const LABEL_AREA =
  /(?:^|\n)[ \t]*(?:Yüzölçümü|Yuzolcumu|Yüz[ \t]*Ölçümü|Alan(?:ı)?)[ \t]*:?[ \t]*(?:\n[ \t]*)?([\d][\d., \t]*)[ \t]*(?:m[²2]|metrekare)?/imu;

const LABEL_MALIK = new RegExp(
  String.raw`(?:^|\n)[ \t]*(?:Malik(?:leri)?|Sahibi|Malik[ \t]*Ad[ıi][ \t]*Soyad[ıi])${VALUE}([A-ZÇĞİÖŞÜa-zçğıöşü.][A-ZÇĞİÖŞÜa-zçğıöşü. \t]{2,79})`,
  'imu',
);

const LABEL_NITELIK = new RegExp(
  String.raw`(?:^|\n)[ \t]*(?:Niteliği|Nitelik)${VALUE}${PLACE}`,
  'imu',
);

const LABEL_BLOK =
  /(?:^|\n)[ \t]*(?:Blok(?:[ \t]*No(?:su)?)?)[ \t]*:?[ \t]*(?:\n[ \t]*)?([A-Z0-9]{1,8})\b/imu;

const LABEL_BB =
  /(?:^|\n)[ \t]*(?:Bağımsız[ \t]*Bölüm(?:[ \t]*No(?:su)?)?|B\.?[ \t]*B\.?[ \t]*No)[ \t]*:?[ \t]*(?:\n[ \t]*)?(\d{1,6}(?:\/\d{1,4})?)\b/imu;

const LABEL_OWNER_ID =
  /(?:^|\n)[ \t]*(?:T\.?[ \t]*C\.?[ \t]*Kimlik[ \t]*No|Kimlik[ \t]*No|TCKN|Vergi[ \t]*No|VKN)[ \t]*:?[ \t]*(?:\n[ \t]*)?([1-9]\d{9,10})\b/imu;

const PLACE_STOP =
  /^(İLÇESİ|ILCESI|MAHALLESİ|MAHALLESI|ADA|PARSEL|NİTELİĞİ|NITELIGI|YÜZÖLÇÜMÜ|YUZOLCUMU|MALİK|MALIK|BLOK|KÖYÜ|KOYU)$/u;

export interface RegexExtractResult {
  fields: Partial<TapuOcrFields>;
  sources: Partial<Record<TapuFieldKey, ExtractionSource>>;
}

function normalizePlace(value: string): string | null {
  const cleaned = value
    .replace(/[ \t]+/g, ' ')
    .replace(/[:；;]+$/g, '')
    .trim()
    .toLocaleUpperCase('tr-TR');

  if (!cleaned || PLACE_STOP.test(cleaned)) return null;

  // "ANKARA İLÇESİ" gibi etiket sızıntısını kırp
  const parts = cleaned.split(' ').filter((p) => !PLACE_STOP.test(p));
  if (parts.length === 0) return null;
  return parts.join(' ');
}

function normalizeOwnerName(value: string): string {
  return value
    .replace(/[ \t]+/g, ' ')
    .replace(/\b(?:T\.?[ \t]*C\.?|Kimlik|TCKN|Vergi).*$/i, '')
    .trim()
    .toLocaleUpperCase('tr-TR');
}

/** "1.250,50" / "1250.50" / "1250" → number (m²) */
export function parseAreaSqm(raw: string): number | null {
  let s = raw.replace(/[ \t]+/g, '').replace(/m[²2]/gi, '');
  if (!s) return null;

  // TR: 1.250,50 → 1250.50
  if (/\d\.\d{3}/.test(s) && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // 1.250 (binlik ayırıcı)
    s = s.replace(/\./g, '');
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return null;
  return Math.round(n * 100) / 100;
}

export function extractTapuByRegex(ocrText: string): RegexExtractResult {
  const fields: Partial<TapuOcrFields> = {};
  const sources: RegexExtractResult['sources'] = {};
  const text = ocrText.replace(/\r\n/g, '\n');

  const il = text.match(LABEL_IL);
  if (il?.[1]) {
    const city = normalizePlace(il[1]);
    if (city) {
      fields.city = city;
      sources.city = 'regex';
    }
  }

  const ilce = text.match(LABEL_ILCE);
  if (ilce?.[1]) {
    const district = normalizePlace(ilce[1]);
    if (district) {
      fields.district = district;
      sources.district = 'regex';
    }
  }

  const mahalle = text.match(LABEL_MAHALLE);
  if (mahalle?.[1]) {
    const neighborhood = normalizePlace(mahalle[1]);
    if (neighborhood) {
      fields.neighborhood = neighborhood;
      sources.neighborhood = 'regex';
    }
  }

  const ada = text.match(LABEL_ADA);
  if (ada?.[1]) {
    fields.ada = ada[1].trim();
    sources.ada = 'regex';
  }

  const parsel = text.match(LABEL_PARSEL);
  if (parsel?.[1]) {
    fields.parsel = parsel[1].trim();
    sources.parsel = 'regex';
  }

  const area = text.match(LABEL_AREA);
  if (area?.[1]) {
    const sqm = parseAreaSqm(area[1]);
    if (sqm !== null) {
      fields.areaSqm = sqm;
      sources.areaSqm = 'regex';
    }
  }

  const malik = text.match(LABEL_MALIK);
  if (malik?.[1]) {
    const name = normalizeOwnerName(malik[1]);
    if (name.length >= 3) {
      fields.ownerName = name;
      sources.ownerName = 'regex';
    }
  }

  const ownerId = text.match(LABEL_OWNER_ID);
  if (ownerId?.[1]) {
    fields.ownerIdentity = ownerId[1];
    sources.ownerIdentity = 'regex';
  } else {
    const found = findValidTckns(text);
    if (found.length === 1) {
      fields.ownerIdentity = found[0];
      sources.ownerIdentity = 'regex';
    }
  }

  const nitelik = text.match(LABEL_NITELIK);
  if (nitelik?.[1]) {
    const propertyType = normalizePlace(nitelik[1]);
    if (propertyType) {
      fields.propertyType = propertyType;
      sources.propertyType = 'regex';
    }
  }

  const blok = text.match(LABEL_BLOK);
  if (blok?.[1]) {
    fields.blockNumber = blok[1].trim().toLocaleUpperCase('tr-TR');
    sources.blockNumber = 'regex';
  }

  const bb = text.match(LABEL_BB);
  if (bb?.[1]) {
    fields.independentSection = bb[1].trim();
    sources.independentSection = 'regex';
  }

  return { fields, sources };
}
