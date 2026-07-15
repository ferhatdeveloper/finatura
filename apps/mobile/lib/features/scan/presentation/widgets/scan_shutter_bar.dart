import 'package:flutter/material.dart';

import '../../models/document_type.dart';

/// Belge türü seçimi + deklanşör çubuğu.
class ScanShutterBar extends StatelessWidget {
  const ScanShutterBar({
    super.key,
    required this.documentType,
    required this.onDocumentTypeChanged,
    required this.onCapture,
    this.onPickGallery,
    this.captureEnabled = true,
  });

  final DocumentType documentType;
  final ValueChanged<DocumentType> onDocumentTypeChanged;
  final VoidCallback onCapture;
  final VoidCallback? onPickGallery;
  final bool captureEnabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: DocumentType.values
                .where((t) => t != DocumentType.unknown)
                .map((type) {
              final selected = type == documentType;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(type.labelTr),
                  selected: selected,
                  onSelected: (_) => onDocumentTypeChanged(type),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            IconButton.filledTonal(
              onPressed: onPickGallery,
              icon: const Icon(Icons.photo_library_outlined),
              tooltip: 'Galeriden seç',
            ),
            Semantics(
              button: true,
              label: 'Belgeyi tara',
              child: Material(
                color: captureEnabled
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey,
                shape: const CircleBorder(),
                elevation: 2,
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: captureEnabled ? onCapture : null,
                  child: const SizedBox(
                    width: 72,
                    height: 72,
                    child: Icon(Icons.camera_alt, color: Colors.white, size: 32),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 48),
          ],
        ),
      ],
    );
  }
}
