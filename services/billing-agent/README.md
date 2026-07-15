# Finatura — Billing Agent (kontör + ödeme + bayilik)

Merkezi **kontör takip**, uygulama içi **ödeme geçidi** ve **e-fatura/OCR kontör bayiliği**.

OCR / e-fatura kullanımında bakiye düşer; müşteri paket satın alınca webhook üzerinden kontör yüklenir. Finatura, entegratörden (EDM / Uyumsoft / FIT) toplu kontör alıp tenant’lara paket olarak satar.

## Bayilik akışı

```
Entegratör (EDM / Uyumsoft / FIT)
        │  Finatura toplu kontör satın alır
        ▼
   Finatura stok / reseller
        │  Müşteriye paket satışı (checkout)
        ▼
POST /api/payment/checkout  →  ödeme (stub | iyzico | paytr)
        │
        ▼
POST /api/payment/webhook   →  kontorLedger.credit
        │   reference_type = paket cinsine göre
        │   (payment_efatura_kontor | payment_ocr_kontor | …)
        ▼
  tenant_kontor_balances / kontor_ledger
        │
        │  e-fatura gönderimi / OCR
        ▼
POST /api/kontor/debit/efatura  →  reference_type=efatura_send
POST /api/kontor/debit/ocr      →  reference_type=ocr_*
```

1. **Finatura → entegratör:** Toplu kontör / sözleşme (operasyonel; bu servis dışı).
2. **Müşteri → Finatura:** Katalogdan `efatura_kontor`, `ocr_kontor`, `mixed` veya genel `topup`/`plan` satın alır.
3. **Fulfillment:** Ödeme başarılı olunca ledger’a credit yazılır; `reference_type` paket türünü ayırır (raporlama / denetim).
4. **Kullanım:** Başarılı e-fatura gönderiminde veya OCR’da debit düşer.
5. **Entegratör seçimi:** Tenant’ın hangi sağlayıcıyı kullandığı `tenant_einvoice_providers` + `/api/einvoice/*` ile yönetilir.

> Bakiye tek havuzdur (`tenant_kontor_balances`). Ayrı “cüzdanlar” yok; ayrım ledger `reference_type` ve paket `buckets` metadata’sı ile yapılır.

## Mimari özet (ödeme)

```
Uygulama (paket seç)
        │
        ▼
POST /api/payment/checkout  →  PaymentGatewayAdapter (stub | iyzico | paytr)
        │
        ▼
  Hostlu ödeme sayfası (redirectUrl)
        │
        ▼
POST /api/payment/webhook   →  verify → parse → kontorLedger.credit
        │
        ▼
  tenant_kontor_balances / kontor_ledger   (central DB)
```

- Bakiye ve ledger yalnızca `finatura_central` DB’dedir.
- Debit ve ödeme credit’i `(reference_type, reference_id)` ile **idempotent** olabilir.
- Gerçek İyzico / PayTR SDK henüz yok; `PAYMENT_PROVIDER=stub` ile uçtan uca akış test edilir.

## Klasör yapısı

```
services/billing-agent/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts
    ├── config.ts
    ├── types.ts
    ├── db/centralPool.ts
    ├── kontor/                 # kontör ledger + debit
    │   ├── costs.ts
    │   ├── ledger.ts
    │   └── deduct.ts
    ├── payment/                # ödeme geçidi + katalog
    │   ├── adapter.ts
    │   ├── stubAdapter.ts
    │   ├── createAdapter.ts
    │   ├── packages.ts         # bayilik ürün kataloğu
    │   ├── checkout.ts
    │   ├── fulfillment.ts      # reference_type paket cinsine göre
    │   ├── webhook.ts
    │   ├── types.ts
    │   └── index.ts
    ├── einvoice/               # tenant entegratör config iskeleti
    │   └── providerConfig.ts
    ├── middleware/tenantHeader.ts
    └── routes/
        ├── health.ts
        ├── kontor.ts
        ├── payment.ts
        └── einvoice.ts
```

## Kurulum

```bash
cd services/billing-agent
cp .env.example .env
# CENTRAL_DATABASE_URL değerini düzenle
npm install
npm run dev
```

Central şema (bayilik tablosu dahil):

```bash
psql -d finatura_central -f database/central/01_schema.sql
psql -d finatura_central -f database/central/02_seed_plans.sql
psql -d finatura_central -f database/central/03_einvoice_reseller.sql
```

Üretim:

```bash
npm run build
npm start
```

Typecheck:

```bash
npm run typecheck
```

## Ortam değişkenleri

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | HTTP port | `3200` |
| `CENTRAL_DATABASE_URL` | Central PostgreSQL | zorunlu |
| `KONTOR_COST_OCR_*` / `KONTOR_COST_EFATURA_SEND` | Birim maliyetler | `1` / `2` |
| `PAYMENT_PROVIDER` | `stub` \| `iyzico` \| `paytr` | `stub` |
| `PAYMENT_CALLBACK_URL` | 3D dönüş URL | `http://localhost:3200/api/payment/callback` |
| `IYZICO_*` / `PAYTR_*` | Gerçek sağlayıcı (gelecek) | boş |

## Kontör API

Tüm `/api/kontor/*` uçları için **`X-Tenant-ID`** zorunlu.

| Metod | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/kontor/balance` | Bakiye + birim maliyetler |
| `GET` | `/api/kontor/ledger` | Hareket listesi |
| `POST` | `/api/kontor/debit/ocr` | OCR düşümü |
| `POST` | `/api/kontor/debit/efatura` | e-Fatura düşümü |
| `POST` | `/api/kontor/credit` | Manuel yükleme (iç kullanım) |

Yetersiz bakiye → HTTP `402` + `insufficient_kontor`.

## Ödeme API

| Metod | Yol | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/api/payment/packages` | — | Aktif paket kataloğu (`?kind=` filtre) |
| `POST` | `/api/payment/checkout` | `X-Tenant-ID` | Ödeme oturumu başlat |
| `GET` | `/api/payment/checkout/:id` | `X-Tenant-ID` | Oturum durumu |
| `POST` | `/api/payment/webhook` | imza (stub: opsiyonel) | Sağlayıcı bildirimi |

### Checkout örneği (e-fatura paketi)

```http
POST /api/payment/checkout
X-Tenant-ID: <tenant-uuid>
Content-Type: application/json

{
  "packageCode": "efatura_500",
  "buyer": {
    "id": "user-uuid",
    "email": "esnaf@ornek.com",
    "name": "Ahmet Yılmaz"
  }
}
```

Başarıda webhook fulfill: `reference_type=payment_efatura_kontor`, `reference_id=conversationId`.

### Webhook simülasyonu (stub)

```http
POST /api/payment/webhook
Content-Type: application/json
x-stub-signature: ok

{
  "conversationId": "<checkout.conversationId>",
  "paymentId": "<checkout.paymentId>",
  "eventType": "payment.success",
  "paidAmount": 3499
}
```

Stub davranışına **dokunulmadı**; ek paketler aynı `createPayment` / webhook sözleşmesini kullanır.

## Paket kataloğu (bayilik)

| Kind | Örnek kodlar | Credit `reference_type` |
|---|---|---|
| `topup` | `topup_50`, `topup_200`, `topup_500` | `payment_topup` |
| `plan` | `starter`, `business`, `yearly` | `payment_topup` |
| `efatura_kontor` | `efatura_100`, `efatura_500`, `efatura_1000`, `efatura_edm_100`, … | `payment_efatura_kontor` |
| `ocr_kontor` | `ocr_100`, `ocr_300` | `payment_ocr_kontor` |
| `mixed` | `mixed_200`, `mixed_600` | `payment_mixed_kontor` |

- `providerHint` (`edm` / `uyumsoft` / `fit` / `elogo` / `qnb` / `nes` / `nilvera` / `izibiz`): opsiyonel katalog metadata; bakiyeyi ayırmaz.
- `buckets`: karma paketlerde tahmini dağılım (`{ efatura, ocr }`); bilgilendirme amaçlı.

Plan kodları `database/central/02_seed_plans.sql` ile hizalıdır.

## e-Fatura entegratör API (iskelet)

Şema: `database/central/03_einvoice_reseller.sql` (+ `04_einvoice_providers_expand.sql`)  
Config store: şimdilik bellek içi; üretimde `tenant_einvoice_providers` tablosuna bağlanır.

| Metod | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/einvoice/providers` | Aktif yapılandırmalar |
| `GET` | `/api/einvoice/providers/primary` | Birincil entegratör |
| `PUT` | `/api/einvoice/providers` | Upsert (credentialsPlaintext yazma) |
| `POST` | `/api/einvoice/providers/primary` | Birincil seç |

Tümü `X-Tenant-ID` ister. Credentials yanıtta düz metin dönmez (`hasCredentials` bayrağı).

## Adapter sözleşmesi

`PaymentGatewayAdapter`:

- `createPayment` — hostlu oturum
- `verifyWebhook` — imza / hash
- `parseWebhook` — standart `PaymentWebhookEvent`
- `getPaymentStatus` — isteğe bağlı

Yeni sağlayıcı: `src/payment/` altında sınıf yazıp `createAdapter.ts` switch’ine ekleyin.

## Ledger notu

| `entry_type` | Kullanım |
|---|---|
| `debit` | OCR (`ocr_*`), e-fatura (`efatura_send`) |
| `credit` | paket / manuel (`topup`, `payment_*`) |
| `refund` / `adjust` | ileride |

## Sonraki adımlar

- Gerçek İyzico ve PayTR adapter implementasyonu
- Checkout oturumlarını central DB tablosuna taşıma
- `providerConfig` → PostgreSQL (`tenant_einvoice_providers`)
- İade (`payment.refund`) → otomatik kontör `refund` entry
- `POST /api/kontor/credit` üretimde yalnızca dahili/admin
