# Tapu Senedi OCR Parser (AŞAMA 2.2)

Tapu senedi OCR metninden İl/İlçe, Ada, Parsel, Yüzölçümü ve Malik bilgilerini yapısal JSON'a çevirir.

## Alanlar

| Alan | Açıklama |
|------|----------|
| `city` / `district` | İl / İlçe |
| `neighborhood` | Mahalle / Köy |
| `ada` / `parsel` | Ada ve parsel no |
| `areaSqm` | Yüzölçümü (m², number) |
| `ownerName` / `ownerIdentity` | Malik adı ve TCKN/VKN |
| `propertyType` | Nitelik (opsiyonel) |
| `blockNumber` / `independentSection` | Blok / BB no (opsiyonel) |

`packages/shared-types` içindeki `tapuOcrFieldsSchema` ile hizalıdır.

## Dosyalar

- `parse.ts` — ana giriş (`parseTapuOcr` / `parseTapuOcrSync` / `parseTapu`)
- `regex.ts` — etiket tabanlı regex çıkarıcı
- `validate-tckn.ts` — malik TCKN kontrolü
- `prompt.ts` — LLM prompt şablonu
- `schema.json` — JSON Schema
- `types.ts` — TypeScript tipleri
- `fixtures/` — örnek OCR metinleri
- `__tests__/` — birim test iskeleti

## Kullanım

```ts
import { parseTapuOcrSync } from './parsers/tapu/index.js';

const result = parseTapuOcrSync(ocrText);
// result.fields.city, .district, .ada, .parsel, .areaSqm, .ownerName
```

LLM fallback:

```ts
import { parseTapuOcr } from './parsers/tapu/index.js';

await parseTapuOcr(ocrText, {
  preferLlmFallback: true,
  llmExtractor: async (_prompt, _text) => {
    return { city: null, district: null, ada: null, parsel: null, areaSqm: null, ownerName: null };
  },
});
```

Orkestratör `tapuAdapter` şu export'ları arar: `parseTapuOcr`, `parseTapu`, `parse`.

## Test

`document-agent` paketinde vitest kurulunca:

```bash
npx vitest run src/parsers/tapu
```
