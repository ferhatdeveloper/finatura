import 'dart:ui';

import '../models/detected_quad.dart';
import 'edge_detection_service.dart';

/// Native plugin yokken deterministik stub kenar algılama.
///
/// UI akışını (overlay, crop handle, confirm) cihaz/plugin olmadan test etmek için.
class MockEdgeDetectionService implements EdgeDetectionService {
  MockEdgeDetectionService({this.jitter = true});

  /// true ise her karede hafif köşe kayması simüle edilir.
  final bool jitter;
  int _tick = 0;

  @override
  Future<DetectedQuad?> detectFromPreviewFrame(List<int> frameBytes) async {
    await Future<void>.delayed(const Duration(milliseconds: 16));
    _tick++;
    final base = DetectedQuad.defaultPreviewFrame();
    if (!jitter) return base;

    final wiggle = ((_tick % 20) - 10) * 0.0015;
    return base.copyWith(
      topLeft: Offset(base.topLeft.dx + wiggle, base.topLeft.dy),
      topRight: Offset(base.topRight.dx - wiggle, base.topRight.dy),
      bottomRight: Offset(base.bottomRight.dx - wiggle, base.bottomRight.dy),
      bottomLeft: Offset(base.bottomLeft.dx + wiggle, base.bottomLeft.dy),
      confidence: 0.55 + (_tick % 10) * 0.02,
    );
  }

  @override
  Future<DetectedQuad?> detectFromImagePath(String imagePath) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    return DetectedQuad.defaultPreviewFrame().copyWith(confidence: 0.78);
  }

  @override
  void dispose() {}
}
