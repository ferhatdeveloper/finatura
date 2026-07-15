# Noter Satış Sözleşmesi OCR Parser

**Aşama:** 2.1  
**Sahiplik:** `services/document-agent/src/parsers/noter/`

Kameradan / OCR’dan gelen motorlu kara taşıtı noter satış sözleşmesi metnini yapısal JSON’a çevirir.

## Çıkarılan alanlar

| Alan | Açıklama |
|------|----------|
| `plaka` | TR plaka (`06 ABC 123`) |
| `saseNo` | 17 karakter VIN / şasi |
| `satisBedeli` | TL tutar (number) |
| `paraBirimi` | `TRY` |
| `aliciTckn` | Alıcı TCKN |
| `saticiTckn` | Satıcı TCKN |

## Mimari

1. **Regex** (`regex.ts`) — etiketli alanlar + plaka/VIN/para kalıpları  
2. **LLM fallback** (`prompt.ts`) — eksik/düşük güven alanları için prompt şablonu  
3. **Orkestrasyon** (`parse.ts`) — birleştirme, TCKN doğrulama, confidence skorları  
4. **Şema** (`schema.json`) — JSON Schema (draft 2020-12)

```ts
import { parseNoterOcr, parseNoterOcrSync } from './index.js';

const sync = parseNoterOcrSync(ocrText);

const asyncResult = await parseNoterOcr(ocrText, {
  preferLlmFallback: true,
  llmExtractor: async (_prompt, _text) => ({ /* LLM JSON */ }),
});
```

## Dosyalar

```
noter/
├── types.ts              # Tip tanımları
├── regex.ts              # Plaka, şasi, bedel, TCKN regex
├── prompt.ts             # LLM system/user şablonları
├── parse.ts              # Ana parse akışı
├── validate-tckn.ts      # TCKN algoritması
├── schema.json           # Çıktı JSON şeması
├── index.ts              # Public API
├── fixtures/             # Örnek OCR metinleri
├── __tests__/            # Birim test iskeleti
└── README.md
```

## Test

```bash
# document-agent kökünde Vitest bağlandıktan sonra:
npm test -- src/parsers/noter
```

Fixture: `fixtures/sample-noter-sozlesme.txt`

## Notlar

- Tapu / kimlik parser’larına dokunulmaz; bu klasör yalnızca noter sözleşmesi içindir.
- LLM sağlayıcısı Document Agent orkestrasyon katmanından enjekte edilir (`llmExtractor`).
- Çıktı `vehicles` ve `customer_caris` tablolarını beslemek üzere Aşama 3 transformer’larına iletilir.
