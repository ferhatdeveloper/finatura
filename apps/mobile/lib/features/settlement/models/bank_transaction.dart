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
}
