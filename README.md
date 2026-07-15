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
│   ├── web/                    # Marketing one-page (Vite) — Dokploy / Docker
│   ├── mobile/                 # Flutter istemci
│   └── accountant-portal/      # Mali müşavir portalı (UI mock)
├── services/                   # Backend servisler (router, ajanlar, API’ler)
├── database/                   # Merkez + kiracı şablon SQL şemaları
├── packages/                   # Paylaşılan kütüphaneler / ortak sözleşmeler
├── docker-compose.yml          # Yerel PostgreSQL (5440 / 5441 — çakışmasız)
├── docker-compose.dokploy.yml  # Production marketing (berqenas_net, DB yok)
├── docker-compose.web.yml      # Marketing yerel Compose
├── scripts/vps-dokploy-finatura-web.sh
├── FINATURA_ROADMAP.md
└── README.md
```

## Aynı VPS’te RetailEX + Kargo ile çakışmama

Marketing deploy **PostgreSQL açmaz**. Host port bağlamaz.

| | RetailEX | Kargo | Finatura (marketing) |
|---|----------|-------|----------------------|
| Ağ | `berqenas_net` | `berqenas_net` | `berqenas_net` |
| PostgreSQL volume | `saas_postgres_data` | `kargomkapinda_pg_data` | **yok** |
| Host portları | `:5432`, `:3001–3020`, `:8080` | yok (internal) | **yok** |
| Servis adı | `saas_postgres`, `postgrest_*` | `kargomkapinda_*` | `finatura_web` |
| Domain | `retailex.app` | (portal domain) | **`finatura.app`** |

Yerel Finatura DB host portları: **`:5440`** (merkez), **`:5441`** (örnek kiracı) — RetailEX `:5432` / Kargo `:5433` ile çakışmaz.

## Marketing site (yerel)

```bash
cd apps/web
npm install
npm run dev
```

Açılır: `http://localhost:5173` — rotalar `/`, `/login`, `/register`.

## Dokploy deploy (marketing web → finatura.app)

**Vercel kullanılmıyor.** Panel: `http://72.60.182.107:3000`

### Önerilen (aynı sunucu): Docker Compose

1. Dokploy → yeni **Docker Compose** servisi
2. Repo: `ferhatdeveloper/finatura` · branch: `main`
3. **Compose Path:** `./docker-compose.dokploy.yml`
4. **Domains** → servis `finatura_web` · port **80** · host **`finatura.app`** (isteğe `www.finatura.app`)
5. Deploy — SSL Traefik/Let’s Encrypt ile

Bu compose `berqenas_net` kullanır; `saas_postgres` / `kargomkapinda_db` konteynerlerine dokunmaz.

### Alternatif: Application → Dockerfile

1. Dockerfile path: `apps/web/Dockerfile` · Context: `apps/web`
2. Port: `80` · Domain: `finatura.app`
3. Health: `/health`

### Acil smoke (SSH ile VPS)

```bash
sudo bash scripts/vps-dokploy-finatura-web.sh
# Domain’i yine Dokploy Domains veya Traefik’ten finatura.app → port 80 bağlayın
```

Yerel Docker doğrulama:

```bash
docker compose -f docker-compose.web.yml -f docker-compose.web.local.yml up -d --build
# http://localhost:8080  ·  http://localhost:8080/health
```

Ayrıntı: [`apps/web/README.md`](./apps/web/README.md).

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

Ayrıntılı SQL şemaları `database/` altında yönetilir. Flutter uygulama kodu `apps/` altına yerleşecektir. Bu kök README yalnızca repo vizyonunu ve iskeleti tanımlar.
