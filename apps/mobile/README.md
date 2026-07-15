# finatura_mobile

Finatura Flutter istemcisi — **tek çatı**: Android / iOS / **Web**.

Production web: `app.finatura.app` ve `login.finatura.app` (aynı Docker image).

## Modüller

| Modül | Yol | Durum |
|-------|-----|--------|
| **Auth** | `lib/features/auth/` | Login + `firmaKodu` → gateway; fail → demo mock |
| **Scan (AŞAMA 2.4)** | `lib/features/scan/` | Stub kamera + crop + Document Agent HTTP |
| Settlement | `lib/features/settlement/` | Veresiye mahsup (ayrı sahiplik) |

### Auth (firma kodu)

- `POST {API_BASE_URL}/auth/login` → `{ email, password, firmaKodu }`
- Token: `shared_preferences` (web → localStorage)
- Demo (gateway fail): `demo@finatura.app` / `demo1234` / `DEMO-GALERI`

### Camera / document crop + OCR

- Ekran: `DocumentScanScreen` → `/scan` → Document Agent → sonuç alanları
- Detay: [`lib/features/scan/README.md`](lib/features/scan/README.md)

```bash
# API Gateway (opsiyonel — yoksa demo mock)
cd services/api-gateway && npm run dev   # :3000

# Document Agent (scan)
cd services/document-agent && npm run dev   # :3100

# Mobil
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=DOCUMENT_AGENT_BASE_URL=http://10.0.2.2:3100
```

## Platform

Kamera + `INTERNET` izinleri AndroidManifest / Info.plist’te. Native `camera` paketi pubspec’te yorumlu; `NativeCameraAdapter` + `SCAN_NATIVE_CAMERA` ile açılır.

## Flutter Web (yerel)

```bash
cd apps/mobile
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
# Gateway yoksa formdaki demo kimlik bilgileriyle mock login çalışır.

# production bundle
flutter build web --release --base-href / \
  --dart-define=API_BASE_URL=https://api.finatura.app
```

Çıktı: `build/web/`. `web/index.html` title: **Finatura**; base href build’de `/`.

## Dokploy deploy (Flutter Web)

| Ayar | Değer |
|------|--------|
| Dockerfile | `apps/mobile/Dockerfile` |
| Context | `apps/mobile` |
| Port | `80` |
| Compose (opsiyonel) | `docker-compose.app.yml` (kök) |
| Hosts | `app.finatura.app` + `login.finatura.app` (aynı image) |

1. Dokploy → GitHub (`ferhatdeveloper/finatura`).
2. **Application** → Dockerfile (veya Compose: `docker-compose.app.yml`).
3. Path / context / port yukarıdaki tablo.
4. Domain: her iki host’u bu Application’a bağla → deploy.

Yerel Docker:

```bash
docker compose -f docker-compose.app.yml up -d --build
# http://localhost:8081
```

Multi-stage: `flutter build web --release` → nginx SPA (`nginx.conf`).
