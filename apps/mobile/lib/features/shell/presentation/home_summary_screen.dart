import 'package:flutter/material.dart';

/// Ana / özet — giriş sonrası varsayılan sekme.
class HomeSummaryScreen extends StatelessWidget {
  const HomeSummaryScreen({super.key});

  static const routeName = '/home';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Ana / Özet')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          Text(
            'Finatura',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: scheme.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Günlük nakit, evrak ve mutabakat özeti.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 28),
          _SummaryRow(
            icon: Icons.document_scanner_outlined,
            title: 'Tara',
            subtitle: 'Evrak çek, Document Agent ile çöz.',
          ),
          _SummaryRow(
            icon: Icons.account_balance_outlined,
            title: 'Mutabakat',
            subtitle: 'Gelen banka hareketlerini veresiye ile mahsup et.',
          ),
          _SummaryRow(
            icon: Icons.receipt_long_outlined,
            title: 'E-fatura',
            subtitle: 'Yakında — GİB e-fatura akışı.',
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: theme.colorScheme.primary),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
