# Scan — Kamera & Kenar Algılama + Document Agent (AŞAMA 2.4)

Akış: **Canlı tarama → kenar overlay → kırp/onay → Document Agent → alanlar**.

Varsayılan: stub kamera. Native path `nativeEnable` / `SCAN_NATIVE_CAMERA` ile açılır; stub bozulmaz.

## Akış

```
DocumentScanScreen
  └─ CameraScanController
       ├─ nativeEnable=false → StubNativeCameraAdapter
       └─ nativeEnable=true  → PluginNativeCameraAdapter (yoksa stub fallback)
  └─ capture → DocumentCropScreen
        └─ DocumentScanResult
              └─ DocumentAgentService.analyzeScan
                   ├─ gerçek dosya → POST /api/v1/documents/analyze (multipart)
                   └─ stub       → POST /api/v1/documents/analyze-text
              └─ SnackBar özet + DocumentAnalyzeResultScreen
```

## Config (`--dart-define`)

| Define | Varsayılan | Anlam |
|--------|------------|--------|
| `DOCUMENT_AGENT_BASE_URL` | `http://10.0.2.2:3100` | Android emülatör → host |
| `SCAN_USE_MOCK_FALLBACK` | `true` | Ağ hatasında fixture alanları |
| `SCAN_NATIVE_CAMERA` | `false` | Native kamera denemesi |

iOS simülatör: `http://127.0.0.1:3100`  
Fiziksel cihaz: bilgisayarın LAN IP’si (örn. `http://192.168.1.10:3100`)

```bash
# Document Agent
cd services/document-agent && npm run dev

# Flutter (emülatör)
cd apps/mobile
flutter pub get
flutter run --dart-define=DOCUMENT_AGENT_BASE_URL=http://10.0.2.2:3100

# Agent yokken bile UI (mock fallback)
flutter run --dart-define=SCAN_USE_MOCK_FALLBACK=true
```

Uygulamada **Tara** FAB → evrak tara → onayla → OCR sonuç ekranı.

## Navigasyon

```dart
final result = await Navigator.pushNamed<DocumentAnalyzeResult>(
  context,
  DocumentScanScreen.routeName, // '/scan'
);
```

## Native kamera (kasıtlı olarak kapalı)

| Paket | Rol |
|-------|-----|
| `camera` | Canlı önizleme / `takePicture` |
| `permission_handler` | Runtime izin |
| `image_picker` | Galeri |

`pubspec.yaml` içinde yorum satırı. Açtıktan sonra:

1. `PluginNativeCameraAdapter` içine `CameraController` yaz
2. `flutter run --dart-define=SCAN_NATIVE_CAMERA=true`
3. Stub path otomatik düşer; plugin initialize başarısızsa yine stub

## Dosyalar

| Dosya | Rol |
|-------|-----|
| `config/scan_api_config.dart` | Base URL + flag’ler |
| `services/document_agent_service.dart` | HTTP istemci |
| `services/native_camera_adapter.dart` | Stub / plugin sözleşme |
| `presentation/document_analyze_result_screen.dart` | JSON alan listesi |

## Dokunulmayan alanlar

Settlement feature, OCR parser sunucu kodu, SQL.
