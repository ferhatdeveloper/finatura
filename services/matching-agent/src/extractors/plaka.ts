/**
 * Türkiye plaka süzümü.
 * Desteklenen örnekler: 34 ABC 123, 06AB1234, 34-AB-1234, PLAKA:34ABC123
 */
const PLATE_REGEX =
  /\b(\d{2})\s*[-\.]?\s*([A-Z]{1,3})\s*[-\.]?\s*(\d{2,4})\b/g;

export function normalizePlate(plate: string): string {
  const cleaned = plate
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]/g, "");
  const m = cleaned.match(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/);
  if (!m) return cleaned;
  return `${m[1]}${m[2]}${m[3]}`;
}

export function extractPlates(description: string): string[] {
  const upper = description
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");

  const found = new Set<string>();
  for (const match of upper.matchAll(PLATE_REGEX)) {
    const city = match[1];
    const letters = match[2];
    const digits = match[3];
    // Geçersiz kombinasyonları ele: 1 harf + 5 rakam yok; rakam uzunluğu 2–4
    if (letters.length === 1 && digits.length > 4) continue;
    if (letters.length === 3 && digits.length > 3) continue;
    found.add(normalizePlate(`${city}${letters}${digits}`));
  }

  return [...found];
}
