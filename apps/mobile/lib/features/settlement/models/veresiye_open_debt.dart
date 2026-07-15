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
}
