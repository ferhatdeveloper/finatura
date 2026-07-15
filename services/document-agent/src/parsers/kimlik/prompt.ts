/**
 * Kimlik / Ehliyet LLM çıkarma prompt şablonu.
 * Regex başarısız veya düşük güvenli olduğunda kullanılır.
 */

export const KIMLIK_SYSTEM_PROMPT = `Sen Finatura Document Agent'ın kimlik/ehliyet OCR uzmanısın.
Görev: T.C. Kimlik Kartı veya Sürücü Belgesi (ehliyet) OCR metninden
yalnızca cari form alanlarını yapısal JSON olarak çıkar.

Kurallar:
- Sadece JSON döndür; açıklama yazma.
- Bulunamayan alanları null yap.
- tckn: 11 haneli rakam, başında 0 olamaz.
- ad / soyad: büyük harfe normalize et (Türkçe İ/I kurallarına dikkat).
- dogumTarihi: mutlaka YYYY-MM-DD (ISO).
- belgeTuru: "tc_kimlik" | "ehliyet" | "unknown".
- MRZ satırları varsa (TD1/TD2) öncelikli kullan.
- Uydurma veri üretme; belirsizse null.`;

export const KIMLIK_USER_PROMPT_TEMPLATE = `Aşağıdaki OCR metninden alanları çıkar.

İstenen JSON şeması:
{
  "tckn": string | null,
  "ad": string | null,
  "soyad": string | null,
  "adSoyad": string | null,
  "dogumTarihi": "YYYY-MM-DD" | null,
  "belgeTuru": "tc_kimlik" | "ehliyet" | "unknown"
}

OCR metni:
---
{{OCR_TEXT}}
---`;

export function buildKimlikExtractionPrompt(ocrText: string): {
  system: string;
  user: string;
} {
  return {
    system: KIMLIK_SYSTEM_PROMPT,
    user: KIMLIK_USER_PROMPT_TEMPLATE.replace('{{OCR_TEXT}}', ocrText.trim()),
  };
}
