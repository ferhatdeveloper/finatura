import 'package:flutter/material.dart';

import '../../models/detected_quad.dart';

/// Kullanıcının dört köşeyi sürükleyerek düzeltmesi için etkileşimli overlay.
class CropAdjustHandles extends StatelessWidget {
  const CropAdjustHandles({
    super.key,
    required this.quad,
    required this.onChanged,
  });

  final DetectedQuad quad;
  final ValueChanged<DetectedQuad> onChanged;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        final pixels = quad.isNormalized ? quad.toPixels(size) : quad;

        Offset toNorm(Offset p) =>
            Offset(p.dx / size.width, p.dy / size.height);

        Widget handle(Offset pos, void Function(Offset) update) {
          return Positioned(
            left: pos.dx - 14,
            top: pos.dy - 14,
            child: GestureDetector(
              onPanUpdate: (details) {
                final next = Offset(
                  (pos.dx + details.delta.dx).clamp(0, size.width),
                  (pos.dy + details.delta.dy).clamp(0, size.height),
                );
                update(toNorm(next));
              },
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
          );
        }

        return Stack(
          children: [
            CustomPaint(
              size: size,
              painter: _CropOutlinePainter(pixels),
            ),
            handle(
              pixels.topLeft,
              (o) => onChanged(quad.copyWith(topLeft: o, isNormalized: true)),
            ),
            handle(
              pixels.topRight,
              (o) => onChanged(quad.copyWith(topRight: o, isNormalized: true)),
            ),
            handle(
              pixels.bottomRight,
              (o) =>
                  onChanged(quad.copyWith(bottomRight: o, isNormalized: true)),
            ),
            handle(
              pixels.bottomLeft,
              (o) =>
                  onChanged(quad.copyWith(bottomLeft: o, isNormalized: true)),
            ),
          ],
        );
      },
    );
  }
}

class _CropOutlinePainter extends CustomPainter {
  _CropOutlinePainter(this.quad);

  final DetectedQuad quad;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(quad.topLeft.dx, quad.topLeft.dy)
      ..lineTo(quad.topRight.dx, quad.topRight.dy)
      ..lineTo(quad.bottomRight.dx, quad.bottomRight.dy)
      ..lineTo(quad.bottomLeft.dx, quad.bottomLeft.dy)
      ..close();
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0x443DDC97)
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0xFF3DDC97)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(covariant _CropOutlinePainter oldDelegate) =>
      oldDelegate.quad != quad;
}
