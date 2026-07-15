import 'dart:ui';

/// Belge kenarlarının dört köşesi (normalize 0..1 veya piksel koordinatı).
///
/// Native kenar algılama (OpenCV / ML Kit) sonuçları bu modele map edilir.
class DetectedQuad {
  const DetectedQuad({
    required this.topLeft,
    required this.topRight,
    required this.bottomRight,
    required this.bottomLeft,
    this.confidence = 0,
    this.isNormalized = true,
  });

  final Offset topLeft;
  final Offset topRight;
  final Offset bottomRight;
  final Offset bottomLeft;

  /// 0..1 arası algılama güveni.
  final double confidence;

  /// true ise köşeler görünüm boyutuna göre 0..1 normalize.
  final bool isNormalized;

  List<Offset> get corners => [topLeft, topRight, bottomRight, bottomLeft];

  DetectedQuad copyWith({
    Offset? topLeft,
    Offset? topRight,
    Offset? bottomRight,
    Offset? bottomLeft,
    double? confidence,
    bool? isNormalized,
  }) {
    return DetectedQuad(
      topLeft: topLeft ?? this.topLeft,
      topRight: topRight ?? this.topRight,
      bottomRight: bottomRight ?? this.bottomRight,
      bottomLeft: bottomLeft ?? this.bottomLeft,
      confidence: confidence ?? this.confidence,
      isNormalized: isNormalized ?? this.isNormalized,
    );
  }

  /// Normalize quad'ı [size] piksel uzayına çevirir.
  DetectedQuad toPixels(Size size) {
    if (!isNormalized) return this;
    Offset scale(Offset o) => Offset(o.dx * size.width, o.dy * size.height);
    return DetectedQuad(
      topLeft: scale(topLeft),
      topRight: scale(topRight),
      bottomRight: scale(bottomRight),
      bottomLeft: scale(bottomLeft),
      confidence: confidence,
      isNormalized: false,
    );
  }

  /// Tipik A4 / kimlik çerçeve oranı için varsayılan stub quad.
  factory DetectedQuad.defaultPreviewFrame() {
    return const DetectedQuad(
      topLeft: Offset(0.12, 0.18),
      topRight: Offset(0.88, 0.18),
      bottomRight: Offset(0.88, 0.82),
      bottomLeft: Offset(0.12, 0.82),
      confidence: 0.42,
    );
  }
}
