import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/settlement_api_config.dart';
import '../models/bank_transaction.dart';
import '../models/settlement_action.dart';
import '../models/veresiye_open_debt.dart';
import 'mock_settlement_data.dart';

/// Gateway `/v1/tenant/bank-transactions*` + `/settlements` istemcisi.
///
/// `allowMock == true` → yalnızca mock (DEBUG). Aksi halde gerçek API;
/// hata durumunda sessiz mock doldurma yok — exception fırlatılır.
class SettlementRepository {
  SettlementRepository({
    http.Client? client,
    this.baseUrl = SettlementApiConfig.baseUrl,
    this.allowMock = SettlementApiConfig.allowMock,
    required this.accessToken,
    required this.tenantId,
  }) : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;
  final bool allowMock;
  final String accessToken;
  final String tenantId;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
        'X-Tenant-ID': tenantId,
      };

  String get _bankTransactionsUrl =>
      '$baseUrl/v1/tenant/bank-transactions';

  String _matchSuggestionsUrl(String bankTxId) =>
      '$baseUrl/v1/tenant/bank-transactions/$bankTxId/match-suggestions';

  String get _settlementsUrl => '$baseUrl/v1/tenant/settlements';

  /// Eşleşmemiş gelen havaleler.
  Future<List<BankTransaction>> fetchInboundUnmatched({int limit = 100}) async {
    if (allowMock) {
      return List<BankTransaction>.from(MockSettlementData.inboundUnmatched);
    }

    final uri = Uri.parse(_bankTransactionsUrl).replace(
      queryParameters: {
        'matchStatus': 'unmatched',
        'direction': 'inbound',
        'limit': '$limit',
      },
    );

    try {
      final response = await _client
          .get(uri, headers: _headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return _parseBankTxList(response.body);
      }

      throw SettlementException(
        _errorMessage(response, fallback: 'Banka hareketleri alınamadı'),
        statusCode: response.statusCode,
      );
    } on SettlementException {
      rethrow;
    } catch (e) {
      throw SettlementException('Sunucuya bağlanılamadı: $e');
    }
  }

  /// Matching önerileri (veresiye adayları).
  Future<List<VeresiyeOpenDebt>> fetchMatchSuggestions(String bankTxId) async {
    if (allowMock) {
      return MockSettlementData.suggestionsForTx(bankTxId);
    }

    try {
      final response = await _client
          .get(
            Uri.parse(_matchSuggestionsUrl(bankTxId)),
            headers: _headers,
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return _parseSuggestions(response.body);
      }

      throw SettlementException(
        _errorMessage(response, fallback: 'Eşleştirme önerileri alınamadı'),
        statusCode: response.statusCode,
      );
    } on SettlementException {
      rethrow;
    } catch (e) {
      throw SettlementException('Sunucuya bağlanılamadı: $e');
    }
  }

  /// Swipe / tek tık mahsup → `POST /v1/tenant/settlements`.
  Future<SettlementAction> settle(SettlementAction action) async {
    if (allowMock) {
      return action.copyWith(
        status: SettlementStatus.settled,
        settledAt: DateTime.now(),
      );
    }

    final body = <String, dynamic>{
      'bankTxId': action.bankTx.id,
      'veresiyeId': action.veresiye.id,
      'cariId': action.veresiye.cariId,
      'settleAmount': action.settleAmount,
    };

    try {
      final response = await _client
          .post(
            Uri.parse(_settlementsUrl),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        DateTime? settledAt;
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map<String, dynamic>) {
            final raw = decoded['settledAt'];
            if (raw is String) settledAt = DateTime.tryParse(raw);
          }
        } catch (_) {}

        return action.copyWith(
          status: SettlementStatus.settled,
          settledAt: settledAt ?? DateTime.now(),
        );
      }

      throw SettlementException(
        _errorMessage(response, fallback: 'Mahsup kaydı başarısız'),
        statusCode: response.statusCode,
      );
    } on SettlementException {
      rethrow;
    } catch (e) {
      throw SettlementException('Sunucuya bağlanılamadı: $e');
    }
  }

  List<BankTransaction> _parseBankTxList(String raw) {
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      throw const SettlementException('Geçersiz banka listesi yanıtı');
    }
    final items = decoded['items'];
    if (items is! List) {
      throw const SettlementException('Yanıtta items dizisi yok');
    }
    return items
        .whereType<Map<String, dynamic>>()
        .map(BankTransaction.fromJson)
        .toList();
  }

  List<VeresiyeOpenDebt> _parseSuggestions(String raw) {
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      throw const SettlementException('Geçersiz öneri yanıtı');
    }
    final items = decoded['suggestions'];
    if (items is! List) {
      throw const SettlementException('Yanıtta suggestions dizisi yok');
    }
    return items
        .whereType<Map<String, dynamic>>()
        .map(VeresiyeOpenDebt.fromJson)
        .toList();
  }

  String _errorMessage(http.Response response, {required String fallback}) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final msg = decoded['message'];
        if (msg is String && msg.isNotEmpty) return msg;
        final err = decoded['error'];
        if (err is String && err.isNotEmpty) return err;
      }
    } catch (_) {}
    return '$fallback (${response.statusCode})';
  }

  void dispose() {
    _client.close();
  }
}

class SettlementException implements Exception {
  const SettlementException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
