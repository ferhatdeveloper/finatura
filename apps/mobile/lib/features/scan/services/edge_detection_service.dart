import '../models/detected_quad.dart';

/// Kenar algılama sözleşmesi.
///
/// Gerçek implementasyon: kamera karesinden / galeri görselinden
/// perspective transform için dört köşe üretir.
///
/// Canlı kenar plugin bağlanana kadar [MockEdgeDetectionService] (yalnızca overlay UI).
/// Yakalama ve Document Agent yolu gerçek görüntü kullanır.
abstract class EdgeDetectionService {
  /// Canlı önizleme çerçevesinden anlık quad tahmini.
  Future<DetectedQuad?> detectFromPreviewFrame(List<int> frameBytes);

  /// Sabit görüntü yolundan (capture sonrası) kenarları yeniden hesapla.
  Future<DetectedQuad?> detectFromImagePath(String imagePath);

  void dispose() {}
}
