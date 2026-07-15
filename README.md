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
│   ├── web/              # Marketing one-page (Vite) — Dokploy / Docker
│   ├── mobile/           # Flutter istemci
│   └── accountant-portal/# Mali müşavir portalı (UI mock)
├── services/             # Backend servisler (router, ajanlar, API’ler)
├── database/             # Merkez + kiracı şablon SQL şemaları
├── packages/             # Paylaşılan kütüphaneler / ortak sözleşmeler
├── docker-compose.yml    # Yerel PostgreSQL (merkez + örnek kiracı)
├── docker-compose.web.yml# Marketing site (nginx) — Dokploy / yerel
├── FINATURA_ROADMAP.md   # Ürün yol haritası
└── README.md             # Bu dosya
```

| Klasör | Amaç |
|--------|------|
| `apps/web` | Tanıtım sitesi (landing + Giriş/Kayıt) — Dokploy deploy |
| `apps/` | Kullanıcıya dönük uygulamalar (mobil / web istemcileri) |
| `services/` | Dinamik DB router, Document / Finteo (+ matching köprüsü) / Matching / Luca ajanları |
| `database/` | `central/` şeması ve `tenant_template/` kopyalanabilir şablon |
| `packages/` | Birden fazla app/service’in paylaştığı kod ve tip tanımları |

## Marketing site (yerel)

```bash
cd apps/web
npm install
npm run dev
```

Açılır: `http://localhost:5173` — rotalar `/`, `/login`, `/register`.

## Dokploy deploy (marketing web)

**Vercel kullanılmıyor.** Production hedefi [Dokploy](https://dokploy.com).

1. Dokploy → GitHub bağla (`ferhatdeveloper/finatura`).
2. **Application** oluştur → **Dockerfile** (veya Compose: `docker-compose.web.yml`).
3. **Dockerfile path:** `apps/web/Dockerfile` · **Context:** `apps/web`.
4. **Port:** `80` → domain bağla → deploy.

Yerel doğrulama:

```bash
docker compose -f docker-compose.web.yml up -d --build
# http://localhost:8080
```

Ayrıntı: [`apps/web/README.md`](./apps/web/README.md).

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

Ayrıntılı SQL şemaları `database/` altında yönetilir. Flutter uygulama kodu `apps/` altına yerleşecektir. Bu kök README yalnızca repo vizyonunu ve iskeleti tanımlar.
