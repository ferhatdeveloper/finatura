import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/auth_session.dart';
import '../models/auth_user.dart';

/// Gateway `POST /auth/login` istemcisi.
///
/// Varsayılan: yalnızca gerçek API. İstemci mock yalnızca
/// `--dart-define=AUTH_ALLOW_MOCK=true` ile açılır.
class AuthApi {
  AuthApi({
    http.Client? client,
    String? baseUrl,
    this.allowMock = ApiConfig.allowMock,
  })  : _client = client ?? http.Client(),
        baseUrl = ApiConfig.sanitizeBaseUrl(baseUrl ?? ApiConfig.baseUrl);

  final http.Client _client;
  final String baseUrl;
  final bool allowMock;

  String get _loginUrl => '$baseUrl/auth/login';

  Future<AuthSession> login({
    required String email,
    required String password,
    required String firmaKodu,
  }) async {
    final body = <String, dynamic>{
      'email': email.trim(),
      'password': password,
      'firmaKodu': firmaKodu.trim(),
    };

    try {
      final response = await _client
          .post(
            Uri.parse(_loginUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        if (decoded is! Map<String, dynamic>) {
          throw const AuthException('Geçersiz sunucu yanıtı');
        }
        return AuthSession.fromJson(decoded);
      }

      final message = _errorMessage(response);
      throw AuthException(message, statusCode: response.statusCode);
    } on AuthException {
      rethrow;
    } catch (_) {
      if (allowMock && _isDemoCredentials(email, password, firmaKodu)) {
        return _demoSession();
      }
      throw const AuthException(
        'Sunucuya bağlanılamadı. Ağ bağlantınızı ve API adresini kontrol edin.',
      );
    }
  }

  bool _isDemoCredentials(String email, String password, String firmaKodu) {
    return email.trim().toLowerCase() == ApiConfig.demoEmail &&
        password == ApiConfig.demoPassword &&
        firmaKodu.trim().toUpperCase() == ApiConfig.demoFirmaKodu;
  }

  AuthSession _demoSession() {
    return AuthSession(
      accessToken: 'demo-mock-access-token',
      refreshToken: 'demo-mock-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      fromMock: true,
      user: const AuthUser(
        id: '00000000-0000-4000-8000-000000000001',
        email: ApiConfig.demoEmail,
        displayName: 'Finatura Demo',
        tenantId: '00000000-0000-4000-8000-0000000000aa',
        tenantSlug: 'ornek-galeri',
        role: 'owner',
      ),
    );
  }

  String _errorMessage(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final msg = decoded['message'];
        if (msg is String && msg.isNotEmpty) return msg;
        final err = decoded['error'];
        if (err is String && err.isNotEmpty) return err;
      }
    } catch (_) {}
    return 'Giriş başarısız (${response.statusCode})';
  }

  void dispose() {
    _client.close();
  }
}

class AuthException implements Exception {
  const AuthException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
