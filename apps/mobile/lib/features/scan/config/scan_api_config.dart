import 'package:flutter/foundation.dart';

/// Document Agent & kamera path ayarları.
///
/// Derleme zamanı:
/// ```bash
/// flutter run --dart-define=DOCUMENT_AGENT_BASE_URL=http://192.168.1.10:3100
/// flutter run --dart-define=SCAN_USE_MOCK_FALLBACK=true
/// flutter run --dart-define=SCAN_NATIVE_CAMERA=false
/// ```
class ScanApiConfig {
  const ScanApiConfig._();

  static const String _documentAgentBaseUrlEnv = String.fromEnvironment(
    'DOCUMENT_AGENT_BASE_URL',
  );

  /// Document Agent kök URL (sonunda `/` olmamalı).
  ///
  /// Varsayılanlar (dart-define yoksa):
  /// - Web / iOS / masaüstü → `http://localhost:3100`
  /// - Android → `http://10.0.2.2:3100` (emülatör → host)
  ///
  /// Fiziksel cihaz: bilgisayarın LAN IP’si (örn. `http://192.168.1.10:3100`)
  static String get documentAgentBaseUrl {
    if (_documentAgentBaseUrlEnv.isNotEmpty) {
      return _documentAgentBaseUrlEnv.replaceAll(RegExp(r'/$'), '');
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3100';
    }
    return 'http://localhost:3100';
  }

  /// Ağ/API hatasında fixture tabanlı mock sonuç dön.
  /// Varsayılan: kapalı — gerçek Document Agent gerekir.
  static const bool useMockFallback = bool.fromEnvironment(
    'SCAN_USE_MOCK_FALLBACK',
    defaultValue: false,
  );

  /// `true` ise gerçek `camera` önizleme / capture denenir (mobil varsayılan).
  /// Web’de canlı plugin yok; galeri/dosya (`image_picker`) kullanılır.
  /// `false` → yalnızca UI stub (geliştirme).
  static const bool nativeCameraEnabled = bool.fromEnvironment(
    'SCAN_NATIVE_CAMERA',
    defaultValue: true,
  );

  static String get analyzeUrl => '$documentAgentBaseUrl/api/v1/documents/analyze';

  static String get analyzeTextUrl =>
      '$documentAgentBaseUrl/api/v1/documents/analyze-text';
}
