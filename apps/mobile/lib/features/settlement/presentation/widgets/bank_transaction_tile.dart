import 'package:flutter/material.dart';

import '../../models/bank_transaction.dart';

/// Gelen banka hareketi satırı — tıklanınca mahsup önerileri açılır.
class BankTransactionTile extends StatelessWidget {
  const BankTransactionTile({
    super.key,
    required this.tx,
    required this.onTap,
  });

  final BankTransaction tx;
  final VoidCallback onTap;

  static String _money(double amount) {
    final fixed =
        amount % 1 == 0 ? amount.toStringAsFixed(0) : amount.toStringAsFixed(2);
    return '₺$fixed';
  }

  static String _when(DateTime at) {
    final d = at.day.toString().padLeft(2, '0');
    final m = at.month.toString().padLeft(2, '0');
    final h = at.hour.toString().padLeft(2, '0');
    final min = at.minute.toString().padLeft(2, '0');
    return '$d.$m $h:$min';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final when = _when(tx.transactionAt);

    return Material(
      color: theme.colorScheme.surface,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.south_west_rounded,
                  color: theme.colorScheme.onPrimaryContainer,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tx.counterpartyName ?? 'Bilinmeyen gönderen',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tx.description ?? tx.bankAccountAlias,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${tx.bankAccountAlias} · $when',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '+${_money(tx.amount)}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: const Color(0xFF1B4D3E),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: theme.colorScheme.outline,
                    size: 20,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
