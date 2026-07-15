import 'detected_quad.dart';
import 'document_type.dart';

/// Kamera/crop akışının OCR katmanına verdiği sonuç.
///
/// `imagePath` gerçek yakalamada dosya yolu; stub modunda placeholder olabilir.
class DocumentScanResult {
  const DocumentScanResult({
    required this.imagePath,
    required this.quad,
    required this.documentType,
    this.isStub = false,
    this.capturedAt,
  });

  final String imagePath;
  final DetectedQuad quad;
  final DocumentType documentType;
  final bool isStub;
  final DateTime? capturedAt;
}
