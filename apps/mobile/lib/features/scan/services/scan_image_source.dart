import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/captured_still.dart';

/// Galeri / dosya / (web) kamera — gerçek görüntü, mock OCR yok.
///
/// Web’de `image_picker` dosya seçici (file input) açar.
class ScanImageSource {
  ScanImageSource({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  Future<CapturedStill?> pickFromGallery() => _pick(ImageSource.gallery);

  /// Web ve mobil: sistem kamera / capture UI.
  Future<CapturedStill?> pickFromCamera() => _pick(ImageSource.camera);

  Future<CapturedStill?> _pick(ImageSource source) async {
    if (!kIsWeb && source == ImageSource.gallery) {
      await _ensurePhotosPermission();
    }
    if (!kIsWeb && source == ImageSource.camera) {
      final cam = await Permission.camera.request();
      if (!cam.isGranted) return null;
    }

    final x = await _picker.pickImage(
      source: source,
      imageQuality: 92,
      maxWidth: 2500,
    );
    if (x == null) return null;

    final bytes = await x.readAsBytes();
    if (bytes.isEmpty) return null;

    return CapturedStill(
      path: x.path,
      bytes: bytes,
      filename: x.name.isNotEmpty ? x.name : 'scan.jpg',
    );
  }

  Future<void> _ensurePhotosPermission() async {
    if (defaultTargetPlatform == TargetPlatform.android) {
      // Android 13+ READ_MEDIA_IMAGES; eski sürümlerde storage.
      final photos = await Permission.photos.request();
      if (photos.isGranted || photos.isLimited) return;
      await Permission.storage.request();
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      await Permission.photos.request();
    }
  }
}
