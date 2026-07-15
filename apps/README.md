# apps/

İstemci uygulamaları bu klasörde yaşar.

| Uygulama | Host | Açıklama |
|----------|------|----------|
| `web/` | `www` | Marketing one-page (Vite) — Dokploy (`apps/web/Dockerfile`, port 80) |
| `mobile/` | `app` / `login` | Flutter tek çatı (mobil + Web) — Dokploy (`apps/mobile/Dockerfile`, port 80) |
| `dashboard/` | — | **Frozen/legacy** Vite operasyon paneli — production deploy yok |
| `accountant-portal/` | `mm` | Mali müşavir portalı — kod doğrula → dönem onayla → Luca XML |
