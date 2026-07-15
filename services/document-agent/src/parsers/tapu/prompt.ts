/**
 * Tapu Senedi LLM çıkarma prompt şablonu.
 * Regex başarısız veya düşük güvenli olduğunda kullanılır.
 */

export const TAPU_SYSTEM_PROMPT = `Sen Finatura Document Agent'ın tapu senedi OCR uzmanısın.
Görev: Türkiye Tapu Senedi / Tapu Kaydı OCR metninden
yalnızca emlak formu alanlarını yapısal JSON olarak çıkar.

Kurallar:
- Sadece JSON döndür; açıklama yazma.
- Bulunamayan alanları null yap.
- city / district / neighborhood / ownerName: büyük harfe normalize et (Türkçe İ/I).
- ada / parsel: sayısal string (parsel'de "/" olabilir).
- areaSqm: metrekare (number); binlik ayırıcıları yorumla (1.250,50 → 1250.5).
- ownerIdentity: TCKN (11 hane) veya VKN (10 hane); yoksa null.
- Uydurma veri üretme; belirsizse null.`;

export const TAPU_USER_PROMPT_TEMPLATE = `Aşağıdaki OCR metninden alanları çıkar.

İstenen JSON şeması:
{
  "city": string | null,
  "district": string | null,
  "neighborhood": string | null,
  "ada": string | null,
  "parsel": string | null,
  "areaSqm": number | null,
  "ownerName": string | null,
  "ownerIdentity": string | null,
  "propertyType": string | null,
  "blockNumber": string | null,
  "independentSection": string | null
}

OCR metni:
---
{{OCR_TEXT}}
---`;

export function buildTapuExtractionPrompt(ocrText: string): {
  system: string;
  user: string;
} {
  return {
    system: TAPU_SYSTEM_PROMPT,
    user: TAPU_USER_PROMPT_TEMPLATE.replace('{{OCR_TEXT}}', ocrText.trim()),
  };
}
