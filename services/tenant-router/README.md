# Finatura — Tenant Router (Aşama 1.2)

Dinamik DB Connection Router. `X-Tenant-ID` ile central PostgreSQL’den tenant bağlantısını çözer; `password_ciphertext` decrypt edilerek izole tenant DB pool’u bağlanır.

Upstream giriş noktası: **api-gateway** `/v1/tenant/*` proxy’si (Bearer + `X-Tenant-ID`).

## Akış

```
İstek (X-Tenant-ID)
        │
        ▼
┌───────────────────┐
│ tenant middleware │
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ resolver          │  tenants ⋈ tenant_databases
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ PasswordDecryptor │  stub (dev) / KMS (prod TODO)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ pool cache        │  tenant başına pg.Pool
└─────────┬─────────┘
          ▼
      req.tenantPool
```

## Klasör yapısı

```
services/tenant-router/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts
    ├── config.ts
    ├── types.ts
    ├── crypto/
    │   └── passwordDecrypt.ts   # decrypt hook + StubPasswordDecryptor
    ├── db/
    │   └── centralPool.ts
    ├── tenant/
    │   ├── resolver.ts          # central şema uyumlu resolve
    │   └── poolCache.ts
├── middleware/
│   └── tenantContext.ts
└── routes/
    ├── health.ts
    ├── bankTransactions.ts   # GET bank-transactions + match-suggestions
    └── settlements.ts        # POST settlements (mahsup)
```

## Kurulum

```bash
cd services/tenant-router
cp .env.example .env
# CENTRAL_DATABASE_URL düzenle
npm install
npm run typecheck
npm run dev
```

## Ortam değişkenleri

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | HTTP port | `3100` |
| `CENTRAL_DATABASE_URL` | Central PostgreSQL | zorunlu |
| `TENANT_LOOKUP_BY` | `id` veya `slug` | `id` |
| `POOL_*` | Pool / cache ayarları | bkz. `.env.example` |

## API

| Header | Zorunlu | Açıklama |
|---|---|---|
| `X-Tenant-ID` | Evet (iş uçları) | Tenant uuid veya slug |

| Metod | Yol | Açıklama |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Central DB hazır mı |
| `GET` | `/api/tenant/ping` | Tenant DB `SELECT 1` |
| `GET` | `/api/tenant/bank-transactions` | Banka hareketleri (`matchStatus`, `direction`, `limit`) |
| `GET` | `/api/tenant/bank-transactions/:id/match-suggestions` | `raw_payload.finatura_match` → açık veresiye önerileri |
| `POST` | `/api/tenant/settlements` | Mahsup iskeleti (`bankTxId`, `veresiyeId`, `settleAmount`) |

Gateway üzerinden: `GET http://localhost:3000/v1/tenant/ping` (JWT + `X-Tenant-ID`).
Aynı proxy: `GET /v1/tenant/bank-transactions`, `POST /v1/tenant/settlements`.

## Central şema bekentisi

`database/central/01_schema.sql` ile uyumlu:

| Kaynak | Alanlar |
|---|---|
| `tenants` | `id`, `slug`, `status`, `deleted_at` |
| `tenant_databases` | `db_host`, `db_port`, `db_name`, `db_user`, `password_ciphertext`, `encryption_key_id`, `ssl_mode`, `is_primary` |

Aktif tenant: `status = 'active'`. Parola düz metin saklanmaz.

### Lokal seed (stub decrypt)

```sql
-- password_ciphertext örnekleri:
--   'plain:gizli_parola'
--   veya encryption_key_id = 'dev-plain' iken ciphertext = düz parola
```

Üretim: `setPasswordDecryptor(new KmsPasswordDecryptor(...))` ile KMS implementasyonu enjekte edilir.

## Hata kodları

| HTTP | Anlam |
|---|---|
| `400` | `X-Tenant-ID` eksik |
| `403` | Tenant pasif (`status ≠ active`) |
| `404` | Tenant / primary DB bulunamadı |
| `503` | Central veya tenant pool hatası |

## Scripts

| Komut | Açıklama |
|-------|----------|
| `npm run typecheck` | Tip kontrolü |
| `npm run dev` | Geliştirme |
| `npm run build` / `npm start` | Üretim |

