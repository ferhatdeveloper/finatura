import 'package:flutter/material.dart';

import '../models/document_analyze_result.dart';
import '../models/document_scan_result.dart';

/// Document Agent’tan dönen ayıklanmış alanları listeler.
class DocumentAnalyzeResultScreen extends StatelessWidget {
  const DocumentAnalyzeResultScreen({
    super.key,
    required this.scan,
    required this.analyze,
  });

  static const routeName = '/scan/result';

  final DocumentScanResult scan;
  final DocumentAnalyzeResult analyze;

  @override
  Widget build(BuildContext context) {
    final entries = analyze.flatFieldEntries;
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0B1210),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: const Text('OCR sonucu'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            _StatusBanner(analyze: analyze),
            const SizedBox(height: 16),
            Text(
              'Belge: ${analyze.documentType}'
              '${analyze.fromMock ? ' · mock' : ''}',
              style: theme.textTheme.titleMedium?.copyWith(color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              'Güven: ${(analyze.overallConfidence * 100).toStringAsFixed(0)}%'
              ' · Parser: ${analyze.parser}',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.65)),
            ),
            Text(
              'Kaynak: ${scan.isStub ? 'stub kamera' : scan.imagePath}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.4),
                fontSize: 12,
              ),
            ),
            if (analyze.warnings.isNotEmpty) ...[
              const SizedBox(height: 12),
              ...analyze.warnings.map(
                (w) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    '• $w',
                    style: TextStyle(
                      color: Colors.amber.shade200,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            Text(
              'Ayıklanan alanlar',
              style: theme.textTheme.titleSmall?.copyWith(
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
            const SizedBox(height: 8),
            if (entries.isEmpty)
              Text(
                analyze.errorMessage ?? 'Alan yok',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.55)),
              )
            else
              ...entries.map(
                (e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 120,
                        child: Text(
                          e.key,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.45),
                            fontSize: 13,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          e.value,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(analyze),
              child: const Text('Tamam'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.analyze});

  final DocumentAnalyzeResult analyze;

  @override
  Widget build(BuildContext context) {
    final ok =
        analyze.ok && analyze.fields != null && analyze.fields!.isNotEmpty;
    final color = ok
        ? const Color(0xFF2E7D57)
        : analyze.fromMock
            ? const Color(0xFF6B5A2A)
            : const Color(0xFF6B3A3A);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        ok
            ? (analyze.fromMock
                ? 'Mock fallback — örnek alanlar'
                : 'Document Agent analizi tamam')
            : (analyze.errorMessage ?? 'Analiz tamamlanamadı / unknown'),
        style: const TextStyle(color: Colors.white, fontSize: 14),
      ),
    );
  }
}
