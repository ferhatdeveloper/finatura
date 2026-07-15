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

Repo kökünden:

```bash
docker compose -f docker-compose.web.yml up -d --build
```

Site: [http://localhost:8080](http://localhost:8080)

Veya doğrudan:

```bash
cd apps/web
docker build -t finatura-web .
docker run --rm -p 8080:80 finatura-web
```

## Dokploy deploy

1. Dokploy’da GitHub reposunu bağla: `ferhatdeveloper/finatura`
2. **Application** oluştur → deploy yöntemi **Dockerfile** (veya Docker Compose: `docker-compose.web.yml`)
3. **Dockerfile path:** `apps/web/Dockerfile` · **Docker context:** `apps/web`
4. **Port:** `80`
5. Domain ekle (ör. `finatura.app`) ve deploy et

SPA routing nginx ile sağlanır (`try_files $uri /index.html`). Özel env gerekmez (statik marketing).
