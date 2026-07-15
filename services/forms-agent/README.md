# @finatura/forms-agent

**Aşama 3.3** — Dijital Maslak / Teslimat / Yer Gösterme formları.

Esnafın sahada müşteriye imzalattığı yasal güvence PDF şablon iskeleti. e-Fatura / entegratör koduna dokunmaz.

## Formlar

| Kind | Belge | Sektör |
|------|--------|--------|
| `yer_gosterme` | Yer gösterme belgesi | Emlak |
| `arac_kapora` | Araç kapora / ön ödeme formu | Oto galeri |

## Dizin

```
services/forms-agent/
├── fixtures/                 # Örnek JSON veri
├── src/
│   ├── forms/
│   │   ├── yer-gosterme/     # tip + HTML şablon + sample
│   │   └── arac-kapora/
│   ├── pdf/
│   │   ├── htmlToPdf.ts      # HTML→PDF stub (Puppeteer vb. için kanca)
│   │   ├── pdfkitStub.ts     # PDFKit benzeri stub
│   │   └── renderFormPdf.ts  # birleşik API
│   ├── cli/generate-samples.ts
│   └── index.ts
└── output/                   # `npm run generate:samples` çıktısı (gitignore)
```

## Kullanım

```ts
import {
  renderForm,
  sampleYerGosterme,
  sampleAracKapora,
} from "@finatura/forms-agent";

// Tarayıcıda yazdırılabilir HTML
const html = renderForm("yer_gosterme", sampleYerGosterme, { engine: "html" });

// İleride gerçek motor bağlanacak stub PDF baytları
const pdfStub = renderForm("arac_kapora", sampleAracKapora, {
  engine: "html-to-pdf-stub",
});
```

### Motorlar

| `engine` | Çıktı |
|----------|--------|
| `html` (varsayılan) | Dolu A4 HTML |
| `html-to-pdf-stub` | HTML + PDF stub baytları |
| `pdfkit-stub` | Minimal PDFKit-benzeri stub |

Üretimde `htmlToPdf.ts` içine Playwright/Puppeteer veya `pdfkitStub.ts` yerine gerçek `pdfkit` bağlanır.

## Komutlar

```bash
cd services/forms-agent
npm install
npm run typecheck
npm run generate:samples   # output/*.html ve *.pdf stub
npm run build
```

## Sınırlar (iskelet)

- Elektronik imza / tablet imza akışı yok (imza kutuları placeholder).
- Teslimat tutanağı formu henüz yok; aynı kalıpla eklenebilir.
- e-Fatura / Gider Pusulası bu paketin dışında (Aşama 3.1–3.2).
