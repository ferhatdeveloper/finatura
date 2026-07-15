import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/captured_still.dart';

/// Native kamera eklentisi için sözleşme.
abstract class NativeCameraAdapter {
  bool get isAvailable;

  Future<bool> initialize();

  /// Canlı önizleme widget’ı; yoksa `null` → viewport placeholder.
  Widget? buildPreview();

  Future<CapturedStill> captureStill();

  Future<void> dispose();
}

/// `SCAN_NATIVE_CAMERA=false` iken UI-only stub (gerçek dosya yok).
class StubNativeCameraAdapter implements NativeCameraAdapter {
  @override
  bool get isAvailable => false;

  @override
  Future<bool> initialize() async => false;

  @override
  Widget? buildPreview() => null;

  @override
  Future<CapturedStill> captureStill() async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return CapturedStill(
      path: 'stub://captured_${DateTime.now().millisecondsSinceEpoch}.jpg',
      bytes: Uint8List(0),
      filename: 'stub-capture.jpg',
    );
  }

  @override
  Future<void> dispose() async {}
}

/// Gerçek `camera` + `permission_handler` adaptörü (Android / iOS).
///
/// Web’de [initialize] bilerek false döner — [ScanImageSource] kullanılır.
class PluginNativeCameraAdapter implements NativeCameraAdapter {
  CameraController? _controller;
  bool _available = false;

  @override
  bool get isAvailable =>
      _available && (_controller?.value.isInitialized ?? false);

  @override
  Future<bool> initialize() async {
    if (kIsWeb) {
      debugPrint(
        'PluginNativeCameraAdapter: web — canlı camera yok, image_picker kullanın.',
      );
      return false;
    }

    try {
      final status = await Permission.camera.request();
      if (!status.isGranted) {
        debugPrint('PluginNativeCameraAdapter: kamera izni reddedildi ($status)');
        return false;
      }

      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        debugPrint('PluginNativeCameraAdapter: kamera bulunamadı');
        return false;
      }

      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await controller.initialize();
      _controller = controller;
      _available = true;
      return true;
    } catch (e, st) {
      debugPrint('PluginNativeCameraAdapter initialize hata: $e\n$st');
      await dispose();
      return false;
    }
  }

  @override
  Widget? buildPreview() {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return null;
    return CameraPreview(c);
  }

  @override
  Future<CapturedStill> captureStill() async {
    final c = _controller;
    if (c == null || !c.value.isInitialized) {
      throw StateError('Native kamera hazır değil');
    }
    final xfile = await c.takePicture();
    final bytes = await xfile.readAsBytes();
    if (bytes.isEmpty) {
      throw StateError('Boş yakalama — tekrar deneyin');
    }
    return CapturedStill(
      path: xfile.path,
      bytes: bytes,
      filename: xfile.name,
    );
  }

  @override
  Future<void> dispose() async {
    final c = _controller;
    _controller = null;
    _available = false;
    await c?.dispose();
  }
}
