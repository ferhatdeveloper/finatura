import 'dart:async';

import 'package:flutter/widgets.dart';

import '../config/scan_api_config.dart';
import '../models/detected_quad.dart';
import 'edge_detection_service.dart';
import 'mock_edge_detection_service.dart';
import 'native_camera_adapter.dart';

/// Kamera oturumu + kenar algılama döngüsü koordinatörü.
///
/// Path:
/// - `nativeEnable: false` (varsayılan) → [StubNativeCameraAdapter] + mock quad
/// - `nativeEnable: true` → [PluginNativeCameraAdapter]; initialize başarısızsa stub
///
/// Gerçek `camera` plugin: pubspec satırlarını aç → adapter’ı doldur →
/// `--dart-define=SCAN_NATIVE_CAMERA=true`
class CameraScanController {
  CameraScanController({
    EdgeDetectionService? edgeDetection,
    NativeCameraAdapter? cameraAdapter,
    bool? nativeEnable,
  })  : _edgeDetection = edgeDetection ?? MockEdgeDetectionService(),
        _nativeEnable = nativeEnable ?? ScanApiConfig.nativeCameraEnabled,
        _camera = cameraAdapter ??
            ((nativeEnable ?? ScanApiConfig.nativeCameraEnabled)
                ? PluginNativeCameraAdapter()
                : StubNativeCameraAdapter());

  final EdgeDetectionService _edgeDetection;
  final NativeCameraAdapter _camera;
  final bool _nativeEnable;

  final StreamController<DetectedQuad?> _quadController =
      StreamController<DetectedQuad?>.broadcast();

  Timer? _previewLoop;
  bool _initialized = false;
  bool _usingStubCamera = true;

  Stream<DetectedQuad?> get quadStream => _quadController.stream;
  bool get isInitialized => _initialized;
  bool get isStubCamera => _usingStubCamera;
  bool get nativeEnable => _nativeEnable;
  EdgeDetectionService get edgeDetection => _edgeDetection;

  /// Native bağlıysa [CameraPreview]; aksi halde `null` (viewport stub çizer).
  Widget? get previewWidget =>
      _usingStubCamera ? null : _camera.buildPreview();

  Future<void> initialize() async {
    if (_nativeEnable) {
      final ok = await _camera.initialize();
      if (ok && _camera.isAvailable) {
        _usingStubCamera = false;
        _initialized = true;
        _startMockPreviewLoop(); // Kenar: native edge gelene kadar mock
        return;
      }
    }

    _usingStubCamera = true;
    _initialized = true;
    _startMockPreviewLoop();
  }

  void _startMockPreviewLoop() {
    _previewLoop?.cancel();
    _previewLoop = Timer.periodic(const Duration(milliseconds: 120), (_) async {
      final quad = await _edgeDetection.detectFromPreviewFrame(const []);
      if (!_quadController.isClosed) {
        _quadController.add(quad);
      }
    });
  }

  Future<String> captureStill() async {
    if (!_usingStubCamera) {
      return _camera.captureStill();
    }
    return StubNativeCameraAdapter().captureStill();
  }

  Future<void> dispose() async {
    _previewLoop?.cancel();
    await _quadController.close();
    await _camera.dispose();
    _edgeDetection.dispose();
    _initialized = false;
  }
}
