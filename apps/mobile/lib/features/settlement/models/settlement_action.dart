import 'bank_transaction.dart';
import 'veresiye_open_debt.dart';

/// Banka hareketi ↔ veresiye mahsup isteği / sonucu.
enum SettlementStatus { pending, settled, undone }

class SettlementAction {
  const SettlementAction({
    required this.bankTx,
    required this.veresiye,
    required this.settleAmount,
    this.status = SettlementStatus.pending,
    this.settledAt,
  });

  final BankTransaction bankTx;
  final VeresiyeOpenDebt veresiye;
  final double settleAmount;
  final SettlementStatus status;
  final DateTime? settledAt;

  SettlementAction copyWith({
    SettlementStatus? status,
    DateTime? settledAt,
  }) {
    return SettlementAction(
      bankTx: bankTx,
      veresiye: veresiye,
      settleAmount: settleAmount,
      status: status ?? this.status,
      settledAt: settledAt ?? this.settledAt,
    );
  }
}
