# Finatura — e-Fatura Entegratör API (Aşama 3.2)

**8 entegratör iskeleti:** EDM, Uyumsoft, FIT, Logo eLogo, QNB eSolutions, NES, Nilvera ve İzibiz — ortak arayüz, stub adapter’lar ve **gönder → onayla → PDF indir** akışı.

Tüm sağlayıcılar **live-capable**: `EINVOICE_STUB_MODE=false` + ilgili credential’lar ile inject edilebilir `HttpClient` üzerinden SOAP/REST HTTP iskeleti çalışır. Stub varsayılan olarak açıktır (CI / geliştirme).

Bu servis **transformer (Aşama 3.1)** iç mantığına dokunmaz; `@finatura/invoice-transformers` çıktısını `invoiceDraftFromTransformer` ile gönderim taslağına köprüler.

## Bayilik ve kontör

Finatura müşteriye kontör satacak, entegratörde **bayilik** hesabı tutulacaktır.

1. Sekiz sağlayıcıdan birinden bayilik (veya alt bayi) başvurusu → test/prod WS/OAuth/API Key + endpoint.
2. `.env` içinde `EINVOICE_PROVIDER` seçilir; ilgili `*_BASE_URL` ve kimlik alanları doldurulur.
3. Geliştirmede `EINVOICE_STUB_MODE=true` (varsayılan) kalır; canlı deneme için `false` yapılır.
4. Credential yokken live çağrı **503 / missing_credentials** fırlatır.

## Mimari

```
Taslak / UBL (3.1 transformer)
        │  invoiceDraftFromTransformer
        ▼
┌──────────────────────────┐
│  EinvoiceIntegrator      │  ortak interface
│  send / approve / pdf    │
└───────────┬──────────────┘
            │
   ┌────────┼────────┬────────┬────────┬────────┬────────┬────────┐
   ▼        ▼        ▼        ▼        ▼        ▼        ▼        ▼
  EDM   Uyumsoft   FIT     eLogo     QNB      NES    Nilvera   İzibiz
 (stub|live SOAP/REST)
```

| Provider | Live taşıma | Tipik operasyonlar |
|---|---|---|
| **EDM** | Login → SESSION_ID, sonra SOAP (EFaturaEDM.svc) | SendInvoice, SendInvoiceResponse, GetInvoiceStatus, GetInvoiceWithType(PDF) |
| **Uyumsoft** | BasicIntegration SOAP | SendInvoice, Accept/Reject, GetInvoiceStatus, GetOutboxInvoicePdf |
| **FIT** | SendUBL SOAP + Basic/WSSE auth (ClientEInvoiceServices) | SendUBL, GetInvoiceView(PDF), GetEnvelopeStatus |
| **eLogo** | Login → sessionID, PostBoxService SOAP | SendDocument, GetDocumentData(PDF), GetDocumentStatus |
| **QNB** | wsLogin (cookie) + connectorService SOAP | belgeGonderExt, gidenBelgeDurumSorgulaExt, gidenBelgeleriIndir(PDF) |
| **NES** | OAuth2 client_credentials + REST | token, send, status, pdf, approve |
| **Nilvera** | REST Bearer (API Key) | send, status, pdf, approve |
| **İzibiz** | Login + EInvoiceWS SOAP | SendInvoice, GetInvoiceStatus, GetInvoice (PDF), Approve |

## Klasör yapısı

```
services/einvoice-integrator/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── tests/
│   ├── stub.integration.test.ts
│   ├── uyumsoft.live.test.ts
│   ├── edm.live.test.ts
│   ├── fit.live.test.ts
│   ├── elogo.live.test.ts
│   ├── qnb.live.test.ts
│   ├── nes.live.test.ts
│   ├── nilvera.live.test.ts
│   └── izibiz.live.test.ts
└── src/
    ├── index.ts
    ├── config.ts
    ├── http/client.ts
    ├── adapters/
    │   ├── types.ts
    │   ├── credentials.ts
    │   ├── stubHelpers.ts
    │   ├── soapXml.ts
    │   ├── uyumsoft.soap.ts / uyumsoft.adapter.ts
    │   ├── edm.soap.ts / edm.adapter.ts
    │   ├── fit.soap.ts / fit.adapter.ts
    │   ├── elogo.soap.ts / elogo.adapter.ts
    │   ├── qnb.soap.ts / qnb.adapter.ts
    │   ├── nes.rest.ts / nes.adapter.ts
    │   ├── nilvera.rest.ts / nilvera.adapter.ts
    │   ├── izibiz.soap.ts / izibiz.adapter.ts
    │   └── index.ts
    ├── flow/
    └── routes/
```

## Kurulum

```bash
cd packages/invoice-transformers && npm install && npm run build

cd ../../services/einvoice-integrator
cp .env.example .env
npm install
npm run dev
```

```bash
npm run typecheck
npm test
```

## Ortam değişkenleri

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | HTTP port | `3200` |
| `EINVOICE_PROVIDER` | `edm` \| `uyumsoft` \| `fit` \| `elogo` \| `qnb` \| `nes` \| `nilvera` \| `izibiz` | `edm` |
| `EINVOICE_STUB_MODE` | Stub (gerçek API yok) | `true` |
| `EDM_BASE_URL` / `USERNAME` / `PASSWORD` / `VKN` | EDM live | test örnek URL |
| `EDM_GB_ALIAS` / `EDM_PK_ALIAS` | Opsiyonel GB/PK | skeleton varsayılan |
| `UYUMSOFT_*` | Uyumsoft live | test örnek URL |
| `FIT_*` / `FIT_GB_ALIAS` / `FIT_PK_ALIAS` | FIT live | test örnek URL |
| `ELOGO_*` / `ELOGO_GB_ALIAS` / `ELOGO_PK_ALIAS` | eLogo PostBoxService | betatest.elogo.com.tr |
| `QNB_*` / `QNB_ERP_CODE` | QNB eSolutions live | connectortest.efinans.com.tr |
| `NES_*` / `NES_CLIENT_ID` / `NES_CLIENT_SECRET` | NES REST+OAuth live | api.nes.com.tr |
| `NILVERA_*` / `NILVERA_API_KEY` | Nilvera REST Bearer | apitest.nilvera.com |
| `IZIBIZ_*` | İzibiz SOAP live | efaturatest.izibiz.com.tr |
| `DEFAULT_SENDER_VKN` | İstekte yoksa gönderici VKN | — |

## HTTP uçları

| Metot | Yol | Açıklama |
|---|---|---|
| `GET` | `/health` | Sağlık + aktif provider |
| `GET` | `/api/invoices/meta/provider` | Varsayılan entegratör bilgisi |
| `POST` | `/api/invoices/send` | Taslak gönder |
| `POST` | `/api/invoices/from-transformer/send` | TransformResult → send (veya `runFlow`) |
| `POST` | `/api/invoices/:ettn/approve` | Onayla / reddet |
| `GET` | `/api/invoices/:ettn/pdf` | PDF |
| `GET` | `/api/invoices/:ettn/status` | Durum |
| `POST` | `/api/invoices/flow/send-approve-pdf` | Üç adımlı akış |

### Programatik

```ts
import {
  createIntegrator,
  invoiceDraftFromTransformer,
  runSendApprovePdfFlow,
} from '@finatura/einvoice-integrator';

const integrator = createIntegrator('nilvera'); // stubMode config’ten
await runSendApprovePdfFlow(integrator, payload);

// Live + mock HTTP (unit test)
createIntegrator('izibiz', { stubMode: false, http: myMockClient });
```

## Bilinçli sınırlar

- Live yollar **taşınabilir SOAP/REST iskeleti**: bayilik WSDL / Swagger / alan adları ortama göre inceltilmeli.
- GB/PK alias’ları prod’da GİB kullanıcı listesinden gelmeli (`*_GB_ALIAS` / metadata).
- Tenant DB yazımı yok.
