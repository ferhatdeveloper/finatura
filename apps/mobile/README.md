# finatura_mobile

Finatura Flutter istemcisi — **tek çatı**: Android / iOS / **Web**.

Production web: `app.finatura.app` ve `login.finatura.app` (aynı Docker image).

## Modüller

| Modül | Yol | Durum |
|-------|-----|--------|
| **Auth** | `lib/features/auth/` | Login + `firmaKodu` → gateway (varsayılan mock kapalı) |
| **Scan (AŞAMA 2.4)** | `lib/features/scan/` | Gerçek kamera / galeri + crop + Document Agent multipart |
| Settlement | `lib/features/settlement/` | Veresiye mahsup (ayrı sahiplik) |

### Auth (firma kodu)

- `POST {API_BASE_URL}/auth/login` → `{ email, password, firmaKodu }`
- Token: `shared_preferences` (web → localStorage)
- Demo (gateway stub): `demo@finatura.app` / `demo1234` / `DEMO-GALERI`
- İstemci mock kapalı; açmak için `--dart-define=AUTH_ALLOW_MOCK=true`

### Camera / document crop + OCR (gerçek)

- Ekran: `DocumentScanScreen` → canlı kamera (veya web’de dosya) → crop → multipart `file` → Document Agent
- Varsayılan: `SCAN_NATIVE_CAMERA=true`, `SCAN_USE_MOCK_FALLBACK=false`
- Detay / test: [`lib/features/scan/README.md`](lib/features/scan/README.md)

```bash
# Document Agent (gerçek OCR/parse)
cd services/document-agent && npm run dev   # :3100

# API Gateway (auth için gerekli)
cd services/api-gateway && npm run dev   # :3000

# Android emülatör
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=DOCUMENT_AGENT_BASE_URL=http://10.0.2.2:3100

# Web (dosya/galeri — mock OCR yok)
flutter run -d chrome \
  --dart-define=DOCUMENT_AGENT_BASE_URL=http://localhost:3100
```

## Platform

`camera`, `permission_handler`, `image_picker` aktif. AndroidManifest / Info.plist kamera + galeri + `INTERNET` izinleri tanımlı.

## Android APK (telefon)

```bash
# Flutter + Android SDK gerekir
bash scripts/build-mobile-apk.sh
# Çıktı: apps/mobile/dist/finatura-0.1.0-release.apk
```

Telefona kurulum: APK dosyasını telefona kopyala → “Bilinmeyen kaynaklardan yükleme”ne izin ver → kur.  
API varsayılanı: `https://api.finatura.app`. Demo: `demo@finatura.app` / `demo1234`.

## Flutter Web (yerel)

```bash
cd apps/mobile
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
# İsteğe bağlı istemci mock: --dart-define=AUTH_ALLOW_MOCK=true


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
