/// Document Agent & kamera path ayarları.
///
/// Derleme zamanı:
/// ```bash
/// flutter run --dart-define=DOCUMENT_AGENT_BASE_URL=http://192.168.1.10:3100
/// flutter run --dart-define=SCAN_USE_MOCK_FALLBACK=true
/// flutter run --dart-define=SCAN_NATIVE_CAMERA=true
/// ```
class ScanApiConfig {
  const ScanApiConfig._();

  /// Document Agent kök URL (sonunda `/` olmamalı).
  ///
  /// Android emülatör → host makine: `http://10.0.2.2:3100`
  /// iOS simülatör → `http://127.0.0.1:3100`
  /// Gerçek cihaz → bilgisayarın LAN IP’si
  static const String documentAgentBaseUrl = String.fromEnvironment(
    'DOCUMENT_AGENT_BASE_URL',
    defaultValue: 'http://10.0.2.2:3100',
  );

  /// Ağ/API hatasında fixture tabanlı mock sonuç dön.
  static const bool useMockFallback = bool.fromEnvironment(
    'SCAN_USE_MOCK_FALLBACK',
    defaultValue: true,
  );

  /// `true` ise [NativeCameraAdapter] gerçek kamera yolunu dener.
  /// `camera` paketi pubspec’te kapalıyken yine stub’a düşer.
  static const bool nativeCameraEnabled = bool.fromEnvironment(
    'SCAN_NATIVE_CAMERA',
    defaultValue: false,
  );

  static String get analyzeUrl => '$documentAgentBaseUrl/api/v1/documents/analyze';

  static String get analyzeTextUrl =>
      '$documentAgentBaseUrl/api/v1/documents/analyze-text';
}
