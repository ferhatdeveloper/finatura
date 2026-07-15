# Finatura Web (Marketing)

Görsel destekli one-page tanıtım sitesi + Giriş / Kayıt placeholder formları.

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

## Vercel

Vercel projesinde **Root Directory** = `apps/web` seçin. Bu klasördeki `vercel.json` SPA rewrite’larını sağlar.

Veya kökten CLI:

```bash
vercel --cwd apps/web
```
