import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/auth_session.dart';

/// Access/refresh token + kullanıcı — web’de localStorage, native’de prefs.
class TokenStorage {
  TokenStorage({SharedPreferences? prefs}) : _prefs = prefs;

  SharedPreferences? _prefs;

  static const _sessionKey = 'finatura_auth_session';

  Future<SharedPreferences> _ensurePrefs() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  Future<AuthSession?> readSession() async {
    final prefs = await _ensurePrefs();
    final raw = prefs.getString(_sessionKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      return AuthSession.fromJson(
        decoded,
        fromMock: decoded['fromMock'] == true,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> saveSession(AuthSession session) async {
    final prefs = await _ensurePrefs();
    await prefs.setString(_sessionKey, jsonEncode(session.toJson()));
  }

  Future<void> clear() async {
    final prefs = await _ensurePrefs();
    await prefs.remove(_sessionKey);
  }

  Future<String?> readAccessToken() async {
    final session = await readSession();
    final token = session?.accessToken;
    if (token == null || token.isEmpty) return null;
    return token;
  }
}
