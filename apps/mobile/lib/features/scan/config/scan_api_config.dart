import 'package:finatura_mobile/features/auth/config/api_config.dart';

/// Document / OCR istemci ayarları.
///
/// Varsayılan: [ApiConfig.baseUrl] (`https://api.finatura.app`).
/// Override: `--dart-define=DOCUMENT_AGENT_BASE_URL=…`
///
/// Not: Production gateway şu an `/api/v1/documents/*` route’larını
/// expose etmiyor (404). Yerel IP / localhost / tünel fallback yok.
class ScanApiConfig {
  const ScanApiConfig._();

  static const String _documentAgentBaseUrlEnv = String.fromEnvironment(
    'DOCUMENT_AGENT_BASE_URL',
  );

  /// Document / OCR kök URL (sonunda `/` olmamalı).
  static String get documentAgentBaseUrl {
    if (_documentAgentBaseUrlEnv.isNotEmpty) {
      return _documentAgentBaseUrlEnv.replaceAll(RegExp(r'/$'), '');
    }
    return ApiConfig.baseUrl;
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

  static String get analyzeUrl =>
      '$documentAgentBaseUrl/api/v1/documents/analyze';

  static String get analyzeTextUrl =>
      '$documentAgentBaseUrl/api/v1/documents/analyze-text';
}
