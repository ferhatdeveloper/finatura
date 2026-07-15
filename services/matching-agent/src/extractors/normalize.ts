/** Türkçe karakter ve banka açıklaması normalizasyonu */
export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/\u0130/g, "I") // İ
    .replace(/\u0131/g, "i") // ı
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9/\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function collapseSpaces(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
