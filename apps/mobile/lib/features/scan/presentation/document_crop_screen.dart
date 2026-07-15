import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../models/detected_quad.dart';
import '../models/document_scan_result.dart';
import '../models/document_type.dart';
import 'widgets/crop_adjust_handles.dart';

/// Yakalanan görüntü üzerinde kenar düzeltme / crop onay ekranı.
class DocumentCropScreen extends StatefulWidget {
  const DocumentCropScreen({
    super.key,
    required this.imagePath,
    required this.initialQuad,
    required this.documentType,
    this.imageBytes,
    this.filename,
    this.isStubImage = false,
  });

  final String imagePath;
  final Uint8List? imageBytes;
  final String? filename;
  final DetectedQuad initialQuad;
  final DocumentType documentType;
  final bool isStubImage;

  @override
  State<DocumentCropScreen> createState() => _DocumentCropScreenState();
}

class _DocumentCropScreenState extends State<DocumentCropScreen> {
  late DetectedQuad _quad;

  @override
  void initState() {
    super.initState();
    _quad = widget.initialQuad.isNormalized
        ? widget.initialQuad
        : widget.initialQuad.copyWith(isNormalized: true);
  }

  void _confirm() {
    Navigator.of(context).pop(
      DocumentScanResult(
        imagePath: widget.imagePath,
        imageBytes: widget.imageBytes,
        filename: widget.filename,
        quad: _quad,
        documentType: widget.documentType,
        isStub: widget.isStubImage,
        capturedAt: DateTime.now(),
      ),
    );
  }

  Widget _buildImageBackdrop() {
    final bytes = widget.imageBytes;
    if (bytes != null && bytes.isNotEmpty) {
      return Image.memory(bytes, fit: BoxFit.cover);
    }

    if (widget.isStubImage || widget.imagePath.startsWith('stub://')) {
      return Container(
        color: const Color(0xFF1A2F28),
        alignment: Alignment.center,
        child: Text(
          'Stub görüntü\n${widget.imagePath}',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
          ),
        ),
      );
    }

    return Container(
      color: Colors.black54,
      alignment: Alignment.center,
      child: const Icon(
        Icons.broken_image_outlined,
        color: Colors.white54,
        size: 48,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1210),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text('${widget.documentType.labelTr} — kırp'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: AspectRatio(
                    aspectRatio: 3 / 4,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _buildImageBackdrop(),
                        CropAdjustHandles(
                          quad: _quad,
                          onChanged: (q) => setState(() => _quad = q),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Köşeleri sürükleyerek belge kenarlarını düzeltin',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                      ),
                      child: const Text('Yeniden çek'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _confirm,
                      child: const Text('Onayla'),
                    ),
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
