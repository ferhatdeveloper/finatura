import 'package:flutter/material.dart';

import '../data/mock_settlement_data.dart';
import '../models/bank_transaction.dart';
import '../models/settlement_action.dart';
import 'widgets/bank_transaction_tile.dart';
import 'widgets/settle_match_sheet.dart';

/// Eşleşmemiş gelen banka hareketleri — swipe / tek tık veresiye kapatma girişi.
class SettlementInboxScreen extends StatefulWidget {
  const SettlementInboxScreen({super.key});

  @override
  State<SettlementInboxScreen> createState() => _SettlementInboxScreenState();
}

class _SettlementInboxScreenState extends State<SettlementInboxScreen> {
  late List<BankTransaction> _inbox;
  final List<SettlementAction> _history = [];

  @override
  void initState() {
    super.initState();
    _inbox = List<BankTransaction>.from(MockSettlementData.inboundUnmatched);
  }

  Future<void> _openMatchSheet(BankTransaction tx) async {
    final candidates = MockSettlementData.suggestionsForTx(tx.id);
    await SettleMatchSheet.show(
      context: context,
      bankTx: tx,
      candidates: candidates,
      onSettle: _applySettlement,
    );
  }

  void _applySettlement(SettlementAction action) {
    setState(() {
      _history.insert(0, action);
      _inbox = _inbox
          .map(
            (tx) => tx.id == action.bankTx.id
                ? tx.copyWith(
                    matchStatus: BankTxMatchStatus.matched,
                    matchedCariId: action.veresiye.cariId,
                    matchedVeresiyeId: action.veresiye.id,
                  )
                : tx,
          )
          .where((tx) => tx.isOpen)
          .toList();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${action.veresiye.cariTitle} veresiyesine mahsup edildi '
          '(₺${action.settleAmount.toStringAsFixed(0)}).',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Banka · Veresiye'),
        actions: [
          if (_history.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Text(
                  '${_history.length} mahsup',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _inbox.isEmpty
          ? _EmptyState(recentCount: _history.length)
          : ListView.separated(
              itemCount: _inbox.length + 1,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Text(
                      'Gelen havaleler — tıkla, kaydır, kapat',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  );
                }
                final tx = _inbox[index - 1];
                return BankTransactionTile(
                  tx: tx,
                  onTap: () => _openMatchSheet(tx),
                );
              },
            ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.recentCount});

  final int recentCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.done_all_rounded,
              size: 48,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              'Eşleşecek hareket kalmadı',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              recentCount > 0
                  ? 'Bu oturumda $recentCount mahsup yapıldı (mock).'
                  : 'Mock gelen havaleler listesi boş.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
