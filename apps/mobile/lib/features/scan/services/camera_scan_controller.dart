import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../config/scan_api_config.dart';
import '../models/captured_still.dart';
import '../models/detected_quad.dart';
import 'edge_detection_service.dart';
import 'mock_edge_detection_service.dart';
import 'native_camera_adapter.dart';

/// Kamera oturumu + kenar overlay döngüsü.
///
/// - Mobil + `SCAN_NATIVE_CAMERA=true` (varsayılan) → [PluginNativeCameraAdapter]
/// - Web / izin yok → canlı önizleme yok; galeri/dosya ile gerçek görüntü
/// - `SCAN_NATIVE_CAMERA=false` → UI stub (`stub://`, boş bayt)
///
/// Kenar overlay şu an [MockEdgeDetectionService] (yalnızca UI); yakalama gerçek dosyadır.
class CameraScanController {
  CameraScanController({
    EdgeDetectionService? edgeDetection,
    NativeCameraAdapter? cameraAdapter,
    bool? nativeEnable,
  })  : _edgeDetection = edgeDetection ?? MockEdgeDetectionService(),
        _nativeEnable = nativeEnable ?? ScanApiConfig.nativeCameraEnabled,
        _camera = cameraAdapter ??
            ((nativeEnable ?? ScanApiConfig.nativeCameraEnabled) && !kIsWeb
                ? PluginNativeCameraAdapter()
                : StubNativeCameraAdapter());

  final EdgeDetectionService _edgeDetection;
  final NativeCameraAdapter _camera;
  final bool _nativeEnable;

  final StreamController<DetectedQuad?> _quadController =
      StreamController<DetectedQuad?>.broadcast();

  Timer? _previewLoop;
  bool _initialized = false;
  bool _usingStubCamera = false;
  bool _livePreview = false;
  bool _pickerOnly = false;

  Stream<DetectedQuad?> get quadStream => _quadController.stream;
  bool get isInitialized => _initialized;

  /// `true` yalnızca bilinçli stub modu (`SCAN_NATIVE_CAMERA=false`).
  bool get isStubCamera => _usingStubCamera;

  /// Canlı CameraPreview aktif mi?
  bool get hasLivePreview => _livePreview;

  /// Kamera yok / web: galeri veya image_picker kamera.
  bool get isPickerOnly => _pickerOnly;

  bool get nativeEnable => _nativeEnable;
  EdgeDetectionService get edgeDetection => _edgeDetection;

  Widget? get previewWidget =>
      _livePreview ? _camera.buildPreview() : null;

  Future<void> initialize() async {
    if (!_nativeEnable) {
      _usingStubCamera = true;
      _livePreview = false;
      _pickerOnly = false;
      _initialized = true;
      _startEdgeOverlayLoop();
      return;
    }

    if (kIsWeb) {
      _usingStubCamera = false;
      _livePreview = false;
      _pickerOnly = true;
      _initialized = true;
      _startEdgeOverlayLoop();
      return;
    }

    final ok = await _camera.initialize();
    if (ok && _camera.isAvailable) {
      _usingStubCamera = false;
      _livePreview = true;
      _pickerOnly = false;
      _initialized = true;
      _startEdgeOverlayLoop();
      return;
    }

    // İzin/cihaz yok → stub yakalama YOK; galeri / picker kamera.
    _usingStubCamera = false;
    _livePreview = false;
    _pickerOnly = true;
    _initialized = true;
    _startEdgeOverlayLoop();
  }

  void _startEdgeOverlayLoop() {
    _previewLoop?.cancel();
    _previewLoop = Timer.periodic(const Duration(milliseconds: 120), (_) async {
      final quad = await _edgeDetection.detectFromPreviewFrame(const []);
      if (!_quadController.isClosed) {
        _quadController.add(quad);
      }
    });
  }

  Future<CapturedStill> captureStill() async {
    if (_livePreview) {
      return _camera.captureStill();
    }
    if (_usingStubCamera) {
      return StubNativeCameraAdapter().captureStill();
    }
    throw StateError(
      'Canlı kamera yok — galeri veya dosya seçin (web / izin).',
    );
  }

  Future<void> dispose() async {
    _previewLoop?.cancel();
    await _quadController.close();
    await _camera.dispose();
    _edgeDetection.dispose();
    _initialized = false;
    _livePreview = false;
  }
}
