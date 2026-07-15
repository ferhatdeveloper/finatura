# Finatura — Finteo Agent (Aşama 4.1)

Banka hesap hareketlerini periyodik olarak Finteo API’den (veya **mock**) çeken, tenant PostgreSQL `bank_transactions` tablosuna yazan ve sync sonrası **matching-agent** ile öneri skorlayan arka plan worker’ı.

## Akış

```
┌──────────────────┐     her 10 dk      ┌─────────────────────┐
│  PollScheduler   │ ─────────────────► │  runSyncCycle()     │
└──────────────────┘                    └──────────┬──────────┘
                                                   │
                         central DB: aktif tenant’lar
                                                   ▼
┌──────────────────┐   fetchTransactions   ┌─────────────────────┐
│  FinteoClient    │ ◄──────────────────── │  tenant başına tur  │
│  (mock | http)   │                       └──────────┬──────────┘
└──────────────────┘                                  │
                                                      ▼
                                         tenant DB: bank_transactions
                                         (idempotent insert)
                                                      │
                                                      ▼
                                         matching-agent (inprocess|http)
                                         → raw_payload.finatura_match
```

- Central DB yalnızca **hangi tenant’ın hangi DB’ye gittiğini** verir.
- İş verisi (`bank_transactions`) tenant DB’de kalır.
- Aynı `provider` + `provider_tx_id` tekrar gelirse satır yazılmaz (idempotent).
- `http` modunda hata olursa **mock/sandbox’a düşülmez**; `FinteoClientError` fırlatılır.

## Klasör yapısı

```
services/finteo-agent/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts
    ├── config.ts
    ├── types.ts
    ├── finteo/
    │   ├── client.ts
    │   ├── mockClient.ts
    │   ├── httpClient.ts          # env-based HTTP + hata yönetimi
    │   ├── mapResponse.ts         # yanıt → FinteoTransaction mapper
    │   └── factory.ts
    ├── matching/
    │   ├── bridge.ts              # sync sonrası skorlama
    │   ├── candidates.ts          # açık fatura adayları
    │   ├── unmatched.ts
    │   ├── persistSuggestions.ts  # raw_payload.finatura_match
    │   ├── httpMatcher.ts
    │   └── types.ts
    ├── db/
    ├── tenants/
    ├── repository/
    └── worker/
        ├── pollScheduler.ts
        └── syncJob.ts
```

## Kurulum

```bash
cd services/matching-agent && npm install && npm run build
cd ../finteo-agent
cp .env.example .env
# CENTRAL_DATABASE_URL değerini düzenle
npm install
npm run typecheck
npm run dev
```

Tek seferlik sync (scheduler yok):

```bash
npm run sync-once
```

Üretim:

```bash
npm run build
npm start
```

## Ortam değişkenleri

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `CENTRAL_DATABASE_URL` | Central PostgreSQL bağlantı dizesi | zorunlu |
| `POLL_INTERVAL_MS` | Poll aralığı | `600000` (10 dk) |
| `POLL_RUN_ON_START` | Açılışta hemen bir tur | `true` |
| `FINTEO_CLIENT_MODE` | `mock` veya `http` | `mock` |
| `FINTEO_API_BASE_URL` | API tabanı | örnek URL |
| `FINTEO_API_KEY` | API anahtarı (`http` modunda zorunlu) | — |
| `FINTEO_TRANSACTIONS_PATH` | Hesap bazlı path (`{accountRef}`) | `/accounts/{accountRef}/transactions` |
| `FINTEO_TRANSACTIONS_LIST_PATH` | Hesapsız liste path | `/transactions` |
| `FINTEO_SINCE_QUERY_PARAM` | since query adı | `since` |
| `FINTEO_AUTH_HEADER` / `FINTEO_AUTH_SCHEME` | Auth başlığı | `Authorization` / `Bearer` |
| `FINTEO_TIMEOUT_MS` | HTTP timeout | `30000` |
| `FINTEO_EXTRA_QUERY` | Ek query (`a=1&b=2`) | — |
| `MATCHING_BRIDGE_MODE` | `off` \| `inprocess` \| `http` | `inprocess` |
| `MATCHING_AGENT_URL` | HTTP matching base URL | `http` modunda zorunlu |
| `MATCHING_MIN_SCORE` / `MATCHING_LIMIT` | Skor eşiği / öneri sayısı | `25` / `5` |
| `TENANT_IDS` | Virgüllü tenant id filtresi | tüm aktifler |
| `POOL_MAX` | pg pool max | `5` |

## HttpFinteoClient

Resmi Finteo OpenAPI yok; path / auth / query env ile yapılandırılır. Yanıt mapper yaygın sarmalayıcıları (`data`, `transactions`, `items`) ve alan takma adlarını (`txId`, `aciklama`, `credit`/`debit` vb.) tolere eder.

```ts
// FINTEO_CLIENT_MODE=http
const client = createFinteoClient();
await client.fetchTransactions({ tenantId, accountRefs, since });
```

## Matching köprüsü

Sync’ten sonra `match_status = unmatched` satırlar için `@finatura/matching-agent` çağrılır (varsayılan: in-process import). Öneriler şu an:

```json
raw_payload.finatura_match = {
  "scoredAt": "...",
  "bridge": "inprocess",
  "suggestions": [{ "candidateId", "kind", "score", "confidence", "breakdown" }],
  "signals": { ... }
}
```

`match_status` bilerek değişmez (4.3 Swipe-to-Settle onayı beklenir).

Kalıcı kolon için bkz. `database/tenant_template/02_match_suggestions.sql.todo`.

## Şema bağımlılığı

- `public.bank_accounts` — `provider_ref`
- `public.bank_transactions` — hareketler + `raw_payload` jsonb
- `public.invoices` (+ vehicles / real_estates / customer_caris) — matching adayları

Mock modda eksik `bank_accounts` satırı otomatik açılır. `http` modunda hesapların önceden tanımlı olması gerekir.

## Notlar

- Matching birim testleri `services/matching-agent` altındadır: `npm test`.
- Gerçek Finteo sözleşmesi gelince `mapResponse.ts` alan eşlemesini sıkılaştırın; path env’lerini doğrulayın.
