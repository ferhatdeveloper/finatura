import '../models/detected_quad.dart';

/// Kenar algılama sözleşmesi.
///
/// Gerçek implementasyon: kamera karesinden / galeri görselinden
/// perspective transform için dört köşe üretir.
///
/// Native plugin bağlanana kadar [MockEdgeDetectionService] kullanılır.
abstract class EdgeDetectionService {
  /// Canlı önizleme çerçevesinden anlık quad tahmini.
  Future<DetectedQuad?> detectFromPreviewFrame(List<int> frameBytes);

  /// Sabit görüntü yolundan (capture sonrası) kenarları yeniden hesapla.
  Future<DetectedQuad?> detectFromImagePath(String imagePath);

  void dispose() {}
}
