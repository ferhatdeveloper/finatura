import 'package:flutter/material.dart';

import '../../models/detected_quad.dart';
import 'edge_quad_painter.dart';

/// Kamera önizleme alanı.
///
/// Stub modunda gradient/placeholder gösterir; gerçek plugin'de child olarak
/// `CameraPreview` verilir.
class CameraViewport extends StatelessWidget {
  const CameraViewport({
    super.key,
    required this.quad,
    this.previewChild,
    this.isStub = true,
    this.statusLabel,
  });

  final DetectedQuad? quad;
  final Widget? previewChild;
  final bool isStub;
  final String? statusLabel;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(
        aspectRatio: 3 / 4,
        child: Stack(
          fit: StackFit.expand,
          children: [
            previewChild ??
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color(0xFF1A2F28),
                        const Color(0xFF0E1A16),
                        Colors.black.withValues(alpha: 0.95),
                      ],
                    ),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.document_scanner_outlined,
                          size: 48,
                          color: Colors.white.withValues(alpha: 0.35),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          isStub ? 'Stub kamera önizleme' : 'Kamera önizleme',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.55),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            CustomPaint(
              painter: EdgeQuadPainter(quad: quad),
              child: const SizedBox.expand(),
            ),
            if (statusLabel != null)
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: Text(
                  statusLabel!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                    shadows: const [
                      Shadow(blurRadius: 6, color: Colors.black54),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
