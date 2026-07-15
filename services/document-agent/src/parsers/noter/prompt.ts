/**
 * Noter Satış Sözleşmesi LLM çıkarma prompt şablonu.
 * Regex başarısız veya düşük güvenli olduğunda kullanılır.
 */

export const NOTER_SYSTEM_PROMPT = `Sen Finatura Document Agent'ın noter satış sözleşmesi OCR uzmanısın.
Görev: Türkiye'de düzenlenen motorlu kara taşıtı / araç noter satış sözleşmesi OCR metninden
yalnızca yapısal alanları JSON olarak çıkar.

Kurallar:
- Sadece JSON döndür; açıklama yazma.
- Bulunamayan alanları null yap.
- plaka: "34 ABC 123" formatında normalize et (il kodu + harf + rakam).
- saseNo: 17 karakter VIN; I, O, Q harflerini kabul etme; büyük harf.
- satisBedeli: sayı (TL); binlik ayraçları temizle (1.850.000,00 → 1850000).
- paraBirimi: "TRY" veya null.
- aliciTckn / saticiTckn: 11 haneli rakam, başında 0 olamaz; doğru tarafa ata.
- belgeTuru: "noter_satis_sozlesmesi" | "unknown".
- Uydurma veri üretme; belirsizse null.
- Alıcı ve satıcı TCKN'lerini birbirine karıştırma.`;

export const NOTER_USER_PROMPT_TEMPLATE = `Aşağıdaki OCR metninden alanları çıkar.

İstenen JSON şeması:
{
  "plaka": string | null,
  "saseNo": string | null,
  "satisBedeli": number | null,
  "paraBirimi": "TRY" | null,
  "aliciTckn": string | null,
  "saticiTckn": string | null,
  "belgeTuru": "noter_satis_sozlesmesi" | "unknown"
}

OCR metni:
---
{{OCR_TEXT}}
---`;

export function buildNoterExtractionPrompt(ocrText: string): {
  system: string;
  user: string;
} {
  return {
    system: NOTER_SYSTEM_PROMPT,
    user: NOTER_USER_PROMPT_TEMPLATE.replace('{{OCR_TEXT}}', ocrText.trim()),
  };
}
