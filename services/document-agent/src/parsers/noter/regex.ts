import { findValidTckns, isValidTckn } from './validate-tckn.js';
import type { NoterBelgeTuru, NoterOcrFields } from './types.js';

/** 01–81 il kodu + 1–3 harf + 2–4 rakam (eski/yeni TR plaka). */
const PLAKA_CORE =
  /(?<![A-Z0-9])(0[1-9]|[1-7][0-9]|8[01])\s*([A-ZÇĞİÖŞÜ]{1,3})\s*(\d{2,4})(?!\d)/i;

const LABEL_PLAKA =
  /(?:Plaka\s*(?:No|Numaras[ıi])?|Ara[cç]\s*Plakas[ıi]|Trafik\s*Plakas[ıi])[:\s]*((?:0[1-9]|[1-7][0-9]|8[01])\s*[A-ZÇĞİÖŞÜ]{1,3}\s*\d{2,4})/i;

/** VIN / şasi: 17 karakter, I/O/Q yok. */
const VIN_CORE = /\b([A-HJ-NPR-Z0-9]{17})\b/i;

const LABEL_SASE =
  /(?:[ŞS]asi\s*(?:No|Numaras[ıi])?|VIN|Vehicle\s*Identification\s*Number|Şasi\s*No)[:\s]*([A-HJ-NPR-Z0-9]{17})/i;

const LABEL_SATIS_BEDELI =
  /(?:Sat[ıi][şs]\s*Bedeli|Bedeli|Sat[ıi][şs]\s*Fiyat[ıi]|Al[ıi][şs]\s*Bedeli|Sözleşme\s*Bedeli)[:\s]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:TL|TRY|₺)?/i;

const LABEL_ALICI_TCKN =
  /(?:Al[ıi]c[ıi](?:n[ıi]n)?\s*(?:T\.?\s*C\.?\s*)?(?:Kimlik\s*)?(?:No|Numaras[ıi])?|Al[ıi]c[ıi]\s*TCKN)[:\s]*([1-9]\d{10})/i;

const LABEL_SATICI_TCKN =
  /(?:Sat[ıi]c[ıi](?:n[ıi]n)?\s*(?:T\.?\s*C\.?\s*)?(?:Kimlik\s*)?(?:No|Numaras[ıi])?|Sat[ıi]c[ıi]\s*TCKN)[:\s]*([1-9]\d{10})/i;

export interface RegexExtractResult {
  fields: Partial<NoterOcrFields>;
  sources: Partial<Record<keyof NoterOcrFields, 'regex'>>;
}

export function normalizePlaka(raw: string): string | null {
  const m = raw.toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim().match(PLAKA_CORE);
  if (!m) return null;
  return `${m[1]} ${m[2].toLocaleUpperCase('tr-TR')} ${m[3]}`;
}

export function normalizeSase(raw: string): string | null {
  const v = raw.replace(/[\s\-]/g, '').toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return null;
  return v;
}

/** TR para formatı → number (örn. 1.850.000,00 → 1850000). */
export function parseTurkishMoney(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/[₺]/g, '');
  if (!cleaned) return null;

  let normalized: string;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1.850.000,00
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // 1850000,50 veya 1,5
    normalized = cleaned.replace(',', '.');
  } else {
    // 1850000 veya 1.850.000 (binlik nokta)
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '');
    } else {
      normalized = cleaned;
    }
  }

  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function detectBelgeTuru(text: string): NoterBelgeTuru {
  const t = text.toLocaleLowerCase('tr-TR');
  if (
    t.includes('noter') ||
    t.includes('satış sözleşmesi') ||
    t.includes('satis sozlesmesi') ||
    t.includes('taşıt satış') ||
    t.includes('tasit satis') ||
    t.includes('motorlu kara taşıtı') ||
    t.includes('motorlu kara tasiti')
  ) {
    return 'noter_satis_sozlesmesi';
  }
  return 'unknown';
}

function pickRoleTckn(
  text: string,
  role: 'alici' | 'satici',
): string | null {
  const labeled =
    role === 'alici' ? text.match(LABEL_ALICI_TCKN) : text.match(LABEL_SATICI_TCKN);
  if (labeled?.[1] && isValidTckn(labeled[1])) {
    return labeled[1];
  }

  // Bölüm başlığı + sonraki satırlarda "T.C. Kimlik No"
  const heading =
    role === 'alici'
      ? /(?:^|\n)\s*AL[İI]CI\b[\s\S]{0,400}?(?:T\.?\s*C\.?\s*)?Kimlik\s*No[:\s]*([1-9]\d{10})/i
      : /(?:^|\n)\s*SAT[İI]CI\b[\s\S]{0,400}?(?:T\.?\s*C\.?\s*)?Kimlik\s*No[:\s]*([1-9]\d{10})/i;

  const block = text.match(heading);
  if (block?.[1] && isValidTckn(block[1])) {
    return block[1];
  }

  return null;
}

export function extractNoterByRegex(ocrText: string): RegexExtractResult {
  const fields: Partial<NoterOcrFields> = {};
  const sources: RegexExtractResult['sources'] = {};
  const text = ocrText.replace(/\r\n/g, '\n');

  const belgeTuru = detectBelgeTuru(text);
  fields.belgeTuru = belgeTuru;
  sources.belgeTuru = 'regex';

  const plakaLabeled = text.match(LABEL_PLAKA);
  if (plakaLabeled?.[1]) {
    const plaka = normalizePlaka(plakaLabeled[1]);
    if (plaka) {
      fields.plaka = plaka;
      sources.plaka = 'regex';
    }
  }
  if (!fields.plaka) {
    const plaka = text.match(PLAKA_CORE);
    if (plaka) {
      fields.plaka = `${plaka[1]} ${plaka[2].toLocaleUpperCase('tr-TR')} ${plaka[3]}`;
      sources.plaka = 'regex';
    }
  }

  const saseLabeled = text.match(LABEL_SASE);
  if (saseLabeled?.[1]) {
    const sase = normalizeSase(saseLabeled[1]);
    if (sase) {
      fields.saseNo = sase;
      sources.saseNo = 'regex';
    }
  }
  if (!fields.saseNo) {
    const vin = text.match(VIN_CORE);
    if (vin?.[1]) {
      const sase = normalizeSase(vin[1]);
      if (sase) {
        fields.saseNo = sase;
        sources.saseNo = 'regex';
      }
    }
  }

  const bedel = text.match(LABEL_SATIS_BEDELI);
  if (bedel?.[1]) {
    const amount = parseTurkishMoney(bedel[1]);
    if (amount !== null) {
      fields.satisBedeli = amount;
      fields.paraBirimi = 'TRY';
      sources.satisBedeli = 'regex';
      sources.paraBirimi = 'regex';
    }
  }

  const alici = pickRoleTckn(text, 'alici');
  if (alici) {
    fields.aliciTckn = alici;
    sources.aliciTckn = 'regex';
  }

  const satici = pickRoleTckn(text, 'satici');
  if (satici) {
    fields.saticiTckn = satici;
    sources.saticiTckn = 'regex';
  }

  // Etiket yoksa: iki geçerli TCKN → sırayla satıcı / alıcı varsayımı yapma; yalnızca tek eşleşmeyi bırak.
  if (!fields.aliciTckn || !fields.saticiTckn) {
    const found = findValidTckns(text).filter(
      (t) => t !== fields.aliciTckn && t !== fields.saticiTckn,
    );
    if (!fields.aliciTckn && !fields.saticiTckn && found.length === 2) {
      // Rol belirsiz — atanmaz; LLM/prompt tamamlasın.
    } else if (!fields.aliciTckn && found.length === 1 && fields.saticiTckn) {
      fields.aliciTckn = found[0];
      sources.aliciTckn = 'regex';
    } else if (!fields.saticiTckn && found.length === 1 && fields.aliciTckn) {
      fields.saticiTckn = found[0];
      sources.saticiTckn = 'regex';
    }
  }

  return { fields, sources };
}
