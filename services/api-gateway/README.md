# Finatura API Gateway

Ortak **API Gateway + Auth** iskeleti. JWT, tenant context, rate-limit placeholder, health/OpenAPI ve **tenant-router proxy** içerir.

> Tenant DB bağlantı çözümü `services/tenant-router` içindedir. Gateway kimlik doğrular, `X-Tenant-ID` bağlar ve `/v1/tenant/*` isteklerini router’a iletir.

## Özellikler

| Bileşen | Durum | Açıklama |
|--------|-------|----------|
| JWT Auth | ✅ | `POST /auth/login`, `/auth/refresh`, `/auth/me` |
| UserRepository | ✅ | `AUTH_PROVIDER=stub` (varsayılan) veya `central` |
| Firma kodu | ✅ | Login `firmaKodu` → tenant resolve |
| Tenant context | ✅ | JWT + opsiyonel `X-Tenant-ID` çapraz kontrol |
| Tenant-router proxy | ✅ | `/v1/tenant/*` → `TENANT_ROUTER_URL/api/tenant/*` |
| Rate limit | 🟡 placeholder | Bellek içi; Redis’e taşınacak |
| Health | ✅ | `/health`, `/ready` (tenant-router ping) |
| OpenAPI | ✅ | `/openapi.yaml` |

## Kurulum

```bash
cd services/api-gateway
cp .env.example .env
npm install
npm run typecheck
npm run dev
```

Varsayılan port: **3000** (`tenant-router` **3100**).

## Web UI form sözleşmesi (login)

Başka ajan Web formunu bağlarken alan adları **birebir** şu olmalı:

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `email` | evet | Kullanıcı e-postası |
| `password` | evet | Parola |
| `firmaKodu` | hayır | Firma / mali müşavir davet kodu → tenant resolve |
| `tenantSlug` | hayır | Alternatif: tenant slug |
| `tenantId` | hayır | Alternatif: tenant UUID |

`firmaKodu` çözümü (central): `tenants.mali_musavir_kodu` → `accountant_codes.code` → `tenants.slug` → `tenants.id`.

JWT access claim’leri: `sub`, `email`, `tenantId`, `tenantSlug`, `role` (`owner` \| `admin` \| `member` \| `viewer` \| `accountant`).

Şema sırası:
1. `database/central/05_auth_accountant.sql` — `users`, `mali_musavir_kodu`, `accountant_codes`, role CHECK
2. `database/central/05b_membership_accountant.sql` — `membership_role` enum + `mali_musavir_baglantilari` (davet akışı)

## Demo giriş (stub)

- **E-posta:** `demo@finatura.app`
- **Şifre:** `demo1234`
- **firmaKodu (opsiyonel):** `DEMO-GALERI`

```bash
# 1) Token al (firma kodu ile)
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@finatura.app\",\"password\":\"demo1234\",\"firmaKodu\":\"DEMO-GALERI\"}"

# 2) Gateway ping
curl -s http://localhost:3000/v1/ping \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Tenant-ID: 00000000-0000-4000-8000-0000000000aa"

# 3) Tenant-router üzerinden izole DB ping (her iki servis ayakta olmalı)
curl -s http://localhost:3000/v1/tenant/ping \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-Tenant-ID: 00000000-0000-4000-8000-0000000000aa"
```

## Auth sağlayıcıları

| `AUTH_PROVIDER` | Davranış |
|-----------------|----------|
| `stub` | Env’deki demo kullanıcı; DB gerekmez |
| `central` | `CENTRAL_DATABASE_URL` + `users` ⋈ `tenant_memberships` + firma kodu |

Seed hash biçimi: `dev:<plaintext>` (bcrypt prod TODO).

## Rotalar

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | `/health` | — | Liveness |
| GET | `/ready` | — | Readiness (+ tenant-router) |
| POST | `/auth/login` | — | JWT çifti (+ opsiyonel firmaKodu) |
| POST | `/auth/refresh` | — | Refresh |
| GET | `/auth/me` | Bearer | Kullanıcı + tenant |
| GET | `/v1/me/tenants` | Bearer | Kullanıcının tenant üyelikleri |
| POST | `/v1/tenants/:id/accountant/invite` | Bearer | Mali müşavir davet kodu üret |
| POST | `/v1/accountant/link` | Bearer | Kod ile mali müşavir bağlan |
| GET | `/v1/ping` | Bearer + tenant | Gateway örnek |
| * | `/v1/tenant/*` | Bearer + tenant | Proxy → tenant-router |

## Mali müşavir üyelik bağlama

Şema: `database/central/05b_membership_accountant.sql` (`membership_role` tek kaynak).  
Login / firmaKodu: `05_auth_accountant.sql`.

`CENTRAL_DATABASE_URL` yoksa stub bellek (`mode: "stub"`).

```bash
curl -s -X POST http://localhost:3000/v1/tenants/<tenantId>/accountant/invite \
  -H "Authorization: Bearer <accessToken>"

curl -s -X POST http://localhost:3000/v1/accountant/link \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"kod\":\"ABCD1234\"}"

curl -s http://localhost:3000/v1/me/tenants \
  -H "Authorization: Bearer <accessToken>"
```

## Mimari

```
Flutter / Web
     │  Authorization: Bearer …   X-Tenant-ID: …
     ▼
 api-gateway  ── JWT (role + tenantId), tenant context, rate-limit
     │
     └─► /v1/tenant/*  →  TENANT_ROUTER_URL  →  tenants + tenant_databases
                                              →  password decrypt → izole PostgreSQL
```

## Scripts

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme (tsx watch) |
| `npm run build` | TypeScript derleme |
| `npm start` | `dist/` üzerinden çalıştır |
| `npm run typecheck` | Tip kontrolü |
