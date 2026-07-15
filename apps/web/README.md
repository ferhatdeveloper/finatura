# Finatura Web (Marketing)

Görsel destekli one-page tanıtım sitesi + Giriş / Kayıt placeholder formları.

**Deploy hedefi:** [Dokploy](https://dokploy.com) (Docker). Vercel kullanılmıyor.

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

Repo kökünden (host port 8080):

```bash
docker compose -f docker-compose.web.yml -f docker-compose.web.local.yml up -d --build
```

Site: [http://localhost:8080](http://localhost:8080) · sağlık: [http://localhost:8080/health](http://localhost:8080/health)

Veya doğrudan:

```bash
cd apps/web
docker build -t finatura-web .
docker run --rm -p 8080:80 finatura-web
```

## Dokploy deploy

Önerilen yöntem: **Application → Dockerfile** (tek servis, basit).

1. Dokploy’da GitHub reposunu bağla: `ferhatdeveloper/finatura`
2. **Application** oluştur → build type **Dockerfile**
3. Ayarlar:
   - **Dockerfile path:** `apps/web/Dockerfile`
   - **Docker context / build path:** `apps/web`
   - **Port:** `80`
4. **Domains** → `finatura.app` (veya üretilen domain) · port `80`
5. Deploy et

Alternatif: **Docker Compose** → Compose path `docker-compose.web.yml` · Domains’de servis `web`, port `80`.

SPA routing nginx ile sağlanır (`try_files $uri /index.html`). Healthcheck: `GET /health` → `200 ok`. Özel env gerekmez (statik marketing).
