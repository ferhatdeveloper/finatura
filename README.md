# Finatura

> Esnafın muhasebe yükünü sıfıra indiren, sektör odaklı (oto galeri, kuyumculuk, emlak) multi-tenant mali operasyon platformu.

**Alan adı:** [finatura.app](https://finatura.app) · VPS: `72.60.182.107` (RetailEX / Kargo ile aynı Dokploy)

## Vizyon

Galericilerin noter sözleşmelerini torbalarda taşıdığı, kuyumcuların has altın hesabı için ajandalarında kaybolduğu, emlakçıların tapu fotokopilerini klasörlerde biriktirdiği dünyayı sadeleştirmek.

- Kamerayla noter sözleşmesi, kimlik veya tapu taratıp (**OCR**) saniyeler içinde e-Fatura / gider pusulası taslağı
- Banka hareketlerini (**Finteo**) otomatik çekip carilerle eşleştirmek
- Karmaşık genel muhasebe yerine günlük ihtiyaç: giren / çıkan para, sözleşme, e-Fatura

### Mimari ilke

Her üye firma (**tenant**) kendi **izolasyonlu PostgreSQL** veritabanına sahiptir. Merkez DB (`finatura_central`) üyelik, bağlantı yönlendirme ve kontör bilgilerini tutar; iş verisi kiracı DB’lerinde kalır.

Yol haritası ve aşamalar için bkz. [`FINATURA_ROADMAP.md`](./FINATURA_ROADMAP.md).

## Klasör yapısı

```
Finatura/
├── apps/
│   ├── web/              # www — marketing (Vite) → finatura.app / www
│   ├── mobile/           # Flutter tek çatı (mobil + Web) → app / login
│   ├── dashboard/        # LEGACY / FROZEN — eski Vite operasyon paneli
│   └── accountant-portal/# mm — mali müşavir portalı → mm.finatura.app
├── services/             # Backend servisler (router, ajanlar, API’ler)
├── database/             # Merkez + kiracı şablon SQL şemaları
├── packages/             # Paylaşılan kütüphaneler / ortak sözleşmeler
├── docker-compose.yml    # Yerel PostgreSQL (5440 / 5441 — çakışmasız)
├── docker-compose.dokploy.yml  # Production marketing (berqenas_net, DB yok)
├── docker-compose.web.yml      # Marketing yerel Compose
├── docker-compose.app.yml      # Flutter Web (Dokploy / yerel)
├── scripts/vps-dokploy-finatura-web.sh
├── FINATURA_ROADMAP.md
└── README.md
```

| Host / klasör | Amaç |
|---------------|------|
| `www` · `apps/web` | Tanıtım sitesi (Vite marketing) — Dokploy |
| `app` / `login` · `apps/mobile` | Flutter Web operasyon istemcisi — aynı image |
| `mm` · `apps/accountant-portal` | Mali müşavir portalı |
| `apps/dashboard` | **Frozen/legacy** Vite panel — production’a deploy edilmez |
| `services/` | Dinamik DB router, Document / Finteo / Matching / Luca ajanları |
| `database/` | `central/` şeması ve `tenant_template/` kopyalanabilir şablon |
| `packages/` | Birden fazla app/service’in paylaştığı kod ve tip tanımları |

## Aynı VPS’te RetailEX + Kargo ile çakışmama

Marketing / app deploy **PostgreSQL açmaz**. Host port bağlamaz.

| | RetailEX | Kargo | Finatura |
|---|----------|-------|----------|
| Ağ | `berqenas_net` | `berqenas_net` | `berqenas_net` |
| PostgreSQL volume | `saas_postgres_data` | `kargomkapinda_pg_data` | **yok** (marketing/app) |
| Host portları | `:5432`, `:3001–3020`, `:8080` | yok (internal) | **yok** |
| Servis adları | `saas_postgres`, `postgrest_*` | `kargomkapinda_*` | `finatura_web`, `finatura_app` |
| Domain | `retailex.app` | (portal) | **`finatura.app`**, `app.`, `login.` |

Yerel Finatura DB host portları: **`:5440`** (merkez), **`:5441`** (örnek kiracı) — RetailEX `:5432` / Kargo `:5433` ile çakışmaz.

## Marketing site (yerel)

```bash
cd apps/web
npm install
npm run dev
```

Açılır: `http://localhost:5173` — rotalar `/`, `/login`, `/register`.

## Flutter Web (operasyon — yerel)

Tek Flutter çatı; web + mobil aynı `apps/mobile` kodu:

```bash
cd apps/mobile
flutter pub get
flutter run -d chrome
# veya
flutter build web --release
```

Ayrıntı: [`apps/mobile/README.md`](./apps/mobile/README.md).

## Operasyon paneli (legacy)

> **Frozen.** Yeni iş Flutter Web’de. Eski Vite panel yalnızca referans:

```bash
cd apps/dashboard
npm install
npm run dev
```

Açılır: `http://localhost:5175`. Ayrıntı: [`apps/dashboard/README.md`](./apps/dashboard/README.md).

## Dokploy deploy

**Vercel kullanılmıyor.** Panel: `http://berqenas.cloud:3000` (`72.60.182.107:3000`)

### Marketing (`finatura.app` / `www`)

1. Docker Compose · Compose Path: `./docker-compose.dokploy.yml`
2. Domains → servis `finatura_web` · port **80** · `finatura.app` + `www.finatura.app`
3. `berqenas_net` — DB/host port yok

Yerel: `docker compose -f docker-compose.web.yml -f docker-compose.web.local.yml up -d --build` → `http://localhost:8080`

### Flutter Web app (`app` + `login`)

1. Docker Compose · Compose Path: `./docker-compose.app.yml`
2. Dockerfile: `apps/mobile/Dockerfile` · Context: `apps/mobile` · Port: `80`
3. Domains → servis `finatura_app` · `app.finatura.app` + `login.finatura.app`

Yerel: `docker compose -f docker-compose.app.yml -f docker-compose.app.local.yml up -d --build` → `http://localhost:8081`

Ayrıntı: [`apps/mobile/README.md`](./apps/mobile/README.md) · [`apps/web/README.md`](./apps/web/README.md).

## Yerel geliştirme (Docker — PostgreSQL)

Önkoşul: Docker Engine + Compose v2.

```bash
docker compose up -d
```

| Servis | DB | Host port | Kullanıcı / parola |
|--------|-----|-----------|-------------------|
| `postgres-central` | `finatura_central` | `5440` | `finatura` / `finatura_dev` |
| `postgres-tenant-ornek` | `tenant_ornek` | `5441` | `finatura_tenant` / `finatura_tenant_dev` |

İlk açılışta Compose, `database/central/` ve `database/tenant_template/` altındaki `.sql` dosyalarını ilgili konteynere init olarak uygular.

Durdurmak: `docker compose down` · veriyi silmek: `docker compose down -v`.

## Katkı & sahiplik

Ayrıntılı SQL şemaları `database/` altında yönetilir. Flutter uygulama kodu `apps/mobile` altındadır (mobil + web). Bu kök README yalnızca repo vizyonunu ve iskeleti tanımlar.
