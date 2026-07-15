/**
 * T.C. Kimlik No süzümü ve algoritmik doğrulama.
 * Banka açıklamalarında boşluk/nokta ayraçlı 11 haneler de yakalanır.
 */
const TCKN_CHUNK = /(?<!\d)(\d[\d\s.\-]{9,14}\d)(?!\d)/g;

export function isValidTckn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const d = digits.split("").map(Number);
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];
  const dig10 = (oddSum * 7 - evenSum) % 10;
  const normalizedDig10 = (dig10 + 10) % 10;
  if (normalizedDig10 !== d[9]) return false;

  const dig11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return dig11 === d[10];
}

export function extractTckns(description: string): string[] {
  const found = new Set<string>();

  for (const match of description.matchAll(TCKN_CHUNK)) {
    const digits = match[1].replace(/\D/g, "");
    if (digits.length !== 11) continue;
    if (isValidTckn(digits)) found.add(digits);
  }

  // Bitışık 11 hane tarama (açıklama ortasında gürültü varken)
  const compact = description.replace(/\D/g, " ");
  for (const token of compact.split(/\s+/)) {
    if (token.length === 11 && isValidTckn(token)) found.add(token);
  }

  return [...found];
}
