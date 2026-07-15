# Finatura API Gateway

Ortak **API Gateway + Auth** iskeleti. JWT, tenant context, rate-limit placeholder, health/OpenAPI ve **tenant-router proxy** içerir.

> Tenant DB bağlantı çözümü `services/tenant-router` içindedir. Gateway kimlik doğrular, `X-Tenant-ID` bağlar ve `/v1/tenant/*` isteklerini router’a iletir.

## Özellikler

| Bileşen | Durum | Açıklama |
|--------|-------|----------|
| JWT Auth | ✅ | `POST /auth/login`, `/auth/refresh`, `/auth/me` |
| UserRepository | ✅ | `AUTH_PROVIDER=stub` (varsayılan) veya `central` iskeleti |
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

## Demo giriş (stub)

- **E-posta:** `demo@finatura.app`
- **Şifre:** `demo1234`

```bash
# 1) Token al
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@finatura.app\",\"password\":\"demo1234\"}"

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
| `central` | `CENTRAL_DATABASE_URL` + `public.users` JOIN `tenant_memberships` |

**TODO:** `public.users` henüz `database/central/01_schema.sql` içinde yok. Central path için tablo eklenmeli; seed hash biçimi `dev:<plaintext>` (bcrypt prod TODO). `tenant_memberships` zaten mevcut.

## Rotalar

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | `/health` | — | Liveness |
| GET | `/ready` | — | Readiness (+ tenant-router) |
| POST | `/auth/login` | — | JWT çifti |
| POST | `/auth/refresh` | — | Refresh |
| GET | `/auth/me` | Bearer | Kullanıcı + tenant |
| GET | `/v1/ping` | Bearer + tenant | Gateway örnek |
| * | `/v1/tenant/*` | Bearer + tenant | Proxy → tenant-router |

## Mimari

```
Flutter / Web
     │  Authorization: Bearer …   X-Tenant-ID: …
     ▼
 api-gateway  ── JWT, tenant context, rate-limit
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
