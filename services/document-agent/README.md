# Document Agent — OCR & Evrak Orkestrasyonu

Finatura Aşama 2: yüklenen belge → tip tespiti → ilgili parser.

## Akış

```
Upload / ocrText
    → OcrProvider (tesseract varsayılan | stub; istemci ocrText öncelikli)
    → Belge tipi tespiti (noter | tapu | kimlik)
    → Parser registry → src/parsers/{noter|tapu|kimlik}
    → Yapısal JSON yanıt
```

Varsayılan motor `tesseract` (gerçek OCR). Stub yalnızca `OCR_PROVIDER=stub` ile açılır. `tesseract` görüntü buffer’ında tesseract.js çalıştırır (`TESSERACT_LANGS=tur+eng`); metin/görüntü yoksa veya OCR başarısızsa **422** döner — stub placeholder’a düşülmez. `/analyze-text` sunucu tarafında fixture üretmez; istemci gerçek `ocrText` göndermelidir.

Parser implementasyonları `src/parsers/*` altında ayrı paketlerdir; bu servis yalnızca orkestrasyon ve HTTP katmanını sağlar.

## API

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/health` | Sağlık, `ocrProvider`, `tesseractLangs`, parser listesi |
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
| `tesseract` (varsayılan) | Upload görüntüsü → tesseract.js (`TESSERACT_LANGS=tur+eng`) |
| `stub` | İstemci `ocrText` yoksa placeholder; yalnızca açıkça `OCR_PROVIDER=stub` |

```bash
# env (özet)
# OCR_PROVIDER=tesseract          # varsayılan; stub için OCR_PROVIDER=stub
# TESSERACT_LANGS=tur+eng

npm run typecheck
npm test
```
