# Finatura Web (Marketing)

Görsel destekli one-page tanıtım sitesi + Giriş / Kayıt placeholder formları.

**Deploy hedefi:** [Dokploy](https://dokploy.com) · domain **`finatura.app`** (VPS `72.60.182.107`, RetailEX/Kargo ile paylaşılır).

Production compose **PostgreSQL açmaz** — RetailEX `:5432` / Kargo DB ile çakışmaz.

## Yerel çalıştırma

```bash
cd apps/web
npm install
npm run dev
```

Tarayıcı: [http://localhost:5173](http://localhost:5173)

Rotalar: `/` · `/login` · `/register`

## Build

```bash
cd apps/web
npm run build
npm run preview
```

## Docker (yerel)

Repo kökünden (host port 8080 — RetailEX 8080’den farklı makinede kullanın):

```bash
docker compose -f docker-compose.web.yml -f docker-compose.web.local.yml up -d --build
```

Site: [http://localhost:8080](http://localhost:8080) · sağlık: [http://localhost:8080/health](http://localhost:8080/health)

```bash
cd apps/web
docker build -t finatura-web .
docker run --rm -p 8080:80 finatura-web
```

## Dokploy (finatura.app)

### Önerilen — Compose (çakışmasız)

1. Panel: `http://72.60.182.107:3000`
2. **Docker Compose** · Repo `ferhatdeveloper/finatura`
3. **Compose Path:** `./docker-compose.dokploy.yml`
4. **Domains:** servis `finatura_web` · port `80` · host `finatura.app`
5. Deploy

Ağ: `berqenas_net` (external). Host port yok. Volume yok.

### Alternatif — Dockerfile

- Path: `apps/web/Dockerfile` · Context: `apps/web` · Port: `80` · Domain: `finatura.app`

SPA routing nginx ile (`try_files`). Healthcheck: `GET /health` → `200 ok`. Env gerekmez.
