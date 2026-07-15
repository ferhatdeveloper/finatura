# Finatura

> Esnafın muhasebe yükünü sıfıra indiren, sektör odaklı (oto galeri, kuyumculuk, emlak) multi-tenant mali operasyon platformu.

**Alan adı:** [finatura.app](https://finatura.app)

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
│   ├── web/              # www — marketing (Vite) → www.finatura.app
│   ├── mobile/           # Flutter tek çatı (mobil + Web) → app / login
│   ├── dashboard/        # LEGACY / FROZEN — eski Vite operasyon paneli
│   └── accountant-portal/# mm — mali müşavir portalı → mm.finatura.app
├── services/             # Backend servisler (router, ajanlar, API’ler)
├── database/             # Merkez + kiracı şablon SQL şemaları
├── packages/             # Paylaşılan kütüphaneler / ortak sözleşmeler
├── docker-compose.yml    # Yerel PostgreSQL (merkez + örnek kiracı)
├── docker-compose.web.yml# Marketing site (nginx) — Dokploy / yerel
├── docker-compose.app.yml# Flutter Web app (nginx) — Dokploy / yerel
├── FINATURA_ROADMAP.md   # Ürün yol haritası
└── README.md             # Bu dosya
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

**Vercel kullanılmıyor.** Production hedefi [Dokploy](https://dokploy.com).

### Marketing (`www`)

1. Application → Dockerfile / Compose `docker-compose.web.yml`
2. **Dockerfile:** `apps/web/Dockerfile` · **Context:** `apps/web` · **Port:** `80`
3. Domain: `www.finatura.app` (veya apex)

Yerel: `docker compose -f docker-compose.web.yml up -d --build` → `http://localhost:8080`

### Flutter Web app (`app` + `login`)

1. Application → Dockerfile / Compose `docker-compose.app.yml`
2. **Dockerfile:** `apps/mobile/Dockerfile` · **Context:** `apps/mobile` · **Port:** `80`
3. Aynı image’a iki host bağla: `app.finatura.app` ve `login.finatura.app`

Yerel: `docker compose -f docker-compose.app.yml up -d --build` → `http://localhost:8081`

Ayrıntı: [`apps/mobile/README.md`](./apps/mobile/README.md) · [`apps/web/README.md`](./apps/web/README.md).

## Yerel geliştirme (Docker — PostgreSQL)

Önkoşul: [Docker Desktop](https://www.docker.com/products/docker-desktop/) veya Docker Engine + Compose v2.

```bash
docker compose up -d
```

| Servis | DB | Host port | Kullanıcı / parola |
|--------|-----|-----------|-------------------|
| `postgres-central` | `finatura_central` | `5432` | `finatura` / `finatura_dev` |
| `postgres-tenant-ornek` | `tenant_ornek` | `5433` | `finatura_tenant` / `finatura_tenant_dev` |

İlk açılışta Compose, `database/central/` ve `database/tenant_template/` altındaki `.sql` dosyalarını ilgili konteynere init olarak uygular.

Durdurmak:

```bash
docker compose down
```

Veriyi de silmek için: `docker compose down -v`.

## Katkı & sahiplik

Ayrıntılı SQL şemaları `database/` altında yönetilir. Flutter uygulama kodu `apps/mobile` altındadır (mobil + web). Bu kök README yalnızca repo vizyonunu ve iskeleti tanımlar.
