import 'package:flutter/widgets.dart';

/// Native kamera eklentisi için sözleşme.
///
/// Varsayılan: [StubNativeCameraAdapter] — stub bozulmaz.
/// `camera` paketi açıldığında [PluginNativeCameraAdapter] yazılır ve
/// [CameraScanController] `nativeEnable: true` ile bağlanır.
abstract class NativeCameraAdapter {
  /// Plugin yüklü ve oturum açılabildi mi?
  bool get isAvailable;

  Future<bool> initialize();

  /// Canlı önizleme widget’ı; yoksa `null` → stub viewport.
  Widget? buildPreview();

  /// Yakalanan still dosya yolu.
  Future<String> captureStill();

  Future<void> dispose();
}

/// `nativeEnable == false` veya plugin yokken kullanılır.
class StubNativeCameraAdapter implements NativeCameraAdapter {
  @override
  bool get isAvailable => false;

  @override
  Future<bool> initialize() async => false;

  @override
  Widget? buildPreview() => null;

  @override
  Future<String> captureStill() async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return 'stub://captured_${DateTime.now().millisecondsSinceEpoch}.jpg';
  }

  @override
  Future<void> dispose() async {}
}

/// `camera` paketi pubspec’e eklendikten sonra doldurulacak iskelet.
///
/// Aktivasyon:
/// 1. `pubspec.yaml` içindeki `camera` / `permission_handler` satırlarını aç
/// 2. `flutter pub get` + native rebuild
/// 3. Bu sınıfta CameraController çağrılarını yaz
/// 4. `--dart-define=SCAN_NATIVE_CAMERA=true` veya `nativeEnable: true`
class PluginNativeCameraAdapter implements NativeCameraAdapter {
  /// Plugin bağlanana kadar her zaman false — stub path korunur.
  @override
  bool get isAvailable => false;

  @override
  Future<bool> initialize() async {
    // TODO: permission_handler + CameraController.initialize()
    // Paket yokken bilerek başarısız dön; controller stub’a düşer.
    debugPrint(
      'PluginNativeCameraAdapter: camera paketi henüz bağlı değil — stub kullanılacak.',
    );
    return false;
  }

  @override
  Widget? buildPreview() {
    // TODO: return CameraPreview(_controller);
    return null;
  }

  @override
  Future<String> captureStill() async {
    // TODO: final x = await _controller.takePicture(); return x.path;
    throw StateError('Native kamera hazır değil');
  }

  @override
  Future<void> dispose() async {
    // TODO: await _controller.dispose();
  }
}
