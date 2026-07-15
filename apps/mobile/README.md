# finatura_mobile

Finatura Flutter istemcisi.

## Modüller

| Modül | Yol | Durum |
|-------|-----|--------|
| **Scan (AŞAMA 2.4)** | `lib/features/scan/` | Stub kamera + crop + Document Agent HTTP |
| Settlement | `lib/features/settlement/` | Veresiye mahsup (ayrı sahiplik) |

### Camera / document crop + OCR

- Ekran: `DocumentScanScreen` → `/scan` → Document Agent → sonuç alanları
- Detay: [`lib/features/scan/README.md`](lib/features/scan/README.md)

```bash
# Backend
cd services/document-agent && npm run dev   # :3100

# Mobil
cd apps/mobile
flutter pub get
flutter run --dart-define=DOCUMENT_AGENT_BASE_URL=http://10.0.2.2:3100
# Ana ekranda «Tara» FAB
```

## Platform

Kamera + `INTERNET` izinleri AndroidManifest / Info.plist’te. Native `camera` paketi pubspec’te yorumlu; `NativeCameraAdapter` + `SCAN_NATIVE_CAMERA` ile açılır.
