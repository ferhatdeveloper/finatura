/// API Gateway kök URL ve auth ayarları.
///
/// ```bash
/// flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
/// flutter run --dart-define=AUTH_USE_MOCK_FALLBACK=true
/// ```
class ApiConfig {
  const ApiConfig._();

  /// Gateway kök URL (sonunda `/` olmamalı).
  ///
  /// Android emülatör → `http://10.0.2.2:3000`
  /// iOS simülatör / web → `http://127.0.0.1:3000` veya `http://localhost:3000`
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Gateway’e ulaşılamazsa demo hesap ile yerel mock oturum.
  static const bool useMockFallback = bool.fromEnvironment(
    'AUTH_USE_MOCK_FALLBACK',
    defaultValue: true,
  );

  static const String demoEmail = 'demo@finatura.app';
  static const String demoPassword = 'demo1234';
  static const String demoFirmaKodu = 'DEMO-GALERI';

  static String get loginUrl => '$baseUrl/auth/login';
}
