/// Açık veresiye borcu — mahsup adayı (`veresiye_transactions`).
enum VeresiyeAssetKind { tl, gold, fx }

enum VeresiyeDirection { debit, credit }

class VeresiyeOpenDebt {
  const VeresiyeOpenDebt({
    required this.id,
    required this.cariId,
    required this.cariTitle,
    required this.assetKind,
    required this.direction,
    required this.openAmount,
    required this.currencyCode,
    required this.transactionDate,
    this.description,
    this.goldGrams,
    this.matchScore = 0,
    this.matchHint,
  });

  final String id;
  final String cariId;
  final String cariTitle;
  final VeresiyeAssetKind assetKind;
  final VeresiyeDirection direction;
  final double openAmount;
  final String currencyCode;
  final DateTime transactionDate;
  final String? description;
  final double? goldGrams;

  /// 0–100; Matching Agent skorunun UI yansıması.
  final int matchScore;
  final String? matchHint;

  factory VeresiyeOpenDebt.fromJson(Map<String, dynamic> json) {
    return VeresiyeOpenDebt(
      id: json['id'] as String? ?? '',
      cariId: json['cariId'] as String? ?? json['cari_id'] as String? ?? '',
      cariTitle:
          json['cariTitle'] as String? ?? json['cari_title'] as String? ?? 'Cari',
      assetKind: _parseAssetKind(json['assetKind'] ?? json['asset_kind']),
      direction: _parseDirection(json['direction']),
      openAmount: _toDouble(json['openAmount'] ?? json['open_amount'] ?? json['amount']),
      currencyCode: json['currencyCode'] as String? ??
          json['currency_code'] as String? ??
          'TRY',
      transactionDate: _parseDate(
            json['transactionDate'] ?? json['transaction_date'],
          ) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      description: json['description'] as String?,
      goldGrams: _toDoubleOrNull(json['goldGrams'] ?? json['gold_grams']),
      matchScore: _toInt(json['matchScore'] ?? json['match_score']),
      matchHint: json['matchHint'] as String? ?? json['match_hint'] as String?,
    );
  }

  static VeresiyeAssetKind _parseAssetKind(Object? raw) {
    final s = raw?.toString().toLowerCase() ?? '';
    if (s == 'gold') return VeresiyeAssetKind.gold;
    if (s == 'fx') return VeresiyeAssetKind.fx;
    return VeresiyeAssetKind.tl;
  }

  static VeresiyeDirection _parseDirection(Object? raw) {
    final s = raw?.toString().toLowerCase() ?? '';
    if (s == 'credit') return VeresiyeDirection.credit;
    return VeresiyeDirection.debit;
  }

  static double _toDouble(Object? raw) {
    if (raw is num) return raw.toDouble();
    if (raw is String) return double.tryParse(raw) ?? 0;
    return 0;
  }

  static double? _toDoubleOrNull(Object? raw) {
    if (raw == null) return null;
    return _toDouble(raw);
  }

  static int _toInt(Object? raw) {
    if (raw is int) return raw;
    if (raw is num) return raw.round();
    if (raw is String) return int.tryParse(raw) ?? 0;
    return 0;
  }

  static DateTime? _parseDate(Object? raw) {
    if (raw is DateTime) return raw;
    if (raw is String && raw.isNotEmpty) {
      final parsed = DateTime.tryParse(raw);
      if (parsed != null) return parsed;
    }
    return null;
  }
}
