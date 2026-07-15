# Document Agent — OCR & Evrak Orkestrasyonu

Finatura Aşama 2: yüklenen belge → tip tespiti → ilgili parser.

## Akış

```
Upload / ocrText
    → OcrProvider (stub | tesseract; istemci ocrText öncelikli)
    → Belge tipi tespiti (noter | tapu | kimlik)
    → Parser registry → src/parsers/{noter|tapu|kimlik}
    → Yapısal JSON yanıt
```

`OCR_PROVIDER=stub|tesseract` ile motor seçilir. `tesseract` görüntü buffer’ında tesseract.js çalıştırır; metin/PDF veya hata durumunda stub placeholder’a düşer.

Parser implementasyonları `src/parsers/*` altında ayrı paketlerdir; bu servis yalnızca orkestrasyon ve HTTP katmanını sağlar.

## API

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/health` | Sağlık + kayıtlı parser listesi |
| POST | `/api/v1/documents/analyze` | multipart `file` ve/veya `ocrText`, opsiyonel `documentType` |
| POST | `/api/v1/documents/analyze-text` | JSON `{ "ocrText": "..." }` |

Örnek:

```bash
curl -s -X POST http://localhost:3100/api/v1/documents/analyze-text \
  -H "Content-Type: application/json" \
  -d "{\"ocrText\":\"T.C. KİMLİK KARTI Soyadı: YILMAZ Doğum Tarihi: 01.01.1990\",\"documentType\":\"kimlik\"}"
```

## Çalıştırma

```bash
cd services/document-agent
cp .env.example .env
npm install
npm run dev
```

Port varsayılan: `3100`.

## Klasörler

- `src/api/` — Express HTTP katmanı
- `src/orchestrator/` — pipeline, tip tespiti, parser adapter'ları
- `src/orchestrator/ocr/` — `OcrProvider` (stub + tesseract.js)
- `src/parsers/` — noter / tapu / kimlik (başka ajan sahipliği)

## OCR

| `OCR_PROVIDER` | Davranış |
|----------------|----------|
| `stub` (varsayılan) | İstemci `ocrText` yoksa placeholder; geriye uyumlu |
| `tesseract` | Görüntü buffer → tesseract.js (`TESSERACT_LANGS`, varsayılan `tur+eng`) |

```bash
npm run typecheck
npm test
```
