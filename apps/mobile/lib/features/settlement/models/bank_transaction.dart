/// `bank_transactions` satırının UI modeli (tenant_template ile hizalı).
enum BankTxDirection { inbound, outbound }

enum BankTxMatchStatus { unmatched, matched, ignored }

class BankTransaction {
  const BankTransaction({
    required this.id,
    required this.bankAccountAlias,
    required this.direction,
    required this.amount,
    required this.currencyCode,
    required this.transactionAt,
    required this.matchStatus,
    this.counterpartyName,
    this.description,
    this.matchedCariId,
    this.matchedVeresiyeId,
  });

  final String id;
  final String bankAccountAlias;
  final BankTxDirection direction;
  final double amount;
  final String currencyCode;
  final DateTime transactionAt;
  final BankTxMatchStatus matchStatus;
  final String? counterpartyName;
  final String? description;
  final String? matchedCariId;
  final String? matchedVeresiyeId;

  bool get isInbound => direction == BankTxDirection.inbound;
  bool get isOpen => matchStatus == BankTxMatchStatus.unmatched;

  factory BankTransaction.fromJson(Map<String, dynamic> json) {
    return BankTransaction(
      id: json['id'] as String? ?? '',
      bankAccountAlias: json['bankAccountAlias'] as String? ??
          json['bank_account_alias'] as String? ??
          'Banka',
      direction: _parseDirection(json['direction']),
      amount: _toDouble(json['amount']),
      currencyCode: json['currencyCode'] as String? ??
          json['currency_code'] as String? ??
          'TRY',
      transactionAt: _parseDateTime(
            json['transactionAt'] ?? json['transaction_at'],
          ) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      matchStatus: _parseMatchStatus(json['matchStatus'] ?? json['match_status']),
      counterpartyName: json['counterpartyName'] as String? ??
          json['counterparty_name'] as String?,
      description: json['description'] as String?,
      matchedCariId: json['matchedCariId'] as String? ??
          json['matched_cari_id'] as String?,
      matchedVeresiyeId: json['matchedVeresiyeId'] as String? ??
          json['matched_veresiye_id'] as String?,
    );
  }

  BankTransaction copyWith({
    BankTxMatchStatus? matchStatus,
    String? matchedCariId,
    String? matchedVeresiyeId,
  }) {
    return BankTransaction(
      id: id,
      bankAccountAlias: bankAccountAlias,
      direction: direction,
      amount: amount,
      currencyCode: currencyCode,
      transactionAt: transactionAt,
      matchStatus: matchStatus ?? this.matchStatus,
      counterpartyName: counterpartyName,
      description: description,
      matchedCariId: matchedCariId ?? this.matchedCariId,
      matchedVeresiyeId: matchedVeresiyeId ?? this.matchedVeresiyeId,
    );
  }

  static BankTxDirection _parseDirection(Object? raw) {
    final s = raw?.toString().toLowerCase() ?? '';
    if (s == 'outbound' || s == 'out') return BankTxDirection.outbound;
    return BankTxDirection.inbound;
  }

  static BankTxMatchStatus _parseMatchStatus(Object? raw) {
    final s = raw?.toString().toLowerCase() ?? '';
    if (s == 'matched') return BankTxMatchStatus.matched;
    if (s == 'ignored') return BankTxMatchStatus.ignored;
    return BankTxMatchStatus.unmatched;
  }

  static double _toDouble(Object? raw) {
    if (raw is num) return raw.toDouble();
    if (raw is String) return double.tryParse(raw) ?? 0;
    return 0;
  }

  static DateTime? _parseDateTime(Object? raw) {
    if (raw is DateTime) return raw;
    if (raw is String && raw.isNotEmpty) return DateTime.tryParse(raw);
    return null;
  }
}
