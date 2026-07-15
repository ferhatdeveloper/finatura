/// API Gateway kök URL ve auth ayarları.
///
/// ```bash
/// flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
/// flutter run --dart-define=AUTH_ALLOW_MOCK=true
/// ```
class ApiConfig {
  const ApiConfig._();

  /// Gateway kök URL (sonunda `/` olmamalı).
  ///
  /// Android emülatör → `http://10.0.2.2:3000`
  /// iOS simülatör / web → `http://127.0.0.1:3000` veya `http://localhost:3000`
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // Yerel: --dart-define=API_BASE_URL=http://localhost:3000
    // Docker/Dokploy production build-arg varsayılanı: https://api.finatura.app
    defaultValue: 'http://localhost:3000',
  );

  /// İsteğe bağlı istemci mock: yalnızca `--dart-define=AUTH_ALLOW_MOCK=true`.
  /// Varsayılan: kapalı — giriş yalnızca API Gateway üzerinden.
  static const bool allowMock = bool.fromEnvironment(
    'AUTH_ALLOW_MOCK',
    defaultValue: false,
  );

  /// Gateway stub / form ön doldurma (istemci mock değil).
  static const String demoEmail = 'demo@finatura.app';
  static const String demoPassword = 'demo1234';
  static const String demoFirmaKodu = 'DEMO-GALERI';

  static String get loginUrl => '$baseUrl/auth/login';
}
