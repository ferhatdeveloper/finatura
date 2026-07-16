import 'package:finatura_mobile/features/auth/config/api_config.dart';

/// Settlement / banka API — Gateway → tenant-router.
///
/// Kök URL: [ApiConfig.baseUrl] (`https://api.finatura.app`).
/// Mock yalnızca `--dart-define=SETTLEMENT_ALLOW_MOCK=true`.
class SettlementApiConfig {
  const SettlementApiConfig._();

  static String get baseUrl => ApiConfig.baseUrl;

  /// Mock inbox yalnızca açıkça `SETTLEMENT_ALLOW_MOCK=true` iken.
  /// API hatasında sessizce mock doldurma yok.
  static const bool allowMock = bool.fromEnvironment(
    'SETTLEMENT_ALLOW_MOCK',
    defaultValue: false,
  );

  static String get bankTransactionsUrl =>
      '$baseUrl/v1/tenant/bank-transactions';

  static String matchSuggestionsUrl(String bankTxId) =>
      '$baseUrl/v1/tenant/bank-transactions/$bankTxId/match-suggestions';

  static String get settlementsUrl => '$baseUrl/v1/tenant/settlements';
}
