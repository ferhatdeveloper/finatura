import 'dart:typed_data';

import 'captured_still.dart';
import 'detected_quad.dart';
import 'document_type.dart';

/// Kamera/crop akışının Document Agent’a verdiği sonuç.
///
/// Gerçek taramada [imageBytes] dolu olmalı (multipart). Stub yalnızca
/// `SCAN_NATIVE_CAMERA=false` geliştirme yolunda.
class DocumentScanResult {
  const DocumentScanResult({
    required this.imagePath,
    required this.quad,
    required this.documentType,
    this.imageBytes,
    this.filename,
    this.isStub = false,
    this.capturedAt,
  });

  factory DocumentScanResult.fromCaptured({
    required CapturedStill still,
    required DetectedQuad quad,
    required DocumentType documentType,
    bool isStub = false,
  }) {
    return DocumentScanResult(
      imagePath: still.path,
      imageBytes: still.bytes,
      filename: still.resolvedFilename,
      quad: quad,
      documentType: documentType,
      isStub: isStub,
      capturedAt: DateTime.now(),
    );
  }

  final String imagePath;
  final Uint8List? imageBytes;
  final String? filename;
  final DetectedQuad quad;
  final DocumentType documentType;
  final bool isStub;
  final DateTime? capturedAt;

  bool get hasUploadableImage =>
      !isStub &&
      !(imagePath.startsWith('stub://')) &&
      imageBytes != null &&
      imageBytes!.isNotEmpty;
}
