/// API Gateway kök URL ve auth ayarları.
///
/// Varsayılan production: `https://api.finatura.app`
/// Override: `--dart-define=API_BASE_URL=…` (localhost/127.0.0.1 yok sayılır)
class ApiConfig {
  const ApiConfig._();

  static const String _rawBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.finatura.app',
  );

  /// Gateway kök URL (sonunda `/` olmamalı).
  /// Localhost / 127.0.0.1 / emülatör IP override'ları production'a düşer.
  static String get baseUrl => sanitizeBaseUrl(_rawBaseUrl);

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

  static String sanitizeBaseUrl(String raw) {
    final trimmed = raw.trim().replaceAll(RegExp(r'/$'), '');
    if (trimmed.isEmpty) return 'https://api.finatura.app';
    final lower = trimmed.toLowerCase();
    if (lower.contains('127.0.0.1') ||
        lower.contains('localhost') ||
        lower.contains('10.0.2.2') ||
        RegExp(r'https?://192\.168\.').hasMatch(lower)) {
      return 'https://api.finatura.app';
    }
    return trimmed;
  }
}
