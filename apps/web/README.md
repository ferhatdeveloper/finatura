# Finatura Web (Marketing)

Görsel destekli one-page tanıtım sitesi. Giriş / Kayıt CTA’ları Flutter app host’a gider.

**Deploy hedefi:** [Dokploy](https://dokploy.com) (Docker). Vercel kullanılmıyor.

## www vs app

| Host | Ne |
|------|-----|
| **Marketing** (`finatura.app` / www) | Bu paket (`apps/web`) — tanıtım landing |
| **App** (`login.finatura.app` veya `VITE_APP_URL`) | Flutter uygulama (giriş / kayıt / ürün) |

CTA href’leri build sırasında `VITE_APP_URL` ile gömülür. Yoksa: prod → `https://login.finatura.app`, dev → `http://localhost:8080`.

## Yerel çalıştırma

```bash
cd apps/web
npm install
npm run dev
```

Tarayıcı: [http://localhost:5173](http://localhost:5173)

Opsiyonel: `.env` içinde `VITE_APP_URL=http://localhost:8080` (Flutter web port’unuza göre).

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
docker build -t finatura-web --build-arg VITE_APP_URL=https://login.finatura.app .
docker run --rm -p 8080:80 finatura-web
```

## Dokploy deploy

1. Dokploy’da GitHub reposunu bağla: `ferhatdeveloper/finatura`
2. **Application** oluştur → deploy yöntemi **Dockerfile** (veya Docker Compose: `docker-compose.web.yml`)
3. **Dockerfile path:** `apps/web/Dockerfile` · **Docker context:** `apps/web`
4. **Port:** `80`
5. Domain ekle (ör. `finatura.app`) ve deploy et
6. İsteğe bağlı build arg: `VITE_APP_URL=https://login.finatura.app`

SPA routing nginx ile sağlanır (`try_files $uri /index.html`).

> Operasyon paneli (`apps/dashboard`) bu Application’a dahil değildir; marketing context yalnızca `apps/web` olmalıdır.
