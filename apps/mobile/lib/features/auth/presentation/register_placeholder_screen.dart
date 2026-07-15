import 'package:flutter/material.dart';

/// Kayıt henüz gateway’de yok — yer tutucu.
class RegisterPlaceholderScreen extends StatelessWidget {
  const RegisterPlaceholderScreen({super.key});

  static const routeName = '/register';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final maxWidth = width >= 900 ? 440.0 : 400.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Hesap oluştur')),
      body: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.person_add_alt_1_outlined,
                  size: 56,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 20),
                Text(
                  'Kayıt yakında',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  'Firma daveti ve hesap oluşturma API gateway üzerinden '
                  'yakında eklenecek. Şimdilik demo hesabı ile giriş yapın.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Girişe dön'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
