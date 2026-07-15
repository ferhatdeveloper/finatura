import 'package:flutter/material.dart';
import 'package:finatura_mobile/features/scan/scan.dart';
import 'package:finatura_mobile/features/settlement/settlement.dart';

/// Minimal entry — feature ekranları ilgili modüllerden route ile açılır.
void main() {
  runApp(const FinaturaApp());
}

class FinaturaApp extends StatelessWidget {
  const FinaturaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Finatura',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1B4D3E),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const _HomeShell(),
      routes: {
        DocumentScanScreen.routeName: (_) => const DocumentScanScreen(),
      },
    );
  }
}

/// Settlement üstüne hafif FAB — settlement dosyalarına dokunulmaz.
class _HomeShell extends StatelessWidget {
  const _HomeShell();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const SettlementInboxScreen(),
        Positioned(
          right: 20,
          bottom: 28,
          child: FloatingActionButton.extended(
            onPressed: () {
              Navigator.of(context).pushNamed(DocumentScanScreen.routeName);
            },
            icon: const Icon(Icons.document_scanner_outlined),
            label: const Text('Tara'),
          ),
        ),
      ],
    );
  }
}
