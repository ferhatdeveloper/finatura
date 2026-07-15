/// Gateway `/auth/login` kullanıcı nesnesi.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.tenantId,
    required this.tenantSlug,
    required this.role,
  });

  final String id;
  final String email;
  final String displayName;
  final String tenantId;
  final String tenantSlug;
  final String role;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      tenantId: json['tenantId'] as String? ?? '',
      tenantSlug: json['tenantSlug'] as String? ?? '',
      role: json['role'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'displayName': displayName,
        'tenantId': tenantId,
        'tenantSlug': tenantSlug,
        'role': role,
      };
}
