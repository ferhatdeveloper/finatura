import 'dart:typed_data';

/// Kamera veya galeriden gelen gerçek görüntü.
class CapturedStill {
  const CapturedStill({
    required this.path,
    required this.bytes,
    this.filename,
  });

  /// Yerel dosya yolu (mobil) veya blob/path (web).
  final String path;

  /// Multipart yükleme ve önizleme için ham baytlar (zorunlu — mock OCR yok).
  final Uint8List bytes;

  final String? filename;

  bool get hasImage => bytes.isNotEmpty;

  String get resolvedFilename {
    if (filename != null && filename!.isNotEmpty) return filename!;
    final slash = path.replaceAll('\\', '/').split('/').last;
    if (slash.isNotEmpty && slash.contains('.')) return slash;
    return 'scan.jpg';
  }
}
