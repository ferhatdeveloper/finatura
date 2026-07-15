import { normalizeText } from "./normalize.js";

const STOPWORDS = new Set([
  "EFT",
  "HAVALE",
  "FAST",
  "GELEN",
  "GIDEN",
  "GONDEREN",
  "ALICI",
  "GONDERICI",
  "ODEME",
  "TAHSILAT",
  "FATURA",
  "SOZLESME",
  "NOTER",
  "TAPU",
  "KAPORA",
  "PESIN",
  "BANKA",
  "TR",
  "TL",
  "TRY",
  "REF",
  "REFNO",
  "ISLEM",
  "ACIKLAMA",
  "MUSTERI",
  "CARI",
  "ADA",
  "PARSEL",
  "PLAKA",
  "TCKN",
  "VKN",
  "IBAN",
  "VE",
  "ILE",
  "ICIN",
  "DEN",
  "DAN",
]);

/**
 * Açıklamadaki olası kişi/unvan adaylarını süz.
 * Banka kalıpları: "GONDEREN: AHMET YILMAZ", "AHMET YILMAZ EFT"
 */
export function extractCandidateNames(description: string): string[] {
  const normalized = normalizeText(description);
  const names = new Set<string>();

  const labeled =
    /(?:GONDEREN|GONDERICI|ALICI|MUSTERI|UNVAN)\s*[:=\-]?\s*([A-Z][A-Z\s.'-]{2,60})/g;
  for (const m of normalized.matchAll(labeled)) {
    const cleaned = cleanNameToken(m[1]);
    if (cleaned) names.add(cleaned);
  }

  // 2–4 ardışık büyük harfli kelime blokları
  const words = normalized.split(" ").filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const chunk: string[] = [];
    for (let j = i; j < Math.min(i + 4, words.length); j++) {
      const w = words[j];
      if (!/^[A-Z]{2,}$/.test(w) || STOPWORDS.has(w) || /^\d/.test(w)) break;
      chunk.push(w);
      if (chunk.length >= 2) {
        names.add(chunk.join(" "));
      }
    }
  }

  return [...names];
}

function cleanNameToken(raw: string): string | null {
  const parts = normalizeText(raw)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  if (parts.length < 2) return null;
  return parts.slice(0, 4).join(" ");
}

/** Basit token Jaccard + prefix benzerliği (0–1) */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;

  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;

  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  const jaccard = union === 0 ? 0 : inter / union;

  // Sıra koruyan prefix puanı
  const arrA = [...ta];
  const arrB = [...tb];
  let prefix = 0;
  const len = Math.min(arrA.length, arrB.length);
  for (let i = 0; i < len; i++) {
    if (arrA[i] === arrB[i]) prefix++;
    else break;
  }
  const orderBonus = prefix / Math.max(arrA.length, arrB.length);

  return Math.min(1, jaccard * 0.75 + orderBonus * 0.35);
}
