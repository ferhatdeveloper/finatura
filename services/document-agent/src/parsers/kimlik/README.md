# Kimlik / Ehliyet OCR Parser (AŞAMA 2.3)

Yeni cari açılırken T.C. Kimlik Kartı veya Sürücü Belgesi OCR metninden form alanlarını yapısal JSON'a çevirir.

## Alanlar

| Alan | Açıklama |
|------|----------|
| `tckn` | 11 haneli TCKN (algoritma doğrulamalı) |
| `ad` / `soyad` / `adSoyad` | İsim bilgisi |
| `dogumTarihi` | `YYYY-MM-DD` |
| `belgeTuru` | `tc_kimlik` \| `ehliyet` \| `unknown` |

## Dosyalar

- `parse.ts` — ana giriş (`parseKimlikOcr` / `parseKimlikOcrSync`)
- `regex.ts` — etiket + MRZ (TD1) regex çıkarıcı
- `validate-tckn.ts` — TCKN kontrol basamağı
- `prompt.ts` — LLM prompt şablonu
- `schema.json` — JSON Schema
- `types.ts` — TypeScript tipleri
- `fixtures/` — örnek OCR metinleri
- `__tests__/` — birim test iskeleti

## Kullanım

```ts
import { parseKimlikOcrSync } from './parsers/kimlik/index.js';

const result = parseKimlikOcrSync(ocrText);
// result.fields.tckn, .ad, .soyad, .dogumTarihi
```

LLM fallback:

```ts
import { parseKimlikOcr } from './parsers/kimlik/index.js';

await parseKimlikOcr(ocrText, {
  preferLlmFallback: true,
  llmExtractor: async (_prompt, text) => {
    // Vision / chat model çağrısı
    return { tckn: null, ad: null, soyad: null, dogumTarihi: null, belgeTuru: 'unknown' };
  },
});
```

## Test

`document-agent` paketinde vitest kurulunca:

```bash
npx vitest run src/parsers/kimlik
```
