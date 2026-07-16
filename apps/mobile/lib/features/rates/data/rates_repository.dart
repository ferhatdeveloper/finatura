import 'dart:convert';

import 'package:finatura_mobile/features/auth/config/api_config.dart';
import 'package:http/http.dart' as http;

import '../models/market_rate.dart';

/// Kur/altın istemcisi.
///
/// 1) `https://api.finatura.app/v1/tenant/rates` (ve `/v1/rates`)
/// 2) Canlı public JSON (truncgil) — gateway/tenant-router kırıkken
/// 3) İşaretli demo — son çare
class RatesRepository {
  RatesRepository({
    http.Client? client,
    String? baseUrl,
    required this.accessToken,
    required this.tenantId,
  })  : _client = client ?? http.Client(),
        baseUrl = _normalizeBaseUrl(baseUrl ?? ApiConfig.baseUrl);

  final http.Client _client;
  final String baseUrl;
  final String accessToken;
  final String tenantId;

  static const _productionBase = 'https://api.finatura.app';
  static const _truncgilUrl = 'https://finans.truncgil.com/v4/today.json';

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
        'X-Tenant-ID': tenantId,
      };

  Future<MarketRatesSnapshot> fetchRates() async {
    final gatewayErrors = <String>[];

    for (final path in ['/v1/tenant/rates', '/v1/rates']) {
      try {
        return await _fetchGateway(path);
      } on RatesException catch (e) {
        gatewayErrors.add(_sanitizeMessage(e.message));
      } catch (e) {
        gatewayErrors.add(_sanitizeMessage('$e'));
      }
    }

    try {
      return await _fetchTruncgil();
    } catch (_) {
      // continue to demo
    }

    return MarketRatesSnapshot.demo(
      note: gatewayErrors.isEmpty
          ? 'Canlı kur alınamadı; örnek (demo) fiyatlar.'
          : 'API kur uç noktası yanıt vermedi; örnek (demo) fiyatlar. '
              '${gatewayErrors.first}',
    );
  }

  Future<MarketRatesSnapshot> _fetchGateway(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _client
        .get(uri, headers: _headers)
        .timeout(const Duration(seconds: 15));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final snapshot = MarketRatesSnapshot.fromJson(decoded);
        if (snapshot.fx.isNotEmpty || snapshot.gold.isNotEmpty) {
          return snapshot;
        }
        throw const RatesException('Kur yanıtı boş');
      }
      throw const RatesException('Geçersiz kur yanıtı');
    }

    throw RatesException(
      _errorMessage(response, fallback: 'Kur ve altın verisi alınamadı'),
      statusCode: response.statusCode,
    );
  }

  Future<MarketRatesSnapshot> _fetchTruncgil() async {
    final response = await _client.get(
      Uri.parse(_truncgilUrl),
      headers: const {'Accept': 'application/json'},
    ).timeout(const Duration(seconds: 12));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw RatesException(
        'Canlı kur kaynağı yanıt vermedi (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const RatesException('Canlı kur JSON geçersiz');
    }
    return MarketRatesSnapshot.fromTruncgil(decoded);
  }

  String _errorMessage(http.Response response, {required String fallback}) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final msg = decoded['message'];
        if (msg is String && msg.isNotEmpty) {
          return _sanitizeMessage(msg);
        }
        final err = decoded['error'];
        if (err is String && err.isNotEmpty) return err;
      }
    } catch (_) {}
    return '$fallback (${response.statusCode})';
  }

  void dispose() {
    _client.close();
  }

  /// Localhost / 127.0.0.1 asla production istemcisinde kullanılmaz.
  static String _normalizeBaseUrl(String raw) {
    final trimmed = raw.trim().replaceAll(RegExp(r'/$'), '');
    if (trimmed.isEmpty) return _productionBase;
    final lower = trimmed.toLowerCase();
    if (lower.contains('127.0.0.1') ||
        lower.contains('localhost') ||
        lower.contains('10.0.2.2') ||
        RegExp(r'https?://192\.168\.').hasMatch(lower) ||
        RegExp(r'https?://10\.').hasMatch(lower)) {
      return _productionBase;
    }
    return trimmed;
  }

  static String _sanitizeMessage(String message) {
    return message
        .replaceAll(RegExp(r'https?://127\.0\.0\.1:\d+', caseSensitive: false),
            'api.finatura.app')
        .replaceAll(RegExp(r'https?://localhost:\d+', caseSensitive: false),
            'api.finatura.app')
        .replaceAll(
          RegExp(r"tenant-router'a ulaşılamadı[^\n.]*", caseSensitive: false),
          'Tenant servisine ulaşılamadı',
        );
  }
}

class RatesException implements Exception {
  const RatesException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
