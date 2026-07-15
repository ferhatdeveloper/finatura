import 'package:flutter/material.dart';

import '../../models/detected_quad.dart';

/// Algılanan belge kenarlarını kamera önizlemesi üzerine çizer.
class EdgeQuadPainter extends CustomPainter {
  EdgeQuadPainter({
    required this.quad,
    this.strokeColor = const Color(0xFF3DDC97),
    this.fillColor = const Color(0x333DDC97),
    this.strokeWidth = 2.5,
  });

  final DetectedQuad? quad;
  final Color strokeColor;
  final Color fillColor;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    if (quad == null) return;
    final pixelQuad = quad!.isNormalized ? quad!.toPixels(size) : quad!;
    final path = Path()
      ..moveTo(pixelQuad.topLeft.dx, pixelQuad.topLeft.dy)
      ..lineTo(pixelQuad.topRight.dx, pixelQuad.topRight.dy)
      ..lineTo(pixelQuad.bottomRight.dx, pixelQuad.bottomRight.dy)
      ..lineTo(pixelQuad.bottomLeft.dx, pixelQuad.bottomLeft.dy)
      ..close();

    canvas.drawPath(
      path,
      Paint()
        ..color = fillColor
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = strokeColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeJoin = StrokeJoin.round,
    );

    final handlePaint = Paint()..color = strokeColor;
    for (final corner in pixelQuad.corners) {
      canvas.drawCircle(corner, 6, handlePaint);
    }
  }

  @override
  bool shouldRepaint(covariant EdgeQuadPainter oldDelegate) {
    return oldDelegate.quad != quad ||
        oldDelegate.strokeColor != strokeColor ||
        oldDelegate.fillColor != fillColor;
  }
}
