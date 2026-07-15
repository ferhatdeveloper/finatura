import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import 'auth_api.dart';
import 'token_storage.dart';

/// Oturum durumu — login / logout / cold start restore.
class AuthController extends ChangeNotifier {
  AuthController({
    AuthApi? api,
    TokenStorage? storage,
  })  : _api = api ?? AuthApi(),
        _storage = storage ?? TokenStorage();

  final AuthApi _api;
  final TokenStorage _storage;

  AuthSession? _session;
  bool _ready = false;
  bool _busy = false;
  String? _error;

  AuthSession? get session => _session;
  bool get isAuthenticated => _session != null;
  bool get ready => _ready;
  bool get busy => _busy;
  String? get error => _error;

  Future<void> bootstrap() async {
    _session = await _storage.readSession();
    _ready = true;
    notifyListeners();
  }

  Future<bool> login({
    required String email,
    required String password,
    required String firmaKodu,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();

    try {
      final session = await _api.login(
        email: email,
        password: password,
        firmaKodu: firmaKodu,
      );
      await _storage.saveSession(session);
      _session = session;
      _busy = false;
      notifyListeners();
      return true;
    } on AuthException catch (e) {
      _error = e.message;
      _busy = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _busy = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clear();
    _session = null;
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }
}
