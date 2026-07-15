import 'package:flutter/material.dart';

import '../../models/bank_transaction.dart';
import '../../models/settlement_action.dart';
import '../../models/veresiye_open_debt.dart';
import 'swipe_to_settle_card.dart';

/// Seçilen banka hareketi için veresiye öneri listesi (bottom sheet).
class SettleMatchSheet extends StatelessWidget {
  const SettleMatchSheet({
    super.key,
    required this.bankTx,
    required this.candidates,
    required this.onSettle,
  });

  final BankTransaction bankTx;
  final List<VeresiyeOpenDebt> candidates;
  final void Function(SettlementAction action) onSettle;

  static String _money(double amount) {
    final fixed =
        amount % 1 == 0 ? amount.toStringAsFixed(0) : amount.toStringAsFixed(2);
    return '₺$fixed';
  }

  static Future<void> show({
    required BuildContext context,
    required BankTransaction bankTx,
    required List<VeresiyeOpenDebt> candidates,
    required void Function(SettlementAction action) onSettle,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => SettleMatchSheet(
        bankTx: bankTx,
        candidates: candidates,
        onSettle: (action) {
          onSettle(action);
          Navigator.of(ctx).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sorted = [...candidates]
      ..sort((a, b) => b.matchScore.compareTo(a.matchScore));

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Veresiye mahsup',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${bankTx.counterpartyName ?? 'Hareket'} · ${_money(bankTx.amount)}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Sola kaydır veya Kapat — tek hareketle mahsup.',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            if (sorted.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  'Bu hareket için önerilen açık veresiye yok.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              )
            else
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(context).height * 0.5,
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: sorted.length,
                  itemBuilder: (context, index) {
                    final debt = sorted[index];
                    final settleAmount =
                        settleCap(bankTx.amount, debt.openAmount);
                    return SwipeToSettleCard(
                      debt: debt,
                      settleAmount: settleAmount,
                      onSettle: () {
                        onSettle(
                          SettlementAction(
                            bankTx: bankTx,
                            veresiye: debt,
                            settleAmount: settleAmount,
                            status: SettlementStatus.settled,
                            settledAt: DateTime.now(),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

double settleCap(double bankAmount, double openAmount) {
  return bankAmount < openAmount ? bankAmount : openAmount;
}
