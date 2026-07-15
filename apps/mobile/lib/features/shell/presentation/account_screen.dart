import 'package:flutter/material.dart';

/// Hesap — oturum bilgisi + çıkış.
class AccountScreen extends StatelessWidget {
  const AccountScreen({
    super.key,
    this.displayName,
    this.email,
    this.onLogout,
  });

  static const routeName = '/account';

  final String? displayName;
  final String? email;
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final name = displayName?.trim().isNotEmpty == true
        ? displayName!
        : 'Finatura kullanıcısı';

    return Scaffold(
      appBar: AppBar(title: const Text('Hesap')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          Text(name, style: theme.textTheme.headlineSmall),
          if (email != null && email!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              email!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 32),
          FilledButton.tonalIcon(
            onPressed: onLogout,
            icon: const Icon(Icons.logout),
            label: const Text('Çıkış yap'),
          ),
        ],
      ),
    );
  }
}
