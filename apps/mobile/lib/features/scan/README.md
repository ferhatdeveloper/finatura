# Scan — Gerçek kamera + Document Agent (AŞAMA 2.4)

Akış: **Canlı tarama → kenar overlay → kırp/onay → multipart görüntü → Document Agent → alanlar**.

Varsayılan: **gerçek kamera** (mobil) / **dosya seçici** (web). Mock OCR fixture kapalı.

## Akış

```
DocumentScanScreen
  └─ CameraScanController
       ├─ mobil + SCAN_NATIVE_CAMERA=true → PluginNativeCameraAdapter (CameraPreview)
       ├─ web / izin yok                   → picker-only (image_picker, gerçek dosya)
       └─ SCAN_NATIVE_CAMERA=false         → StubNativeCameraAdapter (yalnızca UI)
  └─ capture / galeri → DocumentCropScreen (Image.memory)
        └─ DocumentScanResult (imageBytes)
              └─ DocumentAgentService.analyzeScan
                   └─ POST /api/v1/documents/analyze  (multipart field: file)
              └─ SnackBar özet + DocumentAnalyzeResultScreen
```

Kenar overlay şimdilik `MockEdgeDetectionService` (UI rehberi). Yakalama ve OCR **gerçek** görüntü + Document Agent.

## Config (`--dart-define`)

| Define | Varsayılan | Anlam |
|--------|------------|--------|
| `DOCUMENT_AGENT_BASE_URL` | Android: `http://10.0.2.2:3100` · diğer: `http://localhost:3100` | Document Agent kökü |
| `SCAN_USE_MOCK_FALLBACK` | `false` | `true` iken ağ hatasında fixture alanları |
| `SCAN_NATIVE_CAMERA` | `true` | `false` → UI stub (gerçek dosya yok) |

Fiziksel cihaz: bilgisayarın LAN IP’si (örn. `http://192.168.1.10:3100`).

## Nasıl test edilir (gerçek tarama)

### 1) Document Agent

```bash
cd services/document-agent
npm install
npm run dev
# http://localhost:3100  — health / docs’a bakın
```

### 2) Flutter — Android emülatör

```bash
cd apps/mobile
flutter pub get
flutter run \
  --dart-define=DOCUMENT_AGENT_BASE_URL=http://10.0.2.2:3100
```

Uygulamada **Tara** → kamera izni ver → deklanşör → kırp/onay → Document Agent alanları.

### 3) Flutter — iOS simülatör / masaüstü web

```bash
# iOS / Chrome: agent host makinede
flutter run -d chrome \
  --dart-define=DOCUMENT_AGENT_BASE_URL=http://localhost:3100
```

Web’de canlı `camera` yok: **Galeri / dosya seç** (gerçek JPEG/PNG) → crop → multipart upload. Mock OCR metni gönderilmez.

### 4) Fiziksel telefon

1. Bilgisayar ve telefon aynı Wi‑Fi’de olsun.
2. Document Agent’ı `0.0.0.0:3100` dinleyecek şekilde çalıştırın.
3. LAN IP ile:

```bash
flutter run \
  --dart-define=DOCUMENT_AGENT_BASE_URL=http://192.168.x.x:3100
```

### 5) (İsteğe bağlı) UI stub / mock fallback

```bash
# Sadece UI iskeleti (Document Agent’a gerçek görüntü gitmez)
flutter run --dart-define=SCAN_NATIVE_CAMERA=false

# Agent kapalıyken fixture alanları (üretimde kullanmayın)
flutter run --dart-define=SCAN_USE_MOCK_FALLBACK=true
```

## Navigasyon

```dart
final result = await Navigator.pushNamed<DocumentAnalyzeResult>(
  context,
  DocumentScanScreen.routeName, // '/scan'
);
```

## Paketler

| Paket | Rol |
|-------|-----|
| `camera` | Canlı önizleme / `takePicture` |
| `permission_handler` | Runtime kamera / foto izinleri |
| `image_picker` | Galeri + web dosya input |

## İzinler

- **Android:** `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` (≤32), `INTERNET`, cleartext (dev)
- **iOS:** `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (`Info.plist`)

## Dosyalar

| Dosya | Rol |
|-------|-----|
| `config/scan_api_config.dart` | Base URL + flag’ler |
| `services/native_camera_adapter.dart` | Stub / PluginNativeCameraAdapter |
| `services/scan_image_source.dart` | Galeri / dosya / sistem kamerası |
| `services/document_agent_service.dart` | Multipart HTTP istemci |
| `models/captured_still.dart` | Gerçek bayt + path |
| `presentation/document_analyze_result_screen.dart` | Alan listesi |

## Dokunulmayan alanlar

Settlement feature, OCR parser sunucu kodu, SQL.
