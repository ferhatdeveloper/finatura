import 'auth_user.dart';

/// Login başarısı — access / refresh JWT + kullanıcı.
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.tokenType,
    required this.expiresIn,
    required this.user,
    this.fromMock = false,
  });

  final String accessToken;
  final String refreshToken;
  final String tokenType;
  final int expiresIn;
  final AuthUser user;
  final bool fromMock;

  factory AuthSession.fromJson(
    Map<String, dynamic> json, {
    bool fromMock = false,
  }) {
    final userJson = json['user'];
    if (userJson is! Map<String, dynamic>) {
      throw const FormatException('Login yanıtında user yok');
    }
    return AuthSession(
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      tokenType: json['tokenType'] as String? ?? 'Bearer',
      expiresIn: (json['expiresIn'] as num?)?.toInt() ?? 3600,
      user: AuthUser.fromJson(userJson),
      fromMock: fromMock,
    );
  }

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'tokenType': tokenType,
        'expiresIn': expiresIn,
        'user': user.toJson(),
        'fromMock': fromMock,
      };
}
