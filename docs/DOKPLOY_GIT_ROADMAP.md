# Finatura — Git + Dokploy Yol Haritası

**Panel:** http://berqenas.cloud:3000  
**VPS:** `72.60.182.107` · **Repo:** `ferhatdeveloper/finatura` · **Branch:** `main`  
**Proje (Dokploy):** `Finatura`  
**Kural:** RetailEX (`saas_postgres` / `:5432`) ve Kargo (`kargomkapinda_*`) ile **çakışma yok** — Finatura production compose’ları Postgres host port açmaz; ağ `berqenas_net`.

Bu dosya **yapılacaklar** odaklıdır. Ürün fazları için bkz. [`FINATURA_ROADMAP.md`](../FINATURA_ROADMAP.md) AŞAMA D.

---

## 0) Anlık durum (canlı doğrulama)

| Compose | Path | Domain(ler) | Port | Branch | Status |
|---------|------|-------------|------|--------|--------|
| `finatura-web` | `./docker-compose.dokploy.yml` | `finatura.app`, `www.finatura.app` | 80 | `main` | ✅ done |
| `finatura-app` | `./docker-compose.app.yml` | `app.finatura.app`, `login.finatura.app` | 80 | `main` | ✅ done · `API_BASE_URL` build-arg |
| `finatura-mm` | `./docker-compose.mm.yml` | `mm.finatura.app` | 80 | `main` | ✅ done · `VITE_API_GATEWAY_URL` build-arg |
| `finatura-api` | `./docker-compose.api.yml` | `api.finatura.app` | 3000 | `main` | ✅ done (stub) |

| Host | Public DNS A | Traefik (Host → IP) | Let's Encrypt |
|------|--------------|---------------------|---------------|
| `finatura.app` / `www` | ✅ | ✅ | ✅ |
| `app.finatura.app` | ✅ `72.60.182.107` | ✅ | ✅ CN=app |
| `mm.finatura.app` | ✅ | ✅ | ✅ CN=mm |
| `api.finatura.app` | ✅ | ✅ | ✅ CN=api |
| `login.finatura.app` | ❌ henüz yok | ✅ (IP+Host) | ❌ default cert |

> Marketing CTA geçici olarak `https://app.finatura.app` (aynı Flutter image). `login` A/CNAME eklenince Dokploy web env’i `VITE_APP_URL=https://login.finatura.app` yapıp redeploy edin.

---

## 1) HEMEN — DNS (bloklayıcı)

Registrar’da **A kaydı** → `72.60.182.107` (www gibi CNAME→apex de olur):

- [x] `app.finatura.app`
- [ ] `login.finatura.app` ← **eksik** (A → `72.60.182.107` veya CNAME → `app.finatura.app`)
- [x] `mm.finatura.app`
- [x] `api.finatura.app`

> Not: Apex/www çalışıyor; alt alanlar 8.8.8.8 / 1.1.1.1’de hâlâ boşsa kayıt eklenmemiş veya yayılmamış demektir. DNS gelince Dokploy’da ilgili compose’u **Redeploy** veya domain’i kaydet→Let’s Encrypt yenilenir.

---

## 2) Git / Dokploy hijyen

- [x] GitHub provider (RexERP app) → `finatura` repo erişimi
- [x] Tüm production compose’lar `main` + auto-deploy
- [ ] Dokploy → **Git** / **SSH Keys**: deploy key’lerin güncel olduğunu doğrula
- [ ] `main`’e merge öncesi PR; force push yok
- [ ] Secret’lar yalnızca Dokploy Environment’da (JWT vb. repo’da yok)
- [ ] Frozen `apps/dashboard` için Application **açılmayacak**

---

## 3) İstemci → API bağlama

API stub ayakta (`AUTH_PROVIDER=stub`, Postgres yok).

### 3.1 Flutter (`finatura-app`)

- [x] `apps/mobile/Dockerfile` build’e `--dart-define=API_BASE_URL=…` (varsayılan `https://api.finatura.app`)
- [x] `docker-compose.app.yml` build-arg
- [ ] Redeploy `finatura-app` (bu PR sonrası)
- [ ] `login.finatura.app` → demo login stub’a istek (DNS + SSL sonrası)

### 3.2 MM portal (`finatura-mm`)

- [x] Build arg: `VITE_API_GATEWAY_URL=https://api.finatura.app`
- [x] `VITE_AUTH_MODE=auto`
- [ ] Redeploy `finatura-mm` (bu PR sonrası)
- [ ] `mm.finatura.app/giris` gateway login (DNS sonrası)

### 3.3 Marketing (`finatura-web`)

- [x] `VITE_APP_URL=https://login.finatura.app` (CTA)
- [ ] DNS sonrası public CTA tıklama smoke testi

---

## 4) API / veri katmanı (çakışmasız)

> Production Finatura DB **ayrı volume + ayrı servis adı**; asla `saas_postgres` / `kargomkapinda_pg_data` kullanma. Host port: **açma** veya yalnızca `5440+` (RetailEX `5432`, Kargo lokal `5433` rezerve).

### 4.1 Stub → Central auth

- [ ] Dokploy’da Finatura-only Postgres compose (`finatura_pg`, volume `finatura_pg_data`, `berqenas_net`, **host port yok**)
- [ ] Init: `database/central/*.sql`
- [ ] `finatura-api` env: `AUTH_PROVIDER=central`, `CENTRAL_DATABASE_URL=postgres://…@finatura_pg:5432/finatura_central`
- [ ] Güçlü `JWT_SECRET` rotate; stub şifreleri kaldır
- [ ] `/ready` tenant-router olmadan degraded kabul / veya router ekle

### 4.2 Tenant-router + ajanlar (sonraki)

- [ ] `tenant-router` Docker/Compose (`finatura_router`, internal only)
- [ ] Gateway `TENANT_ROUTER_URL=http://finatura_router:3100`
- [ ] İsteğe document / finteo / matching ajanları — her biri `finatura_*` öneki, host port yok

---

## 5) SSL / domain smoke (DNS sonrası)

- [ ] `https://www.finatura.app` landing + CTA → login
- [ ] `https://login.finatura.app` / `https://app.finatura.app` SPA + deep-link
- [ ] `https://mm.finatura.app/giris`
- [ ] `https://api.finatura.app/health` + `POST /auth/login`
- [ ] http→https redirect
- [ ] RetailEX / Kargo siteleri hâlâ ayakta (regresyon)

---

## 6) Operasyon checklist (her release)

```text
1. PR → main merge (Dokploy auto-deploy)
2. berqenas.cloud:3000 → Finatura → ilgili compose Deployments yeşil mi?
3. /health (web, mm, api, app)
4. DNS hâlâ doğru IP mi?
5. Log’da OOM / berqenas_net hatası var mı?
```

---

## Cursor AI talimatı (kopyala-yapıştır)

> `docs/DOKPLOY_GIT_ROADMAP.md` sırasını uygula. Önce DNS eksiklerini kullanıcıya net söyle. Sonra Flutter `API_BASE_URL` ve MM `VITE_API_GATEWAY_URL` bağla, `finatura-app` / `finatura-mm` redeploy et. Postgres eklerken yalnızca `finatura_*` isimleri ve `berqenas_net` kullan; RetailEX/Kargo volume ve `:5432`’ye dokunma. Panel: `http://berqenas.cloud:3000`. Force push yapma.

---

## Compose dosya haritası

| Dosya | Amaç |
|-------|------|
| `docker-compose.dokploy.yml` | Marketing production |
| `docker-compose.app.yml` | Flutter Web production |
| `docker-compose.mm.yml` | Mali müşavir production |
| `docker-compose.api.yml` | API gateway stub production |
| `docker-compose.*.local.yml` | Yerel host port override |
| `docker-compose.yml` | Yerel PG `:5440` / `:5441` |
