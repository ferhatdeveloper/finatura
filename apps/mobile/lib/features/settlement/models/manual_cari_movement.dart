enum ManualCariOperation { tahsilat, tediye }

enum ManualCariAssetKind { tl, gold, fx }

class ManualCariMovementPrefill {
  const ManualCariMovementPrefill({
    required this.assetKind,
    required this.currencyCode,
    required this.description,
    this.amount,
    this.goldGrams,
    this.goldPurity,
    this.fxRate,
    this.title = 'Kur ile düşüm',
  });

  final ManualCariAssetKind assetKind;
  final String currencyCode;
  final String title;
  final String description;
  final double? amount;
  final double? goldGrams;
  final double? goldPurity;
  final double? fxRate;
}

class ManualCariOption {
  const ManualCariOption({
    required this.id,
    required this.title,
    this.code,
    this.openBalance,
  });

  final String id;
  final String title;
  final String? code;
  final double? openBalance;

  factory ManualCariOption.fromJson(Map<String, dynamic> json) {
    return ManualCariOption(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Cari',
      code: json['code'] as String?,
      openBalance: _toDoubleOrNull(json['openBalance'] ?? json['open_balance']),
    );
  }
}

class ManualCariMovementRequest {
  const ManualCariMovementRequest({
    required this.cariId,
    required this.operation,
    required this.assetKind,
    required this.amount,
    required this.currencyCode,
    this.description,
    this.goldGrams,
    this.goldPurity,
    this.fxRate,
  });

  final String cariId;
  final ManualCariOperation operation;
  final ManualCariAssetKind assetKind;
  final double amount;
  final String currencyCode;
  final String? description;
  final double? goldGrams;
  final double? goldPurity;
  final double? fxRate;

  String get direction =>
      operation == ManualCariOperation.tahsilat ? 'credit' : 'debit';

  Map<String, dynamic> toJson() {
    return {
      'cariId': cariId,
      'operation': operation.name,
      'direction': direction,
      'assetKind': assetKind.name,
      'amount': amount,
      'currencyCode': currencyCode,
      if (description != null && description!.trim().isNotEmpty)
        'description': description!.trim(),
      if (goldGrams != null) 'goldGrams': goldGrams,
      if (goldPurity != null) 'goldPurity': goldPurity,
      if (fxRate != null) 'fxRate': fxRate,
    };
  }
}

class ManualCariMovementResult {
  const ManualCariMovementResult({
    required this.id,
    required this.cariId,
    required this.direction,
    required this.assetKind,
    required this.amount,
    required this.currencyCode,
    required this.transactionDate,
    this.description,
    this.goldGrams,
    this.goldPurity,
    this.fxRate,
  });

  final String id;
  final String cariId;
  final String direction;
  final ManualCariAssetKind assetKind;
  final double amount;
  final String currencyCode;
  final DateTime transactionDate;
  final String? description;
  final double? goldGrams;
  final double? goldPurity;
  final double? fxRate;

  factory ManualCariMovementResult.fromJson(Map<String, dynamic> json) {
    final movement = json['movement'];
    final data = movement is Map<String, dynamic> ? movement : json;
    return ManualCariMovementResult(
      id: data['id'] as String? ?? '',
      cariId: data['cariId'] as String? ?? data['cari_id'] as String? ?? '',
      direction: data['direction'] as String? ?? '',
      assetKind: _parseAssetKind(data['assetKind'] ?? data['asset_kind']),
      amount: _toDouble(data['amount']),
      currencyCode: data['currencyCode'] as String? ??
          data['currency_code'] as String? ??
          'TRY',
      transactionDate: DateTime.tryParse(
            data['transactionDate'] as String? ??
                data['transaction_date'] as String? ??
                '',
          ) ??
          DateTime.now(),
      description: data['description'] as String?,
      goldGrams: _toDoubleOrNull(data['goldGrams'] ?? data['gold_grams']),
      goldPurity: _toDoubleOrNull(data['goldPurity'] ?? data['gold_purity']),
      fxRate: _toDoubleOrNull(data['fxRate'] ?? data['fx_rate']),
    );
  }
}

ManualCariAssetKind _parseAssetKind(Object? raw) {
  final value = raw?.toString().toLowerCase();
  if (value == 'gold') return ManualCariAssetKind.gold;
  if (value == 'fx') return ManualCariAssetKind.fx;
  return ManualCariAssetKind.tl;
}

double _toDouble(Object? raw) {
  if (raw is num) return raw.toDouble();
  if (raw is String) return double.tryParse(raw) ?? 0;
  return 0;
}

double? _toDoubleOrNull(Object? raw) {
  if (raw == null) return null;
  return _toDouble(raw);
}
